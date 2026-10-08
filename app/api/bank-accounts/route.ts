import { NextResponse } from "next/server"
import { db } from "@/db"
import { bankAccount, type BankAccount } from "@/db/schemas"
import logger from "@/utils/logger"
import { desc, eq } from "drizzle-orm"
import { z } from "zod"

import {
  getBankAccountAdminContext,
  getBankAccountDatabaseErrorDetails,
  maskBankAccountNumber,
} from "@/lib/bank-account-access"

const accountInputSchema = z.object({
  accountName: z.string().trim().min(1).max(120),
  bankName: z.string().trim().min(1).max(120),
  accountNumber: z.string().trim().min(1).max(64),
  accountHolder: z.string().trim().min(1).max(120),
  accountType: z.enum(["current", "savings", "business", "other"]),
  currency: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{3}$/)
    .transform((v) => v.toUpperCase()),
  branch: z.string().trim().max(120).optional(),
})

function accessError(error: string) {
  const status =
    error === "UNAUTHORIZED" ? 401 : error === "FORBIDDEN" ? 403 : 400
  const message =
    error === "UNAUTHORIZED"
      ? "Sign in to manage bank accounts."
      : error === "FORBIDDEN"
        ? "Only organization administrators can manage bank accounts."
        : "Select an active organization before managing bank accounts."
  return NextResponse.json(
    { success: false, data: null, error: { code: error, message } },
    { status }
  )
}

function isUniqueViolation(error: unknown) {
  return getBankAccountDatabaseErrorDetails(error).databaseCode === "23505"
}

export async function GET() {
  try {
    const context = await getBankAccountAdminContext()
    if (context.error) return accessError(context.error)

    const records = await db
      .select({
        id: bankAccount.id,
        accountName: bankAccount.accountName,
        bankName: bankAccount.bankName,
        accountHolder: bankAccount.accountHolder,
        accountType: bankAccount.accountType,
        currency: bankAccount.currency,
        branch: bankAccount.branch,
        isActive: bankAccount.isActive,
        createdAt: bankAccount.createdAt,
        accountNumber: bankAccount.accountNumber,
      })
      .from(bankAccount)
      .where(eq(bankAccount.organizationId, context.organizationId!))
      .orderBy(desc(bankAccount.createdAt))

    return NextResponse.json({
      success: true,
      data: records.map(
        (
          record: Pick<
            BankAccount,
            | "id"
            | "accountName"
            | "bankName"
            | "accountHolder"
            | "accountType"
            | "currency"
            | "branch"
            | "isActive"
            | "createdAt"
            | "accountNumber"
          >
        ) => {
          const { accountNumber, ...safeRecord } = record
          return {
            ...safeRecord,
            maskedAccountNumber: maskBankAccountNumber(accountNumber),
          }
        }
      ),
      error: null,
    })
  } catch (error) {
    logger.error(
      `[bank-accounts] Failed to load bank accounts ${JSON.stringify(getBankAccountDatabaseErrorDetails(error))}`
    )
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: {
          code: "INTERNAL_ERROR",
          message: "Unable to load bank accounts.",
        },
      },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const context = await getBankAccountAdminContext()
    if (context.error) return accessError(context.error)

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: {
            code: "INVALID_JSON",
            message: "Request body must be valid JSON.",
          },
        },
        { status: 400 }
      )
    }

    const parsed = accountInputSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: {
            code: "VALIDATION_ERROR",
            message: "Check the bank account details and try again.",
            details: parsed.error.issues.map((issue) => ({
              path: issue.path.join("."),
              message: issue.message,
            })),
          },
        },
        { status: 400 }
      )
    }

    const [created] = await db
      .insert(bankAccount)
      .values({
        id: crypto.randomUUID(),
        organizationId: context.organizationId!,
        createdById: context.user!.id,
        ...parsed.data,
      })
      .returning({
        id: bankAccount.id,
        accountName: bankAccount.accountName,
      })

    return NextResponse.json(
      { success: true, data: created, error: null },
      { status: 201 }
    )
  } catch (error) {
    if (isUniqueViolation(error)) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: {
            code: "DUPLICATE_ACCOUNT",
            message:
              "This bank account is already registered for the organization.",
          },
        },
        { status: 409 }
      )
    }
    logger.error(
      `[bank-accounts] Failed to create bank account ${JSON.stringify(getBankAccountDatabaseErrorDetails(error))}`
    )
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: {
          code: "INTERNAL_ERROR",
          message: "Unable to save the bank account.",
        },
      },
      { status: 500 }
    )
  }
}
