import { headers } from "next/headers"
import { NextResponse } from "next/server"
import { db } from "@/db/connection"
import { contributionOperations } from "@/db/operations/contribution-operations"
import { penaltyOperations } from "@/db/operations/penalty-operations"
import { userOperations } from "@/db/operations/user-operations"
import { member, user as userTable } from "@/db/schemas"
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
  contributionId: z.string().optional(),
  limit: z.coerce.number().min(1).max(1000).optional(),
  offset: z.coerce.number().min(0).optional(),
})

const createSchema = z.object({
  memberId: z.string().min(1),
  contributionId: z.string().optional().nullable(),
  amount: z.coerce.string(),
  currency: z.string().default("RWF"),
  period: z.string().min(1),
  reason: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.enum(["active", "waived"]).default("active"),
})

const penaltyNotificationRoles = ["admin", "president"] as const

async function getResolvedRole() {
  const headersList = await headers()
  const session = await auth.api.getSession({ headers: headersList })
  const sessionUser = session?.user || null
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
    } catch {}
  }

  if (!activeRole) {
    try {
      const orgApi = (auth.api as any).organization
      const roleResponse = orgApi?.getActiveMemberRole
        ? await orgApi.getActiveMemberRole({ headers: headersList })
        : null
      activeRole = extractRoleValue(roleResponse)
    } catch {}
  }

  return { user: sessionUser, role: activeRole, activeOrganizationId }
}

async function getPenaltyNotificationRecipients(
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
          inArray(member.role, [...penaltyNotificationRoles])
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
      "[penalties:getPenaltyNotificationRecipients] lookup failed",
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
  help?: string
) {
  return NextResponse.json(
    { success: false, data: null, error: { code, message, help } },
    { status }
  )
}

export async function GET(request: Request) {
  const { user, role } = await getResolvedRole()
  if (!user) return apiError("UNAUTHORIZED", "Sign in to view penalties.", 401)

  const params = listSchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams)
  )
  if (!params.success)
    return apiError("VALIDATION_ERROR", "Invalid query parameters.", 400)

  const statusValues = params.data.status
    ?.split(",")
    .map((v) => v.trim())
    .filter(Boolean)

  const filters = {
    memberId:
      role === "admin" || role === "treasurer" || role === "president"
        ? params.data.memberId
        : user.id,
    status: statusValues?.length ? statusValues : undefined,
    period: params.data.period,
    contributionId: params.data.contributionId,
  }

  const penalties = await penaltyOperations.findMany({
    limit: params.data.limit,
    offset: params.data.offset,
    filters,
  })

  // Collect all user IDs for enrichment
  const userIds = new Set<string>()
  const contributionIds = new Set<string>()
  penalties.forEach((p) => {
    userIds.add(p.memberId)
    if (p.issuedBy) userIds.add(p.issuedBy)
    if (p.waivedBy) userIds.add(p.waivedBy)
    if (p.contributionId) contributionIds.add(p.contributionId)
  })

  const [users, contributions] = await Promise.all([
    userOperations.findByIds([...userIds]),
    contributionIds.size > 0
      ? Promise.all(
          [...contributionIds].map((id) => contributionOperations.findById(id))
        )
      : Promise.resolve([]),
  ])

  const userMap = new Map(users.map((u) => [u.id, u]))
  const contribMap = new Map(
    contributions.filter(Boolean).map((c) => [c!.id, c!])
  )

  const enriched = penalties.map((p) => {
    const contrib = p.contributionId
      ? contribMap.get(p.contributionId)
      : undefined
    return {
      ...p,
      memberName: userMap.get(p.memberId)?.name ?? null,
      memberEmail: userMap.get(p.memberId)?.email ?? null,
      issuedByName: p.issuedBy ? (userMap.get(p.issuedBy)?.name ?? null) : null,
      waivedByName: p.waivedBy ? (userMap.get(p.waivedBy)?.name ?? null) : null,
      contributionAmount: contrib?.amount ?? null,
      contributionDueDate: contrib?.dueDate ?? null,
      contributionPaidAt: contrib?.paidAt ?? null,
      contributionReceiptNumber: contrib?.receiptNumber ?? null,
    }
  })

  const total = await penaltyOperations.count({ filters })
  return NextResponse.json({ data: enriched, total })
}

export async function POST(request: Request) {
  const { user, role, activeOrganizationId } = await getResolvedRole()
  if (!user)
    return apiError("UNAUTHORIZED", "Sign in to create a penalty.", 401)
  if (!["admin", "treasurer", "president"].includes(role ?? ""))
    return apiError(
      "FORBIDDEN",
      "Only treasurers and admins can create penalties.",
      403
    )

  const body = await request.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success)
    return apiError("VALIDATION_ERROR", "Invalid penalty payload.", 400)

  // If a contribution is linked, validate it and prevent duplicates
  if (parsed.data.contributionId) {
    const contrib = await contributionOperations.findById(
      parsed.data.contributionId
    )
    if (!contrib)
      return apiError("NOT_FOUND", "Linked contribution not found.", 404)

    const existing = await penaltyOperations.findByContributionId(
      parsed.data.contributionId
    )
    if (existing)
      return apiError(
        "CONFLICT",
        "A penalty already exists for this contribution. Update it instead.",
        409
      )

    // Sync contribution status/amount
    await contributionOperations.updateById(contrib.id, {
      penaltyAmount: parsed.data.amount,
      status: "late",
    })
  }

  const created = await penaltyOperations.create({
    id: crypto.randomUUID(),
    contributionId: parsed.data.contributionId ?? null,
    memberId: parsed.data.memberId,
    issuedBy: user.id,
    amount: parsed.data.amount,
    currency: parsed.data.currency,
    status: parsed.data.status,
    reason: parsed.data.reason ?? null,
    notes: parsed.data.notes ?? null,
    period: parsed.data.period,
  })

  const penalizedMember = await userOperations.findById(created.memberId)
  const formattedAmount = new Intl.NumberFormat("en-RW").format(
    Number.parseFloat(String(created.amount))
  )
  const leadershipRecipients =
    role === "treasurer"
      ? await getPenaltyNotificationRecipients(activeOrganizationId)
      : []

  try {
    await inngest.send({
      id: `ikimina-penalty-recorded-${created.id}`,
      name: "ikimina/penalty.recorded",
      data: {
        organizationId: activeOrganizationId || "unknown-org",
        penaltyId: created.id,
        memberId: created.memberId,
        memberName: penalizedMember?.name ?? created.memberId,
        memberEmail: penalizedMember?.email ?? undefined,
        amount: formattedAmount,
        currency: created.currency,
        period: created.period,
        reason: created.reason ?? "No reason provided",
        status: created.status,
        notes: created.notes,
        contributionId: created.contributionId,
        issuedByName: user.name,
        issuedByRole: role,
      },
    })
  } catch (error) {
    logger.error("Failed to emit penalty recorded event", {
      penaltyId: created.id,
      error,
    })
  }

  // Create in-app notifications (non-blocking)
  try {
    const notificationPayloads: NotificationPayload[] = []

    if (penalizedMember?.id) {
      notificationPayloads.push({
        userId: penalizedMember.id,
        type: DOMAIN_NOTIFICATION_TYPE.PENALTY,
        title: "Penalty Recorded",
        message: `A penalty of ${created.currency} ${formattedAmount} has been recorded for ${created.period}.`,
        data: {
          penaltyId: created.id,
          memberId: created.memberId,
          amount: formattedAmount,
          currency: created.currency,
          period: created.period,
          status: created.status,
          reason: created.reason,
          notes: created.notes,
          contributionId: created.contributionId ?? undefined,
          issuedBy: user.id,
          issuedByName: user.name,
          action: NOTIFICATION_ACTION.VIEW_PENALTY,
        },
      })
    }

    if (role === "treasurer") {
      leadershipRecipients
        .filter((recipient) => recipient.userId !== penalizedMember?.id)
        .forEach((recipient) => {
          notificationPayloads.push({
            userId: recipient.userId,
            type: DOMAIN_NOTIFICATION_TYPE.PENALTY,
            title: "Penalty Recorded by Treasurer",
            message: `${user.name} recorded a penalty for ${penalizedMember?.name ?? "a member"} (${created.currency} ${formattedAmount}).`,
            data: {
              penaltyId: created.id,
              memberId: created.memberId,
              memberName: penalizedMember?.name,
              memberEmail: penalizedMember?.email,
              amount: formattedAmount,
              currency: created.currency,
              period: created.period,
              status: created.status,
              reason: created.reason,
              notes: created.notes,
              contributionId: created.contributionId ?? undefined,
              issuedBy: user.id,
              issuedByName: user.name,
              recipientRole: recipient.role,
              action: NOTIFICATION_ACTION.VIEW_PENALTY,
            },
          })
        })
    }

    if (notificationPayloads.length > 0) {
      await createBulkNotifications(notificationPayloads)
    }
  } catch (notificationError) {
    logger.error("Failed to create penalty in-app notifications", {
      error: notificationError,
      penaltyId: created.id,
    })
  }

  return NextResponse.json(
    { success: true, data: { penalty: created }, error: null },
    { status: 201 }
  )
}
