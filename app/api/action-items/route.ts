import { headers } from "next/headers"
import { NextResponse } from "next/server"
import { db } from "@/db/connection"
import { actionItemOperations } from "@/db/operations/action-item-operations"
import { meetingOperations } from "@/db/operations/meeting-operations"
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

const listSchema = z.object({
  meetingId: z.string().optional(),
  minutesId: z.string().optional(),
  ownerId: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  createdBy: z.string().optional(),
  limit: z.coerce.number().min(1).max(200).optional(),
  offset: z.coerce.number().min(0).optional(),
})

const createSchema = insertActionItemSchema
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    createdBy: true,
  })
  .extend({
    dueDate: z.coerce.date().optional(),
    completedAt: z.coerce.date().optional(),
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
      console.error("[action-items:getSessionUser] member lookup failed", {
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
        "[action-items:getSessionUser] getActiveMemberRole fallback failed",
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
      "[action-items:getActionItemLeadershipRecipients] lookup failed",
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

export async function GET(request: Request) {
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

  const params = listSchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams)
  )
  if (!params.success) {
    return apiError(
      "VALIDATION_ERROR",
      "Invalid query parameters",
      400,
      { zodErrors: params.error.flatten() },
      "Please check your query parameters and try again."
    )
  }

  const statusValues = params.data.status
    ?.split(",")
    .map((value) => value.trim())
    .filter(Boolean)
  const priorityValues = params.data.priority
    ?.split(",")
    .map((value) => value.trim())
    .filter(Boolean)

  const filters = {
    meetingId: params.data.meetingId,
    minutesId: params.data.minutesId,
    ownerId: ["admin", "secretary", "treasurer", "president"].includes(
      role ?? ""
    )
      ? params.data.ownerId
      : user.id,
    status: statusValues && statusValues.length > 0 ? statusValues : undefined,
    priority:
      priorityValues && priorityValues.length > 0 ? priorityValues : undefined,
    createdBy: params.data.createdBy,
  }

  const actionItems = await actionItemOperations.findMany({
    limit: params.data.limit,
    offset: params.data.offset,
    filters,
  })

  const userIds = new Set<string>()
  const meetingIds = new Set<string>()
  actionItems.forEach((item) => {
    if (item.ownerId) userIds.add(item.ownerId)
    if (item.createdBy) userIds.add(item.createdBy)
    if (item.meetingId) meetingIds.add(item.meetingId)
  })

  const [users, meetings] = await Promise.all([
    userOperations.findByIds([...userIds]),
    meetingOperations.findByIds([...meetingIds]),
  ])
  const userMap = new Map(users.map((member) => [member.id, member]))
  const meetingMap = new Map(meetings.map((item) => [item.id, item]))

  const enriched = actionItems.map((item) => ({
    ...item,
    ownerName: item.ownerId ? (userMap.get(item.ownerId)?.name ?? null) : null,
    ownerEmail: item.ownerId
      ? (userMap.get(item.ownerId)?.email ?? null)
      : null,
    createdByName: item.createdBy
      ? (userMap.get(item.createdBy)?.name ?? null)
      : null,
    meetingTitle: item.meetingId
      ? (meetingMap.get(item.meetingId)?.title ?? null)
      : null,
  }))

  const total = await actionItemOperations.count({ filters })

  return NextResponse.json({ data: enriched, total })
}

export async function POST(request: Request) {
  const { user, role, activeOrganizationId, sessionRole } =
    await getSessionUser()
  if (!user) {
    return apiError(
      "UNAUTHORIZED",
      "You must be signed in to create action items.",
      401,
      {},
      "Please sign in and try again."
    )
  }

  if (!["admin", "secretary", "president"].includes(role ?? "")) {
    return apiError(
      "FORBIDDEN",
      "Only secretaries, presidents, and admins can create action items.",
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

  const created = await actionItemOperations.create({
    ...parsed.data,
    id: crypto.randomUUID(),
    createdBy: user.id,
  })

  const [owner, meeting] = await Promise.all([
    created.ownerId
      ? userOperations.findById(created.ownerId)
      : Promise.resolve(null),
    created.meetingId
      ? meetingOperations.findById(created.meetingId)
      : Promise.resolve(null),
  ])

  if (role === "secretary" || role === "president") {
    const leadershipRecipients =
      await getActionItemLeadershipRecipients(activeOrganizationId)

    try {
      await inngest.send({
        id: `ikimina-action-item-created-${created.id}`,
        name: "ikimina/action-item.created",
        data: {
          organizationId: activeOrganizationId || "unknown-org",
          actionItemId: created.id,
          title: created.title,
          description: created.description,
          priority: created.priority,
          status: created.status,
          dueDate: created.dueDate?.toISOString(),
          meetingTitle: meeting?.title,
          notes: created.notes,
          ownerId: owner?.id,
          ownerName: owner?.name,
          ownerEmail: owner?.email,
          createdByName: user.name,
          createdByRole: role,
        },
      })
    } catch (error) {
      logger.error("Failed to emit action item created event", {
        actionItemId: created.id,
        error,
      })
    }

    // Create in-app notifications for assignment and leadership visibility (non-blocking)
    try {
      const notificationPayloads: NotificationPayload[] = []

      if (owner?.id) {
        notificationPayloads.push({
          userId: owner.id,
          type: DOMAIN_NOTIFICATION_TYPE.ACTION_ITEM,
          title: "New Action Item Assigned",
          message: `${user.name} assigned you an action item: ${created.title}.`,
          data: {
            actionItemId: created.id,
            title: created.title,
            description: created.description,
            priority: created.priority,
            status: created.status,
            dueDate: created.dueDate?.toISOString(),
            ownerId: created.ownerId,
            meetingId: created.meetingId
              ? String(created.meetingId)
              : undefined,
            meetingTitle: meeting?.title,
            assignedBy: user.id,
            assignedByName: user.name,
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
            title: "Action Item Created",
            message: `${user.name} created action item: ${created.title}.`,
            data: {
              actionItemId: created.id,
              title: created.title,
              description: created.description,
              priority: created.priority,
              status: created.status,
              dueDate: created.dueDate?.toISOString(),
              ownerId: created.ownerId,
              ownerName: owner?.name,
              ownerEmail: owner?.email,
              meetingId: created.meetingId
                ? String(created.meetingId)
                : undefined,
              meetingTitle: meeting?.title,
              createdBy: user.id,
              createdByName: user.name,
              recipientRole: recipient.role,
              action: NOTIFICATION_ACTION.VIEW_ACTION_ITEM,
            },
          })
        })

      if (notificationPayloads.length > 0) {
        await createBulkNotifications(notificationPayloads)
      }
    } catch (notificationError) {
      logger.error("Failed to create action item in-app notifications", {
        error: notificationError,
        actionItemId: created.id,
      })
    }
  } else {
    try {
      await inngest.send({
        id: `ikimina-action-item-created-${created.id}`,
        name: "ikimina/action-item.created",
        data: {
          organizationId: activeOrganizationId || "unknown-org",
          actionItemId: created.id,
          title: created.title,
          description: created.description,
          priority: created.priority,
          status: created.status,
          dueDate: created.dueDate?.toISOString(),
          meetingTitle: meeting?.title,
          notes: created.notes,
          ownerId: owner?.id,
          ownerName: owner?.name,
          ownerEmail: owner?.email,
          createdByName: user.name,
          createdByRole: role,
        },
      })
    } catch (error) {
      logger.error("Failed to emit action item created event", {
        actionItemId: created.id,
        error,
      })
    }

    // Create in-app notification for assignment (non-blocking)
    if (owner?.id) {
      try {
        await createBulkNotifications([
          {
            userId: owner.id,
            type: DOMAIN_NOTIFICATION_TYPE.ACTION_ITEM,
            title: "New Action Item Assigned",
            message: `${user.name} assigned you an action item: ${created.title}.`,
            data: {
              actionItemId: created.id,
              title: created.title,
              description: created.description,
              priority: created.priority,
              status: created.status,
              dueDate: created.dueDate?.toISOString(),
              ownerId: created.ownerId,
              meetingId: created.meetingId
                ? String(created.meetingId)
                : undefined,
              meetingTitle: meeting?.title,
              assignedBy: user.id,
              assignedByName: user.name,
              action: NOTIFICATION_ACTION.VIEW_ACTION_ITEM,
            },
          },
        ])
      } catch (notificationError) {
        logger.error("Failed to create action item assignment notification", {
          error: notificationError,
          actionItemId: created.id,
        })
      }
    }
  }

  return NextResponse.json(
    {
      success: true,
      data: { actionItem: created },
      message: "Action item created successfully.",
      error: null,
    },
    { status: 201 }
  )
}
