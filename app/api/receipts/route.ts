import { headers } from "next/headers"
import { NextResponse } from "next/server"
import { db } from "@/db/connection"
import { receiptOperations } from "@/db/operations/receipt-operations"
import { userOperations } from "@/db/operations/user-operations"
import { member } from "@/db/schemas"
import { insertReceiptSchema } from "@/db/schemas/receipt-schema"
import { extractRoleValue } from "@/utils/role-utils"
import { and, eq } from "drizzle-orm"
import { z } from "zod"

import { auth } from "@/lib/auth"

const listSchema = z.object({
  search: z.string().optional(),
  receiptType: z.string().optional(),
  status: z.string().optional(),
  period: z.string().optional(),
  memberId: z.string().optional(),
  issuedBy: z.string().optional(),
  contributionId: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  offset: z.coerce.number().min(0).optional(),
})

const createSchema = insertReceiptSchema
  .omit({ id: true, createdAt: true, updatedAt: true, receiptNumber: true })
  .extend({
    amount: z.coerce.string(),
    issuedAt: z.coerce.date().optional(),
  })

async function getResolvedRole() {
  const headersList = await headers()
  const session = await auth.api.getSession({ headers: headersList })
  const sessionUser = session?.user || null
  const activeOrganizationId = session?.session?.activeOrganizationId
  const sessionRole = sessionUser?.role ?? null

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

  return {
    user: sessionUser,
    role: activeRole,
    activeOrganizationId,
    sessionRole,
  }
}

function apiError(code: string, message: string, status: number) {
  return NextResponse.json(
    { success: false, data: null, error: { code, message } },
    { status }
  )
}

export async function GET(request: Request) {
  const { user, role } = await getResolvedRole()
  if (!user) return apiError("UNAUTHORIZED", "Sign in to view receipts.", 401)

  const params = listSchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams)
  )
  if (!params.success)
    return apiError("VALIDATION_ERROR", "Invalid query parameters.", 400)

  const {
    search,
    receiptType,
    status,
    period,
    sortBy,
    sortOrder,
    limit = 25,
    offset = 0,
  } = params.data

  const isPrivileged = ["admin", "treasurer", "president"].includes(role ?? "")

  // Regular members can only see their own receipts
  const memberId = isPrivileged ? params.data.memberId : user.id

  const filters: Record<string, any> = {
    search,
    receiptType,
    status,
    period,
    memberId,
    ...(params.data.issuedBy && isPrivileged
      ? { issuedBy: params.data.issuedBy }
      : {}),
    ...(params.data.contributionId
      ? { contributionId: params.data.contributionId }
      : {}),
  }

  const [receipts, total] = await Promise.all([
    receiptOperations.findMany({
      limit,
      offset,
      sortBy: sortBy as any,
      sortOrder,
      filters,
    }),
    receiptOperations.count({ filters }),
  ])

  const userIds = new Set<string>()
  receipts.forEach((r) => {
    userIds.add(r.memberId)
    if (r.issuedBy) userIds.add(r.issuedBy)
  })

  const users = userIds.size ? await userOperations.findByIds([...userIds]) : []
  const userMap = new Map(users.map((u) => [u.id, u]))

  const enriched = receipts.map((r) => ({
    ...r,
    memberName: userMap.get(r.memberId)?.name ?? null,
    memberEmail: userMap.get(r.memberId)?.email ?? null,
    issuedByName: r.issuedBy ? (userMap.get(r.issuedBy)?.name ?? null) : null,
  }))

  return NextResponse.json({ success: true, data: enriched, total })
}

export async function POST(request: Request) {
  const { user, role } = await getResolvedRole()
  if (!user) return apiError("UNAUTHORIZED", "Sign in to issue a receipt.", 401)

  if (!["admin", "treasurer", "president"].includes(role ?? "")) {
    return apiError(
      "FORBIDDEN",
      "Only treasurers and admins can issue receipts.",
      403
    )
  }

  const body = await request.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid payload.",
          details: parsed.error.issues,
        },
      },
      { status: 400 }
    )
  }

  // Auto-generate receipt number
  const receiptNumber = await receiptOperations.generateReceiptNumber()

  const created = await receiptOperations.create({
    ...parsed.data,
    id: crypto.randomUUID(),
    receiptNumber,
    issuedBy: user.id,
  })

  return NextResponse.json(
    { success: true, data: { receipt: created }, message: "Receipt issued." },
    { status: 201 }
  )
}
