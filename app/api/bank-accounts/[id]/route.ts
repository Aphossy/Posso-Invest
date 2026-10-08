import { NextResponse } from "next/server"
import { db } from "@/db"
import { bankAccount } from "@/db/schemas"
import logger from "@/utils/logger"
import { and, eq } from "drizzle-orm"
import { z } from "zod"

import {
  getBankAccountAdminContext,
  getBankAccountDatabaseErrorDetails,
} from "@/lib/bank-account-access"

const updateSchema = z
  .object({
    accountName: z.string().trim().min(1).max(120).optional(),
    bankName: z.string().trim().min(1).max(120).optional(),
    accountNumber: z.string().trim().min(1).max(64).optional(),
    accountHolder: z.string().trim().min(1).max(120).optional(),
    accountType: z.enum(["current", "savings", "business", "other"]).optional(),
    currency: z
      .string()
      .trim()
      .regex(/^[A-Za-z]{3}$/)
      .transform((value) => value.toUpperCase())
      .optional(),
    branch: z.string().trim().max(120).nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be updated.",
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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: {
            code: "VALIDATION_ERROR",
            message: "Check the bank account changes and try again.",
            details: parsed.error.issues.map((issue) => ({
              path: issue.path.join("."),
              message: issue.message,
            })),
          },
        },
        { status: 400 }
      )
    }

    const { id } = await params
    const [updated] = await db
      .update(bankAccount)
      .set(parsed.data)
      .where(
        and(
          eq(bankAccount.id, id),
          eq(bankAccount.organizationId, context.organizationId!)
        )
      )
      .returning({
        id: bankAccount.id,
        accountName: bankAccount.accountName,
        isActive: bankAccount.isActive,
      })

    if (!updated) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: { code: "NOT_FOUND", message: "Bank account not found." },
        },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: updated, error: null })
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
      `[bank-accounts] Failed to update bank account ${JSON.stringify(getBankAccountDatabaseErrorDetails(error))}`
    )
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: {
          code: "INTERNAL_ERROR",
          message: "Unable to update the bank account.",
        },
      },
      { status: 500 }
    )
  }
}
