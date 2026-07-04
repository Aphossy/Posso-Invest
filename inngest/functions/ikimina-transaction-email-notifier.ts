import { db } from "@/db/connection"
import { loan, member, user } from "@/db/schemas"
import { ContributionRecordedConfirmationEmail } from "@/emails/contribution-recorded-confirmation"
import { ContributionRecordedNotificationEmail } from "@/emails/contribution-recorded-notification"
import { LoanApprovedNotificationEmail } from "@/emails/loan-approved-notification"
import { LoanNearDueReminderEmail } from "@/emails/loan-near-due-reminder"
import { LoanRequestConfirmationEmail } from "@/emails/loan-request-confirmation"
import { LoanRequestNotificationEmail } from "@/emails/loan-request-notification"
import { PenaltyRecordedConfirmationEmail } from "@/emails/penalty-recorded-confirmation"
import { PenaltyRecordedNotificationEmail } from "@/emails/penalty-recorded-notification"
import { inngest } from "@/inngest/client"
import {
  ensureEmailLogRecord,
  findFailedEmailLogs,
  getEmailLogStatus,
  markEmailFailed,
  markEmailSent,
} from "@/inngest/email-log-helpers"
import {
  contributionRecordedEvent,
  loanApprovedEvent,
  loanNearDueEvent,
  loanRequestedEvent,
  penaltyRecordedEvent,
} from "@/inngest/events"
import { render } from "@react-email/components"
import { and, eq, inArray, ne } from "drizzle-orm"

import sendEmail from "@/lib/send-email"

type LeadershipRecipient = {
  userId: string
  role: string
  name: string
  email: string
}

const getLeadershipRecipients = async (
  organizationId: string,
  roles: string[],
  excludeUserId?: string
): Promise<LeadershipRecipient[]> => {
  const conditions = [
    eq(member.organizationId, organizationId),
    inArray(member.role, roles),
  ]

  if (excludeUserId) {
    conditions.push(ne(member.userId, excludeUserId))
  }

  const members: LeadershipRecipient[] = await db
    .select({
      userId: user.id,
      role: member.role,
      name: user.name,
      email: user.email,
    })
    .from(member)
    .innerJoin(user, eq(member.userId, user.id))
    .where(and(...conditions))

  return members
    .filter((r: LeadershipRecipient) => Boolean(r.email))
    .filter((r: LeadershipRecipient) => r.userId !== excludeUserId)
}

// ---------------------------------------------------------------------------
// Contribution recorded
// ---------------------------------------------------------------------------

export const contributionRecordedEmailNotifier = inngest.createFunction(
  {
    id: "ikimina-contribution-recorded-email-notifier",
    retries: 3,
    concurrency: 4,
    triggers: [contributionRecordedEvent],
  },
  async ({ event, step, logger }) => {
    const {
      organizationId,
      contributionId,
      memberId,
      memberName,
      memberEmail,
      amount,
      currency,
      period,
      status,
      paidAt,
      dueDate,
      penaltyAmount,
      recordedByName,
    } = event.data

    // Member confirmation - single recipient, already in its own step
    if (memberEmail) {
      await step.run("send-member-confirmation", async () => {
        const html = await render(
          ContributionRecordedConfirmationEmail({
            memberName,
            amount,
            currency,
            period,
            status,
            paidAt,
            dueDate,
            penaltyAmount,
            recordedByName,
            contributionId,
          })
        )

        await sendEmail({
          to: memberEmail,
          subject: `Contribution recorded for ${period}`,
          html,
        })
      })
    }

    const leadership = await step.run("resolve-leadership-recipients", () =>
      getLeadershipRecipients(organizationId, ["admin", "president"], memberId)
    )

    if (leadership.length === 0) return

    const eventType = "contribution_recorded_leadership" as const

    // ── One step per leadership recipient ─────────────────────────────────
    for (const r of leadership) {
      await step.run(`send-leadership-alert-${r.userId}`, async () => {
        await ensureEmailLogRecord(r.userId, r.email, eventType, contributionId)

        const currentStatus = await getEmailLogStatus(
          r.userId,
          eventType,
          contributionId
        )
        if (currentStatus === "sent") return

        const html = await render(
          ContributionRecordedNotificationEmail({
            recipientName: r.name || "Leader",
            memberName,
            memberEmail: memberEmail || "N/A",
            amount,
            currency,
            period,
            status,
            paidAt,
            dueDate,
            penaltyAmount,
            recordedByName,
            contributionId,
          })
        )

        const result = await sendEmail({
          to: r.email,
          subject: `Contribution oversight alert: ${memberName}`,
          html,
        })

        if (result.success) {
          await markEmailSent(r.userId, eventType, contributionId)
        } else {
          await markEmailFailed(
            r.userId,
            eventType,
            contributionId,
            String(result.error)
          )
        }
      })
    }

    // ── Retry ─────────────────────────────────────────────────────────────
    const failedUserIds = await step.run("find-failed-emails", () =>
      findFailedEmailLogs(eventType, contributionId)
    )

    if (failedUserIds.length > 0) {
      await step.sleep("wait-before-retry", "5 minutes")

      const leadershipById = new Map(leadership.map((r) => [r.userId, r]))

      for (const userId of failedUserIds) {
        const r = leadershipById.get(userId)
        if (!r) continue

        await step.run(`retry-leadership-alert-${r.userId}`, async () => {
          const currentStatus = await getEmailLogStatus(
            r.userId,
            eventType,
            contributionId
          )
          if (currentStatus === "sent") return

          const html = await render(
            ContributionRecordedNotificationEmail({
              recipientName: r.name || "Leader",
              memberName,
              memberEmail: memberEmail || "N/A",
              amount,
              currency,
              period,
              status,
              paidAt,
              dueDate,
              penaltyAmount,
              recordedByName,
              contributionId,
            })
          )

          const result = await sendEmail({
            to: r.email,
            subject: `Contribution oversight alert: ${memberName}`,
            html,
          })

          if (result.success) {
            await markEmailSent(r.userId, eventType, contributionId)
          } else {
            await markEmailFailed(
              r.userId,
              eventType,
              contributionId,
              String(result.error)
            )
          }
        })
      }
    }

    logger.info("Contribution email notifications sent", {
      contributionId,
      leadershipRecipients: leadership.length,
      retried: failedUserIds.length,
    })
  }
)

// ---------------------------------------------------------------------------
// Loan requested
// ---------------------------------------------------------------------------

export const loanRequestedEmailNotifier = inngest.createFunction(
  {
    id: "ikimina-loan-requested-email-notifier",
    retries: 3,
    concurrency: 4,
    triggers: [loanRequestedEvent],
  },
  async ({ event, step, logger }) => {
    const {
      organizationId,
      loanId,
      requesterId,
      requesterName,
      requesterEmail,
      requestedAmount,
      currency,
      purpose,
      termMonths,
      createdAt,
    } = event.data

    // Requester confirmation - single recipient, already in its own step
    if (requesterEmail) {
      await step.run("send-member-loan-confirmation", async () => {
        const html = await render(
          LoanRequestConfirmationEmail({
            name: requesterName,
            loanCode: loanId,
            requestedAmount,
            currency,
            purpose,
            termMonths,
            createdAt,
          })
        )

        await sendEmail({
          to: requesterEmail,
          subject: `Loan request received: ${loanId}`,
          html,
        })
      })
    }

    const leadership = await step.run("resolve-loan-review-recipients", () =>
      getLeadershipRecipients(
        organizationId,
        ["admin", "treasurer", "president"],
        requesterId
      )
    )

    if (leadership.length === 0) return

    const loanReqEventType = "loan_requested_leadership" as const

    const loanReqSubject = (role: string) =>
      role === "president"
        ? `Action required — loan approval needed: ${loanId}`
        : `Loan request received: ${loanId}`

    // ── One step per leadership recipient ─────────────────────────────────
    for (const r of leadership) {
      await step.run(`send-loan-alert-${r.userId}`, async () => {
        await ensureEmailLogRecord(r.userId, r.email, loanReqEventType, loanId)

        const status = await getEmailLogStatus(
          r.userId,
          loanReqEventType,
          loanId
        )
        if (status === "sent") return

        const html = await render(
          LoanRequestNotificationEmail({
            recipientName: r.name || "Leader",
            recipientRole: r.role,
            requesterName,
            requesterEmail: requesterEmail || "N/A",
            loanCode: loanId,
            requestedAmount,
            currency,
            purpose,
            termMonths,
            submittedAt: createdAt,
          })
        )

        const result = await sendEmail({
          to: r.email,
          subject: loanReqSubject(r.role),
          html,
        })

        if (result.success) {
          await markEmailSent(r.userId, loanReqEventType, loanId)
        } else {
          await markEmailFailed(
            r.userId,
            loanReqEventType,
            loanId,
            String(result.error)
          )
        }
      })
    }

    // ── Retry ─────────────────────────────────────────────────────────────
    const failedUserIds = await step.run("find-failed-emails", () =>
      findFailedEmailLogs(loanReqEventType, loanId)
    )

    if (failedUserIds.length > 0) {
      await step.sleep("wait-before-retry", "5 minutes")

      const leadershipById = new Map(leadership.map((r) => [r.userId, r]))

      for (const userId of failedUserIds) {
        const r = leadershipById.get(userId)
        if (!r) continue

        await step.run(`retry-loan-alert-${r.userId}`, async () => {
          const status = await getEmailLogStatus(
            r.userId,
            loanReqEventType,
            loanId
          )
          if (status === "sent") return

          const html = await render(
            LoanRequestNotificationEmail({
              recipientName: r.name || "Leader",
              recipientRole: r.role,
              requesterName,
              requesterEmail: requesterEmail || "N/A",
              loanCode: loanId,
              requestedAmount,
              currency,
              purpose,
              termMonths,
              submittedAt: createdAt,
            })
          )

          const result = await sendEmail({
            to: r.email,
            subject: loanReqSubject(r.role),
            html,
          })

          if (result.success) {
            await markEmailSent(r.userId, loanReqEventType, loanId)
          } else {
            await markEmailFailed(
              r.userId,
              loanReqEventType,
              loanId,
              String(result.error)
            )
          }
        })
      }
    }

    logger.info("Loan request notifications sent", {
      loanId,
      leadershipRecipients: leadership.length,
      retried: failedUserIds.length,
    })
  }
)

// ---------------------------------------------------------------------------
// Loan approved — notify treasurer to disburse, admin for oversight
// ---------------------------------------------------------------------------

export const loanApprovedEmailNotifier = inngest.createFunction(
  {
    id: "ikimina-loan-approved-email-notifier",
    retries: 3,
    concurrency: 4,
    triggers: [loanApprovedEvent],
  },
  async ({ event, step, logger }) => {
    const {
      organizationId,
      loanId,
      requesterId,
      requesterName,
      requesterEmail,
      approvedAmount,
      currency,
      purpose,
      termMonths,
      approvedAt,
      approvedByName,
      dueDate,
    } = event.data

    // ── Treasurer: action required — disburse ─────────────────────────────
    const treasurers = await step.run("resolve-loan-approved-treasurers", () =>
      getLeadershipRecipients(organizationId, ["treasurer"], requesterId)
    )

    const treasurerEventType = "loan_approved_treasurer" as const

    for (const r of treasurers) {
      await step.run(`send-loan-approved-treasurer-${r.userId}`, async () => {
        await ensureEmailLogRecord(
          r.userId,
          r.email,
          treasurerEventType,
          loanId
        )

        const status = await getEmailLogStatus(
          r.userId,
          treasurerEventType,
          loanId
        )
        if (status === "sent") return

        const html = await render(
          LoanApprovedNotificationEmail({
            recipientName: r.name || "Treasurer",
            recipientRole: r.role,
            requesterName,
            requesterEmail: requesterEmail || "N/A",
            loanCode: loanId,
            approvedAmount,
            currency,
            purpose,
            termMonths,
            approvedAt,
            approvedByName,
            dueDate,
          })
        )

        const result = await sendEmail({
          to: r.email,
          subject: `Loan approved — disbursement required: ${loanId}`,
          html,
        })

        if (result.success) {
          await markEmailSent(r.userId, treasurerEventType, loanId)
        } else {
          await markEmailFailed(
            r.userId,
            treasurerEventType,
            loanId,
            String(result.error)
          )
        }
      })
    }

    // ── Admin: oversight notification ──────────────────────────────────────
    const admins = await step.run("resolve-loan-approved-admins", () =>
      getLeadershipRecipients(organizationId, ["admin"], requesterId)
    )

    const adminEventType = "loan_approved_leadership" as const

    for (const r of admins) {
      await step.run(`send-loan-approved-admin-${r.userId}`, async () => {
        await ensureEmailLogRecord(r.userId, r.email, adminEventType, loanId)

        const status = await getEmailLogStatus(r.userId, adminEventType, loanId)
        if (status === "sent") return

        const html = await render(
          LoanApprovedNotificationEmail({
            recipientName: r.name || "Leader",
            recipientRole: r.role,
            requesterName,
            requesterEmail: requesterEmail || "N/A",
            loanCode: loanId,
            approvedAmount,
            currency,
            purpose,
            termMonths,
            approvedAt,
            approvedByName,
            dueDate,
          })
        )

        const result = await sendEmail({
          to: r.email,
          subject: `Loan approved — oversight notice: ${loanId}`,
          html,
        })

        if (result.success) {
          await markEmailSent(r.userId, adminEventType, loanId)
        } else {
          await markEmailFailed(
            r.userId,
            adminEventType,
            loanId,
            String(result.error)
          )
        }
      })
    }

    logger.info("Loan approved email notifications sent", {
      loanId,
      treasurers: treasurers.length,
      admins: admins.length,
    })
  }
)

// ---------------------------------------------------------------------------
// Loan near due — remind requester and all leaders
// ---------------------------------------------------------------------------

export const loanNearDueEmailNotifier = inngest.createFunction(
  {
    id: "ikimina-loan-near-due-email-notifier",
    retries: 3,
    concurrency: 4,
    triggers: [loanNearDueEvent],
  },
  async ({ event, step, logger }) => {
    const {
      organizationId,
      loanId,
      requesterId,
      requesterName,
      requesterEmail,
      approvedAmount,
      currency,
      purpose,
      dueDate,
      daysUntilDue,
    } = event.data

    // refId distinguishes 14-day, 7-day, 3-day reminders for the same loan
    const refId = `${loanId}:due-${daysUntilDue}d`

    // ── Guard: skip if loan is already repaid ──────────────────────────────
    const loanStatus = await step.run("check-loan-status", async () => {
      const rows = await db
        .select({ status: loan.status })
        .from(loan)
        .where(eq(loan.id, loanId))
        .limit(1)
      return rows[0]?.status ?? null
    })

    if (loanStatus === "repaid") {
      logger.info("Skipping near-due reminders — loan is already repaid", {
        loanId,
      })
      return
    }

    // ── Member reminder ────────────────────────────────────────────────────
    if (requesterEmail) {
      const memberEventType = "loan_near_due_member" as const

      await step.run("send-near-due-member-reminder", async () => {
        await ensureEmailLogRecord(
          requesterId,
          requesterEmail,
          memberEventType,
          refId
        )

        const status = await getEmailLogStatus(
          requesterId,
          memberEventType,
          refId
        )
        if (status === "sent") return

        const html = await render(
          LoanNearDueReminderEmail({
            recipientName: requesterName,
            recipientRole: "member",
            requesterName,
            loanCode: loanId,
            approvedAmount,
            currency,
            dueDate,
            daysUntilDue,
          })
        )

        const result = await sendEmail({
          to: requesterEmail,
          subject: `Loan repayment due in ${daysUntilDue} day${daysUntilDue !== 1 ? "s" : ""}: ${loanId}`,
          html,
        })

        if (result.success) {
          await markEmailSent(requesterId, memberEventType, refId)
        } else {
          await markEmailFailed(
            requesterId,
            memberEventType,
            refId,
            String(result.error)
          )
        }
      })
    }

    // ── Leadership reminder ────────────────────────────────────────────────
    const leadership = await step.run("resolve-near-due-leadership", () =>
      getLeadershipRecipients(
        organizationId,
        ["admin", "treasurer", "president"],
        requesterId
      )
    )

    if (leadership.length === 0) return

    const leaderEventType = "loan_near_due_leadership" as const

    for (const r of leadership) {
      await step.run(`send-near-due-leader-${r.userId}`, async () => {
        await ensureEmailLogRecord(r.userId, r.email, leaderEventType, refId)

        const status = await getEmailLogStatus(r.userId, leaderEventType, refId)
        if (status === "sent") return

        const html = await render(
          LoanNearDueReminderEmail({
            recipientName: r.name || "Leader",
            recipientRole: r.role,
            requesterName,
            requesterEmail: requesterEmail,
            loanCode: loanId,
            approvedAmount,
            currency,
            dueDate,
            daysUntilDue,
          })
        )

        const result = await sendEmail({
          to: r.email,
          subject: `Loan due in ${daysUntilDue} day${daysUntilDue !== 1 ? "s" : ""} — ${requesterName}: ${loanId}`,
          html,
        })

        if (result.success) {
          await markEmailSent(r.userId, leaderEventType, refId)
        } else {
          await markEmailFailed(
            r.userId,
            leaderEventType,
            refId,
            String(result.error)
          )
        }
      })
    }

    logger.info("Loan near-due reminders sent", {
      loanId,
      daysUntilDue,
      leadershipRecipients: leadership.length,
    })
  }
)

// ---------------------------------------------------------------------------
// Penalty recorded
// ---------------------------------------------------------------------------

export const penaltyRecordedEmailNotifier = inngest.createFunction(
  {
    id: "ikimina-penalty-recorded-email-notifier",
    retries: 3,
    concurrency: 4,
    triggers: [penaltyRecordedEvent],
  },
  async ({ event, step, logger }) => {
    const {
      organizationId,
      penaltyId,
      memberId,
      memberName,
      memberEmail,
      amount,
      currency,
      period,
      reason,
      status,
      notes,
      contributionId,
      issuedByName,
      issuedByRole,
    } = event.data

    // Member confirmation - single recipient, already in its own step
    if (memberEmail) {
      await step.run("send-penalty-member-confirmation", async () => {
        const html = await render(
          PenaltyRecordedConfirmationEmail({
            memberName,
            amount,
            currency,
            period,
            reason,
            status,
            notes,
            contributionId,
            penaltyId,
            issuedByName,
          })
        )

        await sendEmail({
          to: memberEmail,
          subject: `Penalty recorded for period ${period}`,
          html,
        })
      })
    }

    if (issuedByRole !== "treasurer") {
      logger.info(
        "Skipping leadership penalty alerts; issuer role is not treasurer",
        { penaltyId, issuedByRole }
      )
      return
    }

    const leadership = await step.run("resolve-penalty-leadership", () =>
      getLeadershipRecipients(organizationId, ["admin", "president"], memberId)
    )

    if (leadership.length === 0) return

    const eventType = "penalty_recorded_leadership" as const

    // ── One step per leadership recipient ─────────────────────────────────
    for (const r of leadership) {
      await step.run(`send-penalty-alert-${r.userId}`, async () => {
        await ensureEmailLogRecord(r.userId, r.email, eventType, penaltyId)

        const currentStatus = await getEmailLogStatus(
          r.userId,
          eventType,
          penaltyId
        )
        if (currentStatus === "sent") return

        const html = await render(
          PenaltyRecordedNotificationEmail({
            recipientName: r.name || "Leader",
            memberName,
            memberEmail: memberEmail || "N/A",
            amount,
            currency,
            period,
            reason,
            status,
            notes,
            contributionId,
            penaltyId,
            issuedByName,
          })
        )

        const result = await sendEmail({
          to: r.email,
          subject: `Penalty oversight alert: ${memberName}`,
          html,
        })

        if (result.success) {
          await markEmailSent(r.userId, eventType, penaltyId)
        } else {
          await markEmailFailed(
            r.userId,
            eventType,
            penaltyId,
            String(result.error)
          )
        }
      })
    }

    // ── Retry ─────────────────────────────────────────────────────────────
    const failedUserIds = await step.run("find-failed-emails", () =>
      findFailedEmailLogs(eventType, penaltyId)
    )

    if (failedUserIds.length > 0) {
      await step.sleep("wait-before-retry", "5 minutes")

      const leadershipById = new Map(leadership.map((r) => [r.userId, r]))

      for (const userId of failedUserIds) {
        const r = leadershipById.get(userId)
        if (!r) continue

        await step.run(`retry-penalty-alert-${r.userId}`, async () => {
          const currentStatus = await getEmailLogStatus(
            r.userId,
            eventType,
            penaltyId
          )
          if (currentStatus === "sent") return

          const html = await render(
            PenaltyRecordedNotificationEmail({
              recipientName: r.name || "Leader",
              memberName,
              memberEmail: memberEmail || "N/A",
              amount,
              currency,
              period,
              reason,
              status,
              notes,
              contributionId,
              penaltyId,
              issuedByName,
            })
          )

          const result = await sendEmail({
            to: r.email,
            subject: `Penalty oversight alert: ${memberName}`,
            html,
          })

          if (result.success) {
            await markEmailSent(r.userId, eventType, penaltyId)
          } else {
            await markEmailFailed(
              r.userId,
              eventType,
              penaltyId,
              String(result.error)
            )
          }
        })
      }
    }

    logger.info("Penalty notifications sent", {
      penaltyId,
      leadershipRecipients: leadership.length,
      retried: failedUserIds.length,
    })
  }
)
