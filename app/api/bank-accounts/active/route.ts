import { NextResponse } from "next/server"
import { db } from "@/db"
import { bankAccount, type BankAccount } from "@/db/schemas"
import logger from "@/utils/logger"
import { and, desc, eq } from "drizzle-orm"

import {
  getBankAccountDatabaseErrorDetails,
  getBankAccountMemberContext,
} from "@/lib/bank-account-access"

function accessError(error: string) {
  const status =
    error === "UNAUTHORIZED" ? 401 : error === "FORBIDDEN" ? 403 : 400
  const message =
    error === "UNAUTHORIZED"
      ? "Sign in to view group bank accounts."
      : error === "FORBIDDEN"
        ? "You must belong to this organization to view its bank accounts."
        : "Select an active organization to view bank accounts."

  return NextResponse.json(
    { success: false, data: null, error: { code: error, message } },
    { status }
  )
}

export async function GET() {
  try {
    const context = await getBankAccountMemberContext()
    if (context.error) return accessError(context.error)

    const accounts = await db
      .select({
        id: bankAccount.id,
        accountName: bankAccount.accountName,
        bankName: bankAccount.bankName,
        accountHolder: bankAccount.accountHolder,
        accountType: bankAccount.accountType,
        currency: bankAccount.currency,
        branch: bankAccount.branch,
        isActive: bankAccount.isActive,
        accountNumber: bankAccount.accountNumber,
      })
      .from(bankAccount)
      .where(
        and(
          eq(bankAccount.organizationId, context.organizationId!),
          eq(bankAccount.isActive, true)
        )
      )
      .orderBy(desc(bankAccount.createdAt))

    return NextResponse.json({
      success: true,
      data: accounts.map(
        (
          account: Pick<
            BankAccount,
            | "id"
            | "accountName"
            | "bankName"
            | "accountHolder"
            | "accountType"
            | "currency"
            | "branch"
            | "isActive"
            | "accountNumber"
          >
        ) => account
      ),
      error: null,
    })
  } catch (error) {
    logger.error(
      `[bank-accounts] Failed to load active bank accounts ${JSON.stringify(getBankAccountDatabaseErrorDetails(error))}`
    )
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: {
          code: "INTERNAL_ERROR",
          message: "Unable to load group bank accounts.",
        },
      },
      { status: 500 }
    )
  }
}
