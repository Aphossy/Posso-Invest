import { headers } from "next/headers"
import { NextResponse } from "next/server"
import { db } from "@/db/connection"
import { auditLogOperations } from "@/db/operations/audit-log-operations"
import {
  shareOutAllocationOperations,
  shareOutOperations,
} from "@/db/operations/share-out-operations"
import { member } from "@/db/schemas"
import { extractRoleValue } from "@/utils/role-utils"
import { and, eq } from "drizzle-orm"
import { z } from "zod"

import { auth } from "@/lib/auth"
import { computeShareOutAllocations } from "@/lib/share-out"

const leadershipRoles = ["admin", "treasurer", "president"] as const

const createSchema = z.object({
  label: z.string().trim().min(1).max(160).optional(),
  fiscalYear: z.coerce.number().int().min(2000).max(2100).optional(),
  distributableAmount: z.coerce.number().positive(),
  notes: z.string().trim().max(2000).optional(),
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

async function getResolvedContext() {
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
    } catch (error) {
      console.error("[share-outs:getResolvedContext] member lookup failed", {
        error,
      })
    }
  }

  if (!activeRole) {
    try {
      const orgApi = (auth.api as any).organization
      const roleResponse = orgApi?.getActiveMemberRole
        ? await orgApi.getActiveMemberRole({ headers: headersList })
        : null
      activeRole = extractRoleValue(roleResponse)
    } catch {
      // ignore
    }
  }

  return { user: sessionUser, role: activeRole, activeOrganizationId }
}

export async function GET() {
  const { user, role } = await getResolvedContext()
  if (!user) {
    return apiError("UNAUTHORIZED", "You must be signed in.", 401)
  }
  if (!leadershipRoles.includes(role as (typeof leadershipRoles)[number])) {
    return apiError(
      "FORBIDDEN",
      "You do not have permission to view share-outs.",
      403,
      { role }
    )
  }

  const cycles = await shareOutOperations.findMany(50)
  return NextResponse.json({
    success: true,
    data: cycles,
    message: "Share-outs loaded.",
    error: null,
  })
}

export async function POST(request: Request) {
  const { user, role, activeOrganizationId } = await getResolvedContext()
  if (!user) {
    return apiError("UNAUTHORIZED", "You must be signed in.", 401)
  }
  if (!leadershipRoles.includes(role as (typeof leadershipRoles)[number])) {
    return apiError(
      "FORBIDDEN",
      "You do not have permission to create a share-out.",
      403,
      { role }
    )
  }
  if (!activeOrganizationId) {
    return apiError(
      "INVALID_STATE",
      "No active organization.",
      409,
      {},
      "Select an organization and try again."
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return apiError("VALIDATION_ERROR", "Invalid payload.", 400)
  }

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "Invalid share-out payload.", 400, {
      validationErrors: parsed.error.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      })),
    })
  }

  const fiscalYear = parsed.data.fiscalYear ?? new Date().getFullYear()
  const label = parsed.data.label ?? `${fiscalYear} Annual Share-out`

  const preview = await computeShareOutAllocations(
    activeOrganizationId,
    parsed.data.distributableAmount
  )

  if (preview.memberCount === 0 || preview.totalContributionBase <= 0) {
    return apiError(
      "INVALID_STATE",
      "No member contributions available to share out.",
      409,
      { preview },
      "Members need confirmed contributions before a share-out can be computed."
    )
  }

  const cycle = await shareOutOperations.create({
    id: crypto.randomUUID(),
    label,
    fiscalYear,
    status: "draft",
    distributableAmount: String(parsed.data.distributableAmount),
    totalContributionBase: String(preview.totalContributionBase),
    totalGross: String(preview.totalGross),
    totalDeductions: String(preview.totalDeductions),
    totalNet: String(preview.totalNet),
    memberCount: preview.memberCount,
    notes: parsed.data.notes,
    createdBy: user.id,
  })

  await shareOutAllocationOperations.bulkCreate(
    preview.allocations.map((a) => ({
      id: crypto.randomUUID(),
      shareOutId: cycle.id,
      memberId: a.memberId,
      contributionBase: String(a.contributionBase),
      sharePercent: String(a.sharePercent),
      grossShare: String(a.grossShare),
      loanDeduction: String(a.loanDeduction),
      penaltyDeduction: String(a.penaltyDeduction),
      netShare: String(a.netShare),
      status: "pending" as const,
    }))
  )

  auditLogOperations
    .create({
      action: "share_out.created",
      userId: user.id,
      userEmail: user.email ?? undefined,
      resourceType: "share_out",
      resourceId: cycle.id,
      details: `Share-out draft "${label}" created for ${preview.memberCount} members`,
      metadata: {
        distributableAmount: parsed.data.distributableAmount,
        totalNet: preview.totalNet,
        actorRole: role,
      },
      severity: "high",
    })
    .catch(() => undefined)

  return NextResponse.json(
    {
      success: true,
      data: { cycle, allocations: preview.allocations },
      message: "Share-out draft created.",
      error: null,
    },
    { status: 201 }
  )
}
