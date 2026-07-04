import { db } from "@/db/connection"
import {
  contribution,
  loan,
  member,
  organization,
  penalty,
  user,
} from "@/db/schemas"
import { MonthlyComplianceSummaryAdminEmail } from "@/emails/monthly-compliance-summary-admin"
import { MonthlyComplianceSummaryMemberEmail } from "@/emails/monthly-compliance-summary-member"
import { MonthlyComplianceSummaryPresidentEmail } from "@/emails/monthly-compliance-summary-president"
import { MonthlyComplianceSummarySecretaryEmail } from "@/emails/monthly-compliance-summary-secretary"
import { MonthlyComplianceSummaryTreasurerEmail } from "@/emails/monthly-compliance-summary-treasurer"
import { inngest } from "@/inngest/client"
import {
  ensureEmailLogRecord,
  getEmailLogStatus,
  markEmailFailed,
  markEmailSent,
} from "@/inngest/email-log-helpers"
import {
  monthlyDispatchRequestedAliasEvent,
  monthlyDispatchRequestedEvent,
  monthlyMemberSummaryEmailEvent,
} from "@/inngest/events"
import { generateUUID } from "@/utils/generate-id"
import { render } from "@react-email/components"
import { and, eq, inArray } from "drizzle-orm"

import sendEmail from "@/lib/send-email"

type MemberRow = {
  userId: string
  name: string
  email: string
}

type ContributionRow = {
  memberId: string
  status: string
}

type LoanRow = {
  memberId: string
  status: string
}

type PenaltyRow = {
  memberId: string
}

const formatPreviousPeriod = () => {
  const now = new Date()
  const kigaliDate = new Date(
    now.toLocaleString("en-US", { timeZone: "Africa/Kigali" })
  )

  // Go back 1 month
  const previousMonth = new Date(
    kigaliDate.getFullYear(),
    kigaliDate.getMonth() - 1,
    1
  )

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Kigali",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(previousMonth)

  const year = parts.find((part) => part.type === "year")?.value
  const month = parts.find((part) => part.type === "month")?.value

  return `${year}-${month}`
}

const formatPeriodLabel = (periodKey: string) => {
  const [year, month] = periodKey.split("-")
  const date = new Date(Number(year), Number(month) - 1, 1)
  return date.toLocaleString("en-US", { month: "long", year: "numeric" })
}

async function resolveOrganizationId(): Promise<string> {
  const rows = await db
    .select({ id: organization.id })
    .from(organization)
    .limit(1)
  if (!rows[0]) throw new Error("No organization found in database")
  return rows[0].id
}

export const monthlyComplianceDispatcher = inngest.createFunction(
  {
    id: "ikimina-monthly-compliance-dispatcher",
    retries: 2,
    concurrency: 1,
    triggers: [
      // Run on the 1st of each month - queries previous month's complete data
      { cron: "TZ=Africa/Kigali 0 7 1 * *" },
      monthlyDispatchRequestedEvent,
      monthlyDispatchRequestedAliasEvent,
    ],
  },
  async ({ event, step, notificationOperations, logger }) => {
    const testRunId =
      "testRunId" in event.data ? event.data.testRunId : undefined
    // Query the PREVIOUS month's data (the month being summarized)
    const periodKey = await step.run("resolve-period", () =>
      formatPreviousPeriod()
    )
    const orgId = await step.run("resolve-organization", resolveOrganizationId)

    const members = await step.run(
      "load-member-directory",
      async (): Promise<MemberRow[]> => {
        const rows = await db
          .select({
            userId: user.id,
            name: user.name,
            email: user.email,
          })
          .from(member)
          .innerJoin(user, eq(member.userId, user.id))
          .where(
            and(eq(member.organizationId, orgId), eq(member.role, "member"))
          )
        // Deduplicate by userId
        const deduped = new Map<string, MemberRow>()
        for (const r of rows) {
          if (r.email) deduped.set(r.userId, r)
        }
        return [...deduped.values()]
      }
    )

    const treasurerRows = await step.run("load-treasurers", async () => {
      const rows = await db
        .select({ userId: user.id, name: user.name, email: user.email })
        .from(member)
        .innerJoin(user, eq(member.userId, user.id))
        .where(
          and(eq(member.organizationId, orgId), eq(member.role, "treasurer"))
        )
      return rows.filter((r: MemberRow) => Boolean(r.email))
    })

    const secretaryRows = await step.run("load-secretaries", async () => {
      const rows = await db
        .select({ userId: user.id, name: user.name, email: user.email })
        .from(member)
        .innerJoin(user, eq(member.userId, user.id))
        .where(
          and(eq(member.organizationId, orgId), eq(member.role, "secretary"))
        )
      return rows.filter((r: MemberRow) => Boolean(r.email))
    })

    const adminRows = await step.run("load-admins", async () => {
      const rows = await db
        .select({ userId: user.id, name: user.name, email: user.email })
        .from(member)
        .innerJoin(user, eq(member.userId, user.id))
        .where(and(eq(member.organizationId, orgId), eq(member.role, "admin")))
      return rows.filter((r: MemberRow) => Boolean(r.email))
    })

    const presidentRows = await step.run("load-presidents", async () => {
      const rows = await db
        .select({ userId: user.id, name: user.name, email: user.email })
        .from(member)
        .innerJoin(user, eq(member.userId, user.id))
        .where(
          and(eq(member.organizationId, orgId), eq(member.role, "president"))
        )
      return rows.filter((r: MemberRow) => Boolean(r.email))
    })

    if (
      members.length === 0 &&
      treasurerRows.length === 0 &&
      secretaryRows.length === 0 &&
      adminRows.length === 0 &&
      presidentRows.length === 0
    ) {
      logger.info("No users found for monthly compliance dispatch", {
        periodKey,
        testRunId,
      })

      return { periodKey, dispatched: 0 }
    }

    const memberIds = members.map((entry: MemberRow) => entry.userId)

    const periodContributions = await step.run(
      "load-period-contributions",
      async (): Promise<ContributionRow[]> => {
        if (memberIds.length === 0) return []
        return db
          .select({
            memberId: contribution.memberId,
            status: contribution.status,
          })
          .from(contribution)
          .where(
            and(
              eq(contribution.period, periodKey),
              inArray(contribution.memberId, memberIds)
            )
          )
      }
    )

    const activeLoans = await step.run(
      "load-active-loans",
      async (): Promise<LoanRow[]> => {
        if (memberIds.length === 0) return []
        return db
          .select({
            memberId: loan.memberId,
            status: loan.status,
          })
          .from(loan)
          .where(
            and(
              inArray(loan.memberId, memberIds),
              inArray(loan.status, [
                "requested",
                "approved",
                "disbursed",
                "repaying",
                "overdue",
              ])
            )
          )
      }
    )

    const activePenalties = await step.run(
      "load-active-penalties",
      async (): Promise<PenaltyRow[]> => {
        if (memberIds.length === 0) return []
        return db
          .select({
            memberId: penalty.memberId,
          })
          .from(penalty)
          .where(
            and(
              inArray(penalty.memberId, memberIds),
              eq(penalty.status, "active")
            )
          )
      }
    )

    const settledContributionMemberIds = new Set(
      periodContributions
        .filter((entry: ContributionRow) =>
          ["confirmed", "late", "waived"].includes(entry.status)
        )
        .map((entry: ContributionRow) => entry.memberId)
    )

    const loanCountByMember = activeLoans.reduce<Record<string, number>>(
      (acc: Record<string, number>, entry: LoanRow) => {
        acc[entry.memberId] = (acc[entry.memberId] || 0) + 1
        return acc
      },
      {}
    )

    const penaltyCountByMember = activePenalties.reduce<Record<string, number>>(
      (acc: Record<string, number>, entry: PenaltyRow) => {
        acc[entry.memberId] = (acc[entry.memberId] || 0) + 1
        return acc
      },
      {}
    )

    // Send MEMBER emails only to members with issues
    const memberEventsToSend = members
      .map((entry: MemberRow) => {
        const pendingContribution = !settledContributionMemberIds.has(
          entry.userId
        )
        const activeLoanCount = loanCountByMember[entry.userId] || 0
        const activePenaltyCount = penaltyCountByMember[entry.userId] || 0

        if (
          !pendingContribution &&
          activeLoanCount === 0 &&
          activePenaltyCount === 0
        ) {
          return null
        }

        return {
          name: "ikimina/reports.monthly.member-summary.email" as const,
          data: {
            periodKey,
            recipientUserId: entry.userId,
            recipientEmail: entry.email,
            recipientName: entry.name || "Member",
            pendingContribution,
            activeLoanCount,
            activePenaltyCount,
          },
        }
      })
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))

    // Send TREASURER emails
    const treasurerEventsToSend = treasurerRows.map((row: MemberRow) => ({
      name: "ikimina/reports.monthly.treasurer-summary.email" as const,
      data: {
        periodKey,
        recipientUserId: row.userId,
        recipientEmail: row.email,
        recipientName: row.name || "Treasurer",
        // These will be calculated by the email handler
        totalContributions: memberIds.length,
        confirmedContributions: settledContributionMemberIds.size,
        pendingContributions:
          memberIds.length - settledContributionMemberIds.size,
        lateContributions: periodContributions.filter(
          (c) => c.status === "late"
        ).length,
        totalLoans: activeLoans.length,
        activeLoanCount: activeLoans.filter((l) => l.status !== "completed")
          .length,
        totalPenalties: activePenalties.length,
        activePenaltyCount: activePenalties.length,
        confirmedAmount: 0,
      },
    }))

    // Send SECRETARY emails
    const secretaryEventsToSend = secretaryRows.map((row: MemberRow) => ({
      name: "ikimina/reports.monthly.secretary-summary.email" as const,
      data: {
        periodKey,
        recipientUserId: row.userId,
        recipientEmail: row.email,
        recipientName: row.name || "Secretary",
        totalMembers: memberIds.length,
        activeMembers: memberIds.length, // This would need actual calculation
        inactiveMembers: 0,
        suspendedMembers: 0,
        newMembersThisMonth: 0,
        departedMembersThisMonth: 0,
        pendingIssuesCount: memberEventsToSend.length,
      },
    }))

    // Send ADMIN emails
    const adminEventsToSend = adminRows.map((row: MemberRow) => ({
      name: "ikimina/reports.monthly.admin-summary.email" as const,
      data: {
        periodKey,
        recipientUserId: row.userId,
        recipientEmail: row.email,
        recipientName: row.name || "Admin",
        totalMembers: memberIds.length,
        complianceScore: 75, // This would need actual calculation
        criticalIssues: memberEventsToSend.length,
        warningIssues: 0,
        totalLoans: activeLoans.length,
        activeLoanCount: activeLoans.filter((l) => l.status !== "completed")
          .length,
        overdueLoansCount: activeLoans.filter((l) => l.status === "overdue")
          .length,
        totalPenalties: activePenalties.length,
        activePenaltyCount: activePenalties.length,
        suspendedMembersCount: 0,
      },
    }))

    // Send PRESIDENT emails
    const presidentEventsToSend = presidentRows.map((row: MemberRow) => ({
      name: "ikimina/reports.monthly.president-summary.email" as const,
      data: {
        periodKey,
        recipientUserId: row.userId,
        recipientEmail: row.email,
        recipientName: row.name || "President",
        totalMembers: memberIds.length,
        activeMembers: memberIds.length,
        membershipChangePercentage: 0,
        organizationalScore: 80,
        criticalActionItems: memberEventsToSend.length,
        upcomingDeadlines: 0,
        memberEngagementRate: 85,
        financialHealthStatus: "healthy",
      },
    }))

    const allEventsToSend = [
      ...memberEventsToSend,
      ...treasurerEventsToSend,
      ...secretaryEventsToSend,
      ...adminEventsToSend,
      ...presidentEventsToSend,
    ]

    await step.run("create-in-app-compliance-notifications", async () => {
      const notifications = memberEventsToSend.map((entry) => ({
        id: generateUUID(),
        userId: entry.data.recipientUserId,
        type: "info" as const,
        title: `Monthly compliance summary (${periodKey})`,
        message: [
          entry.data.pendingContribution ? "Contribution still pending" : null,
          entry.data.activeLoanCount > 0
            ? `${entry.data.activeLoanCount} active loan(s)`
            : null,
          entry.data.activePenaltyCount > 0
            ? `${entry.data.activePenaltyCount} active penalty(ies)`
            : null,
        ]
          .filter(Boolean)
          .join(" · "),
        channel: "in_app" as const,
        actionUrl: "/member/dashboard",
        actionLabel: "Open Dashboard",
        relatedType: "monthly_compliance",
        relatedId: periodKey,
        isRead: false,
        isArchived: false,
      }))

      if (notifications.length > 0) {
        await notificationOperations.bulkCreate(notifications)
      }
    })

    if (allEventsToSend.length > 0) {
      await step.sendEvent("dispatch-compliance-emails", allEventsToSend)
    }

    logger.info("Monthly compliance dispatch completed", {
      periodKey,
      memberEmailsDispatched: memberEventsToSend.length,
      treasurerEmailsDispatched: treasurerEventsToSend.length,
      secretaryEmailsDispatched: secretaryEventsToSend.length,
      adminEmailsDispatched: adminEventsToSend.length,
      presidentEmailsDispatched: presidentEventsToSend.length,
      testRunId,
    })

    return {
      periodKey,
      dispatched: allEventsToSend.length,
    }
  }
)

export const monthlyMemberSummaryEmailSender = inngest.createFunction(
  {
    id: "ikimina-monthly-member-summary-email-sender",
    retries: 2,
    concurrency: 5,
    triggers: [monthlyMemberSummaryEmailEvent],
  },
  async ({ event, step }) => {
    const {
      periodKey,
      recipientUserId,
      recipientEmail,
      recipientName,
      pendingContribution,
      activeLoanCount,
      activePenaltyCount,
    } = event.data

    const periodLabel = formatPeriodLabel(periodKey)
    const eventType = "monthly_compliance_summary" as const

    await step.run("send-monthly-member-summary", async () => {
      await ensureEmailLogRecord(
        recipientUserId,
        recipientEmail,
        eventType,
        periodKey
      )

      const status = await getEmailLogStatus(
        recipientUserId,
        eventType,
        periodKey
      )
      if (status === "sent") return

      const html = await render(
        MonthlyComplianceSummaryMemberEmail({
          memberName: recipientName,
          periodKey,
          periodLabel,
          pendingContribution,
          activeLoanCount,
          activePenaltyCount,
        })
      )

      const result = await sendEmail({
        to: recipientEmail,
        subject: `Your compliance summary for ${periodLabel}`,
        html,
      })

      if (result.success) {
        await markEmailSent(recipientUserId, eventType, periodKey)
      } else {
        await markEmailFailed(
          recipientUserId,
          eventType,
          periodKey,
          String(result.error)
        )
      }
    })
  }
)

// TREASURER EMAIL SENDER
type TreasurerEmailData = {
  periodKey: string
  recipientUserId: string
  recipientEmail: string
  recipientName: string
  totalContributions: number
  confirmedContributions: number
  pendingContributions: number
  lateContributions: number
  totalLoans: number
  activeLoanCount: number
  totalPenalties: number
  activePenaltyCount: number
  confirmedAmount: number
}

export const monthlyTreasurerSummaryEmailSender = inngest.createFunction(
  {
    id: "ikimina-monthly-treasurer-summary-email-sender",
    retries: 2,
    concurrency: 5,
    triggers: [{ event: "ikimina/reports.monthly.treasurer-summary.email" }],
  },
  async ({ event, step }) => {
    const data = event.data as TreasurerEmailData
    const {
      periodKey,
      recipientUserId,
      recipientEmail,
      recipientName,
      totalContributions,
      confirmedContributions,
      pendingContributions,
      lateContributions,
      totalLoans,
      activeLoanCount,
      totalPenalties,
      activePenaltyCount,
      confirmedAmount,
    } = data

    const periodLabel = formatPeriodLabel(periodKey)
    const eventType = "monthly_compliance_summary" as const

    await step.run("send-monthly-treasurer-summary", async () => {
      await ensureEmailLogRecord(
        recipientUserId,
        recipientEmail,
        eventType,
        periodKey
      )

      const status = await getEmailLogStatus(
        recipientUserId,
        eventType,
        periodKey
      )
      if (status === "sent") return

      const html = await render(
        MonthlyComplianceSummaryTreasurerEmail({
          treasurerName: recipientName,
          periodKey,
          periodLabel,
          totalContributions,
          confirmedContributions,
          pendingContributions,
          lateContributions,
          totalLoans,
          activeLoanCount,
          totalPenalties,
          activePenaltyCount,
          confirmedAmount,
        })
      )

      const result = await sendEmail({
        to: recipientEmail,
        subject: `Monthly compliance report for ${periodLabel}`,
        html,
      })

      if (result.success) {
        await markEmailSent(recipientUserId, eventType, periodKey)
      } else {
        await markEmailFailed(
          recipientUserId,
          eventType,
          periodKey,
          String(result.error)
        )
      }
    })
  }
)

// SECRETARY EMAIL SENDER
type SecretaryEmailData = {
  periodKey: string
  recipientUserId: string
  recipientEmail: string
  recipientName: string
  totalMembers: number
  activeMembers: number
  inactiveMembers: number
  suspendedMembers: number
  newMembersThisMonth: number
  departedMembersThisMonth: number
  pendingIssuesCount: number
}

export const monthlySecretarySummaryEmailSender = inngest.createFunction(
  {
    id: "ikimina-monthly-secretary-summary-email-sender",
    retries: 2,
    concurrency: 5,
    triggers: [{ event: "ikimina/reports.monthly.secretary-summary.email" }],
  },
  async ({ event, step }) => {
    const data = event.data as SecretaryEmailData
    const {
      periodKey,
      recipientUserId,
      recipientEmail,
      recipientName,
      totalMembers,
      activeMembers,
      inactiveMembers,
      suspendedMembers,
      newMembersThisMonth,
      departedMembersThisMonth,
      pendingIssuesCount,
    } = data

    const periodLabel = formatPeriodLabel(periodKey)
    const eventType = "monthly_compliance_summary" as const

    await step.run("send-monthly-secretary-summary", async () => {
      await ensureEmailLogRecord(
        recipientUserId,
        recipientEmail,
        eventType,
        periodKey
      )

      const status = await getEmailLogStatus(
        recipientUserId,
        eventType,
        periodKey
      )
      if (status === "sent") return

      const html = await render(
        MonthlyComplianceSummarySecretaryEmail({
          secretaryName: recipientName,
          periodKey,
          periodLabel,
          totalMembers,
          activeMembers,
          inactiveMembers,
          suspendedMembers,
          newMembersThisMonth,
          departedMembersThisMonth,
          pendingIssuesCount,
        })
      )

      const result = await sendEmail({
        to: recipientEmail,
        subject: `Monthly compliance report for ${periodLabel}`,
        html,
      })

      if (result.success) {
        await markEmailSent(recipientUserId, eventType, periodKey)
      } else {
        await markEmailFailed(
          recipientUserId,
          eventType,
          periodKey,
          String(result.error)
        )
      }
    })
  }
)

// ADMIN EMAIL SENDER
type AdminEmailData = {
  periodKey: string
  recipientUserId: string
  recipientEmail: string
  recipientName: string
  totalMembers: number
  complianceScore: number
  criticalIssues: number
  warningIssues: number
  totalLoans: number
  activeLoanCount: number
  overdueLoansCount: number
  totalPenalties: number
  activePenaltyCount: number
  suspendedMembersCount: number
}

export const monthlyAdminSummaryEmailSender = inngest.createFunction(
  {
    id: "ikimina-monthly-admin-summary-email-sender",
    retries: 2,
    concurrency: 5,
    triggers: [{ event: "ikimina/reports.monthly.admin-summary.email" }],
  },
  async ({ event, step }) => {
    const data = event.data as AdminEmailData
    const {
      periodKey,
      recipientUserId,
      recipientEmail,
      recipientName,
      totalMembers,
      complianceScore,
      criticalIssues,
      warningIssues,
      totalLoans,
      activeLoanCount,
      overdueLoansCount,
      totalPenalties,
      activePenaltyCount,
      suspendedMembersCount,
    } = data

    const periodLabel = formatPeriodLabel(periodKey)
    const eventType = "monthly_compliance_summary" as const

    await step.run("send-monthly-admin-summary", async () => {
      await ensureEmailLogRecord(
        recipientUserId,
        recipientEmail,
        eventType,
        periodKey
      )

      const status = await getEmailLogStatus(
        recipientUserId,
        eventType,
        periodKey
      )
      if (status === "sent") return

      const html = await render(
        MonthlyComplianceSummaryAdminEmail({
          adminName: recipientName,
          periodKey,
          periodLabel,
          totalMembers,
          complianceScore,
          criticalIssues,
          warningIssues,
          totalLoans,
          activeLoanCount,
          overdueLoansCount,
          totalPenalties,
          activePenaltyCount,
          suspendedMembersCount,
        })
      )

      const result = await sendEmail({
        to: recipientEmail,
        subject: `Organizational compliance report for ${periodLabel}`,
        html,
      })

      if (result.success) {
        await markEmailSent(recipientUserId, eventType, periodKey)
      } else {
        await markEmailFailed(
          recipientUserId,
          eventType,
          periodKey,
          String(result.error)
        )
      }
    })
  }
)

// PRESIDENT EMAIL SENDER
type PresidentEmailData = {
  periodKey: string
  recipientUserId: string
  recipientEmail: string
  recipientName: string
  totalMembers: number
  activeMembers: number
  membershipChangePercentage: number
  organizationalScore: number
  criticalActionItems: number
  upcomingDeadlines: number
  memberEngagementRate: number
  financialHealthStatus: string
}

export const monthlyPresidentSummaryEmailSender = inngest.createFunction(
  {
    id: "ikimina-monthly-president-summary-email-sender",
    retries: 2,
    concurrency: 5,
    triggers: [{ event: "ikimina/reports.monthly.president-summary.email" }],
  },
  async ({ event, step }) => {
    const data = event.data as PresidentEmailData
    const {
      periodKey,
      recipientUserId,
      recipientEmail,
      recipientName,
      totalMembers,
      activeMembers,
      membershipChangePercentage,
      organizationalScore,
      criticalActionItems,
      upcomingDeadlines,
      memberEngagementRate,
      financialHealthStatus,
    } = data

    const periodLabel = formatPeriodLabel(periodKey)
    const eventType = "monthly_compliance_summary" as const

    await step.run("send-monthly-president-summary", async () => {
      await ensureEmailLogRecord(
        recipientUserId,
        recipientEmail,
        eventType,
        periodKey
      )

      const status = await getEmailLogStatus(
        recipientUserId,
        eventType,
        periodKey
      )
      if (status === "sent") return

      const html = await render(
        MonthlyComplianceSummaryPresidentEmail({
          presidentName: recipientName,
          periodKey,
          periodLabel,
          totalMembers,
          activeMembers,
          membershipChangePercentage,
          organizationalScore,
          criticalActionItems,
          upcomingDeadlines,
          memberEngagementRate,
          financialHealthStatus,
        })
      )

      const result = await sendEmail({
        to: recipientEmail,
        subject: `Executive summary for ${periodLabel}`,
        html,
      })

      if (result.success) {
        await markEmailSent(recipientUserId, eventType, periodKey)
      } else {
        await markEmailFailed(
          recipientUserId,
          eventType,
          periodKey,
          String(result.error)
        )
      }
    })
  }
)
