// utils/loan-finance.ts
// Single source of truth for loan repayment math (principal, interest, totals,
// outstanding balance and progress). Shared by the repayment dialog, the loans
// export util, the API routes and the dashboard views.

export interface LoanFinanceInput {
  requestedAmount?: string | number | null
  approvedAmount?: string | number | null
  interestRate?: string | number | null
  termMonths?: number | null
}

export interface LoanTotals {
  principal: number
  interestPercent: number
  interestAmount: number
  totalRepayable: number
  estimatedMonthlyPayment: number | null
}

export const parseAmount = (value?: string | number | null): number | null => {
  if (value === null || value === undefined || value === "") return null
  const amount =
    typeof value === "number" ? value : Number.parseFloat(String(value))
  return Number.isFinite(amount) ? amount : null
}

/**
 * Interest rate may be stored as a fraction (0.05) or a percent (5).
 * Normalize to a percent value.
 */
export const normalizeInterestPercent = (
  value?: string | number | null
): number | null => {
  const parsed = parseAmount(value)
  if (parsed === null || parsed < 0) return null
  return parsed <= 1 ? parsed * 100 : parsed
}

export const computeLoanTotals = (loan: LoanFinanceInput): LoanTotals => {
  const principal =
    parseAmount(loan.approvedAmount) ?? parseAmount(loan.requestedAmount) ?? 0
  const interestPercent = normalizeInterestPercent(loan.interestRate) ?? 0
  const interestAmount = Math.round((principal * interestPercent) / 100)
  const totalRepayable = principal + interestAmount
  const estimatedMonthlyPayment =
    loan.termMonths && loan.termMonths > 0
      ? Math.ceil(totalRepayable / loan.termMonths)
      : null

  return {
    principal,
    interestPercent,
    interestAmount,
    totalRepayable,
    estimatedMonthlyPayment,
  }
}

export const computeOutstanding = (
  totalRepayable: number,
  totalRepaid: number
): number => {
  const outstanding = totalRepayable - totalRepaid
  return outstanding > 0 ? Math.round(outstanding) : 0
}

export const computeProgressPercent = (
  totalRepayable: number,
  totalRepaid: number
): number => {
  if (totalRepayable <= 0) return 0
  const percent = (totalRepaid / totalRepayable) * 100
  if (percent < 0) return 0
  if (percent > 100) return 100
  return Math.round(percent)
}
