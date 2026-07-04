import { headers } from "next/headers"
import { NextResponse } from "next/server"
import { db } from "@/db/connection"
import { shareOut, shareOutAllocation } from "@/db/schemas"
import { and, desc, eq, inArray } from "drizzle-orm"

import { auth } from "@/lib/auth"

function apiError(code: string, message: string, status: number) {
  return NextResponse.json(
    { success: false, data: null, error: { code, message } },
    { status }
  )
}

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })
  const user = session?.user
  if (!user) {
    return apiError("UNAUTHORIZED", "You must be signed in.", 401)
  }

  // Members only see allocations for cycles that have been approved or
  // distributed (drafts and cancelled cycles stay internal to leadership).
  const rows = await db
    .select({
      allocationId: shareOutAllocation.id,
      shareOutId: shareOutAllocation.shareOutId,
      contributionBase: shareOutAllocation.contributionBase,
      sharePercent: shareOutAllocation.sharePercent,
      grossShare: shareOutAllocation.grossShare,
      loanDeduction: shareOutAllocation.loanDeduction,
      penaltyDeduction: shareOutAllocation.penaltyDeduction,
      netShare: shareOutAllocation.netShare,
      allocationStatus: shareOutAllocation.status,
      paidAt: shareOutAllocation.paidAt,
      label: shareOut.label,
      fiscalYear: shareOut.fiscalYear,
      cycleStatus: shareOut.status,
      currency: shareOut.currency,
      distributedAt: shareOut.distributedAt,
    })
    .from(shareOutAllocation)
    .innerJoin(shareOut, eq(shareOutAllocation.shareOutId, shareOut.id))
    .where(
      and(
        eq(shareOutAllocation.memberId, user.id),
        inArray(shareOut.status, ["approved", "distributed"])
      )
    )
    .orderBy(desc(shareOut.fiscalYear))

  return NextResponse.json({
    success: true,
    data: rows,
    message: "Your share-out statements loaded.",
    error: null,
  })
}
