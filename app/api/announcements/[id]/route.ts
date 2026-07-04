import { headers } from "next/headers"
import { NextResponse } from "next/server"
import { db } from "@/db/connection"
import { announcementOperations } from "@/db/operations/announcement-operations"
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

const updateSchema = insertAnnouncementSchema
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    createdBy: true,
    updatedBy: true,
  })
  .partial()
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
      console.error("[announcements:id:getResolvedRole] member lookup failed", {
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
        "[announcements:id:getResolvedRole] getActiveMemberRole fallback failed",
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
    console.error(
      "[announcements:id:getAnnouncementRecipients] lookup failed",
      {
        activeOrganizationId,
        audience,
        error,
      }
    )
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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const { id } = await params
  const record = await announcementOperations.findById(id)
  if (!record) {
    return apiError(
      "NOT_FOUND",
      "Announcement not found.",
      404,
      { announcementId: id },
      "Refresh the page and try again."
    )
  }

  const isPrivileged = ["admin", "secretary", "president"].includes(role ?? "")
  if (!isPrivileged && record.status !== "published") {
    return apiError(
      "FORBIDDEN",
      "You do not have permission to view this announcement.",
      403,
      {},
      "Make sure you are using an active organization role."
    )
  }

  return NextResponse.json({ success: true, data: record, error: null })
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, role, activeOrganizationId, sessionRole } =
    await getResolvedRole()
  if (!user) {
    return apiError(
      "UNAUTHORIZED",
      "You must be signed in to update an announcement.",
      401,
      {},
      "Please sign in and try again."
    )
  }

  if (!["admin", "secretary", "president"].includes(role ?? "")) {
    return apiError(
      "FORBIDDEN",
      "Only secretaries, admins, and presidents can update announcements.",
      403,
      { role, activeOrganizationId, sessionRole },
      "Make sure you are using an active Secretary, Admin, or President organization role."
    )
  }

  const body = await request.json()
  const parsed = updateSchema.safeParse(body)
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

  const { id } = await params
  const existing = await announcementOperations.findById(id)
  if (!existing) {
    return apiError(
      "NOT_FOUND",
      "Announcement not found.",
      404,
      { announcementId: id },
      "Refresh the page and try again."
    )
  }

  const updated = await announcementOperations.updateById(id, {
    ...parsed.data,
    updatedBy: user.id,
  })
  if (!updated) {
    return apiError(
      "NOT_FOUND",
      "Announcement not found.",
      404,
      { announcementId: id },
      "Refresh the page and try again."
    )
  }

  const hasPublishedTransition =
    existing.status === "draft" && updated.status === "published"

  if (hasPublishedTransition) {
    const recipients = await getAnnouncementRecipients(
      activeOrganizationId,
      updated.audience
    )

    try {
      await inngest.send({
        id: `ikimina-announcement-published-${updated.id}`,
        name: "ikimina/announcement.published",
        data: {
          organizationId: activeOrganizationId || "unknown-org",
          announcementId: updated.id,
          title: updated.title,
          summary: updated.summary,
          content: updated.content,
          audience: updated.audience,
          publishedAt: updated.publishedAt?.toISOString(),
          expiresAt: updated.expiresAt?.toISOString(),
          pinned: updated.pinned,
          createdByName: user.name,
        },
      })
    } catch (error) {
      logger.error("Failed to emit announcement transition event", {
        announcementId: updated.id,
        error,
      })
    }

    // Create in-app notifications for draft-to-published transitions (non-blocking)
    try {
      const notificationPayloads: NotificationPayload[] = recipients.map(
        (recipient) => ({
          userId: recipient.userId,
          type: DOMAIN_NOTIFICATION_TYPE.ANNOUNCEMENT,
          title: `New Announcement: ${updated.title}`,
          message: updated.summary || "A new announcement has been published.",
          data: {
            announcementId: updated.id,
            title: updated.title,
            summary: updated.summary,
            content: updated.content,
            audience: updated.audience,
            status: updated.status,
            pinned: updated.pinned,
            publishedAt: updated.publishedAt?.toISOString(),
            expiresAt: updated.expiresAt?.toISOString(),
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
      logger.error(
        "Failed to create announcement transition in-app notifications",
        {
          error: notificationError,
          announcementId: updated.id,
        }
      )
    }
  }

  return NextResponse.json({
    success: true,
    data: { announcement: updated },
    message: "Announcement updated successfully.",
    error: null,
  })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, role, activeOrganizationId, sessionRole } =
    await getResolvedRole()
  if (!user) {
    return apiError(
      "UNAUTHORIZED",
      "You must be signed in to delete an announcement.",
      401,
      {},
      "Please sign in and try again."
    )
  }

  if (!["admin", "secretary", "president"].includes(role ?? "")) {
    return apiError(
      "FORBIDDEN",
      "Only admins, secretaries, and presidents can delete announcements.",
      403,
      { role, activeOrganizationId, sessionRole },
      "Make sure you are using an active Admin, Secretary, or President organization role."
    )
  }

  const { id } = await params
  const removed = await announcementOperations.deleteById(id)
  if (!removed) {
    return apiError(
      "NOT_FOUND",
      "Announcement not found.",
      404,
      { announcementId: id },
      "Refresh the page and try again."
    )
  }

  return NextResponse.json({
    success: true,
    data: null,
    message: "Announcement deleted successfully.",
    error: null,
  })
}
