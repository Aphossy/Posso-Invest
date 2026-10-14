import { headers } from "next/headers"
import { NextResponse } from "next/server"
import { db } from "@/db/connection"
import { receiptOperations } from "@/db/operations/receipt-operations"
import { userOperations } from "@/db/operations/user-operations"
import { member } from "@/db/schemas"
import { extractRoleValue } from "@/utils/role-utils"
import { and, eq } from "drizzle-orm"

import { auth } from "@/lib/auth"
import { generateReceiptPdf } from "@/lib/receipt-pdf"

const privilegedRoles = ["admin", "treasurer", "president"]

async function getResolvedRole() {
  const headersList = await headers()
  const session = await auth.api.getSession({ headers: headersList })
  const sessionUser = session?.user || null
  const activeOrganizationId = session?.session?.activeOrganizationId

  let activeRole: string | null = null
  if (sessionUser?.id && activeOrganizationId) {
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
  }

  if (!activeRole) {
    const orgApi = (auth.api as any).organization
    const roleResponse = orgApi?.getActiveMemberRole
      ? await orgApi.getActiveMemberRole({ headers: headersList })
      : null
    activeRole = extractRoleValue(roleResponse)
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
  const { user, role } = await getResolvedRole()
  if (!user)
    return apiError("UNAUTHORIZED", "Sign in to view this receipt.", 401)

  const { id } = await params
  const found = await receiptOperations.findById(id)
  if (!found) return apiError("NOT_FOUND", "Receipt not found.", 404)

  if (
    found.memberId !== user.id &&
    found.issuedBy !== user.id &&
    !privilegedRoles.includes(role ?? "")
  ) {
    return apiError("FORBIDDEN", "You do not have access to this receipt.", 403)
  }

  const [memberUser, issuer] = await Promise.all([
    userOperations.findById(found.memberId),
    found.issuedBy ? userOperations.findById(found.issuedBy) : null,
  ])
  if (!memberUser)
    return apiError("NOT_FOUND", "Receipt member not found.", 404)

  const pdf = generateReceiptPdf({
    ...found,
    memberName: memberUser.name,
    issuedByName: issuer?.name,
  })
  const safeReceiptNumber = (found.receiptNumber ?? found.id).replace(
    /[^a-zA-Z0-9-_]/g,
    "_"
  )

  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${safeReceiptNumber}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  })
}
