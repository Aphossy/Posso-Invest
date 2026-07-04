import { headers } from "next/headers"
import { NextResponse } from "next/server"
import { db } from "@/db/connection"
import { attendanceOperations } from "@/db/operations/attendance-operations"
import { meetingOperations } from "@/db/operations/meeting-operations"
import { userOperations } from "@/db/operations/user-operations"
import { member } from "@/db/schemas"
import { insertAttendanceSchema } from "@/db/schemas/attendance-schema"
import { extractRoleValue } from "@/utils/role-utils"
import { and, eq } from "drizzle-orm"
import { z } from "zod"

import { auth } from "@/lib/auth"

const listSchema = z.object({
  meetingId: z.string().optional(),
  memberId: z.string().optional(),
  status: z.string().optional(),
  recordedBy: z.string().optional(),
  limit: z.coerce.number().min(1).max(200).optional(),
  offset: z.coerce.number().min(0).optional(),
})

const createSchema = insertAttendanceSchema
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    recordedBy: true,
  })
  .extend({
    checkedInAt: z.coerce.date().optional(),
  })

async function getSessionUser() {
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
      console.error("[attendance:getSessionUser] member lookup failed", {
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
        "[attendance:getSessionUser] getActiveMemberRole fallback failed",
        {
          userId: sessionUser?.id,
          activeOrganizationId,
          error,
        }
      )
    }
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
  const { user, role } = await getSessionUser()
  if (!user) {
    return apiError(
      "UNAUTHORIZED",
      "You must be signed in to view attendance.",
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

  const filters = {
    meetingId: params.data.meetingId,
    memberId: ["admin", "secretary", "treasurer", "president"].includes(
      role ?? ""
    )
      ? params.data.memberId
      : user.id,
    status: statusValues && statusValues.length > 0 ? statusValues : undefined,
    recordedBy: params.data.recordedBy,
  }

  const attendance = await attendanceOperations.findMany({
    limit: params.data.limit,
    offset: params.data.offset,
    filters,
  })

  const userIds = new Set<string>()
  const meetingIds = new Set<string>()
  attendance.forEach((item) => {
    userIds.add(item.memberId)
    if (item.recordedBy) userIds.add(item.recordedBy)
    meetingIds.add(item.meetingId)
  })

  const [users, meetings] = await Promise.all([
    userOperations.findByIds([...userIds]),
    meetingOperations.findByIds([...meetingIds]),
  ])
  const userMap = new Map(users.map((member) => [member.id, member]))
  const meetingMap = new Map(meetings.map((item) => [item.id, item]))

  const enriched = attendance.map((item) => ({
    ...item,
    memberName: userMap.get(item.memberId)?.name ?? null,
    memberEmail: userMap.get(item.memberId)?.email ?? null,
    recordedByName: item.recordedBy
      ? (userMap.get(item.recordedBy)?.name ?? null)
      : null,
    meetingTitle: meetingMap.get(item.meetingId)?.title ?? null,
  }))

  const total = await attendanceOperations.count({ filters })

  return NextResponse.json({ data: enriched, total })
}

export async function POST(request: Request) {
  const { user, role, activeOrganizationId, sessionRole } =
    await getSessionUser()
  if (!user) {
    return apiError(
      "UNAUTHORIZED",
      "You must be signed in to record attendance.",
      401,
      {},
      "Please sign in and try again."
    )
  }

  if (!["admin", "secretary", "treasurer", "president"].includes(role ?? "")) {
    return apiError(
      "FORBIDDEN",
      "Only secretaries, treasurers, and admins can record attendance.",
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
      "Invalid attendance payload.",
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

  const created = await attendanceOperations.create({
    ...parsed.data,
    id: crypto.randomUUID(),
    recordedBy: user.id,
  })

  return NextResponse.json(
    {
      success: true,
      data: { attendance: created },
      message: "Attendance recorded successfully.",
      error: null,
    },
    { status: 201 }
  )
}
