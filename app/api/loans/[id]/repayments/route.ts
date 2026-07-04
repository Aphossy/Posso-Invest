import { headers } from "next/headers"
import { NextResponse } from "next/server"
import { db } from "@/db/connection"
import { auditLogOperations } from "@/db/operations/audit-log-operations"
import { loanOperations } from "@/db/operations/loan-operations"
import { loanRepaymentOperations } from "@/db/operations/loan-repayment-operations"
import { receiptOperations } from "@/db/operations/receipt-operations"
import { userOperations } from "@/db/operations/user-operations"
import { member, user as userTable } from "@/db/schemas"
import type { LoanStatus } from "@/db/schemas/loan-schema"
import { LoanRepaymentRecordedEmail } from "@/emails/loan-repayment-recorded"
import {
  computeLoanTotals,
  computeOutstanding,
  computeProgressPercent,
} from "@/utils/loan-finance"
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

const leadershipRoles = ["admin", "treasurer", "president"] as const
const repayableStatuses: LoanStatus[] = ["disbursed", "repaying", "overdue"]

const recordSchema = z.object({
  amount: z.coerce.number().positive(),
  paymentMethod: z
    .enum(["cash", "bank_transfer", "mobile_money", "check", "other"])
    .optional(),
  paidAt: z.coerce.date().optional(),
  notes: z.string().max(2000).optional(),
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
    } catch (error) {
      console.error("[loans:repayments:getResolvedRole] member lookup failed", {
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
        "[loans:repayments:getResolvedRole] getActiveMemberRole fallback failed",
        { userId: sessionUser?.id, activeOrganizationId, error }
      )
    }
  }

  return { user: sessionUser, role: activeRole, activeOrganizationId }
}

async function getLeadershipRecipients(activeOrganizationId?: string | null) {
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
          inArray(member.role, [...leadershipRoles])
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
    console.error("[loans:repayments:getLeadershipRecipients] lookup failed", {
      activeOrganizationId,
      error,
    })
    return []
  }
}

const formatRwf = (value: number) =>
  new Intl.NumberFormat("en-RW").format(Math.round(value))

function buildSummary(
  loan: Parameters<typeof computeLoanTotals>[0],
  totalRepaid: number
) {
  const { totalRepayable } = computeLoanTotals(loan)
  const outstanding = computeOutstanding(totalRepayable, totalRepaid)
  return {
    totalRepayable,
    totalRepaid: Math.round(totalRepaid),
    outstanding,
    progressPercent: computeProgressPercent(totalRepayable, totalRepaid),
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, role } = await getResolvedRole()
  if (!user) {
    return apiError(
      "UNAUTHORIZED",
      "You must be signed in to view repayments.",
      401,
      {},
      "Please sign in and try again."
    )
  }

  const loanId = (await params).id
  const loan = await loanOperations.findById(loanId)
  if (!loan) {
    return apiError("NOT_FOUND", "Loan not found.", 404)
  }

  if (
    !leadershipRoles.includes(role as (typeof leadershipRoles)[number]) &&
    loan.memberId !== user.id
  ) {
    return apiError(
      "FORBIDDEN",
      "You do not have permission to view these repayments.",
      403,
      { role }
    )
  }

  const repayments = await loanRepaymentOperations.findByLoanId(loanId)
  const totalRepaid = await loanRepaymentOperations.sumByLoanId(loanId)

  return NextResponse.json({
    success: true,
    data: { repayments, summary: buildSummary(loan, totalRepaid) },
    message: "Repayments loaded successfully.",
    error: null,
  })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, role, activeOrganizationId } = await getResolvedRole()
  if (!user) {
    return apiError(
      "UNAUTHORIZED",
      "You must be signed in to record a repayment.",
      401,
      {},
      "Please sign in and try again."
    )
  }

  if (!leadershipRoles.includes(role as (typeof leadershipRoles)[number])) {
    return apiError(
      "FORBIDDEN",
      "You do not have permission to record repayments.",
      403,
      { role },
      "Only a treasurer, president, or admin may record repayments."
    )
  }

  const loanId = (await params).id
  const loan = await loanOperations.findById(loanId)
  if (!loan) {
    return apiError("NOT_FOUND", "Loan not found.", 404)
  }

  if (!repayableStatuses.includes(loan.status)) {
    return apiError(
      "INVALID_STATE",
      "This loan is not in a repayable state.",
      409,
      { status: loan.status },
      "Only disbursed, repaying, or overdue loans can receive repayments."
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return apiError(
      "VALIDATION_ERROR",
      "Invalid repayment payload.",
      400,
      {
        validationErrors: [
          { path: "", message: "Request body must be valid JSON." },
        ],
      },
      "Please review the form and try again."
    )
  }

  const parsed = recordSchema.safeParse(body)
  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "Invalid repayment payload.",
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

  const { totalRepayable } = computeLoanTotals(loan)
  const priorRepaid = await loanRepaymentOperations.sumByLoanId(loanId)
  const outstanding = computeOutstanding(totalRepayable, priorRepaid)

  if (outstanding <= 0) {
    return apiError(
      "INVALID_STATE",
      "This loan has already been fully repaid.",
      409,
      { outstanding },
      "No further repayments are required."
    )
  }

  const amount = parsed.data.amount
  if (amount > outstanding) {
    return apiError(
      "VALIDATION_ERROR",
      "Repayment exceeds the outstanding balance.",
      400,
      {
        validationErrors: [
          {
            path: "amount",
            message: `Amount cannot exceed the outstanding balance of ${formatRwf(outstanding)} ${loan.currency}.`,
          },
        ],
        outstanding,
      },
      "Reduce the amount to the outstanding balance or less."
    )
  }

  const paidAt = parsed.data.paidAt ?? new Date()
  const period = paidAt.toISOString().slice(0, 7)
  const paymentMethod = parsed.data.paymentMethod ?? "cash"

  // Generate a receipt for the repayment (best-effort).
  let receiptId: string | null = null
  let receiptNumber: string | null = null
  try {
    const number = await receiptOperations.generateReceiptNumber()
    const createdReceipt = await receiptOperations.create({
      receiptNumber: number,
      receiptType: "loan_repayment",
      status: "issued",
      memberId: loan.memberId,
      issuedBy: user.id,
      amount: String(amount),
      currency: loan.currency,
      paymentMethod,
      loanId: loan.id,
      period,
      notes: parsed.data.notes,
      issuedAt: paidAt,
    })
    receiptId = createdReceipt.id
    receiptNumber = createdReceipt.receiptNumber ?? null
  } catch (error) {
    logger.error("Failed to create loan repayment receipt", { loanId, error })
  }

  const repayment = await loanRepaymentOperations.create({
    loanId: loan.id,
    memberId: loan.memberId,
    recordedBy: user.id,
    amount: String(amount),
    currency: loan.currency,
    paymentMethod,
    paidAt,
    period,
    receiptId: receiptId ?? undefined,
    notes: parsed.data.notes,
  })

  const newTotalRepaid = priorRepaid + amount
  const fullyRepaid = newTotalRepaid >= totalRepayable

  let nextStatus: LoanStatus | null = null
  if (fullyRepaid && loan.status !== "repaid") {
    nextStatus = "repaid"
  } else if (!fullyRepaid && loan.status !== "repaying") {
    nextStatus = "repaying"
  }

  if (nextStatus) {
    await loanOperations.updateById(loan.id, {
      status: nextStatus,
      repaidAt: nextStatus === "repaid" ? paidAt : loan.repaidAt,
    })
  }

  const summary = buildSummary(loan, newTotalRepaid)
  const loanMember = await userOperations.findById(loan.memberId)

  // Member confirmation email (best-effort).
  if (loanMember?.email) {
    try {
      const html = await render(
        LoanRepaymentRecordedEmail({
          memberName: loanMember.name,
          amount: formatRwf(amount),
          currency: loan.currency,
          paymentMethod,
          paidAt: paidAt.toISOString(),
          totalRepaid: formatRwf(summary.totalRepaid),
          totalRepayable: formatRwf(summary.totalRepayable),
          outstanding: formatRwf(summary.outstanding),
          progressPercent: summary.progressPercent,
          fullyRepaid,
          recordedByName: user.name,
          receiptNumber,
          loanId: loan.id,
        })
      )
      const result = await sendEmail({
        to: loanMember.email,
        subject: fullyRepaid
          ? "Your loan is fully repaid"
          : `Repayment recorded: ${formatRwf(amount)} ${loan.currency}`,
        html,
      })
      if (!result.success) {
        logger.error("Failed to send loan repayment email", {
          loanId,
          error: result.error,
        })
      }
    } catch (error) {
      logger.error("Failed to prepare loan repayment email", { loanId, error })
    }
  }

  // In-app notifications (non-blocking).
  try {
    const recipients = await getLeadershipRecipients(activeOrganizationId)
    const payloads: NotificationPayload[] = []

    if (loanMember?.id) {
      payloads.push({
        userId: loanMember.id,
        type: DOMAIN_NOTIFICATION_TYPE.PAYMENT_RECEIVED,
        title: fullyRepaid ? "Loan Fully Repaid" : "Repayment Recorded",
        message: fullyRepaid
          ? `Your loan is now fully repaid. Thank you!`
          : `A repayment of ${loan.currency} ${formatRwf(amount)} was recorded. Outstanding: ${loan.currency} ${formatRwf(summary.outstanding)}.`,
        data: {
          loanId: loan.id,
          amount: formatRwf(amount),
          period,
          action: NOTIFICATION_ACTION.VIEW_LOAN,
        },
      })
    }

    recipients
      .filter((r) => r.userId !== loanMember?.id && r.userId !== user.id)
      .forEach((r) => {
        payloads.push({
          userId: r.userId,
          type: DOMAIN_NOTIFICATION_TYPE.PAYMENT_RECEIVED,
          title: "Loan Repayment Recorded",
          message: `${user.name} recorded a ${loan.currency} ${formatRwf(amount)} repayment for ${loanMember?.name ?? "a member"}.`,
          data: {
            loanId: loan.id,
            memberId: loan.memberId,
            amount: formatRwf(amount),
            period,
            action: NOTIFICATION_ACTION.VIEW_LOAN,
          },
        })
      })

    if (payloads.length > 0) {
      await createBulkNotifications(payloads)
    }
  } catch (error) {
    logger.error("Failed to create loan repayment notifications", {
      loanId,
      error,
    })
  }

  // Audit trail (fire-and-forget).
  auditLogOperations
    .create({
      action: "loan.repayment.recorded",
      userId: user.id,
      userEmail: user.email ?? undefined,
      resourceType: "loan",
      resourceId: loan.id,
      details: `Repayment of ${formatRwf(amount)} ${loan.currency} recorded${
        fullyRepaid ? " (loan fully repaid)" : ""
      }`,
      metadata: {
        repaymentId: repayment.id,
        amount: String(amount),
        totalRepaid: summary.totalRepaid,
        outstanding: summary.outstanding,
        receiptNumber: receiptNumber ?? undefined,
        actorName: user.name,
        actorRole: role,
      },
      severity: "medium",
    })
    .catch((err) =>
      logger.error("[loans:repayments] audit log write failed", {
        loanId,
        err,
      })
    )

  return NextResponse.json(
    {
      success: true,
      data: { repayment, summary, fullyRepaid },
      message: fullyRepaid
        ? "Final repayment recorded. Loan fully repaid."
        : "Repayment recorded successfully.",
      error: null,
    },
    { status: 201 }
  )
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, role } = await getResolvedRole()
  if (!user) {
    return apiError(
      "UNAUTHORIZED",
      "You must be signed in to delete a repayment.",
      401,
      {},
      "Please sign in and try again."
    )
  }

  if (role !== "admin" && role !== "treasurer") {
    return apiError(
      "FORBIDDEN",
      "You do not have permission to delete repayments.",
      403,
      { role },
      "Only a treasurer or admin may void a repayment."
    )
  }

  const loanId = (await params).id
  const repaymentId = new URL(request.url).searchParams.get("repaymentId")
  if (!repaymentId) {
    return apiError(
      "VALIDATION_ERROR",
      "A repaymentId query parameter is required.",
      400
    )
  }

  const loan = await loanOperations.findById(loanId)
  if (!loan) {
    return apiError("NOT_FOUND", "Loan not found.", 404)
  }

  const repayment = await loanRepaymentOperations.findById(repaymentId)
  if (!repayment || repayment.loanId !== loanId) {
    return apiError("NOT_FOUND", "Repayment not found for this loan.", 404)
  }

  await loanRepaymentOperations.deleteById(repaymentId)

  // Void the linked receipt if present (best-effort).
  if (repayment.receiptId) {
    try {
      await receiptOperations.updateById(repayment.receiptId, {
        status: "void",
      })
    } catch (error) {
      logger.error("Failed to void repayment receipt", { repaymentId, error })
    }
  }

  const totalRepaid = await loanRepaymentOperations.sumByLoanId(loanId)
  const { totalRepayable } = computeLoanTotals(loan)

  let nextStatus: LoanStatus = loan.status
  if (totalRepaid >= totalRepayable && totalRepayable > 0) {
    nextStatus = "repaid"
  } else if (totalRepaid > 0) {
    nextStatus = "repaying"
  } else if (loan.status === "repaid" || loan.status === "repaying") {
    nextStatus = "disbursed"
  }

  if (nextStatus !== loan.status) {
    await loanOperations.updateById(loan.id, {
      status: nextStatus,
      repaidAt: nextStatus === "repaid" ? loan.repaidAt : null,
    })
  }

  auditLogOperations
    .create({
      action: "loan.repayment.voided",
      userId: user.id,
      userEmail: user.email ?? undefined,
      resourceType: "loan",
      resourceId: loan.id,
      details: `Repayment ${repaymentId} voided`,
      metadata: { repaymentId, actorName: user.name, actorRole: role },
      severity: "medium",
    })
    .catch((err) =>
      logger.error("[loans:repayments] audit log write failed", { loanId, err })
    )

  return NextResponse.json({
    success: true,
    data: { deletedId: repaymentId, summary: buildSummary(loan, totalRepaid) },
    message: "Repayment voided successfully.",
    error: null,
  })
}
