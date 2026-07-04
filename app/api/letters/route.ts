import { headers } from "next/headers"
import { NextResponse } from "next/server"
import { db } from "@/db/connection"
import { letterOperations } from "@/db/operations/letter-operations"
import { userOperations } from "@/db/operations/user-operations"
import { member } from "@/db/schemas"
import { insertLetterSchema } from "@/db/schemas/letter-schema"
import { extractRoleValue } from "@/utils/role-utils"
import { and, eq } from "drizzle-orm"
import { z } from "zod"

import { auth } from "@/lib/auth"

const listSchema = z.object({
  search: z.string().optional(),
  letterType: z.string().optional(),
  status: z.string().optional(),
  visibility: z.string().optional(),
  issuedBy: z.string().optional(),
  recipientMemberId: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  offset: z.coerce.number().min(0).optional(),
})

const createSchema = insertLetterSchema
  .omit({ id: true, createdAt: true, updatedAt: true })
  .extend({
    issuedAt: z.coerce.date().optional(),
    dueDate: z.coerce.date().optional(),
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
  if (!user) return apiError("UNAUTHORIZED", "Sign in to view letters.", 401)

  const params = listSchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams)
  )
  if (!params.success)
    return apiError("VALIDATION_ERROR", "Invalid query parameters.", 400)

  const {
    search,
    letterType,
    status,
    visibility,
    sortBy,
    sortOrder,
    limit = 20,
    offset = 0,
  } = params.data

  // Non-admins/secretaries can only see published/sent letters unless they're the issuer
  const isPrivileged = [
    "admin",
    "secretary",
    "treasurer",
    "president",
  ].includes(role ?? "")

  const filters: Record<string, any> = {
    search,
    letterType,
    status,
    visibility: isPrivileged ? visibility : "published",
    ...(params.data.issuedBy && isPrivileged
      ? { issuedBy: params.data.issuedBy }
      : {}),
    ...(params.data.recipientMemberId
      ? { recipientMemberId: params.data.recipientMemberId }
      : {}),
  }

  const [letters, total] = await Promise.all([
    letterOperations.findMany({
      limit,
      offset,
      sortBy: sortBy as any,
      sortOrder,
      filters,
    }),
    letterOperations.count({ filters }),
  ])

  const userIds = new Set<string>()
  letters.forEach((l) => {
    if (l.issuedBy) userIds.add(l.issuedBy)
    if (l.recipientMemberId) userIds.add(l.recipientMemberId)
  })

  const users = userIds.size ? await userOperations.findByIds([...userIds]) : []
  const userMap = new Map(users.map((u) => [u.id, u]))

  const enriched = letters.map((l) => ({
    ...l,
    issuedByName: l.issuedBy ? (userMap.get(l.issuedBy)?.name ?? null) : null,
    recipientMemberName: l.recipientMemberId
      ? (userMap.get(l.recipientMemberId)?.name ?? null)
      : null,
  }))

  return NextResponse.json({ success: true, data: enriched, total })
}

export async function POST(request: Request) {
  const { user, role } = await getResolvedRole()
  if (!user) return apiError("UNAUTHORIZED", "Sign in to create a letter.", 401)

  if (!["admin", "secretary", "president"].includes(role ?? "")) {
    return apiError(
      "FORBIDDEN",
      "Only secretaries and admins can create letters.",
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
          message: "Invalid letter payload.",
          details: parsed.error.issues,
        },
      },
      { status: 400 }
    )
  }

  const created = await letterOperations.create({
    ...parsed.data,
    id: crypto.randomUUID(),
    issuedBy: user.id,
  })

  return NextResponse.json(
    { success: true, data: { letter: created }, message: "Letter created." },
    { status: 201 }
  )
}
