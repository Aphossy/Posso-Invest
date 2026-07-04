import { headers } from "next/headers"
import { NextResponse } from "next/server"
import { db } from "@/db/connection"
import { meetingOperations } from "@/db/operations/meeting-operations"
import { minutesOperations } from "@/db/operations/minutes-operations"
import { userOperations } from "@/db/operations/user-operations"
import { member } from "@/db/schemas"
import { insertMeetingMinutesSchema } from "@/db/schemas/minutes-schema"
import { extractRoleValue } from "@/utils/role-utils"
import { and, eq } from "drizzle-orm"
import { z } from "zod"

import { auth } from "@/lib/auth"

const listSchema = z.object({
  meetingId: z.string().optional(),
  status: z.string().optional(),
  limit: z.coerce.number().min(1).max(200).optional(),
  offset: z.coerce.number().min(0).optional(),
})

const createSchema = insertMeetingMinutesSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})

async function getResolvedRole() {
  const headersList = await headers()
  const session = await auth.api.getSession({ headers: headersList })
  const sessionUser = session?.user || null
  const sessionRole = sessionUser?.role ?? null
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
      console.error("[minutes:getResolvedRole] member lookup failed", {
        userId: sessionUser.id,
        activeOrganizationId,
        error,
      })
    }
  }

  if (!activeRole) {
    try {
      const orgApi = auth.api as any
      const roleResponse = orgApi?.organization?.getActiveMemberRole
        ? await orgApi.organization.getActiveMemberRole({
            headers: headersList,
          })
        : null
      activeRole = extractRoleValue(roleResponse)
    } catch (error) {
      console.error(
        "[minutes:getResolvedRole] getActiveMemberRole fallback failed",
        {
          userId: sessionUser?.id,
          activeOrganizationId,
          error,
        }
      )
    }
  }

  if (sessionUser && !activeRole) {
    console.warn("[minutes:getResolvedRole] unresolved active role", {
      userId: sessionUser.id,
      activeOrganizationId,
      sessionRole,
    })
  }

  return {
    user: sessionUser,
    role: activeRole,
    activeOrganizationId,
    sessionRole,
  }
}

function apiError(
  code: string,
  message: string,
  status: number,
  details: Record<string, any> = {},
  help?: string
) {
  return NextResponse.json(
    {
      success: false,
      data: null,
      error: { code, message, details, help },
    },
    { status }
  )
}

export async function GET(request: Request) {
  const { user, role } = await getResolvedRole()
  if (!user) {
    return apiError(
      "UNAUTHORIZED",
      "You must be signed in to view minutes.",
      401,
      {},
      "Please sign in and try again."
    )
  }

  const params = listSchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams)
  )

  if (!params.success) {
    return apiError(
      "VALIDATION_ERROR",
      "Invalid query parameters",
      400,
      { zodErrors: params.error.flatten() },
      "Please check your query parameters and try again."
    )
  }

  const statusValues = params.data.status
    ?.split(",")
    .map((value) => value.trim())
    .filter(Boolean)
  const statusFilter = !["admin", "secretary"].includes(role ?? "")
    ? ["published"]
    : statusValues && statusValues.length > 0
      ? statusValues
      : undefined

  const minutes = await minutesOperations.findMany({
    limit: params.data.limit,
    offset: params.data.offset,
    filters: {
      meetingId: params.data.meetingId,
      status: statusFilter,
    },
  })

  const meetingIds = new Set(minutes.map((item) => item.meetingId))
  const recorderIds = new Set(
    minutes.map((item) => item.recordedBy).filter(Boolean) as string[]
  )
  const approverIds = new Set(
    minutes.map((item) => item.approvedBy).filter(Boolean) as string[]
  )
  const meetings = await meetingOperations.findByIds([...meetingIds])
  const users = await userOperations.findByIds([
    ...new Set([...recorderIds, ...approverIds]),
  ])
  const meetingMap = new Map(meetings.map((item) => [item.id, item]))
  const userMap = new Map(users.map((member) => [member.id, member]))
  const enriched = minutes.map((item) => ({
    ...item,
    meetingTitle: meetingMap.get(item.meetingId)?.title ?? null,
    recordedByName: item.recordedBy
      ? (userMap.get(item.recordedBy)?.name ?? null)
      : null,
    approvedByName: item.approvedBy
      ? (userMap.get(item.approvedBy)?.name ?? null)
      : null,
  }))

  const total = await minutesOperations.count({
    filters: {
      meetingId: params.data.meetingId,
      status: statusFilter,
    },
  })

  return NextResponse.json({ data: enriched, total })
}

export async function POST(request: Request) {
  const { user, role, activeOrganizationId, sessionRole } =
    await getResolvedRole()
  if (!user) {
    return apiError(
      "UNAUTHORIZED",
      "You must be signed in to record minutes.",
      401,
      {},
      "Please sign in and try again."
    )
  }

  if (!["admin", "secretary"].includes(role ?? "")) {
    console.warn("[minutes:POST] forbidden role", {
      userId: user.id,
      role,
      activeOrganizationId,
      sessionRole,
    })
    return apiError(
      "FORBIDDEN",
      "Only secretaries and admins can record minutes.",
      403,
      { role, activeOrganizationId, sessionRole },
      "Make sure you are using an active Secretary or Admin organization role."
    )
  }

  const body = await request.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "Invalid minutes payload.",
      400,
      {
        validationErrors: parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
      "Please review the highlighted fields and try again."
    )
  }

  const created = await minutesOperations.create({
    ...parsed.data,
    id: crypto.randomUUID(),
    recordedBy: user.id,
  })

  return NextResponse.json(
    {
      success: true,
      data: { minute: created },
      message: "Minutes created successfully.",
      error: null,
    },
    { status: 201 }
  )
}
