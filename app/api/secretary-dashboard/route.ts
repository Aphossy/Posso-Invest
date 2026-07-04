import { headers } from "next/headers"
import type { NextRequest } from "next/server"
import { siteConfig } from "@/constants/site-config"
import { db } from "@/db/connection"
import {
  actionItemOperations,
  announcementOperations,
  letterOperations,
  meetingOperations,
  minutesOperations,
  userOperations,
} from "@/db/operations"
import { attendanceOperations } from "@/db/operations/attendance-operations"
import { messageOperations } from "@/db/operations/message-operations"
import { member } from "@/db/schemas"
import logger from "@/utils/logger"
import { extractRoleValue, normalizeRoleValue } from "@/utils/role-utils"
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
        "[secretary-dashboard:getResolvedRole] member lookup failed",
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
        "[secretary-dashboard:getResolvedRole] getActiveMemberRole fallback failed",
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

export const GET = withRequestLogging(
  withApiResponse(async (request: NextRequest) => {
    const { startTime } = withTiming()
    const { requestId } = withRequestId()

    const rateLimitResult = await rateLimit("dashboard-secretary", 30, 60, {
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
        "Authentication required to access secretary dashboard",
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

    if (!["secretary", "admin"].includes(effectiveRole ?? "")) {
      logger.warn("[secretary-dashboard:GET] forbidden role", {
        userId: userProfile.id,
        role: effectiveRole,
        activeOrganizationId,
        sessionRole,
        profileRole,
      })
      return unauthorizedResponse(
        request,
        "Insufficient permissions to access secretary dashboard",
        { help: "Secretary role required.", startTime }
      )
    }

    try {
      const now = new Date()
      const sevenDaysOut = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

      const [
        upcomingMeetings,
        recentMeetings,
        recentMinutes,
        openActionItems,
        inProgressActionItems,
        blockedActionItems,
        dueSoonActionItems,
        recentlyDoneActionItems,
        latestMeetingAttendance,
        draftAnnouncements,
        recentPublishedAnnouncements,
        recentLetters,
        recentMessages,
        scheduledMeetingCount,
        completedMeetingCount,
        draftMinutesCount,
        finalizedMinutesCount,
        publishedMinutesCount,
        openActionCount,
        inProgressActionCount,
        blockedActionCount,
        doneActionCount,
        unreadMessageCount,
        draftLetterCount,
        sentLetterCount,
      ] = await Promise.all([
        meetingOperations.findMany({
          limit: 5,
          sortBy: "scheduledAt",
          sortOrder: "asc",
          filters: { status: "scheduled", scheduledFrom: now },
        }),
        meetingOperations.findMany({
          limit: 5,
          sortBy: "scheduledAt",
          sortOrder: "desc",
          filters: { status: "completed" },
        }),
        minutesOperations.findMany({
          limit: 6,
          sortBy: "updatedAt",
          sortOrder: "desc",
        }),
        actionItemOperations.findMany({
          limit: 10,
          sortBy: "dueDate",
          sortOrder: "asc",
          filters: { status: "open" },
        }),
        actionItemOperations.findMany({
          limit: 5,
          sortBy: "dueDate",
          sortOrder: "asc",
          filters: { status: "in_progress" },
        }),
        actionItemOperations.findMany({
          limit: 5,
          sortBy: "updatedAt",
          sortOrder: "desc",
          filters: { status: "blocked" },
        }),
        actionItemOperations.findMany({
          limit: 8,
          sortBy: "dueDate",
          sortOrder: "asc",
          filters: {
            status: ["open", "in_progress", "blocked"],
            dueTo: sevenDaysOut,
          },
        }),
        actionItemOperations.findMany({
          limit: 5,
          sortBy: "completedAt",
          sortOrder: "desc",
          filters: { status: "done" },
        }),
        // attendance for the most recent completed meeting
        meetingOperations
          .findMany({
            limit: 1,
            sortBy: "scheduledAt",
            sortOrder: "desc",
            filters: { status: "completed" },
          })
          .then(async (meetings) => {
            if (!meetings[0]) return []
            return attendanceOperations.findMany({
              limit: 200,
              filters: { meetingId: meetings[0].id },
            })
          }),
        announcementOperations.findMany({
          limit: 5,
          sortBy: "updatedAt",
          sortOrder: "desc",
          filters: { status: "draft" },
        }),
        announcementOperations.findMany({
          limit: 4,
          sortBy: "publishedAt",
          sortOrder: "desc",
          filters: { status: "published" },
        }),
        letterOperations.findMany({
          limit: 5,
          sortBy: "createdAt",
          sortOrder: "desc",
        }),
        messageOperations.findMany({
          limit: 5,
          sortBy: "createdAt",
          sortOrder: "desc",
          filters: { isArchived: false },
        }),
        meetingOperations.count({ filters: { status: "scheduled" } }),
        meetingOperations.count({ filters: { status: "completed" } }),
        minutesOperations.count({ filters: { status: "draft" } }),
        minutesOperations.count({ filters: { status: "finalized" } }),
        minutesOperations.count({ filters: { status: "published" } }),
        actionItemOperations.count({ filters: { status: "open" } }),
        actionItemOperations.count({ filters: { status: "in_progress" } }),
        actionItemOperations.count({ filters: { status: "blocked" } }),
        actionItemOperations.count({ filters: { status: "done" } }),
        messageOperations.count({
          filters: { isRead: false, isArchived: false },
        }),
        letterOperations.count({ filters: { status: "draft" } }),
        letterOperations.count({ filters: { status: "sent" } }),
      ])

      // ── Attendance for last meeting ──
      const lastAttendanceTotal = latestMeetingAttendance.length
      const lastAttendancePresent = latestMeetingAttendance.filter((a) =>
        ["present", "late"].includes(a.status)
      ).length
      const lastAttendanceRate =
        lastAttendanceTotal > 0
          ? Math.round((lastAttendancePresent / lastAttendanceTotal) * 100)
          : 0

      // ── Resolve owner names for action items ──
      const ownerIds = new Set<string>()
      ;[
        ...openActionItems,
        ...inProgressActionItems,
        ...blockedActionItems,
        ...dueSoonActionItems,
      ].forEach((a) => {
        if (a.ownerId) ownerIds.add(a.ownerId)
      })
      const ownerUsers =
        ownerIds.size > 0
          ? await userOperations.findByIds(Array.from(ownerIds))
          : []
      const ownerMap = new Map(ownerUsers.map((u) => [u.id, u.name || u.email]))

      const mapActionItem = (item: (typeof openActionItems)[0]) => ({
        id: item.id,
        title: item.title,
        status: item.status,
        priority: item.priority,
        dueDate: item.dueDate?.toString() || null,
        completedAt: item.completedAt?.toString() || null,
        ownerName: item.ownerId ? (ownerMap.get(item.ownerId) ?? null) : null,
        meetingId: item.meetingId,
      })

      const { membershipCount } = siteConfig.platform.governance

      const dashboardData = {
        secretary: {
          id: userProfile.id,
          name: userProfile.name,
          email: userProfile.email,
          role: effectiveRole,
        },
        stats: {
          meetings: {
            upcoming: scheduledMeetingCount,
            completed: completedMeetingCount,
            nextMeeting: upcomingMeetings[0]?.scheduledAt?.toString() || null,
            nextMeetingTitle: upcomingMeetings[0]?.title || null,
            nextMeetingLocation: upcomingMeetings[0]?.location || null,
          },
          minutes: {
            draft: draftMinutesCount,
            finalized: finalizedMinutesCount,
            published: publishedMinutesCount,
            total:
              draftMinutesCount + finalizedMinutesCount + publishedMinutesCount,
          },
          actionItems: {
            open: openActionCount,
            inProgress: inProgressActionCount,
            blocked: blockedActionCount,
            done: doneActionCount,
            dueSoon: dueSoonActionItems.length,
          },
          attendance: {
            lastMeetingRate: lastAttendanceRate,
            lastMeetingPresent: lastAttendancePresent,
            lastMeetingTotal: lastAttendanceTotal,
            membershipCount,
          },
          communications: {
            unreadMessages: unreadMessageCount,
            draftAnnouncements: draftAnnouncements.length,
            draftLetters: draftLetterCount,
            sentLetters: sentLetterCount,
          },
        },
        meetings: {
          upcoming: upcomingMeetings.map((m) => ({
            id: m.id,
            title: m.title,
            scheduledAt: m.scheduledAt.toString(),
            location: m.location || null,
            status: m.status,
            agenda: m.agenda || null,
          })),
          recent: recentMeetings.map((m) => ({
            id: m.id,
            title: m.title,
            scheduledAt: m.scheduledAt.toString(),
            status: m.status,
          })),
        },
        minutes: {
          recent: recentMinutes.map((m) => ({
            id: m.id,
            meetingId: m.meetingId,
            status: m.status,
            summary: m.summary || null,
            publishedAt: m.publishedAt?.toString() || null,
            updatedAt: m.updatedAt.toString(),
          })),
        },
        actionItems: {
          open: openActionItems.map(mapActionItem),
          inProgress: inProgressActionItems.map(mapActionItem),
          blocked: blockedActionItems.map(mapActionItem),
          dueSoon: dueSoonActionItems.map(mapActionItem),
          recentlyDone: recentlyDoneActionItems.map(mapActionItem),
        },
        announcements: {
          drafts: draftAnnouncements.map((a) => ({
            id: a.id,
            title: a.title,
            audience: a.audience,
            updatedAt: a.updatedAt.toString(),
          })),
          recentPublished: recentPublishedAnnouncements.map((a) => ({
            id: a.id,
            title: a.title,
            audience: a.audience,
            pinned: a.pinned,
            publishedAt: a.publishedAt?.toString() || null,
          })),
        },
        letters: {
          recent: recentLetters.map((l) => ({
            id: l.id,
            subject: l.subject,
            letterType: l.letterType,
            status: l.status,
            recipient: l.recipient || null,
            refNumber: l.refNumber || null,
            createdAt: l.createdAt.toString(),
          })),
        },
        messages: {
          recent: recentMessages.map((m) => ({
            id: m.id,
            subject: m.subject,
            name: m.name || null,
            status: m.status,
            isRead: m.isRead,
            createdAt: m.createdAt.toString(),
          })),
          unreadCount: unreadMessageCount,
        },
      }

      logger.info("Secretary dashboard data retrieved", {
        userId: userProfile.id,
        userRole: effectiveRole,
        requestId,
      })

      return successResponse(request, dashboardData, {
        message: "Secretary dashboard data retrieved successfully",
        startTime,
        links: {
          self: "/api/secretary-dashboard",
          meetings: "/api/meetings",
          minutes: "/api/minutes",
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
      logger.error("Error fetching secretary dashboard data:", error)
      throw error
    }
  })
)
