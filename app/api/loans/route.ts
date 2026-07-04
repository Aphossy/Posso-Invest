import { headers } from "next/headers"
import { NextResponse } from "next/server"
import { siteConfig } from "@/constants/site-config"
import { db } from "@/db/connection"
import { contributionOperations } from "@/db/operations/contribution-operations"
import { loanOperations } from "@/db/operations/loan-operations"
import { loanRepaymentOperations } from "@/db/operations/loan-repayment-operations"
import { userOperations } from "@/db/operations/user-operations"
import { member, user } from "@/db/schemas"
import { insertLoanSchema } from "@/db/schemas/loan-schema"
import { inngest } from "@/inngest/client"
import { computeLoanTotals, computeOutstanding } from "@/utils/loan-finance"
import logger from "@/utils/logger"
import {
  createBulkNotifications,
  type NotificationPayload,
} from "@/utils/notification-utils"
import { extractRoleValue } from "@/utils/role-utils"
import { and, eq, inArray } from "drizzle-orm"
import { z } from "zod"

import {
  DOMAIN_NOTIFICATION_TYPE,
  NOTIFICATION_ACTION,
} from "@/types/notifications"
import { auth } from "@/lib/auth"

const listSchema = z.object({
  memberId: z.string().optional(),
  status: z.string().optional(),
  limit: z.coerce.number().min(1).max(200).optional(),
  offset: z.coerce.number().min(0).optional(),
})

const createSchema = insertLoanSchema
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    approvedAt: true,
    disbursedAt: true,
    repaidAt: true,
  })
  .extend({
    requestedAmount: z.coerce.string(),
    memberId: z.string().optional(),
  })

const loanNotificationRoles = ["admin", "treasurer", "president"] as const

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
      console.error("[loans:getResolvedRole] member lookup failed", {
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
        "[loans:getResolvedRole] getActiveMemberRole fallback failed",
        {
          userId: sessionUser?.id,
          activeOrganizationId,
          error,
        }
      )
    }
  }

  if (sessionUser && !activeRole) {
    console.warn("[loans:getResolvedRole] unresolved active role", {
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

async function getLoanNotificationRecipients(
  activeOrganizationId?: string | null
) {
  if (!activeOrganizationId) return []

  try {
    const rows = await db
      .select({
        userId: user.id,
        name: user.name,
        email: user.email,
        role: member.role,
      })
      .from(member)
      .innerJoin(user, eq(member.userId, user.id))
      .where(
        and(
          eq(member.organizationId, activeOrganizationId),
          inArray(member.role, [...loanNotificationRoles])
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
    console.error("[loans:getLoanNotificationRecipients] lookup failed", {
      activeOrganizationId,
      error,
    })
    return []
  }
}

export async function GET(request: Request) {
  const { user, role } = await getResolvedRole()
  if (!user) {
    return apiError(
      "UNAUTHORIZED",
      "You must be signed in to view loans.",
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
      "Invalid loan query.",
      400,
      {
        validationErrors: params.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
      "Please review the query parameters and try again."
    )
  }

  const statusValues = params.data.status
    ?.split(",")
    .map((value) => value.trim())
    .filter(Boolean)
  const filters = {
    memberId:
      role === "admin" || role === "treasurer" || role === "president"
        ? params.data.memberId
        : user.id,
    status: statusValues && statusValues.length > 0 ? statusValues : undefined,
  }

  const loans = await loanOperations.findMany({
    limit: params.data.limit,
    offset: params.data.offset,
    filters,
  })

  const userIds = new Set<string>()
  loans.forEach((item) => {
    userIds.add(item.memberId)
    if (item.approvedBy) userIds.add(item.approvedBy)
    if (item.disbursedBy) userIds.add(item.disbursedBy)
  })

  const users = await userOperations.findByIds([...userIds])
  const userMap = new Map(
    users.map((memberItem) => [memberItem.id, memberItem])
  )

  const repaidByLoan = await loanRepaymentOperations.sumByLoanIds(
    loans.map((item) => item.id)
  )

  const enriched = loans.map((item) => {
    const totalRepaid = repaidByLoan.get(item.id) ?? 0
    const { totalRepayable } = computeLoanTotals(item)
    return {
      ...item,
      memberName: userMap.get(item.memberId)?.name ?? null,
      memberEmail: userMap.get(item.memberId)?.email ?? null,
      approvedByName: item.approvedBy
        ? (userMap.get(item.approvedBy)?.name ?? null)
        : null,
      disbursedByName: item.disbursedBy
        ? (userMap.get(item.disbursedBy)?.name ?? null)
        : null,
      memberIkiminaProfile:
        (userMap.get(item.memberId)?.metadata as any)?.ikiminaProfile ?? null,
      totalRepaid: Math.round(totalRepaid),
      outstandingBalance: computeOutstanding(totalRepayable, totalRepaid),
    }
  })

  const total = await loanOperations.count({ filters })

  return NextResponse.json({
    success: true,
    data: enriched,
    total,
    message: "Loans loaded successfully.",
    error: null,
  })
}

export async function POST(request: Request) {
  const { user, role, activeOrganizationId, sessionRole } =
    await getResolvedRole()
  if (!user) {
    return apiError(
      "UNAUTHORIZED",
      "You must be signed in to request a loan.",
      401,
      {},
      "Please sign in and try again."
    )
  }

  if (!role || !["admin", "treasurer", "member", "president"].includes(role)) {
    return apiError(
      "FORBIDDEN",
      "You do not have permission to request loans.",
      403,
      { role, activeOrganizationId, sessionRole },
      "Make sure you are using an active member, treasurer, president, or admin role."
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

  const parsed = createSchema.safeParse(body)
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

  const memberId =
    role === "member" ? user.id : parsed.data.memberId?.trim() || null

  if (!memberId) {
    return apiError(
      "VALIDATION_ERROR",
      "Member selection is required.",
      400,
      {
        validationErrors: [
          { path: "memberId", message: "Member selection is required." },
        ],
      },
      "Please select a member and try again."
    )
  }

  const loanMember = await userOperations.findById(memberId)
  if (!loanMember) {
    return apiError(
      "VALIDATION_ERROR",
      "Selected member was not found.",
      400,
      {
        validationErrors: [
          { path: "memberId", message: "Selected member was not found." },
        ],
      },
      "Please select a valid member and try again."
    )
  }

  // Enforce the loan-to-savings ceiling. A member may not borrow more than
  // their paid-in savings (times the configured ratio) minus what they already
  // owe on active loans. This backstops the client-side check in the request
  // form, and is the only guard for leadership-created loans / direct API calls.
  const { maxLoanToSavingsRatio } = siteConfig.platform.loans
  const requested = Number.parseFloat(String(parsed.data.requestedAmount))
  const savings = await contributionOperations.sumPaidByMemberId(memberId)
  const activeLoans = await loanOperations.findMany({
    limit: 200,
    filters: {
      memberId,
      status: ["approved", "disbursed", "repaying", "overdue"],
    },
  })
  const activeLoansTotal = activeLoans.reduce((sum, item) => {
    const value = Number.parseFloat(
      String(item.approvedAmount || item.requestedAmount || "0")
    )
    return Number.isNaN(value) ? sum : sum + value
  }, 0)
  const maxEligible = Math.max(
    0,
    savings * maxLoanToSavingsRatio - activeLoansTotal
  )

  if (Number.isFinite(requested) && requested > maxEligible) {
    const fmt = (n: number) =>
      new Intl.NumberFormat("en-RW").format(Math.round(n))
    return apiError(
      "VALIDATION_ERROR",
      "Requested amount exceeds the loan eligibility limit.",
      400,
      {
        validationErrors: [
          {
            path: "requestedAmount",
            message: `Maximum eligible amount is ${fmt(maxEligible)} RWF (savings ${fmt(savings)} RWF less ${fmt(activeLoansTotal)} RWF in active loans).`,
          },
        ],
        savings,
        activeLoansTotal,
        maxEligible,
        maxLoanToSavingsRatio,
      },
      maxEligible <= 0
        ? "This member has no remaining borrowing capacity."
        : "Reduce the requested amount to the eligible limit or build more savings first."
    )
  }

  const created = await loanOperations.create({
    ...parsed.data,
    memberId,
    id: crypto.randomUUID(),
  })

  const requestedAmount = Number.parseFloat(String(created.requestedAmount))
  const formattedAmount = new Intl.NumberFormat("en-RW").format(requestedAmount)
  const loanPurpose =
    created.metadata?.reason || created.notes || "No purpose provided"
  const loanTerm = created.termMonths
    ? `${created.termMonths} month${created.termMonths > 1 ? "s" : ""}`
    : "Not specified"

  const recipients = await getLoanNotificationRecipients(activeOrganizationId)

  try {
    await inngest.send({
      id: `ikimina-loan-requested-${created.id}`,
      name: "ikimina/loan.requested",
      data: {
        organizationId: activeOrganizationId || "unknown-org",
        loanId: created.id,
        requesterId: loanMember.id,
        requesterName: loanMember.name,
        requesterEmail: loanMember.email,
        requestedAmount: formattedAmount,
        currency: created.currency,
        purpose: loanPurpose,
        termMonths: loanTerm,
        createdAt: created.createdAt.toISOString(),
      },
    })
  } catch (error) {
    logger.error("Failed to emit loan requested event", {
      loanId: created.id,
      error,
    })
  }

  // Create in-app notifications (non-blocking)
  try {
    const notificationPayloads: NotificationPayload[] = []

    if (loanMember?.id) {
      notificationPayloads.push({
        userId: loanMember.id,
        type: DOMAIN_NOTIFICATION_TYPE.LOAN,
        title: "Loan Request Submitted",
        message: `Your loan request for ${created.currency} ${formattedAmount} has been submitted successfully.`,
        data: {
          loanId: created.id,
          memberId: created.memberId,
          requestedAmount: formattedAmount,
          currency: created.currency,
          purpose: loanPurpose,
          termMonths: created.termMonths,
          status: created.status,
          action: NOTIFICATION_ACTION.VIEW_LOAN,
        },
      })
    }

    recipients
      .filter((recipient) => recipient.userId !== loanMember?.id)
      .forEach((recipient) => {
        notificationPayloads.push({
          userId: recipient.userId,
          type: DOMAIN_NOTIFICATION_TYPE.LOAN,
          title: "New Loan Request",
          message: `${loanMember?.name ?? "A member"} submitted a loan request for ${created.currency} ${formattedAmount}.`,
          data: {
            loanId: created.id,
            memberId: created.memberId,
            memberName: loanMember?.name,
            memberEmail: loanMember?.email,
            requestedAmount: formattedAmount,
            currency: created.currency,
            purpose: loanPurpose,
            termMonths: created.termMonths,
            status: created.status,
            submittedBy: user.id,
            submittedByName: user.name,
            recipientRole: recipient.role,
            action: NOTIFICATION_ACTION.VIEW_LOAN,
          },
        })
      })

    if (notificationPayloads.length > 0) {
      await createBulkNotifications(notificationPayloads)
    }
  } catch (notificationError) {
    logger.error("Failed to create loan in-app notifications", {
      error: notificationError,
      loanId: created.id,
    })
  }

  return NextResponse.json(
    {
      success: true,
      data: created,
      message: "Loan request submitted successfully.",
      error: null,
    },
    { status: 201 }
  )
}
