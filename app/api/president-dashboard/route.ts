import { headers } from "next/headers"
import type { NextRequest } from "next/server"
import { siteConfig } from "@/constants/site-config"
import { db } from "@/db/connection"
import {
  actionItemOperations,
  announcementOperations,
  contributionOperations,
  loanOperations,
  meetingOperations,
  penaltyOperations,
  userOperations,
} from "@/db/operations"
import { member } from "@/db/schemas"
import logger from "@/utils/logger"
import { extractRoleValue, normalizeRoleValue } from "@/utils/role-utils"
import { format, parse, subMonths } from "date-fns"
import { and, count, eq } from "drizzle-orm"

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
        "[president-dashboard:getResolvedRole] member lookup failed",
        { userId: sessionUser.id, activeOrganizationId, error }
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
        "[president-dashboard:getResolvedRole] getActiveMemberRole fallback failed",
        { userId: sessionUser?.id, activeOrganizationId, error }
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

    const rateLimitResult = await rateLimit("dashboard-president", 30, 60, {
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
        "Authentication required to access president dashboard",
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

    if (!["president", "admin"].includes(effectiveRole ?? "")) {
      logger.warn("[president-dashboard:GET] forbidden role", {
        userId: userProfile.id,
        role: effectiveRole,
        activeOrganizationId,
        sessionRole,
        profileRole,
      })
      return unauthorizedResponse(
        request,
        "Insufficient permissions to access president dashboard",
        { help: "President or admin role required.", startTime }
      )
    }

    try {
      const now = new Date()
      const currentYear = now.getFullYear()

      const { monthlyContributionRwf } = siteConfig.platform.savings
      const { membershipCount, leadershipTermMonths } =
        siteConfig.platform.governance
      const contributionWindow = getContributionWindow(now)

      const [
        upcomingMeetings,
        openActionItems,
        urgentActionItems,
        recentAnnouncements,
        allContributions,
        allLoans,
        allPenalties,
        openActionCount,
        pendingLoanCount,
        overdueLoanCount,
        activePenaltyCount,
        activeMemberCountResult,
      ] = await Promise.all([
        meetingOperations.findMany({
          limit: 3,
          sortBy: "scheduledAt",
          sortOrder: "asc",
          filters: { status: "scheduled", scheduledFrom: now },
        }),
        actionItemOperations.findMany({
          limit: 8,
          sortBy: "dueDate",
          sortOrder: "asc",
          filters: { status: "open" },
        }),
        actionItemOperations.findMany({
          limit: 5,
          sortBy: "dueDate",
          sortOrder: "asc",
          filters: { status: "open", priority: "high" },
        }),
        announcementOperations.findMany({
          limit: 5,
          sortBy: "publishedAt",
          sortOrder: "desc",
          filters: { status: "published" },
        }),
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
        actionItemOperations.count({ filters: { status: "open" } }),
        loanOperations.count({ filters: { status: "requested" } }),
        loanOperations.count({ filters: { status: "overdue" } }),
        penaltyOperations.count({ filters: { status: "active" } }),
        activeOrganizationId
          ? db
              .select({ value: count() })
              .from(member)
              .where(
                and(
                  eq(member.organizationId, activeOrganizationId),
                  eq(member.role, "member")
                )
              )
          : Promise.resolve([{ value: 0 }]),
      ])

      // ── Financial aggregates ──
      const totalSavings = allContributions
        .filter((c) => c.status === "confirmed")
        .reduce((sum, c) => sum + toNumber(c.amount), 0)

      const activeLoanAmount = allLoans
        .filter((l) => ["disbursed", "repaying", "overdue"].includes(l.status))
        .reduce(
          (sum, l) => sum + toNumber(l.approvedAmount || l.requestedAmount),
          0
        )

      const penaltyFundAmount = allPenalties.reduce(
        (sum, p) => sum + toNumber(p.amount),
        0
      )

      // ── Consolidated fund position (cash on hand) ──
      const fundPosition = await computeFundPosition()

      const thisPeriodContributions = allContributions.filter(
        (c) => c.period === contributionWindow.period
      )
      const confirmedThisPeriod = thisPeriodContributions.filter(
        (c) => c.status === "confirmed"
      )
      const confirmedThisPeriodAmount = confirmedThisPeriod.reduce(
        (sum, c) => sum + toNumber(c.amount),
        0
      )
      const expectedThisPeriod = membershipCount * monthlyContributionRwf
      const collectionRate =
        expectedThisPeriod > 0
          ? Math.min(
              100,
              Math.round((confirmedThisPeriodAmount / expectedThisPeriod) * 100)
            )
          : 0

      // Contribution trends by period (last 6 contribution windows)
      const activePeriodDate = parse(
        contributionWindow.period,
        "yyyy-MM",
        new Date()
      )
      const last6Periods: string[] = []
      for (let i = 5; i >= 0; i--) {
        const periodDate = subMonths(activePeriodDate, i)
        const period = `${periodDate.getFullYear()}-${String(
          periodDate.getMonth() + 1
        ).padStart(2, "0")}`
        last6Periods.push(period)
      }

      const monthlyContributions = last6Periods.map((period) => {
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

      // Pending loan requests (president "authorizations")
      const pendingLoans = allLoans
        .filter((l) => l.status === "requested")
        .slice(0, 5)

      const pendingMemberIds = [...new Set(pendingLoans.map((l) => l.memberId))]
      const pendingUsers =
        pendingMemberIds.length > 0
          ? await userOperations.findByIds(pendingMemberIds)
          : []
      const pendingUserMap = new Map(
        pendingUsers.map((u) => [u.id, u.name || u.email])
      )

      // Leadership term calc
      const termStart = new Date(currentYear, 0, 10) // Jan 10 of current year (approximation)
      const termEnd = new Date(
        termStart.getFullYear(),
        termStart.getMonth() + leadershipTermMonths,
        termStart.getDate()
      )
      const daysRemaining = Math.max(
        0,
        Math.ceil((termEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      )

      const dashboardData = {
        president: {
          id: userProfile.id,
          name: userProfile.name,
          email: userProfile.email,
          role: effectiveRole,
        },
        stats: {
          nextMeeting: upcomingMeetings[0]
            ? {
                title: upcomingMeetings[0].title,
                scheduledAt: upcomingMeetings[0].scheduledAt.toString(),
                location: upcomingMeetings[0].location || null,
              }
            : null,
          openActionItems: openActionCount,
          pendingLoanRequests: pendingLoanCount,
          overdueLoans: overdueLoanCount,
          activePenalties: activePenaltyCount,
          totalMembers: membershipCount,
          activeMemberCount: activeMemberCountResult[0]?.value ?? 0,
          finance: {
            totalSavings,
            activeLoanAmount,
            penaltyFundAmount,
            collectionRate,
            confirmedThisPeriodAmount,
            expectedThisPeriod,
            fundPosition,
          },
        },
        leadership: {
          termStart: termStart.toISOString(),
          termEnd: termEnd.toISOString(),
          daysRemaining,
          leadershipTermMonths,
        },
        meetings: {
          upcoming: upcomingMeetings.map((m) => ({
            id: m.id,
            title: m.title,
            scheduledAt: m.scheduledAt.toString(),
            location: m.location || null,
            status: m.status,
          })),
        },
        actionItems: {
          open: openActionItems.map((a) => ({
            id: a.id,
            title: a.title,
            status: a.status,
            priority: a.priority,
            dueDate: a.dueDate?.toString() || null,
            assigneeId: a.ownerId || null,
          })),
          urgent: urgentActionItems.map((a) => ({
            id: a.id,
            title: a.title,
            status: a.status,
            priority: a.priority,
            dueDate: a.dueDate?.toString() || null,
          })),
        },
        announcements: {
          recent: recentAnnouncements.map((a) => ({
            id: a.id,
            title: a.title,
            status: a.status,
            publishedAt: a.publishedAt?.toString() || null,
            audience: a.audience || null,
          })),
        },
        pendingAuthorizations: pendingLoans.map((l) => ({
          id: l.id,
          memberId: l.memberId,
          memberName: pendingUserMap.get(l.memberId) || "Member",
          requestedAmount: toNumber(l.requestedAmount),
          requestedAt: l.requestedAt.toString(),
          termMonths: l.termMonths,
        })),
        contributions: {
          monthly: monthlyContributions,
        },
      }

      logger.info("President dashboard data retrieved", {
        userId: userProfile.id,
        userRole: effectiveRole,
        requestId,
      })

      return successResponse(request, dashboardData, {
        message: "President dashboard data retrieved successfully",
        startTime,
        links: {
          self: "/api/president-dashboard",
          meetings: "/api/meetings",
          loans: "/api/loans",
          actionItems: "/api/action-items",
        },
        cacheControl: "private, max-age=60",
        rateLimit: rateLimitResult,
        metadata: {
          etag: generateETag(dashboardData),
          requestId,
        },
      })
    } catch (error) {
      logger.error("Error fetching president dashboard data:", error)
      throw error
    }
  })
)
