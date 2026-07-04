import { headers } from "next/headers"
import { NextResponse } from "next/server"
import { db } from "@/db/connection"
import { auditLogOperations } from "@/db/operations/audit-log-operations"
import { operationalExpenseOperations } from "@/db/operations/operational-expense-operations"
import { userOperations } from "@/db/operations/user-operations"
import { member } from "@/db/schemas"
import { insertOperationalExpenseSchema } from "@/db/schemas/operational-expense-schema"
import logger from "@/utils/logger"
import { extractRoleValue } from "@/utils/role-utils"
import { and, eq } from "drizzle-orm"
import { z } from "zod"

import { auth } from "@/lib/auth"

const ALLOWED_SUBMITTER_ROLES = ["admin", "treasurer", "president", "secretary"]

const listSchema = z.object({
  submittedById: z.string().optional(),
  status: z.string().optional(),
  category: z.string().optional(),
  limit: z.coerce.number().min(1).max(500).optional(),
  offset: z.coerce.number().min(0).optional(),
})

const createSchema = insertOperationalExpenseSchema
  .omit({
    id: true,
    submittedById: true,
    status: true,
    createdAt: true,
    updatedAt: true,
    approvedById: true,
    approvedAt: true,
    rejectionNote: true,
  })
  .extend({
    amount: z.coerce.string(),
    expenseDate: z.coerce.date(),
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

export async function GET(request: Request) {
  const { user, role } = await getResolvedRole()
  if (!user) {
    return apiError("UNAUTHORIZED", "You must be signed in.", 401)
  }

  const params = listSchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams)
  )
  if (!params.success) {
    return apiError("VALIDATION_ERROR", "Invalid query parameters.", 400, {
      validationErrors: params.error.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      })),
    })
  }

  const isPrivileged = ["admin", "treasurer"].includes(role ?? "")

  const filters = {
    submittedById: isPrivileged ? params.data.submittedById : user.id,
    status: params.data.status,
    category: params.data.category,
  }

  const [expenses, total] = await Promise.all([
    operationalExpenseOperations.findMany({
      limit: params.data.limit,
      offset: params.data.offset,
      filters,
    }),
    operationalExpenseOperations.count({ filters }),
  ])

  const userIds = new Set<string>()
  expenses.forEach((e) => {
    userIds.add(e.submittedById)
    if (e.approvedById) userIds.add(e.approvedById)
  })

  const users = await userOperations.findByIds([...userIds])
  const userMap = new Map(users.map((u) => [u.id, u]))

  const enriched = expenses.map((e) => ({
    ...e,
    submittedByName: userMap.get(e.submittedById)?.name ?? null,
    submittedByEmail: userMap.get(e.submittedById)?.email ?? null,
    approvedByName: e.approvedById
      ? (userMap.get(e.approvedById)?.name ?? null)
      : null,
  }))

  return NextResponse.json({
    success: true,
    data: enriched,
    total,
    message: "Expenses loaded successfully.",
    error: null,
  })
}

export async function POST(request: Request) {
  const { user, role } = await getResolvedRole()
  if (!user) {
    return apiError("UNAUTHORIZED", "You must be signed in.", 401)
  }

  if (!role || !ALLOWED_SUBMITTER_ROLES.includes(role)) {
    return apiError(
      "FORBIDDEN",
      "Only committee members may submit operational expenses.",
      403,
      { role },
      "Make sure you have an active committee role."
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return apiError("VALIDATION_ERROR", "Invalid request body.", 400)
  }

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "Invalid expense data.", 400, {
      validationErrors: parsed.error.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      })),
    })
  }

  const isTreasurerOrAdmin = role === "treasurer" || role === "admin"

  const created = await operationalExpenseOperations.create({
    ...parsed.data,
    id: crypto.randomUUID(),
    submittedById: user.id,
    status: isTreasurerOrAdmin ? "approved" : "pending",
    ...(isTreasurerOrAdmin
      ? { approvedById: user.id, approvedAt: new Date() }
      : {}),
  })

  auditLogOperations
    .create({
      action: "operational_expense.created",
      userId: user.id,
      userEmail: user.email ?? undefined,
      resourceType: "operational_expense",
      resourceId: created.id,
      details: `${user.name} submitted expense: ${created.description} (${created.amount} ${created.currency})`,
      metadata: {
        category: created.category,
        amount: created.amount,
        actorRole: role,
      },
      severity: "low",
    })
    .catch((err) =>
      logger.error("[operational-expenses] audit log failed", { err })
    )

  return NextResponse.json(
    {
      success: true,
      data: created,
      message: "Expense submitted successfully.",
      error: null,
    },
    { status: 201 }
  )
}
