import { headers } from "next/headers"
import { NextResponse } from "next/server"
import { db } from "@/db/connection"
import { actionItemOperations } from "@/db/operations/action-item-operations"
import { userOperations } from "@/db/operations/user-operations"
import { member, user as userTable } from "@/db/schemas"
import { insertActionItemSchema } from "@/db/schemas/action-item-schema"
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

const updateSchema = insertActionItemSchema
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    createdBy: true,
  })
  .partial()
  .extend({
    dueDate: z.coerce.date().optional(),
    completedAt: z.coerce.date().optional(),
  })

const memberUpdateSchema = updateSchema.pick({
  status: true,
  notes: true,
  completedAt: true,
})

const actionItemLeadershipRoles = ["admin", "president"] as const

async function getSessionUser() {
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
      console.error("[action-items:id:getSessionUser] member lookup failed", {
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
        "[action-items:id:getSessionUser] getActiveMemberRole fallback failed",
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

async function getActionItemLeadershipRecipients(
  activeOrganizationId?: string | null
) {
  if (!activeOrganizationId) return []

  try {
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
          inArray(member.role, [...actionItemLeadershipRoles])
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
      "[action-items:id:getActionItemLeadershipRecipients] lookup failed",
      {
        activeOrganizationId,
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
  const { user, role } = await getSessionUser()
  if (!user) {
    return apiError(
      "UNAUTHORIZED",
      "You must be signed in to view action items.",
      401,
      {},
      "Please sign in and try again."
    )
  }

  const record = await actionItemOperations.findById((await params).id)
  if (!record) {
    return apiError(
      "NOT_FOUND",
      "Action item not found.",
      404,
      { actionItemId: (await params).id },
      "Refresh the page and try again."
    )
  }

  if (
    !["admin", "secretary", "treasurer", "president"].includes(role ?? "") &&
    record.ownerId !== user.id
  ) {
    return apiError(
      "FORBIDDEN",
      "You do not have access to this action item.",
      403,
      { ownerId: record.ownerId },
      "Members can only access their own assigned action items."
    )
  }

  return NextResponse.json({ data: record })
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, role, activeOrganizationId, sessionRole } =
    await getSessionUser()
  if (!user) {
    return apiError(
      "UNAUTHORIZED",
      "You must be signed in to update action items.",
      401,
      {},
      "Please sign in and try again."
    )
  }

  const existing = await actionItemOperations.findById((await params).id)
  if (!existing) {
    return apiError(
      "NOT_FOUND",
      "Action item not found.",
      404,
      { actionItemId: (await params).id },
      "Refresh the page and try again."
    )
  }

  if (role === "member") {
    if (existing.ownerId !== user.id) {
      return apiError(
        "FORBIDDEN",
        "Members can only update their own action items.",
        403,
        { ownerId: existing.ownerId },
        "Contact a secretary if ownership needs to be changed."
      )
    }
  } else if (!["admin", "secretary", "president"].includes(role ?? "")) {
    return apiError(
      "FORBIDDEN",
      "Only secretaries, presidents,  and admins can update this action item.",
      403,
      { role, activeOrganizationId, sessionRole },
      "Make sure you are using an active Secretary, President or Admin organization role."
    )
  }

  const body = await request.json()
  const parsed = (
    role === "member" ? memberUpdateSchema : updateSchema
  ).safeParse(body)
  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "Invalid action item payload.",
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

  const updated = await actionItemOperations.updateById(
    (await params).id,
    parsed.data
  )
  if (!updated) {
    return apiError(
      "NOT_FOUND",
      "Action item not found.",
      404,
      { actionItemId: (await params).id },
      "Refresh the page and try again."
    )
  }

  if (existing.status !== updated.status) {
    const [owner, leadershipRecipients] = await Promise.all([
      updated.ownerId
        ? userOperations.findById(updated.ownerId)
        : Promise.resolve(null),
      role === "member"
        ? getActionItemLeadershipRecipients(activeOrganizationId)
        : Promise.resolve([]),
    ])

    try {
      await inngest.send({
        id: `ikimina-action-item-status-changed-${updated.id}-${Date.now()}`,
        name: "ikimina/action-item.status.changed",
        data: {
          organizationId: activeOrganizationId || "unknown-org",
          actionItemId: updated.id,
          title: updated.title,
          oldStatus: existing.status,
          newStatus: updated.status,
          priority: updated.priority,
          dueDate: updated.dueDate?.toISOString(),
          ownerId: owner?.id,
          ownerName: owner?.name,
          ownerEmail: owner?.email,
          notes: updated.notes,
          changedByName: user.name,
          changedByRole: role,
        },
      })
    } catch (error) {
      logger.error("Failed to emit action item status changed event", {
        actionItemId: updated.id,
        error,
      })
    }

    // Create in-app notifications for status updates (non-blocking)
    try {
      const notificationPayloads: NotificationPayload[] = []

      if (owner?.id) {
        notificationPayloads.push({
          userId: owner.id,
          type: DOMAIN_NOTIFICATION_TYPE.ACTION_ITEM,
          title: "Action Item Status Updated",
          message: `${updated.title} moved from ${existing.status} to ${updated.status}.`,
          data: {
            actionItemId: updated.id,
            title: updated.title,
            oldStatus: existing.status,
            newStatus: updated.status,
            priority: updated.priority,
            dueDate: updated.dueDate?.toISOString(),
            completedAt: updated.completedAt?.toISOString(),
            ownerId: updated.ownerId,
            changedBy: user.id,
            changedByName: user.name,
            action: NOTIFICATION_ACTION.VIEW_ACTION_ITEM,
          },
        })
      }

      leadershipRecipients
        .filter((recipient) => recipient.userId !== owner?.id)
        .forEach((recipient) => {
          notificationPayloads.push({
            userId: recipient.userId,
            type: DOMAIN_NOTIFICATION_TYPE.ACTION_ITEM,
            title: "Action Item Status Changed",
            message: `${user.name} changed ${updated.title} from ${existing.status} to ${updated.status}.`,
            data: {
              actionItemId: updated.id,
              title: updated.title,
              oldStatus: existing.status,
              newStatus: updated.status,
              priority: updated.priority,
              dueDate: updated.dueDate?.toISOString(),
              completedAt: updated.completedAt?.toISOString(),
              ownerId: updated.ownerId,
              ownerName: owner?.name,
              ownerEmail: owner?.email,
              changedBy: user.id,
              changedByName: user.name,
              recipientRole: recipient.role,
              action: NOTIFICATION_ACTION.VIEW_ACTION_ITEM,
            },
          })
        })

      if (notificationPayloads.length > 0) {
        await createBulkNotifications(notificationPayloads)
      }
    } catch (notificationError) {
      logger.error("Failed to create action item status notifications", {
        error: notificationError,
        actionItemId: updated.id,
      })
    }
  }

  return NextResponse.json({
    success: true,
    data: { actionItem: updated },
    message: "Action item updated successfully.",
    error: null,
  })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, role, activeOrganizationId, sessionRole } =
    await getSessionUser()
  if (!user) {
    return apiError(
      "UNAUTHORIZED",
      "You must be signed in to delete action items.",
      401,
      {},
      "Please sign in and try again."
    )
  }

  if (!["admin", "secretary", "president"].includes(role ?? "")) {
    return apiError(
      "FORBIDDEN",
      "Only secretaries, presidents, and admins can delete action items.",
      403,
      { role, activeOrganizationId, sessionRole },
      "Make sure you are using an active Secretary, President or Admin organization role."
    )
  }

  const removed = await actionItemOperations.deleteById((await params).id)
  if (!removed) {
    return apiError(
      "NOT_FOUND",
      "Action item not found.",
      404,
      { actionItemId: (await params).id },
      "Refresh the page and try again."
    )
  }

  return NextResponse.json({
    success: true,
    data: null,
    message: "Action item deleted successfully.",
    error: null,
  })
}
