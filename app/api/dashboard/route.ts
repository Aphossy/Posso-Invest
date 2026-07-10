import { headers } from "next/headers"
import type { NextRequest } from "next/server"
import { siteConfig } from "@/constants/site-config"
import { db, dbHealthCheck } from "@/db/connection"
import {
  actionItemOperations,
  announcementOperations,
  contributionOperations,
  loanOperations,
  meetingOperations,
  userOperations,
} from "@/db/operations"
import { attendanceOperations } from "@/db/operations/attendance-operations"
import { messageOperations } from "@/db/operations/message-operations"
import { invitation, member, user } from "@/db/schemas"
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
import { rateLimit } from "@/lib/rate-limiter"

const toNumber = (value?: string | number | null) => (value ? Number(value) : 0)

export const GET = withRequestLogging(
  withApiResponse(async (request: NextRequest) => {
    const { startTime } = withTiming()
    const { requestId } = withRequestId()

    const rateLimitResult = await rateLimit("dashboard-admin", 30, 60, {
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

    const headersList = await headers()
    const session = await auth.api.getSession({
      headers: headersList,
    })

    if (!session) {
      return unauthorizedResponse(
        request,
        "Authentication required to access admin dashboard",
        {
          help: "Please sign in to view dashboard data.",
          startTime,
        }
      )
    }

    const userProfile = await userOperations.getProfileByUserId(
      session.user.id as string
    )

    if (!userProfile) {
      return unauthorizedResponse(request, "User profile not found.", {
        help: "Please sign in again to refresh your session.",
        startTime,
      })
    }

    const activeOrganizationId = session?.session?.activeOrganizationId
    let resolvedRole = normalizeRoleValue(userProfile.role)

    if (userProfile.id && activeOrganizationId) {
      try {
        const membershipRows = await db
          .select({ role: member.role })
          .from(member)
          .where(
            and(
              eq(member.organizationId, activeOrganizationId),
              eq(member.userId, userProfile.id)
            )
          )
          .limit(1)

        resolvedRole = normalizeRoleValue(membershipRows[0]?.role) ?? resolvedRole
      } catch (error) {
        logger.error("[dashboard:GET] member role lookup failed", {
          userId: userProfile.id,
          activeOrganizationId,
          error,
        })
      }
    }

    if (!resolvedRole || resolvedRole === "member") {
      try {
        const orgApi = (auth.api as any).organization
        const roleResponse = orgApi?.getActiveMemberRole
          ? await orgApi.getActiveMemberRole({ headers: headersList })
          : null
        resolvedRole = normalizeRoleValue(extractRoleValue(roleResponse)) ?? resolvedRole
      } catch (error) {
        logger.error("[dashboard:GET] getActiveMemberRole fallback failed", {
          userId: userProfile.id,
          activeOrganizationId,
          error,
        })
      }
    }

    if (resolvedRole !== "admin") {
      return unauthorizedResponse(
        request,
        "Insufficient permissions to access admin dashboard",
        {
          help: "Admin role required.",
          startTime,
        }
      )
    }

    try {
      const now = new Date()
      const currentYear = now.getFullYear()
      const currentMonth = now.getMonth()
      const sixMonthsAgo = new Date(currentYear, currentMonth - 5, 1)

      const [
        allContributions,
        allLoans,
        recentMeetings,
        upcomingMeetings,
        urgentActionItems,
        recentAnnouncements,
        recentMessages,
        healthStatus,
        loanTotalCount,
        actionOpenCount,
        actionInProgressCount,
        actionBlockedCount,
        announcementPublishedCount,
        announcementDraftCount,
        announcementPinnedCount,
        unreadMessageCount,
        meetingCompletedCount,
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
        meetingOperations.findMany({
          limit: 4,
          sortBy: "scheduledAt",
          sortOrder: "desc",
        }),
        meetingOperations.findMany({
          limit: 3,
          sortBy: "scheduledAt",
          sortOrder: "asc",
          filters: {
            status: "scheduled",
            scheduledFrom: now,
          },
        }),
        actionItemOperations.findMany({
          limit: 5,
          sortBy: "dueDate",
          sortOrder: "asc",
          filters: {
            status: ["open", "in_progress", "blocked"],
            dueTo: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
          },
        }),
        announcementOperations.findMany({
          limit: 3,
          sortBy: "createdAt",
          sortOrder: "desc",
        }),
        messageOperations.findMany({
          limit: 3,
          sortBy: "createdAt",
          sortOrder: "desc",
          filters: { isArchived: false },
        }),
        dbHealthCheck(),
        loanOperations.count(),
        actionItemOperations.count({ filters: { status: "open" } }),
        actionItemOperations.count({ filters: { status: "in_progress" } }),
        actionItemOperations.count({ filters: { status: "blocked" } }),
        announcementOperations.count({ filters: { status: "published" } }),
        announcementOperations.count({ filters: { status: "draft" } }),
        announcementOperations.count({ filters: { pinned: true } }),
        messageOperations.count({
          filters: { isRead: false, isArchived: false },
        }),
        meetingOperations.count({ filters: { status: "completed" } }),
      ])

      const latestMeeting = recentMeetings[0]
      const actionDueSoonCount = urgentActionItems.length
      const meetingUpcomingCount = upcomingMeetings.length
      const attendanceRecords = latestMeeting
        ? await attendanceOperations.findMany({
            limit: 200,
            filters: { meetingId: latestMeeting.id },
          })
        : []

      const attendanceByStatus = attendanceRecords.reduce(
        (acc, record) => {
          acc[record.status] = (acc[record.status] || 0) + 1
          return acc
        },
        {} as Record<string, number>
      )

      const attendanceTotal = attendanceRecords.length
      const attendancePresent =
        (attendanceByStatus.present || 0) + (attendanceByStatus.late || 0)
      const attendanceRate =
        attendanceTotal > 0
          ? Math.round((attendancePresent / attendanceTotal) * 100)
          : 0

      const activeOrgId = session?.session?.activeOrganizationId
      const memberCountQuery = activeOrgId
        ? db
            .select({ count: count() })
            .from(member)
            .where(eq(member.organizationId, activeOrgId))
        : db.select({ count: count() }).from(member)
      const memberRoleQuery = activeOrgId
        ? db
            .select({ role: member.role, count: count() })
            .from(member)
            .where(eq(member.organizationId, activeOrgId))
            .groupBy(member.role)
        : db
            .select({ role: user.role, count: count() })
            .from(user)
            .groupBy(user.role)
      const invitationQuery = activeOrgId
        ? db
            .select({ count: count() })
            .from(invitation)
            .where(
              and(
                eq(invitation.organizationId, activeOrgId),
                eq(invitation.status, "pending")
              )
            )
        : db
            .select({ count: count() })
            .from(invitation)
            .where(eq(invitation.status, "pending"))

      const [[memberCountResult], memberRoles, [invitationCountResult]] =
        await Promise.all([memberCountQuery, memberRoleQuery, invitationQuery])

      const membersTotal = Number(
        memberCountResult?.count ??
          siteConfig.platform.governance.membershipCount
      )
      const memberRolesMap = memberRoles.reduce(
        (
          acc: { [x: string]: number },
          item: { role: string | number; count: any }
        ) => {
          acc[item.role] = Number(item.count)
          return acc
        },
        {} as Record<string, number>
      )

      const contributionWindow = getContributionWindow(now)

      const thisPeriodContributions = allContributions.filter(
        (item) => item.period === contributionWindow.period
      )

      // All status counts are scoped to the current contribution window period
      const confirmedCount = thisPeriodContributions.filter(
        (item) => item.status === "confirmed"
      ).length
      const pendingCount = thisPeriodContributions.filter(
        (item) => item.status === "pending"
      ).length
      const lateCount = thisPeriodContributions.filter(
        (item) => item.status === "late"
      ).length
      const waivedCount = thisPeriodContributions.filter(
        (item) => item.status === "waived"
      ).length

      const totalContributionAmount = allContributions.reduce(
        (sum, item) => sum + toNumber(item.amount),
        0
      )
      const thisMonthContributionAmount = thisPeriodContributions.reduce(
        (sum, item) => sum + toNumber(item.amount),
        0
      )
      const confirmedThisMonthAmount = thisPeriodContributions
        .filter((item) => item.status === "confirmed")
        .reduce((sum, item) => sum + toNumber(item.amount), 0)

      // Outstanding = unpaid obligations in the current period only
      const outstandingAmount = thisPeriodContributions
        .filter((item) => ["pending", "late"].includes(item.status))
        .reduce((sum, item) => sum + toNumber(item.amount), 0)

      // Target uses the canonical membership count from config, not the live DB total
      const expectedThisMonth =
        siteConfig.platform.governance.membershipCount *
        siteConfig.platform.savings.monthlyContributionRwf
      const collectionRate =
        expectedThisMonth > 0
          ? Math.min(
              100,
              Math.round((confirmedThisMonthAmount / expectedThisMonth) * 100)
            )
          : 0

      // Status breakdown scoped to the current period
      const contributionsByStatus = thisPeriodContributions.reduce(
        (acc, item) => {
          const status = item.status || "unknown"
          acc[status] = (acc[status] || 0) + 1
          return acc
        },
        {} as Record<string, number>
      )

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
        const month = format(periodDate, "MMM")
        const periodContributions = allContributions.filter(
          (item) => item.period === period
        )
        const total = periodContributions.reduce(
          (sum, item) => sum + toNumber(item.amount),
          0
        )
        const confirmed = periodContributions
          .filter((item) => item.status === "confirmed")
          .reduce((sum, item) => sum + toNumber(item.amount), 0)
        const late = periodContributions
          .filter((item) => item.status === "late")
          .reduce((sum, item) => sum + toNumber(item.amount), 0)

        return { month, period, total, confirmed, late }
      })

      const loansByStatus = allLoans.reduce(
        (acc, item) => {
          const status = item.status || "unknown"
          acc[status] = (acc[status] || 0) + 1
          return acc
        },
        {} as Record<string, number>
      )

      const outstandingLoanAmount = allLoans
        .filter((item) =>
          ["disbursed", "repaying", "overdue"].includes(item.status)
        )
        .reduce(
          (sum, item) =>
            sum + toNumber(item.approvedAmount || item.requestedAmount),
          0
        )

      const loanMonthly = []
      const loansInRange = allLoans.filter((item) => {
        const requestedAt = item.requestedAt
          ? new Date(item.requestedAt)
          : undefined
        return requestedAt && requestedAt >= sixMonthsAgo
      })

      for (let i = 5; i >= 0; i--) {
        const month = new Date(currentYear, currentMonth - i, 1)
        const nextMonth = new Date(currentYear, currentMonth - i + 1, 1)
        const monthLabel = month.toLocaleString("default", { month: "short" })
        const monthLoans = loansInRange.filter((item) => {
          const requestedAt = item.requestedAt
            ? new Date(item.requestedAt)
            : undefined
          return requestedAt && requestedAt >= month && requestedAt < nextMonth
        })
        const disbursed = loansInRange.filter((item) => {
          const disbursedAt = item.disbursedAt
            ? new Date(item.disbursedAt)
            : undefined
          return disbursedAt && disbursedAt >= month && disbursedAt < nextMonth
        })
        loanMonthly.push({
          month: monthLabel,
          requested: monthLoans.length,
          disbursed: disbursed.length,
        })
      }

      const recentContributions = allContributions.slice(0, 5)
      const recentLoans = allLoans.slice(0, 5)

      const relatedUserIds = new Set<string>()
      recentContributions.forEach((item) => relatedUserIds.add(item.memberId))
      recentLoans.forEach((item) => relatedUserIds.add(item.memberId))
      urgentActionItems.forEach((item) => {
        if (item.ownerId) relatedUserIds.add(item.ownerId)
      })

      const relatedUsers = await userOperations.findByIds(
        Array.from(relatedUserIds)
      )
      const userMap = new Map(
        relatedUsers.map((item) => [item.id, item.name || "Member"])
      )

      const activity = [
        ...recentContributions.map((item) => ({
          id: `contribution-${item.id}`,
          type: "contribution" as const,
          title: "Contribution recorded",
          description: `${userMap.get(item.memberId) || "Member"} - RWF ${toNumber(item.amount).toLocaleString()}`,
          timestamp: (item.paidAt || item.createdAt || now).toString(),
          status: item.status,
        })),
        ...recentLoans.map((item) => ({
          id: `loan-${item.id}`,
          type: "loan" as const,
          title: "Loan request updated",
          description: `${userMap.get(item.memberId) || "Member"} - RWF ${toNumber(item.requestedAmount).toLocaleString()}`,
          timestamp: (item.requestedAt || item.createdAt || now).toString(),
          status: item.status,
        })),
        ...recentMeetings.map((item) => ({
          id: `meeting-${item.id}`,
          type: "meeting" as const,
          title: "Meeting update",
          description: `${item.title} - ${item.status}`,
          timestamp: item.scheduledAt.toString(),
          status: item.status,
        })),
        ...recentAnnouncements.map((item) => ({
          id: `announcement-${item.id}`,
          type: "announcement" as const,
          title: "Announcement update",
          description: `${item.title} - ${item.audience}`,
          timestamp: (item.publishedAt || item.createdAt || now).toString(),
          status: item.status,
        })),
      ]
        .filter((item) => item.timestamp)
        .sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )
        .slice(0, 8)

      const dashboardData = {
        stats: {
          contributions: {
            totalAmount: totalContributionAmount,
            thisMonthAmount: thisMonthContributionAmount,
            expectedThisMonth,
            outstandingAmount,
            confirmedCount,
            pendingCount,
            lateCount,
            waivedCount,
            collectionRate,
          },
          loans: {
            total: loanTotalCount,
            outstandingAmount: outstandingLoanAmount,
            requested: loansByStatus.requested || 0,
            approved: loansByStatus.approved || 0,
            disbursed: loansByStatus.disbursed || 0,
            repaying: loansByStatus.repaying || 0,
            overdue: loansByStatus.overdue || 0,
            repaid: loansByStatus.repaid || 0,
          },
          members: {
            total: membersTotal,
            active: membersTotal,
            invitationsPending: Number(invitationCountResult?.count || 0),
            byRole: memberRolesMap,
          },
          meetings: {
            upcoming: meetingUpcomingCount,
            completed: meetingCompletedCount,
            nextMeeting: upcomingMeetings[0]?.scheduledAt?.toString() || null,
          },
          attendance: {
            latestMeetingRate: attendanceRate,
            present: attendanceByStatus.present || 0,
            absent: attendanceByStatus.absent || 0,
            late: attendanceByStatus.late || 0,
            excused: attendanceByStatus.excused || 0,
          },
          actionItems: {
            open: actionOpenCount,
            inProgress: actionInProgressCount,
            blocked: actionBlockedCount,
            dueSoon: actionDueSoonCount,
          },
          announcements: {
            published: announcementPublishedCount,
            draft: announcementDraftCount,
            pinned: announcementPinnedCount,
          },
          messages: {
            unread: unreadMessageCount,
          },
          activity,
        },
        window: contributionWindow,
        contributions: {
          byStatus: contributionsByStatus,
          monthly: monthlyContributions,
        },
        loans: {
          byStatus: loansByStatus,
          monthly: loanMonthly,
        },
        meetings: {
          upcoming: upcomingMeetings.map((item) => ({
            id: item.id,
            title: item.title,
            scheduledAt: item.scheduledAt.toString(),
            location: item.location || null,
            status: item.status,
          })),
        },
        actionItems: {
          urgent: urgentActionItems.map((item) => ({
            id: item.id,
            title: item.title,
            dueDate: item.dueDate ? item.dueDate.toString() : null,
            status: item.status,
            priority: item.priority,
            ownerName: item.ownerId ? userMap.get(item.ownerId) : null,
          })),
        },
        announcements: {
          recent: recentAnnouncements.map((item) => ({
            id: item.id,
            title: item.title,
            status: item.status,
            audience: item.audience,
            publishedAt: item.publishedAt ? item.publishedAt.toString() : null,
          })),
        },
        messages: {
          recent: recentMessages.map((item) => ({
            id: item.id,
            subject: item.subject,
            status: item.status,
            createdAt: item.createdAt.toString(),
            name: item.name || null,
          })),
        },
        health: healthStatus,
      }

      logger.info("Admin dashboard data retrieved", {
        userId: userProfile.id,
        userRole: resolvedRole,
        requestId,
      })

      return successResponse(request, dashboardData, {
        message: "Admin dashboard data retrieved successfully",
        startTime,
        links: {
          self: "/api/dashboard",
          contributions: "/api/contributions",
          loans: "/api/loans",
          meetings: "/api/meetings",
          actionItems: "/api/action-items",
          announcements: "/api/announcements",
        },
        cacheControl: "private, max-age=60",
        rateLimit: rateLimitResult,
        metadata: {
          etag: generateETag(dashboardData),
          requestId,
        },
      })
    } catch (error) {
      logger.error("Error fetching admin dashboard data:", error)
      throw error
    }
  })
)
