import { headers } from "next/headers"
import { NextResponse } from "next/server"
import { db } from "@/db/connection"
import { auditLogOperations } from "@/db/operations/audit-log-operations"
import { operationalExpenseOperations } from "@/db/operations/operational-expense-operations"
import { member } from "@/db/schemas"
import { insertOperationalExpenseSchema } from "@/db/schemas/operational-expense-schema"
import logger from "@/utils/logger"
import { extractRoleValue } from "@/utils/role-utils"
import { and, eq } from "drizzle-orm"
import { z } from "zod"

import { auth } from "@/lib/auth"

const updateSchema = insertOperationalExpenseSchema
  .omit({ id: true, createdAt: true, updatedAt: true })
  .partial()
  .extend({
    amount: z.coerce.string().optional(),
    expenseDate: z.coerce.date().optional(),
    approvedAt: z.coerce.date().optional(),
  })

const approveSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  rejectionNote: z.string().optional(),
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

async function getResolvedRole() {
  const headersList = await headers()
  const session = await auth.api.getSession({ headers: headersList })
  const sessionUser = session?.user ?? null
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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, role } = await getResolvedRole()
  if (!user) return apiError("UNAUTHORIZED", "You must be signed in.", 401)

  const record = await operationalExpenseOperations.findById((await params).id)
  if (!record) return apiError("NOT_FOUND", "Expense not found.", 404)

  const isPrivileged = ["admin", "treasurer"].includes(role ?? "")
  if (!isPrivileged && record.submittedById !== user.id) {
    return apiError("FORBIDDEN", "You may not view this expense.", 403)
  }

  return NextResponse.json({
    success: true,
    data: record,
    message: "Expense loaded.",
    error: null,
  })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, role } = await getResolvedRole()
  if (!user) return apiError("UNAUTHORIZED", "You must be signed in.", 401)

  const existing = await operationalExpenseOperations.findById(
    (await params).id
  )
  if (!existing) return apiError("NOT_FOUND", "Expense not found.", 404)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return apiError("VALIDATION_ERROR", "Invalid request body.", 400)
  }

  const isTreasurer = role === "treasurer" || role === "admin"
  const isOwner = existing.submittedById === user.id

  // Treasurer approving/rejecting
  if (
    (isTreasurer && (body as any)?.status === "approved") ||
    (body as any)?.status === "rejected"
  ) {
    const parsed = approveSchema.safeParse(body)
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", "Invalid approval data.", 400, {
        validationErrors: parsed.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      })
    }

    if (existing.status !== "pending") {
      return apiError(
        "CONFLICT",
        "This expense has already been reviewed.",
        409,
        { currentStatus: existing.status },
        "Only pending expenses can be approved or rejected."
      )
    }

    const updatePayload: Record<string, any> = {
      status: parsed.data.status,
    }

    if (parsed.data.status === "approved") {
      updatePayload.approvedById = user.id
      updatePayload.approvedAt = new Date()
      updatePayload.rejectionNote = null
    } else {
      updatePayload.rejectionNote = parsed.data.rejectionNote ?? null
      updatePayload.approvedById = user.id
      updatePayload.approvedAt = new Date()
    }

    const updated = await operationalExpenseOperations.updateById(
      (await params).id,
      updatePayload
    )
    if (!updated) return apiError("NOT_FOUND", "Expense not found.", 404)

    auditLogOperations
      .create({
        action: `operational_expense.${parsed.data.status}`,
        userId: user.id,
        userEmail: user.email ?? undefined,
        resourceType: "operational_expense",
        resourceId: updated.id,
        details: `${user.name} ${parsed.data.status} expense: ${existing.description}`,
        metadata: {
          previousStatus: existing.status,
          newStatus: parsed.data.status,
          rejectionNote: parsed.data.rejectionNote,
          actorRole: role,
        },
        severity: "medium",
      })
      .catch((err) =>
        logger.error("[operational-expenses:[id]] audit log failed", { err })
      )

    return NextResponse.json({
      success: true,
      data: updated,
      message: `Expense ${parsed.data.status} successfully.`,
      error: null,
    })
  }

  // Owner editing their own pending expense
  if (!isOwner && !isTreasurer) {
    return apiError("FORBIDDEN", "You may not update this expense.", 403)
  }

  if (!isTreasurer && existing.status !== "pending") {
    return apiError("CONFLICT", "You may only edit pending expenses.", 409, {
      currentStatus: existing.status,
    })
  }

  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "Invalid expense data.", 400, {
      validationErrors: parsed.error.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      })),
    })
  }

  const updated = await operationalExpenseOperations.updateById(
    (await params).id,
    parsed.data as any
  )
  if (!updated) return apiError("NOT_FOUND", "Expense not found.", 404)

  return NextResponse.json({
    success: true,
    data: updated,
    message: "Expense updated successfully.",
    error: null,
  })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, role } = await getResolvedRole()
  if (!user) return apiError("UNAUTHORIZED", "You must be signed in.", 401)

  const existing = await operationalExpenseOperations.findById(
    (await params).id
  )
  if (!existing) return apiError("NOT_FOUND", "Expense not found.", 404)

  const isPrivileged = ["admin", "treasurer"].includes(role ?? "")
  const canDelete =
    isPrivileged ||
    (existing.submittedById === user.id && existing.status === "pending")

  if (!canDelete) {
    return apiError(
      "FORBIDDEN",
      "You may not delete this expense.",
      403,
      { role, status: existing.status },
      "Only the submitter can delete a pending expense."
    )
  }

  const removed = await operationalExpenseOperations.deleteById(
    (await params).id
  )
  if (!removed) return apiError("NOT_FOUND", "Expense not found.", 404)

  return NextResponse.json({
    success: true,
    data: { deletedId: existing.id },
    message: "Expense deleted successfully.",
    error: null,
  })
}
