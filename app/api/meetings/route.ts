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

const listSchema = z.object({
  status: z.string().optional(),
  limit: z.coerce.number().min(1).max(200).optional(),
  offset: z.coerce.number().min(0).optional(),
})

const createSchema = insertMeetingSchema
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    scheduledAt: z.coerce.date(),
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
      console.error("[meetings:getResolvedRole] member lookup failed", {
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
        "[meetings:getResolvedRole] getActiveMemberRole fallback failed",
        {
          userId: sessionUser?.id,
          activeOrganizationId,
          error,
        }
      )
    }
  }

  if (sessionUser && !activeRole) {
    console.warn("[meetings:getResolvedRole] unresolved active role", {
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
    console.error("[meetings:getMeetingNotificationRecipients] lookup failed", {
      activeOrganizationId,
      error,
    })
    return []
  }
}

export async function GET(request: Request) {
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

  const meetings = await meetingOperations.findMany({
    limit: params.data.limit,
    offset: params.data.offset,
    filters: { status: params.data.status },
  })

  const total = await meetingOperations.count({
    filters: { status: params.data.status },
  })

  return NextResponse.json({ data: meetings, total })
}

export async function POST(request: Request) {
  const { user, role, activeOrganizationId, sessionRole } =
    await getResolvedRole()
  if (!user) {
    return apiError(
      "UNAUTHORIZED",
      "You must be signed in to create a meeting.",
      401,
      {},
      "Please sign in and try again."
    )
  }

  if (!["admin", "secretary", "president"].includes(role ?? "")) {
    console.warn("[meetings:POST] forbidden role", {
      userId: user.id,
      role,
      activeOrganizationId,
      sessionRole,
    })
    return apiError(
      "FORBIDDEN",
      "Only secretaries, admins, and presidents can create meetings.",
      403,
      { role, activeOrganizationId, sessionRole },
      "Make sure you are using an active Secretary, Admin, or President organization role."
    )
  }

  const body = await request.json()
  const parsed = createSchema.safeParse(body)
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

  const created = await meetingOperations.create({
    ...parsed.data,
    id: crypto.randomUUID(),
    createdBy: user.id,
  })

  // Create in-app notifications for organization members (non-blocking)
  try {
    const recipients =
      await getMeetingNotificationRecipients(activeOrganizationId)
    const notificationPayloads: NotificationPayload[] = recipients
      .filter((recipient) => recipient.userId !== user.id)
      .map((recipient) => ({
        userId: recipient.userId,
        type: DOMAIN_NOTIFICATION_TYPE.MEETING,
        title: `New Meeting Scheduled: ${created.title}`,
        message: `${user.name} scheduled a meeting on ${created.scheduledAt.toISOString()}.`,
        data: {
          meetingId: created.id,
          title: created.title,
          scheduledAt: created.scheduledAt.toISOString(),
          location: created.location,
          agenda: created.agenda,
          status: created.status,
          hostContribution: created.hostContribution,
          createdBy: user.id,
          createdByName: user.name,
          recipientRole: recipient.role,
          action: NOTIFICATION_ACTION.VIEW_MEETING,
        },
      }))

    if (notificationPayloads.length > 0) {
      await createBulkNotifications(notificationPayloads)
    }
  } catch (notificationError) {
    logger.error("Failed to create meeting in-app notifications", {
      error: notificationError,
      meetingId: created.id,
    })
  }

  return NextResponse.json(
    {
      success: true,
      data: { meeting: created },
      message: "Meeting created successfully.",
      error: null,
    },
    { status: 201 }
  )
}
