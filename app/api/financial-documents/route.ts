import { headers } from "next/headers"
import { NextResponse } from "next/server"
import { db } from "@/db/connection"
import { financialDocumentOperations } from "@/db/operations/financial-document-operations"
import { userOperations } from "@/db/operations/user-operations"
import { member } from "@/db/schemas"
import { insertFinancialDocumentSchema } from "@/db/schemas/financial-document-schema"
import { extractRoleValue } from "@/utils/role-utils"
import { and, eq } from "drizzle-orm"
import { z } from "zod"

import { auth } from "@/lib/auth"

const listSchema = z.object({
  search: z.string().optional(),
  docType: z.string().optional(),
  status: z.string().optional(),
  visibility: z.string().optional(),
  period: z.string().optional(),
  fiscalYear: z.coerce.number().optional(),
  uploadedBy: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  offset: z.coerce.number().min(0).optional(),
})

const createSchema = insertFinancialDocumentSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
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
  if (!user)
    return apiError("UNAUTHORIZED", "Sign in to view financial documents.", 401)

  const params = listSchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams)
  )
  if (!params.success)
    return apiError("VALIDATION_ERROR", "Invalid query parameters.", 400)

  const {
    search,
    docType,
    status,
    visibility,
    period,
    fiscalYear,
    sortBy,
    sortOrder,
    limit = 20,
    offset = 0,
  } = params.data

  const isPrivileged = ["admin", "treasurer", "president"].includes(role ?? "")

  const filters: Record<string, any> = {
    search,
    docType,
    status,
    period,
    fiscalYear,
    visibility: isPrivileged ? visibility : "committee", // Non-privileged users can only see committee-visible documents
    ...(params.data.uploadedBy && isPrivileged
      ? { uploadedBy: params.data.uploadedBy }
      : {}),
  }

  const [docs, total] = await Promise.all([
    financialDocumentOperations.findMany({
      limit,
      offset,
      sortBy: sortBy as any,
      sortOrder,
      filters,
    }),
    financialDocumentOperations.count({ filters }),
  ])

  const uploaderIds = new Set(
    docs.map((d) => d.uploadedBy).filter(Boolean) as string[]
  )
  const users = uploaderIds.size
    ? await userOperations.findByIds([...uploaderIds])
    : []
  const userMap = new Map(users.map((u) => [u.id, u]))

  const enriched = docs.map((d) => ({
    ...d,
    uploaderName: d.uploadedBy
      ? (userMap.get(d.uploadedBy)?.name ?? null)
      : null,
    uploaderEmail: d.uploadedBy
      ? (userMap.get(d.uploadedBy)?.email ?? null)
      : null,
  }))

  return NextResponse.json({ success: true, data: enriched, total })
}

export async function POST(request: Request) {
  const { user, role } = await getResolvedRole()
  if (!user)
    return apiError(
      "UNAUTHORIZED",
      "Sign in to upload a financial document.",
      401
    )

  if (!["admin", "treasurer", "president"].includes(role ?? "")) {
    return apiError(
      "FORBIDDEN",
      "Only treasurers and admins can upload financial documents.",
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

  const created = await financialDocumentOperations.create({
    ...parsed.data,
    id: crypto.randomUUID(),
    uploadedBy: user.id,
  })

  return NextResponse.json(
    {
      success: true,
      data: { financialDocument: created },
      message: "Document uploaded.",
    },
    { status: 201 }
  )
}
