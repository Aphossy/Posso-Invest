/**
 * Daily loan lifecycle sweep.
 *
 * Loans never moved through their late-stage lifecycle automatically:
 *  - the near-due reminder feature (loanNearDueEmailNotifier) was dead code —
 *    nothing ever emitted `ikimina/loan.near-due`;
 *  - loans never flipped to `overdue` once their due date passed.
 *
 * This cron (runs daily, Kigali morning) scans active loans and:
 *  1. emits `ikimina/loan.near-due` at 14 / 7 / 3 days before the due date,
 *     wiring up the existing reminder notifier;
 *  2. transitions past-due `disbursed`/`repaying` loans to `overdue`, notifying
 *     the member (email + in-app) and leadership (in-app), with an audit entry.
 *
 * Idempotency: status updates are naturally idempotent (skip non-active loans),
 * overdue emails are deduped via the email_send_log, and near-due events are
 * deduped by event id + the notifier's own send-log guard.
 */
import { db } from "@/db/connection"
import { auditLogOperations } from "@/db/operations/audit-log-operations"
import { loanOperations } from "@/db/operations/loan-operations"
import { loan, member, organization, user } from "@/db/schemas"
import { LoanUpdatedMemberEmail } from "@/emails/loan-updated-member"
import { inngest } from "@/inngest/client"
import {
  ensureEmailLogRecord,
  getEmailLogStatus,
  markEmailFailed,
  markEmailSent,
} from "@/inngest/email-log-helpers"
import { generateUUID } from "@/utils/generate-id"
import { render } from "@react-email/components"
import { and, eq, inArray, isNotNull } from "drizzle-orm"

import sendEmail from "@/lib/send-email"

const NEAR_DUE_THRESHOLDS = [14, 7, 3]
const ACTIVE_STATUSES = ["disbursed", "repaying"] as const

type ActiveLoanRow = {
  id: string
  memberId: string
  status: string
  approvedAmount: string | null
  requestedAmount: string
  currency: string
  termMonths: number | null
  // Serialized to an ISO string once it passes through an Inngest step.
  dueDate: string | null
  notes: string | null
  reason: string | null
  memberName: string
  memberEmail: string | null
}

type LeadershipRow = {
  userId: string
  name: string
  email: string | null
}

const fmtAmount = (value?: string | null) => {
  if (!value) return "0"
  const n = Number.parseFloat(value)
  return Number.isFinite(n) ? new Intl.NumberFormat("en-RW").format(n) : value
}

function daysUntil(dueDate: Date): number {
  return Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

async function resolveOrganizationId(): Promise<string> {
  const rows = await db
    .select({ id: organization.id })
    .from(organization)
    .limit(1)
  if (!rows[0]) throw new Error("No organization found in database")
  return rows[0].id
}

async function loadActiveLoans(): Promise<ActiveLoanRow[]> {
  return db
    .select({
      id: loan.id,
      memberId: loan.memberId,
      status: loan.status,
      approvedAmount: loan.approvedAmount,
      requestedAmount: loan.requestedAmount,
      currency: loan.currency,
      termMonths: loan.termMonths,
      dueDate: loan.dueDate,
      notes: loan.notes,
      reason: loan.metadata,
      memberName: user.name,
      memberEmail: user.email,
    })
    .from(loan)
    .innerJoin(user, eq(loan.memberId, user.id))
    .where(
      and(inArray(loan.status, [...ACTIVE_STATUSES]), isNotNull(loan.dueDate))
    ) as unknown as Promise<ActiveLoanRow[]>
}

async function loadLeadership(
  organizationId: string
): Promise<LeadershipRow[]> {
  const rows = await db
    .select({
      userId: user.id,
      name: user.name,
      email: user.email,
    })
    .from(member)
    .innerJoin(user, eq(member.userId, user.id))
    .where(
      and(
        eq(member.organizationId, organizationId),
        inArray(member.role, ["admin", "president", "treasurer"])
      )
    )
  return rows.filter((r: LeadershipRow) => Boolean(r.email))
}

export const loanLifecycleSweep = inngest.createFunction(
  {
    id: "ikimina-loan-lifecycle-sweep",
    retries: 3,
    concurrency: 1,
    triggers: [{ cron: "TZ=Africa/Kigali 0 7 * * *" }],
  },
  async ({ step, notificationOperations, logger }) => {
    const orgId = await step.run("resolve-organization", resolveOrganizationId)
    const loans = await step.run("load-active-loans", loadActiveLoans)

    if (loans.length === 0) {
      logger.info("No active loans to sweep")
      return { nearDue: 0, overdue: 0 }
    }

    const overdueLoans: ActiveLoanRow[] = []
    const nearDueEvents: { name: string; id: string; data: any }[] = []

    for (const l of loans) {
      if (!l.dueDate) continue
      const days = daysUntil(new Date(l.dueDate))

      if (days < 0) {
        overdueLoans.push(l)
      } else if (NEAR_DUE_THRESHOLDS.includes(days)) {
        const purpose =
          (l.reason as { reason?: string } | null)?.reason ||
          l.notes ||
          "Loan repayment"
        nearDueEvents.push({
          name: "ikimina/loan.near-due",
          id: `ikimina-loan-near-due-${l.id}-${days}d`,
          data: {
            organizationId: orgId,
            loanId: l.id,
            requesterId: l.memberId,
            requesterName: l.memberName || "Member",
            requesterEmail: l.memberEmail ?? undefined,
            approvedAmount: fmtAmount(l.approvedAmount ?? l.requestedAmount),
            currency: l.currency,
            purpose,
            dueDate: new Date(l.dueDate).toISOString(),
            daysUntilDue: days,
          },
        })
      }
    }

    // ── Near-due reminders ──────────────────────────────────────────────────
    if (nearDueEvents.length > 0) {
      await step.sendEvent("emit-near-due-events", nearDueEvents)
    }

    // ── Overdue transitions ─────────────────────────────────────────────────
    let overdueProcessed = 0
    if (overdueLoans.length > 0) {
      const leadership = await step.run("load-leadership", () =>
        loadLeadership(orgId)
      )

      for (const l of overdueLoans) {
        await step.run(`mark-overdue-${l.id}`, async () => {
          // Re-read inside the step so retries/replays see current state.
          const current = await loanOperations.findById(l.id)
          if (!current || current.status === "overdue") return
          if (!ACTIVE_STATUSES.includes(current.status as any)) return

          await loanOperations.updateById(l.id, { status: "overdue" })

          // Member email (deduped — one overdue notice per loan).
          if (l.memberEmail) {
            const evt = "loan_overdue_member" as const
            await ensureEmailLogRecord(l.memberId, l.memberEmail, evt, l.id)
            const status = await getEmailLogStatus(l.memberId, evt, l.id)
            if (status !== "sent") {
              try {
                const html = await render(
                  LoanUpdatedMemberEmail({
                    memberName: l.memberName || "Member",
                    oldStatus: current.status,
                    newStatus: "overdue",
                    requestedAmount: fmtAmount(l.requestedAmount),
                    approvedAmount: l.approvedAmount
                      ? fmtAmount(l.approvedAmount)
                      : null,
                    currency: l.currency,
                    termMonths: l.termMonths,
                    dueDate: l.dueDate
                      ? new Date(l.dueDate).toISOString()
                      : undefined,
                    notes: l.notes,
                    updatedByName: "TrustLink (automated)",
                    loanId: l.id,
                  })
                )
                const result = await sendEmail({
                  to: l.memberEmail,
                  subject: `Your loan is now overdue: ${l.id}`,
                  html,
                })
                if (result.success) {
                  await markEmailSent(l.memberId, evt, l.id)
                } else {
                  await markEmailFailed(
                    l.memberId,
                    evt,
                    l.id,
                    String(result.error)
                  )
                }
              } catch (error) {
                await markEmailFailed(l.memberId, evt, l.id, String(error))
              }
            }
          }

          // In-app notifications: member + leadership.
          const notifications = [
            {
              id: generateUUID(),
              userId: l.memberId,
              type: "loan" as const,
              title: "Loan Overdue",
              message: `Your loan (${l.currency} ${fmtAmount(l.approvedAmount ?? l.requestedAmount)}) has passed its due date and is now overdue. Please arrange repayment.`,
              channel: "in_app" as const,
              actionUrl: "/member/loans",
              actionLabel: "View Loan",
              relatedType: "loan",
              relatedId: l.id,
              isRead: false,
              isArchived: false,
              priority: "urgent" as const,
            },
            ...leadership
              .filter((r) => r.userId !== l.memberId)
              .map((r) => ({
                id: generateUUID(),
                userId: r.userId,
                type: "loan" as const,
                title: "Loan Overdue",
                message: `${l.memberName || "A member"}'s loan (${l.currency} ${fmtAmount(l.approvedAmount ?? l.requestedAmount)}) is now overdue.`,
                channel: "in_app" as const,
                actionUrl: "/treasurer/loans/repayments",
                actionLabel: "Review",
                relatedType: "loan",
                relatedId: l.id,
                isRead: false,
                isArchived: false,
                priority: "high" as const,
              })),
          ]
          await notificationOperations.bulkCreate(notifications)

          await auditLogOperations
            .create({
              action: "loan.overdue",
              userId: l.memberId,
              resourceType: "loan",
              resourceId: l.id,
              details: `Loan auto-transitioned from "${current.status}" to "overdue" (past due date)`,
              metadata: { previousStatus: current.status, automated: true },
              severity: "high",
            })
            .catch(() => undefined)
        })
        overdueProcessed++
      }
    }

    logger.info("Loan lifecycle sweep complete", {
      nearDueEmitted: nearDueEvents.length,
      overdueProcessed,
    })
    return { nearDue: nearDueEvents.length, overdue: overdueProcessed }
  }
)
