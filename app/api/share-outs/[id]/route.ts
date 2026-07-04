import { headers } from "next/headers"
import { NextResponse } from "next/server"
import { db } from "@/db/connection"
import { auditLogOperations } from "@/db/operations/audit-log-operations"
import {
  shareOutAllocationOperations,
  shareOutOperations,
} from "@/db/operations/share-out-operations"
import { userOperations } from "@/db/operations/user-operations"
import { member } from "@/db/schemas"
import type { ShareOutStatus } from "@/db/schemas/share-out-schema"
import { extractRoleValue } from "@/utils/role-utils"
import { and, eq } from "drizzle-orm"
import { z } from "zod"

import { auth } from "@/lib/auth"

const leadershipRoles = ["admin", "treasurer", "president"] as const
const approverRoles = ["admin", "president"] as const

const patchSchema = z.object({
  action: z.enum(["approve", "distribute", "cancel"]),
})

function apiError(
  code: string,
  message: string,
  status: number,
  details: Record<string, any> = {},
  help?: string
) {
  return NextResponse.json(
    { success: false, data: null, error: { code, message, details, help } },
    { status }
  )
}

async function getResolvedContext() {
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
    } catch {
      // ignore
    }
  }

  if (!activeRole) {
    try {
      const orgApi = (auth.api as any).organization
      const roleResponse = orgApi?.getActiveMemberRole
        ? await orgApi.getActiveMemberRole({ headers: headersList })
        : null
      activeRole = extractRoleValue(roleResponse)
    } catch {
      // ignore
    }
  }

  return { user: sessionUser, role: activeRole }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, role } = await getResolvedContext()
  if (!user) {
    return apiError("UNAUTHORIZED", "You must be signed in.", 401)
  }
  if (!leadershipRoles.includes(role as (typeof leadershipRoles)[number])) {
    return apiError("FORBIDDEN", "You do not have permission.", 403, { role })
  }

  const cycle = await shareOutOperations.findById((await params).id)
  if (!cycle) {
    return apiError("NOT_FOUND", "Share-out not found.", 404)
  }

  const allocations = await shareOutAllocationOperations.findByShareOutId(
    cycle.id
  )
  const users = await userOperations.findByIds(
    allocations.map((a) => a.memberId)
  )
  const userMap = new Map(users.map((u) => [u.id, u]))
  const enriched = allocations.map((a) => ({
    ...a,
    memberName: userMap.get(a.memberId)?.name ?? null,
    memberEmail: userMap.get(a.memberId)?.email ?? null,
  }))

  return NextResponse.json({
    success: true,
    data: { cycle, allocations: enriched },
    message: "Share-out loaded.",
    error: null,
  })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, role } = await getResolvedContext()
  if (!user) {
    return apiError("UNAUTHORIZED", "You must be signed in.", 401)
  }
  if (!leadershipRoles.includes(role as (typeof leadershipRoles)[number])) {
    return apiError("FORBIDDEN", "You do not have permission.", 403, { role })
  }

  const cycle = await shareOutOperations.findById((await params).id)
  if (!cycle) {
    return apiError("NOT_FOUND", "Share-out not found.", 404)
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return apiError("VALIDATION_ERROR", "Invalid payload.", 400)
  }
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "Invalid action.", 400, {
      validationErrors: parsed.error.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      })),
    })
  }

  const { action } = parsed.data
  const now = new Date()
  let updates: Partial<typeof cycle> = {}

  if (action === "approve") {
    if (!approverRoles.includes(role as (typeof approverRoles)[number])) {
      return apiError(
        "FORBIDDEN",
        "Only a president or admin can approve a share-out.",
        403,
        { role }
      )
    }
    if (cycle.status !== "draft") {
      return apiError(
        "INVALID_STATE",
        `Cannot approve a ${cycle.status} share-out.`,
        409,
        { status: cycle.status }
      )
    }
    updates = { status: "approved", approvedBy: user.id, approvedAt: now }
  } else if (action === "distribute") {
    if (cycle.status !== "approved") {
      return apiError(
        "INVALID_STATE",
        "Only an approved share-out can be distributed.",
        409,
        { status: cycle.status }
      )
    }
    updates = { status: "distributed", distributedAt: now }
    await shareOutAllocationOperations.markAllPaid(cycle.id, now)
  } else if (action === "cancel") {
    if (cycle.status === "distributed" || cycle.status === "cancelled") {
      return apiError(
        "INVALID_STATE",
        `Cannot cancel a ${cycle.status} share-out.`,
        409,
        { status: cycle.status }
      )
    }
    updates = { status: "cancelled" as ShareOutStatus }
  }

  const updated = await shareOutOperations.updateById(cycle.id, updates)

  auditLogOperations
    .create({
      action: `share_out.${action}`,
      userId: user.id,
      userEmail: user.email ?? undefined,
      resourceType: "share_out",
      resourceId: cycle.id,
      details: `Share-out "${cycle.label}" ${action} (status now ${updated?.status})`,
      metadata: { previousStatus: cycle.status, actorRole: role },
      severity: action === "distribute" ? "high" : "medium",
    })
    .catch(() => undefined)

  return NextResponse.json({
    success: true,
    data: updated,
    message: `Share-out ${action} successful.`,
    error: null,
  })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, role } = await getResolvedContext()
  if (!user) {
    return apiError("UNAUTHORIZED", "You must be signed in.", 401)
  }
  if (!leadershipRoles.includes(role as (typeof leadershipRoles)[number])) {
    return apiError("FORBIDDEN", "You do not have permission.", 403, { role })
  }

  const cycle = await shareOutOperations.findById((await params).id)
  if (!cycle) {
    return apiError("NOT_FOUND", "Share-out not found.", 404)
  }
  if (cycle.status !== "draft") {
    return apiError(
      "INVALID_STATE",
      "Only a draft share-out can be deleted.",
      409,
      { status: cycle.status },
      "Cancel it instead if it has been approved."
    )
  }

  await shareOutOperations.deleteById(cycle.id)

  return NextResponse.json({
    success: true,
    data: { deletedId: cycle.id },
    message: "Share-out deleted.",
    error: null,
  })
}
