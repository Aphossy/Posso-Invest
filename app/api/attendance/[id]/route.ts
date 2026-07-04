import { headers } from "next/headers"
import { NextResponse } from "next/server"
import { db } from "@/db/connection"
import { attendanceOperations } from "@/db/operations/attendance-operations"
import { member } from "@/db/schemas"
import { insertAttendanceSchema } from "@/db/schemas/attendance-schema"
import { extractRoleValue } from "@/utils/role-utils"
import { and, eq } from "drizzle-orm"
import { z } from "zod"

import { auth } from "@/lib/auth"

const updateSchema = insertAttendanceSchema
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    recordedBy: true,
  })
  .partial()
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
      console.error("[attendance:id:getSessionUser] member lookup failed", {
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
        "[attendance:id:getSessionUser] getActiveMemberRole fallback failed",
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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const record = await attendanceOperations.findById((await params).id)
  if (!record) {
    return apiError(
      "NOT_FOUND",
      "Attendance record not found.",
      404,
      { attendanceId: (await params).id },
      "Refresh the page and try again."
    )
  }

  if (
    !["admin", "secretary", "treasurer", "president"].includes(role ?? "") &&
    record.memberId !== user.id
  ) {
    return apiError(
      "FORBIDDEN",
      "You do not have access to this attendance record.",
      403,
      { memberId: record.memberId },
      "Only your own attendance is visible for members."
    )
  }

  return NextResponse.json({ data: record })
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, role, activeOrganizationId, sessionRole } =
    await getSessionUser()
  if (!user) {
    return apiError(
      "UNAUTHORIZED",
      "You must be signed in to update attendance.",
      401,
      {},
      "Please sign in and try again."
    )
  }

  if (!["admin", "secretary", "treasurer", "president"].includes(role ?? "")) {
    return apiError(
      "FORBIDDEN",
      "Only secretaries, treasurers, and admins can update attendance.",
      403,
      { role, activeOrganizationId, sessionRole },
      "Make sure you are using an active Secretary, Treasurer, or Admin organization role."
    )
  }

  const body = await request.json()
  const parsed = updateSchema.safeParse(body)
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

  const updated = await attendanceOperations.updateById(
    (await params).id,
    parsed.data
  )
  if (!updated) {
    return apiError(
      "NOT_FOUND",
      "Attendance record not found.",
      404,
      { attendanceId: (await params).id },
      "Refresh the page and try again."
    )
  }

  return NextResponse.json({
    success: true,
    data: { attendance: updated },
    message: "Attendance updated successfully.",
    error: null,
  })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, role, activeOrganizationId, sessionRole } =
    await getSessionUser()
  if (!user) {
    return apiError(
      "UNAUTHORIZED",
      "You must be signed in to delete attendance.",
      401,
      {},
      "Please sign in and try again."
    )
  }

  if (!["admin", "secretary", "treasurer", "president"].includes(role ?? "")) {
    return apiError(
      "FORBIDDEN",
      "Only secretaries, treasurers, and admins can delete attendance.",
      403,
      { role, activeOrganizationId, sessionRole },
      "Make sure you are using an active Secretary, Treasurer, or Admin organization role."
    )
  }

  const removed = await attendanceOperations.deleteById((await params).id)
  if (!removed) {
    return apiError(
      "NOT_FOUND",
      "Attendance record not found.",
      404,
      { attendanceId: (await params).id },
      "Refresh the page and try again."
    )
  }

  return NextResponse.json({
    success: true,
    data: null,
    message: "Attendance deleted successfully.",
    error: null,
  })
}
