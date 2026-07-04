import { headers } from "next/headers"
import { NextResponse } from "next/server"
import { db } from "@/db/connection"
import { meetingOperations } from "@/db/operations/meeting-operations"
import { member, user as userTable } from "@/db/schemas"
import { insertMeetingSchema } from "@/db/schemas/meeting-schema"
import logger from "@/utils/logger"
import {
  createBulkNotifications,
  type NotificationPayload,
} from "@/utils/notification-utils"
import { extractRoleValue } from "@/utils/role-utils"
import { and, eq } from "drizzle-orm"
import { z } from "zod"

import {
  DOMAIN_NOTIFICATION_TYPE,
  NOTIFICATION_ACTION,
} from "@/types/notifications"
import { auth } from "@/lib/auth"

const updateSchema = insertMeetingSchema
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    createdBy: true,
  })
  .partial()
  .extend({
    scheduledAt: z.coerce.date().optional(),
    hostContribution: z.coerce.string().optional(),
  })

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
      console.error("[meetings:id:getResolvedRole] member lookup failed", {
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
        "[meetings:id:getResolvedRole] getActiveMemberRole fallback failed",
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

async function getMeetingNotificationRecipients(
  activeOrganizationId?: string | null
) {
  if (!activeOrganizationId) return []

  try {
    const rows = await db
      .select({
        userId: userTable.id,
        name: userTable.name,
        role: member.role,
      })
      .from(member)
      .innerJoin(userTable, eq(member.userId, userTable.id))
      .where(eq(member.organizationId, activeOrganizationId))

    const deduped = new Map<
      string,
      { userId: string; name: string; role: string }
    >()

    for (const row of rows) {
      deduped.set(row.userId, row)
    }

    return [...deduped.values()]
  } catch (error) {
    console.error(
      "[meetings:id:getMeetingNotificationRecipients] lookup failed",
      {
        activeOrganizationId,
        error,
      }
    )
    return []
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user } = await getResolvedRole()
  if (!user) {
    return apiError(
      "UNAUTHORIZED",
      "You must be signed in to view meetings.",
      401,
      {},
      "Please sign in and try again."
    )
  }

  const record = await meetingOperations.findById((await params).id)
  if (!record) {
    return apiError(
      "NOT_FOUND",
      "Meeting not found.",
      404,
      { meetingId: (await params).id },
      "Refresh the page and try again."
    )
  }

  return NextResponse.json({ data: record })
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
      "You must be signed in to update a meeting.",
      401,
      {},
      "Please sign in and try again."
    )
  }

  if (!["admin", "secretary", "president"].includes(role ?? "")) {
    return apiError(
      "FORBIDDEN",
      "Only secretaries, admins, and presidents can update meetings.",
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
      "Invalid meeting payload.",
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

  const existing = await meetingOperations.findById((await params).id)
  if (!existing) {
    return apiError(
      "NOT_FOUND",
      "Meeting not found.",
      404,
      { meetingId: (await params).id },
      "Refresh the page and try again."
    )
  }

  const updated = await meetingOperations.updateById(
    (await params).id,
    parsed.data
  )
  if (!updated) {
    return apiError(
      "NOT_FOUND",
      "Meeting not found.",
      404,
      { meetingId: (await params).id },
      "Refresh the page and try again."
    )
  }

  const hasMeaningfulUpdate =
    existing.title !== updated.title ||
    existing.status !== updated.status ||
    String(existing.hostContribution ?? "") !==
      String(updated.hostContribution ?? "") ||
    (existing.location ?? "") !== (updated.location ?? "") ||
    (existing.agenda ?? "") !== (updated.agenda ?? "") ||
    new Date(existing.scheduledAt).toISOString() !==
      new Date(updated.scheduledAt).toISOString()

  if (hasMeaningfulUpdate) {
    try {
      const recipients =
        await getMeetingNotificationRecipients(activeOrganizationId)
      const notificationPayloads: NotificationPayload[] = recipients
        .filter((recipient) => recipient.userId !== user.id)
        .map((recipient) => ({
          userId: recipient.userId,
          type: DOMAIN_NOTIFICATION_TYPE.MEETING,
          title: `Meeting Updated: ${updated.title}`,
          message: `${user.name} updated meeting details for ${updated.title}.`,
          data: {
            meetingId: updated.id,
            title: updated.title,
            previousTitle: existing.title,
            oldStatus: existing.status,
            newStatus: updated.status,
            scheduledAt: updated.scheduledAt.toISOString(),
            previousScheduledAt: existing.scheduledAt.toISOString(),
            location: updated.location,
            agenda: updated.agenda,
            hostContribution: updated.hostContribution,
            updatedBy: user.id,
            updatedByName: user.name,
            recipientRole: recipient.role,
            action: NOTIFICATION_ACTION.VIEW_MEETING,
          },
        }))

      if (notificationPayloads.length > 0) {
        await createBulkNotifications(notificationPayloads)
      }
    } catch (notificationError) {
      logger.error("Failed to create meeting update notifications", {
        error: notificationError,
        meetingId: updated.id,
      })
    }
  }

  return NextResponse.json({
    success: true,
    data: { meeting: updated },
    message: "Meeting updated successfully.",
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
      "You must be signed in to cancel a meeting.",
      401,
      {},
      "Please sign in and try again."
    )
  }

  if (!["admin", "secretary", "president"].includes(role ?? "")) {
    return apiError(
      "FORBIDDEN",
      "Only secretaries, admins, and presidents can cancel meetings.",
      403,
      { role, activeOrganizationId, sessionRole },
      "Make sure you are using an active Secretary, Admin, or President organization role."
    )
  }

  const existing = await meetingOperations.findById((await params).id)
  if (!existing) {
    return apiError(
      "NOT_FOUND",
      "Meeting not found.",
      404,
      { meetingId: (await params).id },
      "Refresh the page and try again."
    )
  }

  const updated = await meetingOperations.updateById((await params).id, {
    status: "cancelled",
  })
  if (!updated) {
    return apiError(
      "NOT_FOUND",
      "Meeting not found.",
      404,
      { meetingId: (await params).id },
      "Refresh the page and try again."
    )
  }

  if (existing.status !== "cancelled") {
    try {
      const recipients =
        await getMeetingNotificationRecipients(activeOrganizationId)
      const notificationPayloads: NotificationPayload[] = recipients
        .filter((recipient) => recipient.userId !== user.id)
        .map((recipient) => ({
          userId: recipient.userId,
          type: DOMAIN_NOTIFICATION_TYPE.MEETING,
          title: `Meeting Cancelled: ${updated.title}`,
          message: `${user.name} cancelled the meeting ${updated.title}.`,
          data: {
            meetingId: updated.id,
            title: updated.title,
            scheduledAt: updated.scheduledAt.toISOString(),
            oldStatus: existing.status,
            newStatus: updated.status,
            location: updated.location,
            agenda: updated.agenda,
            cancelledBy: user.id,
            cancelledByName: user.name,
            recipientRole: recipient.role,
            action: NOTIFICATION_ACTION.VIEW_MEETING,
          },
        }))

      if (notificationPayloads.length > 0) {
        await createBulkNotifications(notificationPayloads)
      }
    } catch (notificationError) {
      logger.error("Failed to create meeting cancellation notifications", {
        error: notificationError,
        meetingId: updated.id,
      })
    }
  }

  return NextResponse.json({
    success: true,
    data: { meeting: updated },
    message: "Meeting cancelled successfully.",
    error: null,
  })
}
