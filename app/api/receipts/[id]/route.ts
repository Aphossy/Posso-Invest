import { headers } from "next/headers"
import { NextResponse } from "next/server"
import { db } from "@/db/connection"
import { receiptOperations } from "@/db/operations/receipt-operations"
import { member } from "@/db/schemas"
import { extractRoleValue } from "@/utils/role-utils"
import { and, eq } from "drizzle-orm"
import { z } from "zod"

import { auth } from "@/lib/auth"

const updateSchema = z.object({
  receiptType: z
    .enum([
      "contribution",
      "loan_repayment",
      "penalty_payment",
      "registration_fee",
      "other",
    ])
    .optional(),
  status: z.enum(["issued", "void", "replaced"]).optional(),
  amount: z.coerce.string().optional(),
  currency: z.string().optional(),
  paymentMethod: z
    .enum(["cash", "bank_transfer", "mobile_money", "check", "other"])
    .optional(),
  period: z.string().optional().nullable(),
  contributionId: z.string().optional().nullable(),
  loanId: z.string().optional().nullable(),
  penaltyId: z.string().optional().nullable(),
  fileUrl: z.string().optional().nullable(),
  fileKey: z.string().optional().nullable(),
  fileSize: z.number().optional().nullable(),
  fileType: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  issuedAt: z.coerce.date().optional(),
})

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
  return { user: sessionUser, role: activeRole }
}

function apiError(code: string, message: string, status: number) {
  return NextResponse.json(
    { success: false, data: null, error: { code, message } },
    { status }
  )
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user } = await getResolvedRole()
  if (!user) return apiError("UNAUTHORIZED", "Sign in.", 401)

  const { id } = await params
  const found = await receiptOperations.findById(id)
  if (!found) return apiError("NOT_FOUND", "Receipt not found.", 404)

  return NextResponse.json({ success: true, data: found })
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, role } = await getResolvedRole()
  if (!user) return apiError("UNAUTHORIZED", "Sign in.", 401)

  const { id } = await params
  const existing = await receiptOperations.findById(id)
  if (!existing) return apiError("NOT_FOUND", "Receipt not found.", 404)

  if (!["admin", "treasurer", "president"].includes(role ?? "")) {
    return apiError(
      "FORBIDDEN",
      "Only treasurers and admins can edit receipts.",
      403
    )
  }

  const body = await request.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: { code: "VALIDATION_ERROR", details: parsed.error.issues },
      },
      { status: 400 }
    )
  }

  const updated = await receiptOperations.updateById(id, parsed.data as any)
  return NextResponse.json({ success: true, data: { receipt: updated } })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, role } = await getResolvedRole()
  if (!user) return apiError("UNAUTHORIZED", "Sign in.", 401)

  const { id } = await params
  const existing = await receiptOperations.findById(id)
  if (!existing) return apiError("NOT_FOUND", "Receipt not found.", 404)

  if (!["admin", "treasurer", "president"].includes(role ?? "")) {
    return apiError(
      "FORBIDDEN",
      "Only treasurers and admins can delete receipts.",
      403
    )
  }

  await receiptOperations.deleteById(id)
  return NextResponse.json({
    success: true,
    data: null,
    message: "Receipt deleted.",
  })
}
