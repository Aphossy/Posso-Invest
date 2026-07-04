import { headers } from "next/headers"
import { NextResponse } from "next/server"
import { db } from "@/db/connection"
import { financialDocumentOperations } from "@/db/operations/financial-document-operations"
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

function canAccessDocument(
  doc: { visibility: string; uploadedBy: string | null },
  role: string | null,
  userId: string
) {
  if (doc.uploadedBy === userId) return true
  if (doc.visibility === "public" || doc.visibility === "authenticated")
    return true
  if (doc.visibility === "committee") {
    return ["admin", "treasurer", "president", "secretary"].includes(role ?? "")
  }
  return ["admin", "treasurer", "president"].includes(role ?? "")
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, role } = await getResolvedRole()
  if (!user)
    return apiError(
      "UNAUTHORIZED",
      "Sign in to download financial documents.",
      401
    )

  const { id } = await params
  const doc = await financialDocumentOperations.findById(id)
  if (!doc) return apiError("NOT_FOUND", "Document not found.", 404)

  if (!canAccessDocument(doc, role, user.id)) {
    return apiError(
      "FORBIDDEN",
      "You do not have access to this document.",
      403
    )
  }

  if (!doc.fileUrl) {
    return apiError("NOT_FOUND", "No file attached to this document.", 404)
  }

  let downloadUrl = doc.fileUrl
  if (doc.fileKey) {
    try {
      downloadUrl = await getSignedUrlForDownload(doc.fileKey, 3600)
    } catch {
      // Fall back to stored URL when signing fails.
    }
  }

  financialDocumentOperations.incrementDownloadCount(id).catch(() => {})

  return NextResponse.json({
    success: true,
    data: {
      downloadUrl,
      expiresIn: doc.fileKey ? 3600 : undefined,
      fileName: doc.title,
      fileType: doc.fileType,
      fileSize: doc.fileSize,
    },
  })
}
