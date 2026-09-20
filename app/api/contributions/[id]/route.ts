import { NextResponse } from "next/server"
import { contributionOperations } from "@/db/operations/contribution-operations"
import { penaltyOperations } from "@/db/operations/penalty-operations"
import { insertContributionSchema } from "@/db/schemas/contribution-schema"
import { z } from "zod"

import { getSessionUserCached } from "@/lib/get-session-cached"

const updateSchema = insertContributionSchema
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .partial()
  .extend({
    amount: z.coerce.string().optional(),
    penaltyAmount: z.coerce.string().optional(),
    paidAt: z.coerce.date().optional(),
    dueDate: z.coerce.date().optional(),
  })

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessionInfo = await getSessionUserCached()
  const user = sessionInfo.user
  const role = sessionInfo.role
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const record = await contributionOperations.findById((await params).id)
  if (!record) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  if (
    !["admin", "treasurer", "president"].includes(role ?? "") &&
    record.memberId !== user.id
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  return NextResponse.json({ data: record })
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessionInfo = await getSessionUserCached()
  const user = sessionInfo.user
  const role = sessionInfo.role
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!["admin", "treasurer"].includes(role ?? "")) {
    console.warn("[contributions:id:PUT] forbidden role", {
      userId: user.id,
      role,
      activeOrganizationId: sessionInfo.activeOrganizationId,
      sessionRole: user.role,
    })
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await request.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
  }

  const contribId = (await params).id
  const existing = await contributionOperations.findById(contribId)
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const auditTimestamp = new Date().toISOString()
  const mergedMetadata = {
    ...(existing.metadata ?? {}),
    lastUpdatedById: user.id,
    lastUpdatedByName: user.name ?? "Unknown user",
    lastUpdatedAt: auditTimestamp,
  }

  const updated = await contributionOperations.updateById(contribId, {
    ...parsed.data,
    metadata: mergedMetadata,
  })
  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  // Sync penalty records when contribution status or penaltyAmount changes
  const newStatus = parsed.data.status
  const newPenaltyAmount = parsed.data.penaltyAmount

  if (newStatus === "late" || newPenaltyAmount !== undefined) {
    const penaltyRecord =
      await penaltyOperations.findByContributionId(contribId)
    const amount = newPenaltyAmount ?? existing.penaltyAmount ?? "0"
    const penaltyVal = Number(amount)

    if (
      !penaltyRecord &&
      penaltyVal > 0 &&
      (newStatus === "late" || existing.status === "late")
    ) {
      // Create penalty if it doesn't exist yet
      await penaltyOperations.create({
        id: crypto.randomUUID(),
        organizationId: sessionInfo.activeOrganizationId || "unknown-org",
        contributionId: contribId,
        memberId: existing.memberId,
        issuedBy: user.id,
        amount: String(penaltyVal),
        currency: existing.currency,
        status: "active",
        reason: `Late payment for period ${existing.period}`,
        period: existing.period,
      })
    } else if (penaltyRecord && newPenaltyAmount !== undefined) {
      // Update penalty amount
      await penaltyOperations.updateById(penaltyRecord.id, {
        amount: newPenaltyAmount,
      })
    }
  }

  if (newStatus === "waived") {
    const penaltyRecord =
      await penaltyOperations.findByContributionId(contribId)
    if (penaltyRecord && penaltyRecord.status === "active") {
      await penaltyOperations.updateById(penaltyRecord.id, {
        status: "waived",
        waivedBy: user.id,
        waivedAt: new Date(),
        waivedReason: parsed.data.notes ?? "Waived via contribution update",
      })
    }
  }

  if (newStatus === "late" && existing.status === "waived") {
    // Undo waiver - re-activate the penalty
    const penaltyRecord =
      await penaltyOperations.findByContributionId(contribId)
    if (penaltyRecord && penaltyRecord.status === "waived") {
      await penaltyOperations.updateById(penaltyRecord.id, {
        status: "active",
        waivedBy: null,
        waivedAt: null,
        waivedReason: null,
      })
    }
  }

  return NextResponse.json({ data: updated })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessionInfo = await getSessionUserCached()
  const user = sessionInfo.user
  const role = sessionInfo.role
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!["admin", "treasurer"].includes(role ?? "")) {
    console.warn("[contributions:id:DELETE] forbidden role", {
      userId: user.id,
      role,
      activeOrganizationId: sessionInfo.activeOrganizationId,
      sessionRole: user.role,
    })
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const removed = await contributionOperations.deleteById((await params).id)
  if (!removed) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
