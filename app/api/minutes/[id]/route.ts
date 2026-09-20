import { NextResponse } from "next/server"
import { minutesOperations } from "@/db/operations/minutes-operations"
import { insertMeetingMinutesSchema } from "@/db/schemas/minutes-schema"
import { z } from "zod"

import { getSessionUserCached } from "@/lib/get-session-cached"

const updateSchema = insertMeetingMinutesSchema
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .partial()
  .extend({
    publishedAt: z.coerce.date().optional(),
  })

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
  const { user, role } = await getSessionUserCached()
  if (!user) {
    return apiError(
      "UNAUTHORIZED",
      "You must be signed in to view minutes.",
      401,
      {},
      "Please sign in and try again."
    )
  }

  const record = await minutesOperations.findById((await params).id)
  if (!record) {
    return apiError(
      "NOT_FOUND",
      "Minutes record not found.",
      404,
      { minuteId: (await params).id },
      "Refresh the page and try again."
    )
  }

  if (
    !["admin", "secretary"].includes(role ?? "") &&
    record.status !== "published"
  ) {
    return apiError(
      "FORBIDDEN",
      "You do not have access to this minutes record.",
      403,
      { status: record.status },
      "Published records are visible to members."
    )
  }

  return NextResponse.json({ data: record })
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, role, activeOrganizationId, sessionRole } =
    await getSessionUserCached()
  if (!user) {
    return apiError(
      "UNAUTHORIZED",
      "You must be signed in to update minutes.",
      401,
      {},
      "Please sign in and try again."
    )
  }

  if (!["admin", "secretary"].includes(role ?? "")) {
    return apiError(
      "FORBIDDEN",
      "Only secretaries and admins can update minutes.",
      403,
      { role, activeOrganizationId, sessionRole },
      "Make sure you are using an active Secretary or Admin organization role."
    )
  }

  const body = await request.json()
  const parsed = updateSchema.safeParse(body)
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

  const updated = await minutesOperations.updateById(
    (await params).id,
    parsed.data
  )
  if (!updated) {
    return apiError(
      "NOT_FOUND",
      "Minutes record not found.",
      404,
      { minuteId: (await params).id },
      "Refresh the page and try again."
    )
  }

  return NextResponse.json({
    success: true,
    data: { minute: updated },
    message: "Minutes updated successfully.",
    error: null,
  })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, role, activeOrganizationId, sessionRole } =
    await getSessionUserCached()
  if (!user) {
    return apiError(
      "UNAUTHORIZED",
      "You must be signed in to delete minutes.",
      401,
      {},
      "Please sign in and try again."
    )
  }

  if (!["admin", "secretary"].includes(role ?? "")) {
    return apiError(
      "FORBIDDEN",
      "Only secretaries and admins can delete minutes.",
      403,
      { role, activeOrganizationId, sessionRole },
      "Make sure you are using an active Secretary or Admin organization role."
    )
  }

  const removed = await minutesOperations.deleteById((await params).id)
  if (!removed) {
    return apiError(
      "NOT_FOUND",
      "Minutes record not found.",
      404,
      { minuteId: (await params).id },
      "Refresh the page and try again."
    )
  }

  return NextResponse.json({
    success: true,
    data: null,
    message: "Minutes deleted successfully.",
    error: null,
  })
}
