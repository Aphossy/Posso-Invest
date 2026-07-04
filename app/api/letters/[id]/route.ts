import { headers } from "next/headers"
import { NextResponse } from "next/server"
import { db } from "@/db/connection"
import { letterOperations } from "@/db/operations/letter-operations"
import { member } from "@/db/schemas"
import { extractRoleValue } from "@/utils/role-utils"
import { and, eq } from "drizzle-orm"
import { z } from "zod"

import { auth } from "@/lib/auth"

const updateSchema = z.object({
  subject: z.string().min(1).optional(),
  letterType: z
    .enum([
      "approval_request",
      "official_notice",
      "legal_notice",
      "meeting_notice",
      "member_communication",
      "general_correspondence",
    ])
    .optional(),
  status: z
    .enum([
      "draft",
      "sent",
      "acknowledged",
      "pending_signature",
      "signed",
      "approved",
      "rejected",
      "archived",
    ])
    .optional(),
  visibility: z
    .enum(["public", "authenticated", "committee", "private"])
    .optional(),
  recipient: z.string().optional(),
  recipientMemberId: z.string().optional().nullable(),
  description: z.string().optional(),
  notes: z.string().optional(),
  refNumber: z.string().optional(),
  fileUrl: z.string().optional().nullable(),
  fileKey: z.string().optional().nullable(),
  fileSize: z.number().optional().nullable(),
  fileType: z.string().optional().nullable(),
  issuedAt: z.coerce.date().optional().nullable(),
  dueDate: z.coerce.date().optional().nullable(),
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
  if (!user)
    return apiError("UNAUTHORIZED", "Sign in to view this letter.", 401)

  const { id } = await params
  const found = await letterOperations.findById(id)
  if (!found) return apiError("NOT_FOUND", "Letter not found.", 404)

  return NextResponse.json({ success: true, data: found })
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, role } = await getResolvedRole()
  if (!user)
    return apiError("UNAUTHORIZED", "Sign in to edit this letter.", 401)

  const { id } = await params
  const existing = await letterOperations.findById(id)
  if (!existing) return apiError("NOT_FOUND", "Letter not found.", 404)

  const isPrivileged = ["admin", "secretary", "president"].includes(role ?? "")
  const isOwner = existing.issuedBy === user.id

  if (!isPrivileged && !isOwner) {
    return apiError("FORBIDDEN", "You can only edit your own letters.", 403)
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

  const updated = await letterOperations.updateById(id, parsed.data)
  return NextResponse.json({ success: true, data: { letter: updated } })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, role } = await getResolvedRole()
  if (!user)
    return apiError("UNAUTHORIZED", "Sign in to delete this letter.", 401)

  const { id } = await params
  const existing = await letterOperations.findById(id)
  if (!existing) return apiError("NOT_FOUND", "Letter not found.", 404)

  const isPrivileged = ["admin", "secretary", "president"].includes(role ?? "")
  const isOwner = existing.issuedBy === user.id

  if (!isPrivileged && !isOwner) {
    return apiError("FORBIDDEN", "You can only delete your own letters.", 403)
  }

  await letterOperations.deleteById(id)
  return NextResponse.json({
    success: true,
    data: null,
    message: "Letter deleted.",
  })
}
