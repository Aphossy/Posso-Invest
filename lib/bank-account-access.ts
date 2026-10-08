import { headers } from "next/headers"
import { db } from "@/db"
import { member } from "@/db/schemas"
import { and, eq } from "drizzle-orm"

import { auth } from "@/lib/auth"

export async function getBankAccountMemberContext() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return {
      user: null,
      organizationId: null,
      role: null,
      error: "UNAUTHORIZED" as const,
    }
  }

  const organizationId = session.session.activeOrganizationId
  if (!organizationId) {
    return {
      user: session.user,
      organizationId: null,
      role: null,
      error: "NO_ORGANIZATION" as const,
    }
  }

  const [membership] = await db
    .select({ role: member.role })
    .from(member)
    .where(
      and(
        eq(member.organizationId, organizationId),
        eq(member.userId, session.user.id)
      )
    )
    .limit(1)

  if (!membership) {
    return {
      user: session.user,
      organizationId,
      role: null,
      error: "FORBIDDEN" as const,
    }
  }

  return {
    user: session.user,
    organizationId,
    role: membership.role,
    error: null,
  }
}

export async function getBankAccountAdminContext() {
  const context = await getBankAccountMemberContext()
  if (context.error) return context
  if (context.role !== "admin") {
    return { ...context, error: "FORBIDDEN" as const }
  }
  return context
}

export function maskBankAccountNumber(accountNumber: string) {
  const compactNumber = accountNumber.replace(/\s/g, "")
  return `•••• ${compactNumber.slice(-4)}`
}

export function getBankAccountDatabaseErrorDetails(error: unknown) {
  const details: {
    errorName: string
    databaseCode?: string
    constraint?: string
    table?: string
    column?: string
  } = { errorName: "UnknownDatabaseError" }

  let current: unknown = error
  for (
    let depth = 0;
    depth < 4 && typeof current === "object" && current;
    depth++
  ) {
    if (depth === 0 && current instanceof Error) {
      details.errorName = current.name
    }

    const databaseError = current as Record<string, unknown>
    for (const key of ["code", "constraint", "table", "column"] as const) {
      const value = databaseError[key]
      if (typeof value !== "string") continue

      if (key === "code" && !details.databaseCode) {
        details.databaseCode = value.slice(0, 32)
      }
      if (key === "constraint" && !details.constraint) {
        details.constraint = value.slice(0, 128)
      }
      if (key === "table" && !details.table) {
        details.table = value.slice(0, 128)
      }
      if (key === "column" && !details.column) {
        details.column = value.slice(0, 128)
      }
    }

    current = databaseError.cause
  }

  return details
}
