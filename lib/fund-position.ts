// lib/fund-position.ts
// Consolidated group fund position ("cash on hand") for treasurer/president
// dashboards. A simple cash-flow model:
//
//   balance = contributions in + loan repayments in − loans disbursed − approved expenses
//
// Notes:
//  - Contributions count both `confirmed` and `late` (money actually received).
//  - Loan repayments come from the loan_repayment ledger (principal + interest),
//    so repaid interest correctly increases the fund.
//  - Loans disbursed includes every loan that reached disbursement
//    (disbursed/repaying/overdue/repaid); repaid loans net out via repayments.
//  - Penalties are excluded — there is no "collected" state for them, so they
//    are receivables, not cash.
import { db } from "@/db/connection"
import {
  contribution,
  loan,
  loanRepayment,
  operationalExpense,
} from "@/db/schemas"
import { eq, inArray, sql } from "drizzle-orm"

export interface FundPosition {
  contributionsIn: number
  repaymentsIn: number
  loansOut: number
  expensesOut: number
  balance: number
}

const num = (value?: string | null) => Number.parseFloat(value ?? "0") || 0

export async function computeFundPosition(): Promise<FundPosition> {
  const [contribRow, repayRow, loanRow, expenseRow] = await Promise.all([
    db
      .select({
        total: sql<string>`coalesce(sum(${contribution.amount}), 0)`,
      })
      .from(contribution)
      .where(inArray(contribution.status, ["confirmed", "late"])),
    db
      .select({
        total: sql<string>`coalesce(sum(${loanRepayment.amount}), 0)`,
      })
      .from(loanRepayment),
    db
      .select({
        total: sql<string>`coalesce(sum(coalesce(${loan.approvedAmount}, ${loan.requestedAmount})), 0)`,
      })
      .from(loan)
      .where(
        inArray(loan.status, ["disbursed", "repaying", "overdue", "repaid"])
      ),
    db
      .select({
        total: sql<string>`coalesce(sum(${operationalExpense.amount}), 0)`,
      })
      .from(operationalExpense)
      .where(eq(operationalExpense.status, "approved")),
  ])

  const contributionsIn = num(contribRow[0]?.total)
  const repaymentsIn = num(repayRow[0]?.total)
  const loansOut = num(loanRow[0]?.total)
  const expensesOut = num(expenseRow[0]?.total)

  return {
    contributionsIn,
    repaymentsIn,
    loansOut,
    expensesOut,
    balance: contributionsIn + repaymentsIn - loansOut - expensesOut,
  }
}
