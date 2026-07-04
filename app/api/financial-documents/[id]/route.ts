import { headers } from "next/headers"
import { NextResponse } from "next/server"
import { db } from "@/db/connection"
import { financialDocumentOperations } from "@/db/operations/financial-document-operations"
import { member } from "@/db/schemas"
import { extractRoleValue } from "@/utils/role-utils"
import { and, eq } from "drizzle-orm"
import { z } from "zod"

import { auth } from "@/lib/auth"

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  docType: z
    .enum([
      "monthly_report",
      "balance_sheet",
      "income_statement",
      "contribution_schedule",
      "loan_agreement",
      "disbursement_record",
      "repayment_schedule",
      "audit_report",
      "bank_statement",
      "budget",
      "other",
    ])
    .optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
  visibility: z
    .enum(["public", "authenticated", "committee", "private"])
    .optional(),
  period: z.string().optional().nullable(),
  fiscalYear: z.number().optional().nullable(),
  fileUrl: z.string().optional().nullable(),
  fileKey: z.string().optional().nullable(),
  fileSize: z.number().optional().nullable(),
  fileType: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
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
  const found = await financialDocumentOperations.findById(id)
  if (!found) return apiError("NOT_FOUND", "Document not found.", 404)

  return NextResponse.json({ success: true, data: found })
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, role } = await getResolvedRole()
  if (!user) return apiError("UNAUTHORIZED", "Sign in.", 401)

  const { id } = await params
  const existing = await financialDocumentOperations.findById(id)
  if (!existing) return apiError("NOT_FOUND", "Document not found.", 404)

  const isPrivileged = ["admin", "treasurer", "president"].includes(role ?? "")
  const isOwner = existing.uploadedBy === user.id

  if (!isPrivileged && !isOwner) {
    return apiError("FORBIDDEN", "You can only edit your own documents.", 403)
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

  const updated = await financialDocumentOperations.updateById(id, parsed.data)
  return NextResponse.json({
    success: true,
    data: { financialDocument: updated },
  })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, role } = await getResolvedRole()
  if (!user) return apiError("UNAUTHORIZED", "Sign in.", 401)

  const { id } = await params
  const existing = await financialDocumentOperations.findById(id)
  if (!existing) return apiError("NOT_FOUND", "Document not found.", 404)

  const isPrivileged = ["admin", "treasurer", "president"].includes(role ?? "")
  const isOwner = existing.uploadedBy === user.id

  if (!isPrivileged && !isOwner) {
    return apiError("FORBIDDEN", "You can only delete your own documents.", 403)
  }

  await financialDocumentOperations.deleteById(id)
  return NextResponse.json({
    success: true,
    data: null,
    message: "Document deleted.",
  })
}
