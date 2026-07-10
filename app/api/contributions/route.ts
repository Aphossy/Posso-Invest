import { headers } from "next/headers"
import { NextResponse } from "next/server"
import { db } from "@/db/connection"
import { contributionOperations } from "@/db/operations/contribution-operations"
import { penaltyOperations } from "@/db/operations/penalty-operations"
import { userOperations } from "@/db/operations/user-operations"
import { member, user as userTable } from "@/db/schemas"
import { insertContributionSchema } from "@/db/schemas/contribution-schema"
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
  memberId: z.string().optional(),
  status: z.string().optional(),
  period: z.string().optional(),
  limit: z.coerce.number().min(1).max(1000).optional(),
  offset: z.coerce.number().min(0).optional(),
})

const createSchema = insertContributionSchema
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    amount: z.coerce.string(),
    penaltyAmount: z.coerce.string().optional(),
    paidAt: z.coerce.date().optional(),
    dueDate: z.coerce.date().optional(),
  })

const contributionNotificationRoles = ["admin", "president"] as const

async function getResolvedRole() {
  const headersList = await headers()
  const session = await auth.api.getSession({ headers: headersList })
  const sessionUser = session?.user || null
  const sessionRole = sessionUser?.role ?? null
  const activeOrganizationId = session?.session?.activeOrganizationId

  let activeRole: string | null = null

  // Source of truth: organization membership role for active organization.
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
      console.error("[contributions:getResolvedRole] member lookup failed", {
        userId: sessionUser.id,
        activeOrganizationId,
        error,
      })
    }
  }

  // Fallback to Better Auth endpoint if member lookup did not resolve.
  if (!activeRole) {
    try {
      const orgApi = (auth.api as any).organization
      const roleResponse = orgApi?.getActiveMemberRole
        ? await orgApi.getActiveMemberRole({ headers: headersList })
        : null
      activeRole = extractRoleValue(roleResponse)
    } catch (error) {
      console.error(
        "[contributions:getResolvedRole] getActiveMemberRole fallback failed",
        {
          userId: sessionUser?.id,
          activeOrganizationId,
          error,
        }
      )
    }
  }

  if (sessionUser && !activeRole) {
    console.warn("[contributions:getResolvedRole] unresolved active role", {
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

async function getContributionNotificationRecipients(
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
          inArray(member.role, [...contributionNotificationRoles])
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
      "[contributions:getContributionNotificationRecipients] lookup failed",
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
  const { user, role } = await getResolvedRole()
  if (!user) {
    return apiError(
      "UNAUTHORIZED",
      "You must be signed in to view contributions.",
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
  const filters = {
    memberId:
      role === "admin" || role === "treasurer" || role === "president"
        ? params.data.memberId
        : user.id,
    status: statusValues && statusValues.length > 0 ? statusValues : undefined,
    period: params.data.period,
  }

  const contributions = await contributionOperations.findMany({
    limit: params.data.limit,
    offset: params.data.offset,
    filters,
  })

  const userIds = new Set<string>()
  contributions.forEach((item) => {
    userIds.add(item.memberId)
    if (item.recordedBy) userIds.add(item.recordedBy)
  })

  const users = await userOperations.findByIds([...userIds])
  const userMap = new Map(users.map((member) => [member.id, member]))
  const enriched = contributions.map((item) => ({
    ...item,
    memberName: userMap.get(item.memberId)?.name ?? null,
    memberEmail: userMap.get(item.memberId)?.email ?? null,
    recordedByName: item.recordedBy
      ? (userMap.get(item.recordedBy)?.name ?? null)
      : null,
    updatedByName: item.metadata?.lastUpdatedByName ?? null,
    lastUpdatedAt: item.metadata?.lastUpdatedAt ?? null,
  }))

  const total = await contributionOperations.count({ filters })

  return NextResponse.json({ data: enriched, total })
}

export async function POST(request: Request) {
  const { user, role, activeOrganizationId, sessionRole } =
    await getResolvedRole()
  if (!user) {
    return apiError(
      "UNAUTHORIZED",
      "You must be signed in to record a contribution.",
      401,
      {},
      "Please sign in and try again."
    )
  }

  if (!["admin", "treasurer", "president"].includes(role ?? "")) {
    console.warn("[contributions:POST] forbidden role", {
      userId: user.id,
      role,
      activeOrganizationId,
      sessionRole,
    })
    return apiError(
      "FORBIDDEN",
      "Only treasurers and admins can record contributions.",
      403,
      { role, activeOrganizationId, sessionRole },
      "Make sure you are using an active Treasurer or Admin organization role."
    )
  }

  const body = await request.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "Invalid contribution payload.",
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

  const created = await contributionOperations.create({
    ...parsed.data,
    id: crypto.randomUUID(),
    recordedBy: user.id,
  })

  const contributionMember = await userOperations.findById(created.memberId)
  const formattedAmount = new Intl.NumberFormat("en-RW").format(
    Number.parseFloat(String(created.amount))
  )
  const formattedPenalty =
    created.penaltyAmount && Number(created.penaltyAmount) > 0
      ? new Intl.NumberFormat("en-RW").format(
          Number.parseFloat(String(created.penaltyAmount))
        )
      : null
  const leadershipRecipients =
    role === "treasurer"
      ? await getContributionNotificationRecipients(activeOrganizationId)
      : []

  try {
    await inngest.send({
      id: `ikimina-contribution-recorded-${created.id}`,
      name: "ikimina/contribution.recorded",
      data: {
        organizationId: activeOrganizationId || "unknown-org",
        contributionId: created.id,
        memberId: created.memberId,
        memberName: contributionMember?.name ?? created.memberId,
        memberEmail: contributionMember?.email ?? undefined,
        amount: formattedAmount,
        currency: created.currency,
        period: created.period,
        status: created.status,
        paidAt: created.paidAt?.toISOString(),
        dueDate: created.dueDate?.toISOString(),
        penaltyAmount: formattedPenalty,
        recordedByName: user.name,
        recordedByRole: role,
      },
    })
  } catch (error) {
    logger.error("Failed to emit contribution recorded event", {
      contributionId: created.id,
      error,
    })
  }

  // Create in-app notifications (non-blocking)
  try {
    const notificationPayloads: NotificationPayload[] = []

    if (contributionMember?.id) {
      notificationPayloads.push({
        userId: contributionMember.id,
        type: DOMAIN_NOTIFICATION_TYPE.CONTRIBUTION,
        title: "Contribution Recorded",
        message: `Your contribution of ${created.currency} ${formattedAmount} for ${created.period} has been recorded.`,
        data: {
          contributionId: created.id,
          amount: formattedAmount,
          currency: created.currency,
          period: created.period,
          status: created.status,
          penaltyAmount: formattedPenalty,
          action: NOTIFICATION_ACTION.VIEW_CONTRIBUTION,
        },
      })
    }

    if (role === "treasurer") {
      leadershipRecipients.forEach((recipient) => {
        notificationPayloads.push({
          userId: recipient.userId,
          type: DOMAIN_NOTIFICATION_TYPE.CONTRIBUTION,
          title: "Contribution Recorded by Treasurer",
          message: `${user.name} recorded ${created.currency} ${formattedAmount} for ${contributionMember?.name ?? "a member"} (${created.period}).`,
          data: {
            contributionId: created.id,
            memberId: created.memberId,
            memberName: contributionMember?.name,
            memberEmail: contributionMember?.email,
            amount: formattedAmount,
            currency: created.currency,
            period: created.period,
            status: created.status,
            recordedBy: user.id,
            recordedByName: user.name,
            action: NOTIFICATION_ACTION.VIEW_CONTRIBUTION,
          },
        })
      })
    }

    if (notificationPayloads.length > 0) {
      await createBulkNotifications(notificationPayloads)
    }
  } catch (notificationError) {
    logger.error("Failed to create contribution in-app notifications", {
      error: notificationError,
      contributionId: created.id,
    })
  }

  // Auto-create a penalty record when a contribution is recorded as late
  if (
    created.status === "late" &&
    created.penaltyAmount &&
    Number(created.penaltyAmount) > 0
  ) {
    const existing = await penaltyOperations.findByContributionId(created.id)
    if (!existing) {
      await penaltyOperations.create({
        id: crypto.randomUUID(),
        organizationId: activeOrganizationId || "unknown-org",
        contributionId: created.id,
        memberId: created.memberId,
        issuedBy: user.id,
        amount: created.penaltyAmount,
        currency: created.currency,
        status: "active",
        reason: `Late payment for period ${created.period}`,
        period: created.period,
      })
    }
  }

  return NextResponse.json(
    {
      success: true,
      data: { contribution: created },
      message: "Contribution recorded successfully.",
      error: null,
    },
    { status: 201 }
  )
}
