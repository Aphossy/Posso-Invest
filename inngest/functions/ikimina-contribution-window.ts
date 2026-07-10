import { siteConfig } from "@/constants/site-config"
import { db } from "@/db/connection"
import { penaltyOperations } from "@/db/operations/penalty-operations"
import { contribution, member, organization, user } from "@/db/schemas"
import { ContributionDeadlinePassedMemberEmail } from "@/emails/contribution-deadline-passed-member"
import { ContributionDeadlineSummaryTreasurerEmail } from "@/emails/contribution-deadline-summary-treasurer"
import { ContributionWindowLastDayMemberEmail } from "@/emails/contribution-window-last-day-member"
import { ContributionWindowLastDayTreasurerEmail } from "@/emails/contribution-window-last-day-treasurer"
import { ContributionWindowOpenedMemberEmail } from "@/emails/contribution-window-opened-member"
import { ContributionWindowOpenedTreasurerEmail } from "@/emails/contribution-window-opened-treasurer"
import { ContributionWindowReminderMemberEmail } from "@/emails/contribution-window-reminder-member"
import { ContributionWindowReminderTreasurerEmail } from "@/emails/contribution-window-reminder-treasurer"
import { inngest } from "@/inngest/client"
import {
  ensureEmailLogRecord,
  findFailedEmailLogs,
  getEmailLogStatus,
  markEmailFailed,
  markEmailSent,
} from "@/inngest/email-log-helpers"
import { generateUUID } from "@/utils/generate-id"
import { render } from "@react-email/components"
import { and, eq, inArray } from "drizzle-orm"

import sendEmail from "@/lib/send-email"

import ContributionWindowLeadershipEmail from "../../emails/contribution-window-leadership"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type MemberRow = {
  userId: string
  name: string
  email: string
  role: string
}

type ContributionStatusRow = {
  memberId: string
  status: string
}

// ---------------------------------------------------------------------------
// Email event type constants
// ---------------------------------------------------------------------------

const EMAIL_EVENT = {
  OPENED: "contribution_window_opened",
  REMINDER: "contribution_window_reminder",
  LAST_DAY: "contribution_window_last_day",
  DEADLINE_PASSED: "contribution_deadline_passed",
} as const

// ---------------------------------------------------------------------------
// Date / period helpers
// ---------------------------------------------------------------------------

function getCurrentPeriod(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Kigali",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date())
  const year = parts.find((p) => p.type === "year")?.value ?? ""
  const month = parts.find((p) => p.type === "month")?.value ?? ""
  return `${year}-${month}`
}

function getPreviousPeriod(): string {
  const now = new Date()
  const kigaliStr = now.toLocaleString("en-US", { timeZone: "Africa/Kigali" })
  const kigali = new Date(kigaliStr)
  const prev = new Date(kigali.getFullYear(), kigali.getMonth() - 1, 1)
  const year = prev.getFullYear()
  const month = String(prev.getMonth() + 1).padStart(2, "0")
  return `${year}-${month}`
}

function periodLabel(period: string): string {
  const [y, m] = period.split("-")
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("en-RW", {
    month: "long",
    year: "numeric",
  })
}

function fmtDate(date: Date): string {
  return date.toLocaleDateString("en-RW", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Africa/Kigali",
  })
}

function getWindowDates(period: string): {
  windowStart: string
  windowEnd: string
  daysRemainingFromNow: number
} {
  const [y, m] = period.split("-").map(Number)
  const windowStartDate = new Date(y, m - 1, 25)
  const windowEndDate = new Date(y, m, 6)
  const nowMs = Date.now()
  const daysRemainingFromNow = Math.max(
    0,
    Math.ceil((windowEndDate.getTime() - nowMs) / (1000 * 60 * 60 * 24))
  )
  return {
    windowStart: fmtDate(windowStartDate),
    windowEnd: fmtDate(windowEndDate),
    daysRemainingFromNow,
  }
}

function fmtAmount(n: number): string {
  return n.toLocaleString("en-RW")
}

// ---------------------------------------------------------------------------
// Shared DB helpers
// ---------------------------------------------------------------------------

async function resolveOrganizationId(): Promise<string> {
  const rows = await db
    .select({ id: organization.id })
    .from(organization)
    .limit(1)
  if (!rows[0]) throw new Error("No organization found in database")
  return rows[0].id
}

async function loadContributionMembers(
  organizationId: string
): Promise<MemberRow[]> {
  const rows = await db
    .select({
      userId: user.id,
      name: user.name,
      email: user.email,
      role: member.role,
    })
    .from(member)
    .innerJoin(user, eq(member.userId, user.id))
    .where(
      and(eq(member.organizationId, organizationId), eq(member.role, "member"))
    )

  const deduped = new Map<string, MemberRow>()
  for (const r of rows) {
    if (r.email) deduped.set(r.userId, r)
  }
  return [...deduped.values()]
}

async function loadTreasurers(organizationId: string): Promise<MemberRow[]> {
  const rows = await db
    .select({
      userId: user.id,
      name: user.name,
      email: user.email,
      role: member.role,
    })
    .from(member)
    .innerJoin(user, eq(member.userId, user.id))
    .where(
      and(
        eq(member.organizationId, organizationId),
        eq(member.role, "treasurer")
      )
    )
  return rows.filter((r: { email: any }) => Boolean(r.email))
}

async function loadLeadership(organizationId: string): Promise<MemberRow[]> {
  const rows = await db
    .select({
      userId: user.id,
      name: user.name,
      email: user.email,
      role: member.role,
    })
    .from(member)
    .innerJoin(user, eq(member.userId, user.id))
    .where(
      and(
        eq(member.organizationId, organizationId),
        inArray(member.role, ["admin", "president", "secretary"])
      )
    )
  return rows.filter((r: { email: any }) => Boolean(r.email))
}

async function loadContributionsForPeriod(
  period: string,
  memberIds: string[]
): Promise<ContributionStatusRow[]> {
  if (memberIds.length === 0) return []
  return db
    .select({ memberId: contribution.memberId, status: contribution.status })
    .from(contribution)
    .where(
      and(
        eq(contribution.period, period),
        inArray(contribution.memberId, memberIds)
      )
    )
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const { monthlyContributionRwf, latePenaltyRate } = siteConfig.platform.savings
const CURRENCY = "RWF"
const PENALTY_AMOUNT = Math.round(monthlyContributionRwf * latePenaltyRate)
const PENALTY_RATE_LABEL = `${Math.round(latePenaltyRate * 100)}%`
const SETTLED_STATUSES = ["confirmed", "late", "waived"]

// Marker stored in penalty.notes so the deadline sweep can recognise (and avoid
// re-creating) the auto-generated late penalty for a given member + period.
const AUTO_LATE_PENALTY_MARKER = "auto:late_contribution"

/**
 * Create an `active` late penalty for each overdue member, once per period.
 * Idempotent: skips members who already have an auto-generated late penalty for
 * the period, so reruns / retries never double-charge.
 */
async function applyLatePenalties(
  organizationId: string,
  period: string,
  label: string,
  overdueMembers: MemberRow[]
): Promise<number> {
  let created = 0
  for (const m of overdueMembers) {
    const existing = await penaltyOperations.findMany({
      filters: { memberId: m.userId, period },
      limit: 50,
    })
    const alreadyApplied = existing.some((p) =>
      (p.notes ?? "").includes(AUTO_LATE_PENALTY_MARKER)
    )
    if (alreadyApplied) continue

    await penaltyOperations.create({
      id: generateUUID(),
      organizationId,
      memberId: m.userId,
      amount: String(PENALTY_AMOUNT),
      currency: CURRENCY,
      status: "active",
      reason: `Late contribution payment for ${label}`,
      notes: AUTO_LATE_PENALTY_MARKER,
      period,
    })
    created++
  }
  return created
}

// ---------------------------------------------------------------------------
// Function 1 - Window opened (cron: 25th of every month)
// ---------------------------------------------------------------------------

export const contributionWindowOpenedNotifier = inngest.createFunction(
  {
    id: "ikimina-contribution-window-opened-notifier",
    retries: 3,
    concurrency: 1,
    triggers: [{ cron: "TZ=Africa/Kigali 0 8 25 * *" }],
  },
  async ({ step, notificationOperations, logger }) => {
    const period = await step.run("resolve-period", getCurrentPeriod)
    const orgId = await step.run("resolve-organization", resolveOrganizationId)
    const label = periodLabel(period)
    const { windowStart, windowEnd, daysRemainingFromNow } =
      getWindowDates(period)

    const members = await step.run("load-contribution-members", () =>
      loadContributionMembers(orgId)
    )
    const treasurers = await step.run("load-treasurers", () =>
      loadTreasurers(orgId)
    )
    const leadership = await step.run("load-leadership", () =>
      loadLeadership(orgId)
    )

    if (members.length === 0) {
      logger.info("No members found for window-opened notification", { period })
      return { period, notified: 0 }
    }

    const eventType = EMAIL_EVENT.OPENED

    // ── Initial send ──────────────────────────────────────────────────────
    // One Inngest step per member so each is independently memoised and
    // retried. The status check inside each step is the hard deduplication
    // guard: a member whose log already shows "sent" will never be emailed
    // again, even on replays or retries.

    for (const m of members) {
      await step.run(`send-email-${m.userId}`, async () => {
        await ensureEmailLogRecord(m.userId, m.email, eventType, period)

        const status = await getEmailLogStatus(m.userId, eventType, period)
        if (status === "sent") return // already delivered - skip

        const html = await render(
          ContributionWindowOpenedMemberEmail({
            memberName: m.name || "Member",
            period,
            periodLabel: label,
            windowStart,
            windowEnd,
            daysRemaining: daysRemainingFromNow,
            amountDue: fmtAmount(monthlyContributionRwf),
            currency: CURRENCY,
          })
        )

        const result = await sendEmail({
          to: m.email,
          subject: `Contribution window for ${label} is now open`,
          html,
        })

        if (result.success) {
          await markEmailSent(m.userId, eventType, period)
        } else {
          await markEmailFailed(
            m.userId,
            eventType,
            period,
            String(result.error)
          )
        }
      })
    }

    // ── Retry failed emails after a pause ────────────────────────────────
    // We query the log table (not in-memory state) so the retry decision is
    // based on ground truth even if the function was interrupted earlier.

    const failedUserIds = await step.run("find-failed-emails", () =>
      findFailedEmailLogs(eventType, period)
    )

    if (failedUserIds.length > 0) {
      logger.info("Some emails failed - will retry after pause", {
        period,
        count: failedUserIds.length,
      })

      await step.sleep("wait-before-retry", "5 minutes")

      const memberById = new Map(members.map((m) => [m.userId, m]))

      for (const userId of failedUserIds) {
        const m = memberById.get(userId)
        if (!m) continue

        await step.run(`retry-email-${m.userId}`, async () => {
          // Re-check status - a concurrent fix or previous retry may have
          // already delivered this email.
          const status = await getEmailLogStatus(m.userId, eventType, period)
          if (status === "sent") return

          const html = await render(
            ContributionWindowOpenedMemberEmail({
              memberName: m.name || "Member",
              period,
              periodLabel: label,
              windowStart,
              windowEnd,
              daysRemaining: daysRemainingFromNow,
              amountDue: fmtAmount(monthlyContributionRwf),
              currency: CURRENCY,
            })
          )

          const result = await sendEmail({
            to: m.email,
            subject: `Contribution window for ${label} is now open`,
            html,
          })

          if (result.success) {
            await markEmailSent(m.userId, eventType, period)
          } else {
            await markEmailFailed(
              m.userId,
              eventType,
              period,
              String(result.error)
            )
          }
        })
      }
    }

    // ── In-app notifications ───────────────────────────────────────────────
    await step.run("create-member-notifications", async () => {
      const notifications = members.map((m) => ({
        id: generateUUID(),
        userId: m.userId,
        type: "contribution" as const,
        title: `Contribution window open - ${label}`,
        message: `The ${label} contribution window is now open. Pay ${CURRENCY} ${fmtAmount(monthlyContributionRwf)} before ${windowEnd}.`,
        channel: "in_app" as const,
        actionUrl: "/member/contributions",
        actionLabel: "View Contributions",
        relatedType: "contribution_window",
        relatedId: period,
        isRead: false,
        isArchived: false,
        priority: "normal" as const,
      }))
      if (notifications.length > 0) {
        await notificationOperations.bulkCreate(notifications)
      }
    })

    // ── Treasurer email ───────────────────────────────────────────────────
    if (treasurers.length > 0) {
      await step.run("send-treasurer-email", async () => {
        const totalExpected = monthlyContributionRwf * members.length
        const memberList = members.map((m) => ({
          name: m.name || "Member",
          email: m.email,
        }))
        await Promise.allSettled([
          ...treasurers.map(async (t) => {
            const html = await render(
              ContributionWindowOpenedTreasurerEmail({
                treasurerName: t.name || "Treasurer",
                period,
                periodLabel: label,
                windowStart,
                windowEnd,
                daysRemaining: daysRemainingFromNow,
                totalMembers: members.length,
                members: memberList,
                amountPerMember: fmtAmount(monthlyContributionRwf),
                totalExpected: fmtAmount(totalExpected),
                currency: CURRENCY,
              })
            )
            await sendEmail({
              to: t.email,
              subject: `[Treasurer] Contribution window opened - ${label}`,
              html,
            })
          }),
          ...leadership.map(async (l) => {
            const html = await render(
              ContributionWindowLeadershipEmail({
                leaderName: l.name || "Leader",
                period,
                periodLabel: label,
                windowEnd,
                daysRemaining: daysRemainingFromNow,
                totalMembers: members.length,
                paidCount: 0,
                unpaidMembers: memberList,
                amountCollected: fmtAmount(0),
                amountExpected: fmtAmount(totalExpected),
                currency: CURRENCY,
              })
            )
            await sendEmail({
              to: l.email,
              subject: `[Leadership] Contribution window opened - ${label}`,
              html,
            })
          }),
        ])
      })
    }

    logger.info("Window opened notifications sent", {
      period,
      members: members.length,
      retried: failedUserIds.length,
    })
    return { period, notified: members.length }
  }
)

// ---------------------------------------------------------------------------
// Function 2 - 3-day reminder (cron: 3rd of every month)
// ---------------------------------------------------------------------------

export const contributionWindowReminderNotifier = inngest.createFunction(
  {
    id: "ikimina-contribution-window-reminder-notifier",
    retries: 3,
    concurrency: 1,
    triggers: [{ cron: "TZ=Africa/Kigali 0 8 3 * *" }],
  },
  async ({ step, notificationOperations, logger }) => {
    const period = await step.run("resolve-period", getPreviousPeriod)
    const orgId = await step.run("resolve-organization", resolveOrganizationId)
    const label = periodLabel(period)
    const { windowEnd, daysRemainingFromNow } = getWindowDates(period)

    const members = await step.run("load-contribution-members", () =>
      loadContributionMembers(orgId)
    )
    const treasurers = await step.run("load-treasurers", () =>
      loadTreasurers(orgId)
    )
    const leadership = await step.run("load-leadership", () =>
      loadLeadership(orgId)
    )

    if (members.length === 0) {
      logger.info("No members found for window reminder", { period })
      return { period, reminders: 0 }
    }

    const memberIds = members.map((m) => m.userId)
    const contributions = await step.run("load-contributions", () =>
      loadContributionsForPeriod(period, memberIds)
    )

    const settledIds = new Set(
      contributions
        .filter((c) => SETTLED_STATUSES.includes(c.status))
        .map((c) => c.memberId)
    )

    const unpaidMembers = members.filter((m) => !settledIds.has(m.userId))
    const paidCount = members.length - unpaidMembers.length

    if (unpaidMembers.length === 0) {
      logger.info("All members paid - skipping reminder", { period })
      return { period, reminders: 0 }
    }

    const eventType = EMAIL_EVENT.REMINDER

    // ── Initial send ──────────────────────────────────────────────────────
    for (const m of unpaidMembers) {
      await step.run(`send-reminder-email-${m.userId}`, async () => {
        await ensureEmailLogRecord(m.userId, m.email, eventType, period)

        const status = await getEmailLogStatus(m.userId, eventType, period)
        if (status === "sent") return

        const html = await render(
          ContributionWindowReminderMemberEmail({
            memberName: m.name || "Member",
            period,
            periodLabel: label,
            windowEnd,
            daysRemaining: daysRemainingFromNow,
            amountDue: fmtAmount(monthlyContributionRwf),
            penaltyAmount: fmtAmount(PENALTY_AMOUNT),
            currency: CURRENCY,
          })
        )

        const result = await sendEmail({
          to: m.email,
          subject: `Reminder: ${daysRemainingFromNow} days left to pay your ${label} contribution`,
          html,
        })

        if (result.success) {
          await markEmailSent(m.userId, eventType, period)
        } else {
          await markEmailFailed(
            m.userId,
            eventType,
            period,
            String(result.error)
          )
        }
      })
    }

    // ── Retry ─────────────────────────────────────────────────────────────
    const failedUserIds = await step.run("find-failed-emails", () =>
      findFailedEmailLogs(eventType, period)
    )

    if (failedUserIds.length > 0) {
      logger.info("Retrying failed reminder emails", {
        period,
        count: failedUserIds.length,
      })

      await step.sleep("wait-before-retry", "5 minutes")

      const memberById = new Map(unpaidMembers.map((m) => [m.userId, m]))

      for (const userId of failedUserIds) {
        const m = memberById.get(userId)
        if (!m) continue

        await step.run(`retry-reminder-email-${m.userId}`, async () => {
          const status = await getEmailLogStatus(m.userId, eventType, period)
          if (status === "sent") return

          const html = await render(
            ContributionWindowReminderMemberEmail({
              memberName: m.name || "Member",
              period,
              periodLabel: label,
              windowEnd,
              daysRemaining: daysRemainingFromNow,
              amountDue: fmtAmount(monthlyContributionRwf),
              penaltyAmount: fmtAmount(PENALTY_AMOUNT),
              currency: CURRENCY,
            })
          )

          const result = await sendEmail({
            to: m.email,
            subject: `Reminder: ${daysRemainingFromNow} days left to pay your ${label} contribution`,
            html,
          })

          if (result.success) {
            await markEmailSent(m.userId, eventType, period)
          } else {
            await markEmailFailed(
              m.userId,
              eventType,
              period,
              String(result.error)
            )
          }
        })
      }
    }

    // ── In-app notifications ───────────────────────────────────────────────
    await step.run("create-reminder-notifications", async () => {
      const notifications = unpaidMembers.map((m) => ({
        id: generateUUID(),
        userId: m.userId,
        type: "contribution" as const,
        title: `${daysRemainingFromNow} days left - ${label} contribution`,
        message: `Reminder: pay ${CURRENCY} ${fmtAmount(monthlyContributionRwf)} before ${windowEnd}. A ${PENALTY_RATE_LABEL} penalty applies after the deadline.`,
        channel: "in_app" as const,
        actionUrl: "/member/contributions",
        actionLabel: "Pay Now",
        relatedType: "contribution_window",
        relatedId: period,
        isRead: false,
        isArchived: false,
        priority: "high" as const,
      }))
      if (notifications.length > 0) {
        await notificationOperations.bulkCreate(notifications)
      }
    })

    // ── Treasurer summary ─────────────────────────────────────────────────
    if (treasurers.length > 0) {
      await step.run("send-treasurer-reminder", async () => {
        const amountCollected = fmtAmount(paidCount * monthlyContributionRwf)
        const amountExpected = fmtAmount(
          members.length * monthlyContributionRwf
        )
        const unpaidList = unpaidMembers.map((m) => ({
          name: m.name || "Member",
          email: m.email,
        }))
        await Promise.allSettled([
          ...treasurers.map(async (t) => {
            const html = await render(
              ContributionWindowReminderTreasurerEmail({
                treasurerName: t.name || "Treasurer",
                period,
                periodLabel: label,
                windowEnd,
                daysRemaining: daysRemainingFromNow,
                totalMembers: members.length,
                paidCount,
                unpaidMembers: unpaidList,
                amountCollected,
                amountExpected,
                currency: CURRENCY,
              })
            )
            await sendEmail({
              to: t.email,
              subject: `[Treasurer] ${daysRemainingFromNow} days left - ${unpaidMembers.length} members unpaid (${label})`,
              html,
            })
          }),
          ...leadership.map(async (l) => {
            const html = await render(
              ContributionWindowLeadershipEmail({
                leaderName: l.name || "Leader",
                period,
                periodLabel: label,
                windowEnd,
                daysRemaining: daysRemainingFromNow,
                totalMembers: members.length,
                paidCount,
                unpaidMembers: unpaidList,
                amountCollected,
                amountExpected,
                currency: CURRENCY,
              })
            )
            await sendEmail({
              to: l.email,
              subject: `[Leadership] ${daysRemainingFromNow} days left - ${unpaidMembers.length} members unpaid (${label})`,
              html,
            })
          }),
        ])
      })
    }

    logger.info("Reminder notifications sent", {
      period,
      unpaid: unpaidMembers.length,
      retried: failedUserIds.length,
    })
    return { period, reminders: unpaidMembers.length }
  }
)

// ---------------------------------------------------------------------------
// Function 3 - Last day (cron: 6th of every month)
// ---------------------------------------------------------------------------

export const contributionWindowLastDayNotifier = inngest.createFunction(
  {
    id: "ikimina-contribution-window-last-day-notifier",
    retries: 3,
    concurrency: 1,
    triggers: [{ cron: "TZ=Africa/Kigali 0 8 6 * *" }],
  },
  async ({ step, notificationOperations, logger }) => {
    const period = await step.run("resolve-period", getPreviousPeriod)
    const orgId = await step.run("resolve-organization", resolveOrganizationId)
    const label = periodLabel(period)
    const { windowEnd } = getWindowDates(period)

    const members = await step.run("load-contribution-members", () =>
      loadContributionMembers(orgId)
    )
    const treasurers = await step.run("load-treasurers", () =>
      loadTreasurers(orgId)
    )
    const leadership = await step.run("load-leadership", () =>
      loadLeadership(orgId)
    )

    if (members.length === 0) {
      logger.info("No members found for last-day notification", { period })
      return { period, notified: 0 }
    }

    const memberIds = members.map((m) => m.userId)
    const contributions = await step.run("load-contributions", () =>
      loadContributionsForPeriod(period, memberIds)
    )

    const settledIds = new Set(
      contributions
        .filter((c) => SETTLED_STATUSES.includes(c.status))
        .map((c) => c.memberId)
    )

    const unpaidMembers = members.filter((m) => !settledIds.has(m.userId))
    const paidCount = members.length - unpaidMembers.length

    if (unpaidMembers.length === 0) {
      logger.info("All members paid - skipping last-day alert", { period })
      return { period, notified: 0 }
    }

    const totalIfLate = monthlyContributionRwf + PENALTY_AMOUNT
    const eventType = EMAIL_EVENT.LAST_DAY

    // ── Initial send ──────────────────────────────────────────────────────
    for (const m of unpaidMembers) {
      await step.run(`send-last-day-email-${m.userId}`, async () => {
        await ensureEmailLogRecord(m.userId, m.email, eventType, period)

        const status = await getEmailLogStatus(m.userId, eventType, period)
        if (status === "sent") return

        const html = await render(
          ContributionWindowLastDayMemberEmail({
            memberName: m.name || "Member",
            period,
            periodLabel: label,
            windowEnd,
            amountDue: fmtAmount(monthlyContributionRwf),
            penaltyAmount: fmtAmount(PENALTY_AMOUNT),
            totalIfLate: fmtAmount(totalIfLate),
            currency: CURRENCY,
          })
        )

        const result = await sendEmail({
          to: m.email,
          subject: `🚨 Last day to pay your ${label} contribution - pay now or face a penalty`,
          html,
        })

        if (result.success) {
          await markEmailSent(m.userId, eventType, period)
        } else {
          await markEmailFailed(
            m.userId,
            eventType,
            period,
            String(result.error)
          )
        }
      })
    }

    // ── Retry ─────────────────────────────────────────────────────────────
    const failedUserIds = await step.run("find-failed-emails", () =>
      findFailedEmailLogs(eventType, period)
    )

    if (failedUserIds.length > 0) {
      logger.info("Retrying failed last-day emails", {
        period,
        count: failedUserIds.length,
      })

      await step.sleep("wait-before-retry", "5 minutes")

      const memberById = new Map(unpaidMembers.map((m) => [m.userId, m]))

      for (const userId of failedUserIds) {
        const m = memberById.get(userId)
        if (!m) continue

        await step.run(`retry-last-day-email-${m.userId}`, async () => {
          const status = await getEmailLogStatus(m.userId, eventType, period)
          if (status === "sent") return

          const html = await render(
            ContributionWindowLastDayMemberEmail({
              memberName: m.name || "Member",
              period,
              periodLabel: label,
              windowEnd,
              amountDue: fmtAmount(monthlyContributionRwf),
              penaltyAmount: fmtAmount(PENALTY_AMOUNT),
              totalIfLate: fmtAmount(totalIfLate),
              currency: CURRENCY,
            })
          )

          const result = await sendEmail({
            to: m.email,
            subject: `🚨 Last day to pay your ${label} contribution - pay now or face a penalty`,
            html,
          })

          if (result.success) {
            await markEmailSent(m.userId, eventType, period)
          } else {
            await markEmailFailed(
              m.userId,
              eventType,
              period,
              String(result.error)
            )
          }
        })
      }
    }

    // ── In-app notifications ───────────────────────────────────────────────
    await step.run("create-last-day-notifications", async () => {
      const notifications = unpaidMembers.map((m) => ({
        id: generateUUID(),
        userId: m.userId,
        type: "contribution" as const,
        title: `Last day - ${label} contribution`,
        message: `Today is the last day to pay your ${label} contribution (${CURRENCY} ${fmtAmount(monthlyContributionRwf)}). A ${PENALTY_RATE_LABEL} penalty applies if you miss the deadline.`,
        channel: "in_app" as const,
        actionUrl: "/member/contributions",
        actionLabel: "Pay Now",
        relatedType: "contribution_window",
        relatedId: period,
        isRead: false,
        isArchived: false,
        priority: "urgent" as const,
      }))
      if (notifications.length > 0) {
        await notificationOperations.bulkCreate(notifications)
      }
    })

    // ── Treasurer summary ─────────────────────────────────────────────────
    if (treasurers.length > 0) {
      await step.run("send-last-day-treasurer", async () => {
        const amountCollected = fmtAmount(paidCount * monthlyContributionRwf)
        const amountRemaining = fmtAmount(
          unpaidMembers.length * monthlyContributionRwf
        )
        const totalExpected = fmtAmount(members.length * monthlyContributionRwf)
        const unpaidList = unpaidMembers.map((m) => ({
          name: m.name || "Member",
          email: m.email,
        }))
        await Promise.allSettled([
          ...treasurers.map(async (t) => {
            const html = await render(
              ContributionWindowLastDayTreasurerEmail({
                treasurerName: t.name || "Treasurer",
                period,
                periodLabel: label,
                windowEnd,
                totalMembers: members.length,
                paidCount,
                unpaidMembers: unpaidList,
                amountCollected,
                amountRemaining,
                totalExpected,
                penaltyPerMember: fmtAmount(PENALTY_AMOUNT),
                currency: CURRENCY,
              })
            )
            await sendEmail({
              to: t.email,
              subject: `[Treasurer] 🚨 Last day - ${unpaidMembers.length} members still unpaid (${label})`,
              html,
            })
          }),
          ...leadership.map(async (l) => {
            const html = await render(
              ContributionWindowLeadershipEmail({
                leaderName: l.name || "Leader",
                period,
                periodLabel: label,
                windowEnd,
                daysRemaining: 1,
                totalMembers: members.length,
                paidCount,
                unpaidMembers: unpaidList,
                amountCollected,
                amountExpected: totalExpected,
                currency: CURRENCY,
              })
            )
            await sendEmail({
              to: l.email,
              subject: `[Leadership] 🚨 Last day - ${unpaidMembers.length} members still unpaid (${label})`,
              html,
            })
          }),
        ])
      })
    }

    logger.info("Last-day notifications sent", {
      period,
      unpaid: unpaidMembers.length,
      retried: failedUserIds.length,
    })
    return { period, notified: unpaidMembers.length }
  }
)

// ---------------------------------------------------------------------------
// Function 4 - Deadline passed (cron: 7th of every month)
// ---------------------------------------------------------------------------

export const contributionDeadlinePassedNotifier = inngest.createFunction(
  {
    id: "ikimina-contribution-deadline-passed-notifier",
    retries: 3,
    concurrency: 1,
    triggers: [{ cron: "TZ=Africa/Kigali 0 8 7 * *" }],
  },
  async ({ step, notificationOperations, logger }) => {
    const period = await step.run("resolve-period", getPreviousPeriod)
    const orgId = await step.run("resolve-organization", resolveOrganizationId)
    const label = periodLabel(period)
    const { windowEnd } = getWindowDates(period)

    const members = await step.run("load-contribution-members", () =>
      loadContributionMembers(orgId)
    )
    const treasurers = await step.run("load-treasurers", () =>
      loadTreasurers(orgId)
    )
    const leadership = await step.run("load-leadership", () =>
      loadLeadership(orgId)
    )

    if (members.length === 0) {
      logger.info("No members found for deadline-passed notification", {
        period,
      })
      return { period, overdue: 0 }
    }

    const memberIds = members.map((m) => m.userId)
    const contributions = await step.run("load-contributions", () =>
      loadContributionsForPeriod(period, memberIds)
    )

    const settledIds = new Set(
      contributions
        .filter((c) => SETTLED_STATUSES.includes(c.status))
        .map((c) => c.memberId)
    )

    const overdueMembers = members.filter((m) => !settledIds.has(m.userId))
    const paidOnTimeCount = members.length - overdueMembers.length

    if (overdueMembers.length === 0) {
      logger.info("All members paid - no deadline-passed alerts needed", {
        period,
      })
      return { period, overdue: 0 }
    }

    const totalDue = monthlyContributionRwf + PENALTY_AMOUNT
    const eventType = EMAIL_EVENT.DEADLINE_PASSED

    // ── Apply late penalties ───────────────────────────────────────────────
    // Persist the penalty before any "penalty applied" messaging goes out, so
    // the emails and notifications below reflect real ledger state.
    const penaltiesCreated = await step.run("apply-late-penalties", () =>
      applyLatePenalties(orgId, period, label, overdueMembers)
    )

    logger.info("Late penalties applied", { period, penaltiesCreated })

    // ── Initial send ──────────────────────────────────────────────────────
    for (const m of overdueMembers) {
      await step.run(`send-overdue-email-${m.userId}`, async () => {
        await ensureEmailLogRecord(m.userId, m.email, eventType, period)

        const status = await getEmailLogStatus(m.userId, eventType, period)
        if (status === "sent") return

        const html = await render(
          ContributionDeadlinePassedMemberEmail({
            memberName: m.name || "Member",
            period,
            periodLabel: label,
            windowEndedOn: windowEnd,
            amountDue: fmtAmount(monthlyContributionRwf),
            penaltyAmount: fmtAmount(PENALTY_AMOUNT),
            totalDue: fmtAmount(totalDue),
            penaltyRate: PENALTY_RATE_LABEL,
            currency: CURRENCY,
          })
        )

        const result = await sendEmail({
          to: m.email,
          subject: `Overdue: Your ${label} contribution is past due - penalty applied`,
          html,
        })

        if (result.success) {
          await markEmailSent(m.userId, eventType, period)
        } else {
          await markEmailFailed(
            m.userId,
            eventType,
            period,
            String(result.error)
          )
        }
      })
    }

    // ── Retry ─────────────────────────────────────────────────────────────
    const failedUserIds = await step.run("find-failed-emails", () =>
      findFailedEmailLogs(eventType, period)
    )

    if (failedUserIds.length > 0) {
      logger.info("Retrying failed overdue emails", {
        period,
        count: failedUserIds.length,
      })

      await step.sleep("wait-before-retry", "5 minutes")

      const memberById = new Map(overdueMembers.map((m) => [m.userId, m]))

      for (const userId of failedUserIds) {
        const m = memberById.get(userId)
        if (!m) continue

        await step.run(`retry-overdue-email-${m.userId}`, async () => {
          const status = await getEmailLogStatus(m.userId, eventType, period)
          if (status === "sent") return

          const html = await render(
            ContributionDeadlinePassedMemberEmail({
              memberName: m.name || "Member",
              period,
              periodLabel: label,
              windowEndedOn: windowEnd,
              amountDue: fmtAmount(monthlyContributionRwf),
              penaltyAmount: fmtAmount(PENALTY_AMOUNT),
              totalDue: fmtAmount(totalDue),
              penaltyRate: PENALTY_RATE_LABEL,
              currency: CURRENCY,
            })
          )

          const result = await sendEmail({
            to: m.email,
            subject: `Overdue: Your ${label} contribution is past due - penalty applied`,
            html,
          })

          if (result.success) {
            await markEmailSent(m.userId, eventType, period)
          } else {
            await markEmailFailed(
              m.userId,
              eventType,
              period,
              String(result.error)
            )
          }
        })
      }
    }

    // ── In-app notifications ───────────────────────────────────────────────
    await step.run("create-overdue-notifications", async () => {
      const notifications = overdueMembers.map((m) => ({
        id: generateUUID(),
        userId: m.userId,
        type: "penalty" as const,
        title: `Overdue contribution - ${label}`,
        message: `Your ${label} contribution is overdue. A ${PENALTY_RATE_LABEL} penalty (${CURRENCY} ${fmtAmount(PENALTY_AMOUNT)}) has been applied. Total due: ${CURRENCY} ${fmtAmount(totalDue)}.`,
        channel: "in_app" as const,
        actionUrl: "/member/contributions",
        actionLabel: "View Details",
        relatedType: "contribution_window",
        relatedId: period,
        isRead: false,
        isArchived: false,
        priority: "urgent" as const,
      }))
      if (notifications.length > 0) {
        await notificationOperations.bulkCreate(notifications)
      }
    })

    // ── Treasurer summary ─────────────────────────────────────────────────
    if (treasurers.length > 0) {
      await step.run("send-summary-to-treasurer", async () => {
        const totalCollected = fmtAmount(
          paidOnTimeCount * monthlyContributionRwf
        )
        const totalPending = fmtAmount(
          overdueMembers.length * monthlyContributionRwf
        )
        const totalExpected = fmtAmount(members.length * monthlyContributionRwf)
        const totalPenalties = fmtAmount(overdueMembers.length * PENALTY_AMOUNT)
        const overdueList = overdueMembers.map((m) => ({
          name: m.name || "Member",
          email: m.email,
          penaltyAmount: fmtAmount(PENALTY_AMOUNT),
        }))

        await Promise.allSettled([
          ...treasurers.map(async (t) => {
            const html = await render(
              ContributionDeadlineSummaryTreasurerEmail({
                treasurerName: t.name || "Treasurer",
                period,
                periodLabel: label,
                windowEndedOn: windowEnd,
                totalMembers: members.length,
                paidOnTimeCount,
                overdueMembers: overdueList,
                totalCollected,
                totalPending,
                totalExpected,
                totalPenalties,
                currency: CURRENCY,
              })
            )
            await sendEmail({
              to: t.email,
              subject: `[Treasurer] Window closed summary - ${label} (${overdueMembers.length} overdue)`,
              html,
            })
          }),
          ...leadership.map(async (l) => {
            const html = await render(
              ContributionWindowLeadershipEmail({
                leaderName: l.name || "Leader",
                period,
                periodLabel: label,
                windowEnd,
                daysRemaining: 0,
                totalMembers: members.length,
                paidCount: paidOnTimeCount,
                unpaidMembers: overdueList,
                amountCollected: totalCollected,
                amountExpected: totalExpected,
                currency: CURRENCY,
              })
            )
            await sendEmail({
              to: l.email,
              subject: `[Leadership] Window closed summary - ${label} (${overdueMembers.length} overdue)`,
              html,
            })
          }),
        ])
      })
    }

    logger.info("Deadline-passed notifications sent", {
      period,
      overdue: overdueMembers.length,
      paidOnTime: paidOnTimeCount,
      penaltiesCreated,
      retried: failedUserIds.length,
    })
    return {
      period,
      overdue: overdueMembers.length,
      paidOnTime: paidOnTimeCount,
      penaltiesCreated,
    }
  }
)
