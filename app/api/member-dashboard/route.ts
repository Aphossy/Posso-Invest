import type { NextRequest } from "next/server"
import { siteConfig } from "@/constants/site-config"
import {
  announcementOperations,
  contributionOperations,
  loanOperations,
  meetingOperations,
  userOperations,
} from "@/db/operations"
import { attendanceOperations } from "@/db/operations/attendance-operations"
import { penaltyOperations } from "@/db/operations/penalty-operations"
import logger from "@/utils/logger"
import { normalizeRoleValue } from "@/utils/role-utils"
import { format, parse } from "date-fns"

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
import {
  getContributionTrendPeriods,
  getContributionWindow,
} from "@/lib/contribution-window"
import { getSessionUserCached } from "@/lib/get-session-cached"
import { rateLimit } from "@/lib/rate-limiter"

async function getResolvedRole() {
  const session = await getSessionUserCached()
  return {
    ...session,
    role: normalizeRoleValue(session.role ?? session.sessionRole),
    sessionRole: normalizeRoleValue(session.sessionRole),
  }
}

const toNumber = (value?: string | number | null) => (value ? Number(value) : 0)

export const GET = withRequestLogging(
  withApiResponse(async (request: NextRequest) => {
    const { startTime } = withTiming()
    const { requestId } = withRequestId()

    const rateLimitResult = await rateLimit("dashboard-member", 30, 60, {
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
        "Authentication required to access member dashboard",
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

    if (!["member", "admin"].includes(effectiveRole ?? "")) {
      logger.warn("[member-dashboard:GET] forbidden role", {
        userId: userProfile.id,
        role: effectiveRole,
        activeOrganizationId,
        sessionRole,
        profileRole,
      })
      return unauthorizedResponse(
        request,
        "Insufficient permissions to access member dashboard",
        { help: "Member role required.", startTime }
      )
    }

    try {
      const now = new Date()
      const currentYear = now.getFullYear()
      const currentMonth = now.getMonth()

      const contributionWindow = getContributionWindow(now)
      const memberId = userProfile.id

      const [
        myContributions,
        myLoans,
        myAttendance,
        myPenalties,
        upcomingMeetings,
        memberAnnouncements,
      ] = await Promise.all([
        contributionOperations.findMany({
          limit: 500,
          sortBy: "createdAt",
          sortOrder: "desc",
          filters: { memberId, organizationId: activeOrganizationId ?? undefined },
        }),
        loanOperations.findMany({
          limit: 100,
          sortBy: "requestedAt",
          sortOrder: "desc",
          filters: { memberId, organizationId: activeOrganizationId ?? undefined },
        }),
        attendanceOperations.findMany({
          limit: 200,
          sortBy: "createdAt",
          sortOrder: "desc",
          filters: { memberId, organizationId: activeOrganizationId ?? undefined },
        }),
        penaltyOperations.findMany({
          limit: 100,
          sortBy: "createdAt",
          sortOrder: "desc",
          filters: { memberId, organizationId: activeOrganizationId ?? undefined },
        }),
        meetingOperations.findMany({
          limit: 3,
          sortBy: "scheduledAt",
          sortOrder: "asc",
          filters: { status: "scheduled", scheduledFrom: now },
        }),
        announcementOperations.findMany({
          limit: 4,
          sortBy: "createdAt",
          sortOrder: "desc",
          filters: { status: "published" },
        }),
      ])

      // --- Contribution stats ---
      const thisPeriodContribution = myContributions.find(
        (c) => c.period === contributionWindow.period
      )
      const totalSaved = myContributions
        .filter((c) => c.status === "confirmed")
        .reduce((sum, c) => sum + toNumber(c.amount), 0)

      const confirmedCount = myContributions.filter(
        (c) => c.status === "confirmed"
      ).length
      const pendingCount = myContributions.filter(
        (c) => c.status === "pending"
      ).length
      const lateCount = myContributions.filter(
        (c) => c.status === "late"
      ).length
      const waivedCount = myContributions.filter(
        (c) => c.status === "waived"
      ).length

      // Monthly history (last 6 months, anchored to the first contribution month)
      const { startDay } = siteConfig.platform.savings.contributionWindow
      const trendingPeriods = getContributionTrendPeriods(
        contributionWindow.period,
        6
      )
      const monthlyContributions = trendingPeriods
        .map((period) => {
          const periodDate = parse(period, "yyyy-MM", new Date())
          const monthLabel = format(periodDate, "MMM")
          const month = new Date(
            periodDate.getFullYear(),
            periodDate.getMonth(),
            1
          )
          const windowOpenDate = new Date(
            month.getFullYear(),
            month.getMonth(),
            startDay
          )

          if (windowOpenDate > now) return null

          const monthContribs = myContributions.filter((c) => c.period === period)
          const amount = monthContribs.reduce(
            (sum, c) => sum + toNumber(c.amount),
            0
          )
          const status = monthContribs[0]?.status || null
          return { month: monthLabel, period, amount, status }
        })
        .filter((entry): entry is NonNullable<typeof entry> => entry !== null)

      // Streak: consecutive confirmed periods (most recent first)
      let streak = 0
      for (let i = monthlyContributions.length - 1; i >= 0; i--) {
        if (monthlyContributions[i].status === "confirmed") {
          streak++
        } else {
          break
        }
      }

      // --- Loan stats ---
      const activeLoan = myLoans.find((l) =>
        ["disbursed", "repaying", "approved"].includes(l.status)
      )
      const overdueLoan = myLoans.find((l) => l.status === "overdue")
      const pendingLoanCount = myLoans.filter(
        (l) => l.status === "requested"
      ).length
      const loansByStatus = myLoans.reduce(
        (acc, l) => {
          acc[l.status] = (acc[l.status] || 0) + 1
          return acc
        },
        {} as Record<string, number>
      )

      // --- Attendance stats ---
      const totalMeetings = myAttendance.length
      const presentCount = myAttendance.filter((a) =>
        ["present", "late"].includes(a.status)
      ).length
      const attendanceRate =
        totalMeetings > 0 ? Math.round((presentCount / totalMeetings) * 100) : 0

      // --- Penalty stats ---
      const activePenalties = myPenalties.filter((p) => p.status === "active")
      const totalPenaltyAmount = activePenalties.reduce(
        (sum, p) => sum + toNumber(p.amount),
        0
      )

      const dashboardData = {
        member: {
          id: userProfile.id,
          name: userProfile.name,
          email: userProfile.email,
          role: effectiveRole,
        },
        stats: {
          savings: {
            totalSaved,
            thisPeriodAmount: toNumber(thisPeriodContribution?.amount),
            thisPeriodStatus: thisPeriodContribution?.status || null,
            confirmedCount,
            pendingCount,
            lateCount,
            waivedCount,
            streak,
          },
          loans: {
            total: myLoans.length,
            pendingRequests: pendingLoanCount,
            activeLoan: activeLoan
              ? {
                  id: activeLoan.id,
                  amount: toNumber(
                    activeLoan.approvedAmount || activeLoan.requestedAmount
                  ),
                  status: activeLoan.status,
                  dueDate: activeLoan.dueDate?.toString() || null,
                  termMonths: activeLoan.termMonths,
                  interestRate: toNumber(activeLoan.interestRate),
                }
              : null,
            isOverdue: !!overdueLoan,
            byStatus: loansByStatus,
          },
          attendance: {
            rate: attendanceRate,
            present: presentCount,
            total: totalMeetings,
            absent: myAttendance.filter((a) => a.status === "absent").length,
            excused: myAttendance.filter((a) => a.status === "excused").length,
          },
          penalties: {
            activeCount: activePenalties.length,
            totalAmount: totalPenaltyAmount,
          },
        },
        window: contributionWindow,
        contributions: {
          monthly: monthlyContributions,
          recent: myContributions.slice(0, 5).map((c) => ({
            id: c.id,
            amount: toNumber(c.amount),
            period: c.period,
            status: c.status,
            paidAt: c.paidAt?.toString() || null,
            receiptNumber: c.receiptNumber,
          })),
        },
        loans: {
          recent: myLoans.slice(0, 5).map((l) => ({
            id: l.id,
            requestedAmount: toNumber(l.requestedAmount),
            approvedAmount: l.approvedAmount
              ? toNumber(l.approvedAmount)
              : null,
            status: l.status,
            requestedAt: l.requestedAt.toString(),
            disbursedAt: l.disbursedAt?.toString() || null,
            dueDate: l.dueDate?.toString() || null,
            termMonths: l.termMonths,
          })),
        },
        meetings: {
          upcoming: upcomingMeetings.map((m) => ({
            id: m.id,
            title: m.title,
            scheduledAt: m.scheduledAt.toString(),
            location: m.location || null,
            status: m.status,
          })),
          recentAttendance: myAttendance.slice(0, 5).map((a) => ({
            id: a.id,
            meetingId: a.meetingId,
            status: a.status,
            checkedInAt: a.checkedInAt?.toString() || null,
            createdAt: a.createdAt.toString(),
          })),
        },
        announcements: {
          recent: memberAnnouncements.map((a) => ({
            id: a.id,
            title: a.title,
            summary: a.summary,
            pinned: a.pinned,
            publishedAt: a.publishedAt?.toString() || null,
          })),
        },
        penalties: {
          active: activePenalties.map((p) => ({
            id: p.id,
            amount: toNumber(p.amount),
            period: p.period,
            reason: p.reason,
            createdAt: p.createdAt.toString(),
          })),
        },
      }

      logger.info("Member dashboard data retrieved", {
        userId: userProfile.id,
        userRole: effectiveRole,
        requestId,
      })

      return successResponse(request, dashboardData, {
        message: "Member dashboard data retrieved successfully",
        startTime,
        links: {
          self: "/api/member-dashboard",
          contributions: "/api/contributions",
          loans: "/api/loans",
          meetings: "/api/meetings",
        },
        cacheControl: "private, max-age=60",
        rateLimit: rateLimitResult,
        metadata: {
          etag: generateETag(dashboardData),
          requestId,
        },
      })
    } catch (error) {
      logger.error("Error fetching member dashboard data:", error)
      throw error
    }
  })
)
