// lib/share-out.ts
// Computes a year-end share-out: distributes a cash pool to members in
// proportion to their contribution base, then deducts each member's
// outstanding loan balance and active penalties to get a net payout.
import { db } from "@/db/connection"
import { loanRepaymentOperations } from "@/db/operations/loan-repayment-operations"
import { contribution, loan, member, penalty, user } from "@/db/schemas"
import { computeLoanTotals, computeOutstanding } from "@/utils/loan-finance"
import { and, eq, inArray, sql } from "drizzle-orm"

export interface ShareOutAllocationPreview {
  memberId: string
  memberName: string
  memberEmail: string | null
  contributionBase: number
  sharePercent: number
  grossShare: number
  loanDeduction: number
  penaltyDeduction: number
  netShare: number
}

export interface ShareOutPreview {
  distributableAmount: number
  totalContributionBase: number
  totalGross: number
  totalDeductions: number
  totalNet: number
  memberCount: number
  allocations: ShareOutAllocationPreview[]
}

const toNum = (value?: string | null) => Number.parseFloat(value ?? "0") || 0

export async function computeShareOutAllocations(
  organizationId: string,
  distributableAmount: number
): Promise<ShareOutPreview> {
  // Members eligible for a share-out (regular contributing members).
  const members: Array<{
    memberId: string
    memberName: string
    memberEmail: string | null
  }> = await db
    .select({
      memberId: user.id,
      memberName: user.name,
      memberEmail: user.email,
    })
    .from(member)
    .innerJoin(user, eq(member.userId, user.id))
    .where(
      and(eq(member.organizationId, organizationId), eq(member.role, "member"))
    )

  const memberIds = members.map((m) => m.memberId)
  if (memberIds.length === 0) {
    return {
      distributableAmount,
      totalContributionBase: 0,
      totalGross: 0,
      totalDeductions: 0,
      totalNet: 0,
      memberCount: 0,
      allocations: [],
    }
  }

  // Contribution base: confirmed + late contributions per member.
  const baseRows: Array<{ memberId: string; total: string }> = await db
    .select({
      memberId: contribution.memberId,
      total: sql<string>`coalesce(sum(${contribution.amount}), 0)`,
    })
    .from(contribution)
    .where(
      and(
        inArray(contribution.memberId, memberIds),
        inArray(contribution.status, ["confirmed", "late"])
      )
    )
    .groupBy(contribution.memberId)
  const baseMap = new Map(baseRows.map((r) => [r.memberId, toNum(r.total)]))

  // Active penalties per member.
  const penaltyRows: Array<{ memberId: string; total: string }> = await db
    .select({
      memberId: penalty.memberId,
      total: sql<string>`coalesce(sum(${penalty.amount}), 0)`,
    })
    .from(penalty)
    .where(
      and(inArray(penalty.memberId, memberIds), eq(penalty.status, "active"))
    )
    .groupBy(penalty.memberId)
  const penaltyMap = new Map(
    penaltyRows.map((r) => [r.memberId, toNum(r.total)])
  )

  // Outstanding loan balance per member (active loans only).
  const activeLoans: Array<{
    id: string
    memberId: string
    approvedAmount: string | null
    requestedAmount: string
    interestRate: string
    termMonths: number | null
  }> = await db
    .select({
      id: loan.id,
      memberId: loan.memberId,
      approvedAmount: loan.approvedAmount,
      requestedAmount: loan.requestedAmount,
      interestRate: loan.interestRate,
      termMonths: loan.termMonths,
    })
    .from(loan)
    .where(
      and(
        inArray(loan.memberId, memberIds),
        inArray(loan.status, ["disbursed", "repaying", "overdue"])
      )
    )

  const repaidByLoan = await loanRepaymentOperations.sumByLoanIds(
    activeLoans.map((l) => l.id)
  )
  const loanDeductionMap = new Map<string, number>()
  for (const l of activeLoans) {
    const { totalRepayable } = computeLoanTotals(l)
    const outstanding = computeOutstanding(
      totalRepayable,
      repaidByLoan.get(l.id) ?? 0
    )
    loanDeductionMap.set(
      l.memberId,
      (loanDeductionMap.get(l.memberId) ?? 0) + outstanding
    )
  }

  const totalContributionBase = memberIds.reduce(
    (sum, id) => sum + (baseMap.get(id) ?? 0),
    0
  )

  const allocations: ShareOutAllocationPreview[] = members.map((m) => {
    const contributionBase = baseMap.get(m.memberId) ?? 0
    const sharePercent =
      totalContributionBase > 0
        ? (contributionBase / totalContributionBase) * 100
        : 0
    const grossShare =
      totalContributionBase > 0
        ? Math.round(
            (distributableAmount * contributionBase) / totalContributionBase
          )
        : 0
    const loanDeduction = Math.round(loanDeductionMap.get(m.memberId) ?? 0)
    const penaltyDeduction = Math.round(penaltyMap.get(m.memberId) ?? 0)
    const netShare = Math.max(0, grossShare - loanDeduction - penaltyDeduction)

    return {
      memberId: m.memberId,
      memberName: m.memberName || "Member",
      memberEmail: m.memberEmail,
      contributionBase,
      sharePercent: Math.round(sharePercent * 100) / 100,
      grossShare,
      loanDeduction,
      penaltyDeduction,
      netShare,
    }
  })

  const totalGross = allocations.reduce((s, a) => s + a.grossShare, 0)
  const totalDeductions = allocations.reduce(
    (s, a) => s + a.loanDeduction + a.penaltyDeduction,
    0
  )
  const totalNet = allocations.reduce((s, a) => s + a.netShare, 0)

  return {
    distributableAmount,
    totalContributionBase,
    totalGross,
    totalDeductions,
    totalNet,
    memberCount: members.length,
    allocations,
  }
}
