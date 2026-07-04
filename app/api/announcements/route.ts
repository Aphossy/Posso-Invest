import { headers } from "next/headers"
import { NextResponse } from "next/server"
import { db } from "@/db/connection"
import { announcementOperations } from "@/db/operations/announcement-operations"
import { userOperations } from "@/db/operations/user-operations"
import { member, user as userTable } from "@/db/schemas"
import { insertAnnouncementSchema } from "@/db/schemas/announcement-schema"
import { inngest } from "@/inngest/client"
import logger from "@/utils/logger"
import {
  createBulkNotifications,
  type NotificationPayload,
} from "@/utils/notification-utils"
import { extractRoleValue } from "@/utils/role-utils"
import { and, eq, inArray } from "drizzle-orm"
import { z } from "zod"

import {
  DOMAIN_NOTIFICATION_TYPE,
  NOTIFICATION_ACTION,
} from "@/types/notifications"
import { auth } from "@/lib/auth"

const listSchema = z.object({
  status: z.string().optional(),
  audience: z.string().optional(),
  createdBy: z.string().optional(),
  pinned: z.coerce.boolean().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().min(1).max(200).optional(),
  offset: z.coerce.number().min(0).optional(),
})

const createSchema = insertAnnouncementSchema
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    createdBy: true,
    updatedBy: true,
  })
  .extend({
    publishedAt: z.coerce.date().optional(),
    expiresAt: z.coerce.date().optional(),
  })

const allOrgRoles = [
  "admin",
  "president",
  "secretary",
  "treasurer",
  "member",
] as const

function getAudienceRoles(audience: string): readonly string[] {
  if (audience === "committee") {
    return ["admin", "president", "secretary", "treasurer"] as const
  }

  if (audience === "members") {
    return ["member"] as const
  }

  return allOrgRoles
}

async function getResolvedRole() {
  const headersList = await headers()
  const session = await auth.api.getSession({ headers: headersList })
  const sessionUser = session?.user || null
  const sessionRole = sessionUser?.role ?? null
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
      activeRole = rows[0]?.role ?? null
    } catch (error) {
      console.error("[announcements:getResolvedRole] member lookup failed", {
        userId: sessionUser.id,
        activeOrganizationId,
        error,
      })
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
      console.error(
        "[announcements:getResolvedRole] getActiveMemberRole fallback failed",
        {
          userId: sessionUser?.id,
          activeOrganizationId,
          error,
        }
      )
    }
  }

  if (sessionUser && !activeRole) {
    console.warn("[announcements:getResolvedRole] unresolved active role", {
      userId: sessionUser.id,
      activeOrganizationId,
      sessionRole,
    })
  }

  return {
    user: sessionUser,
    role: activeRole,
    activeOrganizationId,
    sessionRole,
  }
}

async function getAnnouncementRecipients(
  activeOrganizationId: string | null | undefined,
  audience: string
) {
  if (!activeOrganizationId) return []

  try {
    const roles = getAudienceRoles(audience)

    const rows = await db
      .select({
        userId: userTable.id,
        name: userTable.name,
        email: userTable.email,
        role: member.role,
      })
      .from(member)
      .innerJoin(userTable, eq(member.userId, userTable.id))
      .where(
        and(
          eq(member.organizationId, activeOrganizationId),
          inArray(member.role, [...roles])
        )
      )

    const deduped = new Map<
      string,
      { userId: string; name: string; email: string; role: string }
    >()

    for (const row of rows) {
      if (!row.email) continue
      deduped.set(row.userId, row)
    }

    return [...deduped.values()]
  } catch (error) {
    console.error("[announcements:getAnnouncementRecipients] lookup failed", {
      activeOrganizationId,
      audience,
      error,
    })
    return []
  }
}

function apiError(
  code: string,
  message: string,
  status: number,
  details: Record<string, any> = {},
  help?: string
) {
  return NextResponse.json(
    {
      success: false,
      data: null,
      error: { code, message, details, help },
    },
    { status }
  )
}

export async function GET(request: Request) {
  const { user, role } = await getResolvedRole()
  if (!user) {
    return apiError(
      "UNAUTHORIZED",
      "You must be signed in to view announcements.",
      401,
      {},
      "Please sign in and try again."
    )
  }

  const params = listSchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams)
  )
  if (!params.success) {
    return apiError(
      "VALIDATION_ERROR",
      "Invalid query parameters.",
      400,
      { zodErrors: params.error.flatten() },
      "Please check your query parameters and try again."
    )
  }

  const isPrivileged = ["admin", "secretary", "president"].includes(role ?? "")

  const statusValues = params.data.status
    ?.split(",")
    .map((v) => v.trim())
    .filter(Boolean)
  const audienceValues = params.data.audience
    ?.split(",")
    .map((v) => v.trim())
    .filter(Boolean)

  const statusFilter = !isPrivileged
    ? ["published"]
    : statusValues && statusValues.length > 0
      ? statusValues
      : undefined
  const audienceFilter = !isPrivileged
    ? ["members", "public", "committee"]
    : audienceValues && audienceValues.length > 0
      ? audienceValues
      : undefined

  const announcements = await announcementOperations.findMany({
    limit: params.data.limit,
    offset: params.data.offset,
    filters: {
      status: statusFilter,
      audience: audienceFilter,
      createdBy: params.data.createdBy,
      pinned: params.data.pinned,
      search: params.data.search,
    },
  })

  const userIds = new Set<string>()
  announcements.forEach((item) => {
    if (item.createdBy) userIds.add(item.createdBy)
    if (item.updatedBy) userIds.add(item.updatedBy)
  })
  const users = await userOperations.findByIds([...userIds])
  const userMap = new Map(users.map((u) => [u.id, u]))

  const enriched = announcements.map((item) => ({
    ...item,
    createdByName: item.createdBy
      ? (userMap.get(item.createdBy)?.name ?? null)
      : null,
    updatedByName: item.updatedBy
      ? (userMap.get(item.updatedBy)?.name ?? null)
      : null,
  }))

  const total = await announcementOperations.count({
    filters: {
      status: statusFilter,
      audience: audienceFilter,
      createdBy: params.data.createdBy,
      pinned: params.data.pinned,
    },
  })

  return NextResponse.json({
    success: true,
    data: enriched,
    total,
    error: null,
  })
}

export async function POST(request: Request) {
  const { user, role, activeOrganizationId, sessionRole } =
    await getResolvedRole()
  if (!user) {
    return apiError(
      "UNAUTHORIZED",
      "You must be signed in to create an announcement.",
      401,
      {},
      "Please sign in and try again."
    )
  }

  if (!["admin", "secretary", "president"].includes(role ?? "")) {
    console.warn("[announcements:POST] forbidden role", {
      userId: user.id,
      role,
      activeOrganizationId,
      sessionRole,
    })
    return apiError(
      "FORBIDDEN",
      "Only secretaries, presidents and admins can create announcements.",
      403,
      { role, activeOrganizationId, sessionRole },
      "Make sure you are using an active Secretary, President or Admin organization role."
    )
  }

  const body = await request.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "Invalid announcement payload.",
      400,
      {
        validationErrors: parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
      "Please review the highlighted fields and try again."
    )
  }

  const created = await announcementOperations.create({
    ...parsed.data,
    id: crypto.randomUUID(),
    createdBy: user.id,
    updatedBy: user.id,
  })

  if (created.status === "published") {
    const recipients = await getAnnouncementRecipients(
      activeOrganizationId,
      created.audience
    )

    try {
      await inngest.send({
        id: `ikimina-announcement-published-${created.id}`,
        name: "ikimina/announcement.published",
        data: {
          organizationId: activeOrganizationId || "unknown-org",
          announcementId: created.id,
          title: created.title,
          summary: created.summary,
          content: created.content,
          audience: created.audience,
          publishedAt: created.publishedAt?.toISOString(),
          expiresAt: created.expiresAt?.toISOString(),
          pinned: created.pinned,
          createdByName: user.name,
        },
      })
    } catch (error) {
      logger.error("Failed to emit announcement published event", {
        announcementId: created.id,
        error,
      })
    }

    // Create in-app notifications for published announcements (non-blocking)
    try {
      const notificationPayloads: NotificationPayload[] = recipients.map(
        (recipient) => ({
          userId: recipient.userId,
          type: DOMAIN_NOTIFICATION_TYPE.ANNOUNCEMENT,
          title: `New Announcement: ${created.title}`,
          message: created.summary || "A new announcement has been published.",
          data: {
            announcementId: created.id,
            title: created.title,
            summary: created.summary,
            content: created.content,
            audience: created.audience,
            status: created.status,
            pinned: created.pinned,
            publishedAt: created.publishedAt?.toISOString(),
            expiresAt: created.expiresAt?.toISOString(),
            createdBy: user.id,
            createdByName: user.name,
            recipientRole: recipient.role,
            action: NOTIFICATION_ACTION.VIEW_ANNOUNCEMENT,
          },
        })
      )

      if (notificationPayloads.length > 0) {
        await createBulkNotifications(notificationPayloads)
      }
    } catch (notificationError) {
      logger.error("Failed to create announcement in-app notifications", {
        error: notificationError,
        announcementId: created.id,
      })
    }
  }

  return NextResponse.json(
    {
      success: true,
      data: { announcement: created },
      message: "Announcement created successfully.",
      error: null,
    },
    { status: 201 }
  )
}
