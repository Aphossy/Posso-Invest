import { headers } from "next/headers"
import { NextResponse } from "next/server"
import { auditLogOperations } from "@/db/operations/audit-log-operations"
import { loanOperations } from "@/db/operations/loan-operations"

import { auth } from "@/lib/auth"

function apiError(code: string, message: string, status: number) {
  return NextResponse.json(
    { success: false, data: null, error: { code, message } },
    { status }
  )
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const headersList = await headers()
  const session = await auth.api.getSession({ headers: headersList })
  const user = session?.user ?? null

  if (!user) {
    return apiError("UNAUTHORIZED", "You must be signed in.", 401)
  }

  const role = (user as any).role as string | undefined
  if (!["admin", "treasurer", "president"].includes(role ?? "")) {
    return apiError("FORBIDDEN", "Insufficient permissions.", 403)
  }

  const loanId = (await params).id
  const loan = await loanOperations.findById(loanId)
  if (!loan) {
    return apiError("NOT_FOUND", "Loan not found.", 404)
  }

  const logs = await auditLogOperations.findByResourceId("loan", loanId, 50)

  return NextResponse.json({
    success: true,
    data: logs,
    total: logs.length,
    error: null,
  })
}
