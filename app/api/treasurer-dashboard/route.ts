import { headers } from "next/headers"
import type { NextRequest } from "next/server"
import { siteConfig } from "@/constants/site-config"
import { db } from "@/db/connection"
import {
  contributionOperations,
  loanOperations,
  meetingOperations,
  penaltyOperations,
  receiptOperations,
  userOperations,
} from "@/db/operations"
import { member } from "@/db/schemas"
import logger from "@/utils/logger"
import { extractRoleValue, normalizeRoleValue } from "@/utils/role-utils"
import { format, parse, subMonths } from "date-fns"
import { and, eq } from "drizzle-orm"

import {
  generateETag,
  withRequestId,
  withRequestLogging,
  withTiming,
} from "@/lib/api-middleware"
import {
  rateLimitedResponse,
  successResponse,
  unauthorizedResponse,
  withApiResponse,
} from "@/lib/api-response"
import { auth } from "@/lib/auth"
import { getContributionWindow } from "@/lib/contribution-window"
import { computeFundPosition } from "@/lib/fund-position"
import { rateLimit } from "@/lib/rate-limiter"

async function getResolvedRole() {
  const headersList = await headers()
  const session = await auth.api.getSession({ headers: headersList })
  const sessionUser = session?.user || null
  const sessionRole = normalizeRoleValue(sessionUser?.role)
  const activeOrganizationId = session?.session?.activeOrganizationId

  let activeRole: string | null = null

  if (sessionUser?.id && activeOrganizationId) {
    try {
      const rows = await db
        .select({ role: member.role })
        .from(member)
        .where(
          and(
            eq(member.organizationId, activeOrganizationId),
            eq(member.userId, sessionUser.id)
          )
        )
        .limit(1)
      activeRole = normalizeRoleValue(rows[0]?.role ?? null)
    } catch (error) {
      logger.error(
        "[treasurer-dashboard:getResolvedRole] member lookup failed",
        {
          userId: sessionUser.id,
          activeOrganizationId,
          error,
        }
      )
    }
  }

  if (!activeRole) {
    try {
      const orgApi = auth.api as any
      const roleResponse = orgApi?.organization?.getActiveMemberRole
        ? await orgApi.organization.getActiveMemberRole({
            headers: headersList,
          })
        : null
      activeRole = extractRoleValue(roleResponse)
    } catch (error) {
      logger.error(
        "[treasurer-dashboard:getResolvedRole] getActiveMemberRole fallback failed",
        {
          userId: sessionUser?.id,
          activeOrganizationId,
          error,
        }
      )
    }
  }

  return {
    user: sessionUser,
    role: normalizeRoleValue(activeRole ?? sessionRole),
    activeOrganizationId,
    sessionRole,
  }
}

const toNumber = (value?: string | number | null) => (value ? Number(value) : 0)

export const GET = withRequestLogging(
  withApiResponse(async (request: NextRequest) => {
    const { startTime } = withTiming()
    const { requestId } = withRequestId()

    const rateLimitResult = await rateLimit("dashboard-treasurer", 30, 60, {
      algorithm: "sliding-window",
      analytics: true,
    })

    if (!rateLimitResult.success) {
      return rateLimitedResponse(request, rateLimitResult, {
        message: "Rate limit exceeded. Please wait and try again later.",
        help: "You can make up to 30 requests per minute.",
        startTime,
      })
    }

    const {
      user,
      role: resolvedRole,
      activeOrganizationId,
      sessionRole,
    } = await getResolvedRole()

    if (!user) {
      return unauthorizedResponse(
        request,
        "Authentication required to access treasurer dashboard",
        { help: "Please sign in to view dashboard data.", startTime }
      )
    }

    const userProfile = await userOperations.getProfileByUserId(
      user.id as string
    )

    if (!userProfile) {
      return unauthorizedResponse(request, "User profile not found.", {
        help: "Please sign in again to refresh your session.",
        startTime,
      })
    }

    const profileRole = normalizeRoleValue(userProfile.role)
    const effectiveRole = normalizeRoleValue(resolvedRole ?? profileRole)

    if (!["treasurer", "admin", "president"].includes(effectiveRole ?? "")) {
      logger.warn("[treasurer-dashboard:GET] forbidden role", {
        userId: userProfile.id,
        role: effectiveRole,
        activeOrganizationId,
        sessionRole,
        profileRole,
      })
      return unauthorizedResponse(
        request,
        "Insufficient permissions to access treasurer dashboard",
        { help: "Treasurer, admin, or president role required.", startTime }
      )
    }

    try {
      const now = new Date()
      const currentYear = now.getFullYear()
      const currentMonth = now.getMonth()

      const contributionWindow = getContributionWindow(now)
      const { monthlyContributionRwf } = siteConfig.platform.savings
      const { membershipCount } = siteConfig.platform.governance
      const { auditCadenceMonths } = siteConfig.platform.meetings

      const [
        allContributions,
        allLoans,
        allPenalties,
        upcomingMeetings,
        thisMonthReceipts,
        allTimeReceiptCount,
        confirmedCount,
        pendingCount,
        lateCount,
        waivedCount,
        activePenaltyCount,
        waivedPenaltyCount,
        pendingLoanCount,
        approvedLoanCount,
        disbursedLoanCount,
        repayingLoanCount,
        overdueLoanCount,
        repaidLoanCount,
      ] = await Promise.all([
        contributionOperations.findMany({
          limit: 2000,
          sortBy: "createdAt",
          sortOrder: "desc",
        }),
        loanOperations.findMany({
          limit: 2000,
          sortBy: "requestedAt",
          sortOrder: "desc",
        }),
        penaltyOperations.findMany({
          limit: 500,
          sortBy: "createdAt",
          sortOrder: "desc",
          filters: { status: "active" },
        }),
        meetingOperations.findMany({
          limit: 3,
          sortBy: "scheduledAt",
          sortOrder: "asc",
          filters: { status: "scheduled", scheduledFrom: now },
        }),
        receiptOperations.findMany({
          limit: 500,
          sortBy: "issuedAt",
          sortOrder: "desc",
          filters: { period: contributionWindow.period, status: "issued" },
        }),
        receiptOperations.count({ filters: { status: "issued" } }),
        contributionOperations.count({ filters: { status: "confirmed" } }),
        contributionOperations.count({ filters: { status: "pending" } }),
        contributionOperations.count({ filters: { status: "late" } }),
        contributionOperations.count({ filters: { status: "waived" } }),
        penaltyOperations.count({ filters: { status: "active" } }),
        penaltyOperations.count({ filters: { status: "waived" } }),
        loanOperations.count({ filters: { status: "requested" } }),
        loanOperations.count({ filters: { status: "approved" } }),
        loanOperations.count({ filters: { status: "disbursed" } }),
        loanOperations.count({ filters: { status: "repaying" } }),
        loanOperations.count({ filters: { status: "overdue" } }),
        loanOperations.count({ filters: { status: "repaid" } }),
      ])

      // ── Contribution aggregates ──
      const thisPeriodContributions = allContributions.filter(
        (c) => c.period === contributionWindow.period
      )
      const totalAllTimeAmount = allContributions
        .filter((c) => c.status === "confirmed")
        .reduce((sum, c) => sum + toNumber(c.amount), 0)
      const confirmedThisPeriod = thisPeriodContributions.filter(
        (c) => c.status === "confirmed"
      )
      const confirmedThisPeriodAmount = confirmedThisPeriod.reduce(
        (sum, c) => sum + toNumber(c.amount),
        0
      )
      const outstandingAmount = allContributions
        .filter((c) => ["pending", "late"].includes(c.status))
        .reduce((sum, c) => sum + toNumber(c.amount), 0)
      const expectedThisPeriod = membershipCount * monthlyContributionRwf
      const collectionRate =
        expectedThisPeriod > 0
          ? Math.min(
              100,
              Math.round((confirmedThisPeriodAmount / expectedThisPeriod) * 100)
            )
          : 0

      // Contribution trends by period (last 6 contribution windows)
      // Generate 6 periods working backwards from current active period
      const activePeriodDate = parse(
        contributionWindow.period,
        "yyyy-MM",
        new Date()
      )
      const last6Periods: string[] = []
      for (let i = 5; i >= 0; i--) {
        const periodDate = subMonths(activePeriodDate, i)
        const periodStr = `${periodDate.getFullYear()}-${String(
          periodDate.getMonth() + 1
        ).padStart(2, "0")}`
        last6Periods.push(periodStr)
      }

      // Group contributions by their period field and aggregate
      const monthlyTrends = last6Periods.map((period) => {
        const periodDate = parse(period, "yyyy-MM", new Date())
        const label = format(periodDate, "MMM")

        const periodContribs = allContributions.filter(
          (c) => c.period === period
        )
        const confirmed = periodContribs
          .filter((c) => c.status === "confirmed")
          .reduce((sum, c) => sum + toNumber(c.amount), 0)
        const total = periodContribs.reduce(
          (sum, c) => sum + toNumber(c.amount),
          0
        )
        const late = periodContribs
          .filter((c) => c.status === "late")
          .reduce((sum, c) => sum + toNumber(c.amount), 0)

        return { month: label, period, confirmed, total, late }
      })

      // Outstanding members (pending/late this period)
      const outstandingContribs = thisPeriodContributions.filter((c) =>
        ["pending", "late"].includes(c.status)
      )
      const outstandingMemberIds = [
        ...new Set(outstandingContribs.map((c) => c.memberId)),
      ]
      const outstandingUsers =
        outstandingMemberIds.length > 0
          ? await userOperations.findByIds(outstandingMemberIds)
          : []
      const userMap = new Map(
        outstandingUsers.map((u) => [u.id, u.name || u.email])
      )
      const outstandingMembers = outstandingContribs.slice(0, 10).map((c) => ({
        memberId: c.memberId,
        memberName: userMap.get(c.memberId) || "Member",
        amount: toNumber(c.amount),
        status: c.status,
        period: c.period,
      }))

      // ── Loan aggregates ──
      const outstandingLoanAmount = allLoans
        .filter((l) => ["disbursed", "repaying", "overdue"].includes(l.status))
        .reduce(
          (sum, l) => sum + toNumber(l.approvedAmount || l.requestedAmount),
          0
        )
      const overdueLoans = allLoans
        .filter((l) => l.status === "overdue")
        .slice(0, 5)
      const overdueMemberIds = [...new Set(overdueLoans.map((l) => l.memberId))]
      const overdueUsers =
        overdueMemberIds.length > 0
          ? await userOperations.findByIds(overdueMemberIds)
          : []
      const loanUserMap = new Map(
        overdueUsers.map((u) => [u.id, u.name || u.email])
      )

      const loanMonthly = []
      const sixMonthsAgo = new Date(currentYear, currentMonth - 5, 1)
      const loansInRange = allLoans.filter((l) => {
        const d = l.requestedAt ? new Date(l.requestedAt) : undefined
        return d && d >= sixMonthsAgo
      })
      for (let i = 5; i >= 0; i--) {
        const month = new Date(currentYear, currentMonth - i, 1)
        const nextMonth = new Date(currentYear, currentMonth - i + 1, 1)
        const label = month.toLocaleString("default", { month: "short" })
        const requested = loansInRange.filter((l) => {
          const d = l.requestedAt ? new Date(l.requestedAt) : undefined
          return d && d >= month && d < nextMonth
        }).length
        const disbursed = allLoans.filter((l) => {
          const d = l.disbursedAt ? new Date(l.disbursedAt) : undefined
          return d && d >= month && d < nextMonth
        }).length
        loanMonthly.push({ month: label, requested, disbursed })
      }

      // ── Penalty aggregates ──
      const totalActivePenaltyAmount = allPenalties.reduce(
        (sum, p) => sum + toNumber(p.amount),
        0
      )

      // ── Consolidated fund position (cash on hand) ──
      const fundPosition = await computeFundPosition()

      // ── Audit info ──
      const lastAuditApprox = new Date(
        currentYear,
        currentMonth - (currentMonth % auditCadenceMonths),
        1
      )
      const nextAuditApprox = new Date(
        lastAuditApprox.getFullYear(),
        lastAuditApprox.getMonth() + auditCadenceMonths,
        1
      )
      const daysToAudit = Math.max(
        0,
        Math.ceil(
          (nextAuditApprox.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        )
      )

      const dashboardData = {
        treasurer: {
          id: userProfile.id,
          name: userProfile.name,
          email: userProfile.email,
          role: effectiveRole,
        },
        stats: {
          contributions: {
            confirmedThisPeriodAmount,
            expectedThisPeriod,
            outstandingAmount,
            collectionRate,
            totalAllTimeAmount,
            confirmedCount,
            pendingCount,
            lateCount,
            waivedCount,
            thisPeriodMembersPaid: confirmedThisPeriod.length,
            thisPeriodTotal: thisPeriodContributions.length,
          },
          loans: {
            outstandingAmount: outstandingLoanAmount,
            pendingRequests: pendingLoanCount,
            approved: approvedLoanCount,
            disbursed: disbursedLoanCount,
            repaying: repayingLoanCount,
            overdue: overdueLoanCount,
            repaid: repaidLoanCount,
            totalActive:
              approvedLoanCount + disbursedLoanCount + repayingLoanCount,
          },
          penalties: {
            activeCount: activePenaltyCount,
            waivedCount: waivedPenaltyCount,
            totalActiveAmount: totalActivePenaltyAmount,
          },
          receipts: {
            issuedThisPeriod: thisMonthReceipts.length,
            totalIssued: allTimeReceiptCount,
          },
          fundPosition,
        },
        window: contributionWindow,
        contributions: {
          monthly: monthlyTrends,
          outstandingMembers,
          recent: thisPeriodContributions.slice(0, 8).map((c) => ({
            id: c.id,
            memberId: c.memberId,
            amount: toNumber(c.amount),
            period: c.period,
            status: c.status,
            paidAt: c.paidAt?.toString() || null,
            receiptNumber: c.receiptNumber,
          })),
        },
        loans: {
          monthly: loanMonthly,
          pendingRequests: allLoans
            .filter((l) => l.status === "requested")
            .slice(0, 5)
            .map((l) => ({
              id: l.id,
              memberId: l.memberId,
              requestedAmount: toNumber(l.requestedAmount),
              requestedAt: l.requestedAt.toString(),
              termMonths: l.termMonths,
            })),
          overdueLoans: overdueLoans.map((l) => ({
            id: l.id,
            memberId: l.memberId,
            memberName: loanUserMap.get(l.memberId) || "Member",
            amount: toNumber(l.approvedAmount || l.requestedAmount),
            dueDate: l.dueDate?.toString() || null,
            status: l.status,
          })),
        },
        penalties: {
          recent: allPenalties.slice(0, 6).map((p) => ({
            id: p.id,
            memberId: p.memberId,
            amount: toNumber(p.amount),
            period: p.period,
            reason: p.reason,
            createdAt: p.createdAt.toString(),
          })),
        },
        meetings: {
          upcoming: upcomingMeetings.map((m) => ({
            id: m.id,
            title: m.title,
            scheduledAt: m.scheduledAt.toString(),
            location: m.location || null,
          })),
        },
        audit: {
          cadenceMonths: auditCadenceMonths,
          nextAuditApprox: nextAuditApprox.toString(),
          daysToAudit,
        },
      }

      logger.info("Treasurer dashboard data retrieved", {
        userId: userProfile.id,
        userRole: effectiveRole,
        requestId,
      })

      return successResponse(request, dashboardData, {
        message: "Treasurer dashboard data retrieved successfully",
        startTime,
        links: {
          self: "/api/treasurer-dashboard",
          contributions: "/api/contributions",
          loans: "/api/loans",
          penalties: "/api/penalties",
          receipts: "/api/receipts",
        },
        cacheControl: "private, max-age=60",
        rateLimit: rateLimitResult,
        metadata: {
          etag: generateETag(dashboardData),
          requestId,
        },
      })
    } catch (error) {
      logger.error("Error fetching treasurer dashboard data:", error)
      throw error
    }
  })
)
