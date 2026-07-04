import { headers } from "next/headers"
import { NextResponse } from "next/server"
import { db } from "@/db/connection"
import { letterOperations } from "@/db/operations/letter-operations"
import { member } from "@/db/schemas"
import { extractRoleValue } from "@/utils/role-utils"
import { and, eq } from "drizzle-orm"

import { auth } from "@/lib/auth"
import { getSignedUrlForDownload } from "@/lib/r2-enhanced"

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

function canAccessLetter(
  letter: {
    visibility: string
    issuedBy: string | null
    recipientMemberId: string | null
  },
  role: string | null,
  userId: string
) {
  if (letter.issuedBy === userId || letter.recipientMemberId === userId) {
    return true
  }

  if (letter.visibility === "public" || letter.visibility === "authenticated") {
    return true
  }

  if (letter.visibility === "committee") {
    return ["admin", "secretary", "treasurer", "president"].includes(role ?? "")
  }

  return ["admin", "secretary", "president"].includes(role ?? "")
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, role } = await getResolvedRole()
  if (!user)
    return apiError("UNAUTHORIZED", "Sign in to download letters.", 401)

  const { id } = await params
  const found = await letterOperations.findById(id)
  if (!found) return apiError("NOT_FOUND", "Letter not found.", 404)

  if (!canAccessLetter(found, role, user.id)) {
    return apiError("FORBIDDEN", "You do not have access to this letter.", 403)
  }

  if (!found.fileUrl) {
    return apiError("NOT_FOUND", "No file attached to this letter.", 404)
  }

  let downloadUrl = found.fileUrl
  if (found.fileKey) {
    try {
      downloadUrl = await getSignedUrlForDownload(found.fileKey, 3600)
    } catch {
      // Fall back to stored URL when URL signing fails.
    }
  }

  letterOperations.incrementDownloadCount(id).catch(() => {})

  return NextResponse.json({
    success: true,
    data: {
      downloadUrl,
      expiresIn: found.fileKey ? 3600 : undefined,
      fileName: found.subject,
      fileType: found.fileType,
      fileSize: found.fileSize,
    },
  })
}
