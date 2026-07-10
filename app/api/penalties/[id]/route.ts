import { NextResponse } from "next/server"
import { db } from "@/db/connection"
import { contributionOperations } from "@/db/operations/contribution-operations"
import { penaltyOperations } from "@/db/operations/penalty-operations"
import { userOperations } from "@/db/operations/user-operations"
import { member, user as userTable } from "@/db/schemas"
import { PenaltyUpdatedLeadershipEmail } from "@/emails/penalty-updated-leadership"
import { PenaltyUpdatedMemberEmail } from "@/emails/penalty-updated-member"
import logger from "@/utils/logger"
import {
  createBulkNotifications,
  type NotificationPayload,
} from "@/utils/notification-utils"
import { render } from "@react-email/components"
import { and, eq, inArray } from "drizzle-orm"
import { z } from "zod"

import {
  DOMAIN_NOTIFICATION_TYPE,
  NOTIFICATION_ACTION,
} from "@/types/notifications"
import { getSessionUserCached } from "@/lib/get-session-cached"
import sendEmail from "@/lib/send-email"

const updateSchema = z.object({
  status: z.enum(["active", "waived"]).optional(),
  amount: z.coerce.string().optional(),
  reason: z.string().optional(),
  waivedReason: z.string().optional(),
  notes: z.string().optional(),
})

const penaltyNotificationRoles = ["admin", "president"] as const

async function getPenaltyNotificationRecipients(
  activeOrganizationId?: string | null
) {
  if (!activeOrganizationId) return []

  try {
    const rows = await db
      .select({
        userId: userTable.id,
        name: userTable.name,
        email: userTable.email,
        role: member.role,
      })
      .from(member)
      .innerJoin(userTable, eq(member.userId, userTable.id))
      .where(
        and(
          eq(member.organizationId, activeOrganizationId),
          inArray(member.role, [...penaltyNotificationRoles])
        )
      )

    const deduped = new Map<
      string,
      { userId: string; name: string; email: string; role: string }
    >()

    for (const row of rows) {
      if (!row.email) continue
      deduped.set(row.userId, row)
    }

    return [...deduped.values()]
  } catch (error) {
    console.error(
      "[penalties:id:getPenaltyNotificationRecipients] lookup failed",
      {
        activeOrganizationId,
        error,
      }
    )
    return []
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, role } = await getSessionUserCached()
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const record = await penaltyOperations.findById((await params).id)
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 })

  if (
    !["admin", "treasurer"].includes(role ?? "") &&
    record.memberId !== user.id
  )
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  return NextResponse.json({ data: record })
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, role, activeOrganizationId } = await getSessionUserCached()
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!["admin", "treasurer"].includes(role ?? ""))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const record = await penaltyOperations.findById((await params).id)
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await request.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 })

  const updates: Parameters<typeof penaltyOperations.updateById>[1] = {
    ...parsed.data,
  }

  const isWaiving =
    parsed.data.status === "waived" && record.status !== "waived"
  const isUndoingWaiver =
    parsed.data.status === "active" && record.status === "waived"

  if (isWaiving) {
    updates.waivedBy = user.id
    updates.waivedAt = new Date()
    updates.waivedReason = parsed.data.waivedReason ?? null
  }

  if (isUndoingWaiver) {
    updates.waivedBy = null
    updates.waivedAt = null
    updates.waivedReason = null
  }

  const updated = await penaltyOperations.updateById(record.id, updates)
  if (!updated)
    return NextResponse.json({ error: "Update failed" }, { status: 500 })

  const changedFields = [
    record.status !== updated.status,
    String(record.amount) !== String(updated.amount),
    (record.reason ?? "") !== (updated.reason ?? ""),
    (record.waivedReason ?? "") !== (updated.waivedReason ?? ""),
    (record.notes ?? "") !== (updated.notes ?? ""),
  ]
  const hasMeaningfulUpdate = changedFields.some(Boolean)

  if (hasMeaningfulUpdate) {
    const penalizedMember = await userOperations.findById(updated.memberId)
    const oldAmount = new Intl.NumberFormat("en-RW").format(
      Number.parseFloat(String(record.amount))
    )
    const newAmount = new Intl.NumberFormat("en-RW").format(
      Number.parseFloat(String(updated.amount))
    )
    const leadershipRecipients =
      role === "treasurer"
        ? await getPenaltyNotificationRecipients(activeOrganizationId)
        : []

    if (penalizedMember?.email) {
      try {
        const memberHtml = await render(
          PenaltyUpdatedMemberEmail({
            memberName: penalizedMember.name,
            oldStatus: record.status,
            newStatus: updated.status,
            oldAmount,
            newAmount,
            currency: updated.currency,
            period: updated.period,
            reason: updated.reason,
            waivedReason: updated.waivedReason,
            notes: updated.notes,
            updatedByName: user.name,
            penaltyId: updated.id,
          })
        )

        const memberResult = await sendEmail({
          to: penalizedMember.email,
          subject: "Your penalty record has been updated - TrustLink Group",
          html: memberHtml,
        })

        if (!memberResult.success) {
          logger.error("Failed to send penalty update member email", {
            penaltyId: updated.id,
            memberId: updated.memberId,
            error: memberResult.error,
          })
        }
      } catch (error) {
        logger.error("Failed to prepare penalty update member email", {
          penaltyId: updated.id,
          memberId: updated.memberId,
          error,
        })
      }
    }

    if (role === "treasurer") {
      if (leadershipRecipients.length > 0) {
        await Promise.all(
          leadershipRecipients.map(async (recipient) => {
            try {
              const recipientHtml = await render(
                PenaltyUpdatedLeadershipEmail({
                  recipientName: recipient.name,
                  memberName: penalizedMember?.name ?? updated.memberId,
                  memberEmail: penalizedMember?.email ?? "N/A",
                  oldStatus: record.status,
                  newStatus: updated.status,
                  oldAmount,
                  newAmount,
                  currency: updated.currency,
                  period: updated.period,
                  reason: updated.reason,
                  waivedReason: updated.waivedReason,
                  notes: updated.notes,
                  updatedByName: user.name,
                  penaltyId: updated.id,
                })
              )

              const recipientResult = await sendEmail({
                to: recipient.email,
                subject: `Penalty updated by treasurer for ${penalizedMember?.name ?? "member"}`,
                html: recipientHtml,
              })

              if (!recipientResult.success) {
                logger.error("Failed to send penalty update leadership email", {
                  penaltyId: updated.id,
                  recipientId: recipient.userId,
                  recipientRole: recipient.role,
                  error: recipientResult.error,
                })
              }
            } catch (error) {
              logger.error(
                "Failed to prepare penalty update leadership email",
                {
                  penaltyId: updated.id,
                  recipientId: recipient.userId,
                  recipientRole: recipient.role,
                  error,
                }
              )
            }
          })
        )
      }
    }

    // Create in-app notifications for penalty updates (non-blocking)
    try {
      const notificationPayloads: NotificationPayload[] = []

      if (penalizedMember?.id) {
        notificationPayloads.push({
          userId: penalizedMember.id,
          type: DOMAIN_NOTIFICATION_TYPE.PENALTY,
          title: "Penalty Updated",
          message: `Your penalty for ${updated.period} was updated from ${record.status} to ${updated.status}.`,
          data: {
            penaltyId: updated.id,
            memberId: updated.memberId,
            oldStatus: record.status,
            newStatus: updated.status,
            oldAmount,
            newAmount,
            currency: updated.currency,
            period: updated.period,
            reason: updated.reason,
            waivedReason: updated.waivedReason,
            notes: updated.notes,
            updatedBy: user.id,
            updatedByName: user.name,
            action: NOTIFICATION_ACTION.VIEW_PENALTY,
          },
        })
      }

      if (role === "treasurer") {
        leadershipRecipients
          .filter((recipient) => recipient.userId !== penalizedMember?.id)
          .forEach((recipient) => {
            notificationPayloads.push({
              userId: recipient.userId,
              type: DOMAIN_NOTIFICATION_TYPE.PENALTY,
              title: "Penalty Updated by Treasurer",
              message: `${user.name} updated a penalty for ${penalizedMember?.name ?? "a member"}.`,
              data: {
                penaltyId: updated.id,
                memberId: updated.memberId,
                memberName: penalizedMember?.name,
                memberEmail: penalizedMember?.email,
                oldStatus: record.status,
                newStatus: updated.status,
                oldAmount,
                newAmount,
                currency: updated.currency,
                period: updated.period,
                reason: updated.reason,
                waivedReason: updated.waivedReason,
                notes: updated.notes,
                updatedBy: user.id,
                updatedByName: user.name,
                recipientRole: recipient.role,
                action: NOTIFICATION_ACTION.VIEW_PENALTY,
              },
            })
          })
      }

      if (notificationPayloads.length > 0) {
        await createBulkNotifications(notificationPayloads)
      }
    } catch (notificationError) {
      logger.error("Failed to create penalty update in-app notifications", {
        error: notificationError,
        penaltyId: updated.id,
      })
    }
  }

  // Sync contribution status and penaltyAmount
  const contribUpdates: Record<string, any> = {}
  if (isWaiving) contribUpdates.status = "waived"
  if (isUndoingWaiver) contribUpdates.status = "late"
  if (parsed.data.amount) contribUpdates.penaltyAmount = parsed.data.amount

  if (Object.keys(contribUpdates).length > 0 && record.contributionId) {
    await contributionOperations.updateById(
      record.contributionId,
      contribUpdates
    )
  }

  return NextResponse.json({ data: updated })
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, role } = await getSessionUserCached()
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const removed = await penaltyOperations.deleteById((await params).id)
  if (!removed)
    return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json({ success: true })
}
