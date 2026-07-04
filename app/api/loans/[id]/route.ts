import { headers } from "next/headers"
import { NextResponse } from "next/server"
import { db } from "@/db/connection"
import { auditLogOperations } from "@/db/operations/audit-log-operations"
import { loanOperations } from "@/db/operations/loan-operations"
import { userOperations } from "@/db/operations/user-operations"
import { member, user as userTable } from "@/db/schemas"
import { insertLoanSchema } from "@/db/schemas/loan-schema"
import { LoanUpdatedLeadershipEmail } from "@/emails/loan-updated-leadership"
import { LoanUpdatedMemberEmail } from "@/emails/loan-updated-member"
import logger from "@/utils/logger"
import {
  createBulkNotifications,
  type NotificationPayload,
} from "@/utils/notification-utils"
import { extractRoleValue } from "@/utils/role-utils"
import { render } from "@react-email/components"
import { and, eq, inArray } from "drizzle-orm"
import { z } from "zod"

import {
  DOMAIN_NOTIFICATION_TYPE,
  NOTIFICATION_ACTION,
} from "@/types/notifications"
import { auth } from "@/lib/auth"
import sendEmail from "@/lib/send-email"

const updateSchema = insertLoanSchema
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .partial()
  .extend({
    requestedAmount: z.coerce.string().optional(),
    approvedAmount: z.coerce.string().optional(),
    interestRate: z.coerce.string().optional(),
    dueDate: z.coerce.date().optional(),
    approvedAt: z.coerce.date().optional(),
    disbursedAt: z.coerce.date().optional(),
    repaidAt: z.coerce.date().optional(),
  })

const memberUpdateSchema = updateSchema.pick({
  requestedAmount: true,
  termMonths: true,
  notes: true,
  metadata: true,
})

const loanLeadershipRoles = ["admin", "president"] as const

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
      console.error("[loans:[id]:getResolvedRole] member lookup failed", {
        userId: sessionUser.id,
        activeOrganizationId,
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
    } catch (error) {
      console.error(
        "[loans:[id]:getResolvedRole] getActiveMemberRole fallback failed",
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

async function getLoanLeadershipRecipients(
  activeOrganizationId?: string | null
) {
  if (!activeOrganizationId) return []

  try {
    const rows = await db
      .select({
        userId: userTable.id,
        name: userTable.name,
        email: userTable.email,
        role: member.role,
      })
      .from(member)
      .innerJoin(userTable, eq(member.userId, userTable.id))
      .where(
        and(
          eq(member.organizationId, activeOrganizationId),
          inArray(member.role, [...loanLeadershipRoles])
        )
      )

    const deduped = new Map<
      string,
      { userId: string; name: string; email: string; role: string }
    >()

    for (const row of rows) {
      if (!row.email) continue
      deduped.set(row.userId, row)
    }

    return [...deduped.values()]
  } catch (error) {
    console.error("[loans:[id]:getLoanLeadershipRecipients] lookup failed", {
      activeOrganizationId,
      error,
    })
    return []
  }
}

function toIso(value: Date | null | undefined) {
  return value ? new Date(value).toISOString() : undefined
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, role } = await getResolvedRole()
  if (!user) {
    return apiError(
      "UNAUTHORIZED",
      "You must be signed in to view this loan.",
      401,
      {},
      "Please sign in and try again."
    )
  }

  const record = await loanOperations.findById((await params).id)
  if (!record) {
    return apiError(
      "NOT_FOUND",
      "Loan not found.",
      404,
      {},
      "Please refresh and try again."
    )
  }

  if (
    !["admin", "treasurer", "president"].includes(role ?? "") &&
    record.memberId !== user.id
  ) {
    return apiError(
      "FORBIDDEN",
      "You do not have permission to view this loan.",
      403,
      { role },
      "Make sure you are using the correct organization role."
    )
  }

  return NextResponse.json({
    success: true,
    data: record,
    message: "Loan loaded successfully.",
    error: null,
  })
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, role, activeOrganizationId } = await getResolvedRole()
  if (!user) {
    return apiError(
      "UNAUTHORIZED",
      "You must be signed in to update this loan.",
      401,
      {},
      "Please sign in and try again."
    )
  }

  const existing = await loanOperations.findById((await params).id)
  if (!existing) {
    return apiError(
      "NOT_FOUND",
      "Loan not found.",
      404,
      {},
      "Please refresh and try again."
    )
  }

  const canEditAsMember =
    role === "member" &&
    existing.memberId === user.id &&
    existing.status === "requested"

  if (
    !canEditAsMember &&
    !["admin", "treasurer", "president"].includes(role ?? "")
  ) {
    return apiError(
      "FORBIDDEN",
      "You do not have permission to update this loan.",
      403,
      { role, status: existing.status },
      "Only the request owner may edit a pending request."
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return apiError(
      "VALIDATION_ERROR",
      "Invalid loan payload.",
      400,
      {
        validationErrors: [
          { path: "", message: "Request body must be valid JSON." },
        ],
      },
      "Please review the form and try again."
    )
  }

  const parsed = (
    canEditAsMember ? memberUpdateSchema : updateSchema
  ).safeParse(body)
  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "Invalid loan payload.",
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

  const updatePayload = {
    ...(parsed.data as z.infer<typeof updateSchema>),
  }

  if (!canEditAsMember) {
    if (updatePayload.status === "approved" && existing.status !== "approved") {
      updatePayload.approvedBy = user.id
    }
    if (updatePayload.status === "rejected" && existing.status !== "rejected") {
      updatePayload.approvedBy = user.id
    }
    if (
      updatePayload.status === "disbursed" &&
      existing.status !== "disbursed"
    ) {
      updatePayload.disbursedBy = user.id
    }
  }

  const updated = await loanOperations.updateById(
    (await params).id,
    updatePayload
  )
  if (!updated) {
    return apiError(
      "NOT_FOUND",
      "Loan not found.",
      404,
      {},
      "Please refresh and try again."
    )
  }

  const existingRequestedAmount = String(existing.requestedAmount)
  const updatedRequestedAmount = String(updated.requestedAmount)
  const existingApprovedAmount = existing.approvedAmount
    ? String(existing.approvedAmount)
    : null
  const updatedApprovedAmount = updated.approvedAmount
    ? String(updated.approvedAmount)
    : null

  const hasRelevantUpdate =
    existing.status !== updated.status ||
    existingRequestedAmount !== updatedRequestedAmount ||
    existingApprovedAmount !== updatedApprovedAmount ||
    (existing.termMonths ?? null) !== (updated.termMonths ?? null) ||
    toIso(existing.approvedAt) !== toIso(updated.approvedAt) ||
    toIso(existing.disbursedAt) !== toIso(updated.disbursedAt) ||
    toIso(existing.repaidAt) !== toIso(updated.repaidAt) ||
    toIso(existing.dueDate) !== toIso(updated.dueDate) ||
    (existing.notes ?? "") !== (updated.notes ?? "")

  if (hasRelevantUpdate) {
    const loanMember = await userOperations.findById(updated.memberId)
    const requestedAmount = new Intl.NumberFormat("en-RW").format(
      Number.parseFloat(updatedRequestedAmount)
    )
    const approvedAmount = updatedApprovedAmount
      ? new Intl.NumberFormat("en-RW").format(
          Number.parseFloat(updatedApprovedAmount)
        )
      : null

    if (loanMember?.email) {
      try {
        const memberHtml = await render(
          LoanUpdatedMemberEmail({
            memberName: loanMember.name,
            oldStatus: existing.status,
            newStatus: updated.status,
            requestedAmount,
            approvedAmount,
            currency: updated.currency,
            termMonths: updated.termMonths,
            dueDate: toIso(updated.dueDate),
            approvedAt: toIso(updated.approvedAt),
            disbursedAt: toIso(updated.disbursedAt),
            repaidAt: toIso(updated.repaidAt),
            notes: updated.notes,
            updatedByName: user.name,
            loanId: updated.id,
          })
        )

        const memberResult = await sendEmail({
          to: loanMember.email,
          subject: `Loan update: ${updated.status.replace("_", " ")}`,
          html: memberHtml,
        })

        if (!memberResult.success) {
          logger.error("Failed to send loan update member email", {
            loanId: updated.id,
            memberId: updated.memberId,
            error: memberResult.error,
          })
        }
      } catch (error) {
        logger.error("Failed to prepare loan update member email", {
          loanId: updated.id,
          memberId: updated.memberId,
          error,
        })
      }
    }

    const leadershipRecipients =
      role === "treasurer" || role === "president"
        ? await getLoanLeadershipRecipients(activeOrganizationId)
        : []

    if (role === "treasurer" || role === "president") {
      if (leadershipRecipients.length > 0) {
        await Promise.all(
          leadershipRecipients.map(async (recipient) => {
            try {
              const recipientHtml = await render(
                LoanUpdatedLeadershipEmail({
                  recipientName: recipient.name,
                  memberName: loanMember?.name ?? updated.memberId,
                  memberEmail: loanMember?.email ?? "N/A",
                  oldStatus: existing.status,
                  newStatus: updated.status,
                  requestedAmount,
                  approvedAmount,
                  currency: updated.currency,
                  termMonths: updated.termMonths,
                  dueDate: toIso(updated.dueDate),
                  approvedAt: toIso(updated.approvedAt),
                  disbursedAt: toIso(updated.disbursedAt),
                  repaidAt: toIso(updated.repaidAt),
                  notes: updated.notes,
                  updatedByName: user.name,
                  loanId: updated.id,
                })
              )

              const recipientResult = await sendEmail({
                to: recipient.email,
                subject: `Loan updated: ${loanMember?.name ?? "member"}`,
                html: recipientHtml,
              })

              if (!recipientResult.success) {
                logger.error("Failed to send loan update leadership email", {
                  loanId: updated.id,
                  recipientId: recipient.userId,
                  recipientRole: recipient.role,
                  error: recipientResult.error,
                })
              }
            } catch (error) {
              logger.error("Failed to prepare loan update leadership email", {
                loanId: updated.id,
                recipientId: recipient.userId,
                recipientRole: recipient.role,
                error,
              })
            }
          })
        )
      }
    }

    // Create in-app notifications for relevant loan updates (non-blocking)
    try {
      const notificationPayloads: NotificationPayload[] = []

      if (loanMember?.id) {
        notificationPayloads.push({
          userId: loanMember.id,
          type: DOMAIN_NOTIFICATION_TYPE.LOAN,
          title: "Loan Updated",
          message: `Your loan status is now ${updated.status.replace("_", " ")}.`,
          data: {
            loanId: updated.id,
            memberId: updated.memberId,
            oldStatus: existing.status,
            newStatus: updated.status,
            requestedAmount,
            approvedAmount,
            currency: updated.currency,
            termMonths: updated.termMonths,
            dueDate: toIso(updated.dueDate),
            approvedAt: toIso(updated.approvedAt),
            disbursedAt: toIso(updated.disbursedAt),
            repaidAt: toIso(updated.repaidAt),
            updatedBy: user.id,
            updatedByName: user.name,
            action: NOTIFICATION_ACTION.VIEW_LOAN,
          },
        })
      }

      if (role === "treasurer" || role === "president") {
        leadershipRecipients
          .filter((recipient) => recipient.userId !== loanMember?.id)
          .forEach((recipient) => {
            notificationPayloads.push({
              userId: recipient.userId,
              type: DOMAIN_NOTIFICATION_TYPE.LOAN,
              title: "Loan Updated",
              message: `${user.name} updated ${loanMember?.name ?? "a member"}'s loan to ${updated.status.replace("_", " ")}.`,
              data: {
                loanId: updated.id,
                memberId: updated.memberId,
                memberName: loanMember?.name,
                memberEmail: loanMember?.email,
                oldStatus: existing.status,
                newStatus: updated.status,
                requestedAmount,
                approvedAmount,
                currency: updated.currency,
                termMonths: updated.termMonths,
                dueDate: toIso(updated.dueDate),
                approvedAt: toIso(updated.approvedAt),
                disbursedAt: toIso(updated.disbursedAt),
                repaidAt: toIso(updated.repaidAt),
                updatedBy: user.id,
                updatedByName: user.name,
                recipientRole: recipient.role,
                action: NOTIFICATION_ACTION.VIEW_LOAN,
              },
            })
          })
      }

      if (notificationPayloads.length > 0) {
        await createBulkNotifications(notificationPayloads)
      }
    } catch (notificationError) {
      logger.error("Failed to create loan update in-app notifications", {
        error: notificationError,
        loanId: updated.id,
      })
    }
  }

  // Audit trail — fire-and-forget, never blocks the response
  auditLogOperations
    .create({
      action: `loan.${updated.status}`,
      userId: user.id,
      userEmail: user.email ?? undefined,
      resourceType: "loan",
      resourceId: updated.id,
      details:
        existing.status !== updated.status
          ? `Status changed from "${existing.status}" to "${updated.status}"`
          : "Loan details updated",
      metadata: {
        previousStatus: existing.status,
        newStatus: updated.status,
        approvedAmount: updated.approvedAmount ?? undefined,
        requestedAmount: updated.requestedAmount,
        notes: updated.notes ?? undefined,
        actorName: user.name,
        actorRole: role,
      },
      severity: updated.status === "disbursed" ? "high" : "medium",
    })
    .catch((err) =>
      logger.error("[loans:[id]] audit log write failed", {
        loanId: updated.id,
        err,
      })
    )

  return NextResponse.json({
    success: true,
    data: updated,
    message: "Loan updated successfully.",
    error: null,
  })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, role } = await getResolvedRole()
  if (!user) {
    return apiError(
      "UNAUTHORIZED",
      "You must be signed in to delete this loan.",
      401,
      {},
      "Please sign in and try again."
    )
  }

  const existing = await loanOperations.findById((await params).id)
  if (!existing) {
    return apiError(
      "NOT_FOUND",
      "Loan not found.",
      404,
      {},
      "Please refresh and try again."
    )
  }

  const canDeleteAsMember =
    role === "member" &&
    existing.memberId === user.id &&
    existing.status === "requested"

  if (
    !canDeleteAsMember &&
    !["admin", "treasurer", "president"].includes(role ?? "")
  ) {
    return apiError(
      "FORBIDDEN",
      "You do not have permission to delete this loan.",
      403,
      { role, status: existing.status },
      "Only the request owner may delete a pending request."
    )
  }

  const removed = await loanOperations.deleteById((await params).id)
  if (!removed) {
    return apiError(
      "NOT_FOUND",
      "Loan not found.",
      404,
      {},
      "Please refresh and try again."
    )
  }

  return NextResponse.json({
    success: true,
    data: { deletedId: existing.id },
    message: "Loan deleted successfully.",
    error: null,
  })
}
