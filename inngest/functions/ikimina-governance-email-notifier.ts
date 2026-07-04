import { db } from "@/db/connection"
import { member, user } from "@/db/schemas"
import { ActionItemAssignedEmail } from "@/emails/action-item-assigned"
import { ActionItemCreatedLeadershipEmail } from "@/emails/action-item-created-leadership"
import { ActionItemStatusChangedLeadershipEmail } from "@/emails/action-item-status-changed-leadership"
import { ActionItemStatusChangedOwnerEmail } from "@/emails/action-item-status-changed-owner"
import { AnnouncementPublishedEmail } from "@/emails/announcement-published"
import { inngest } from "@/inngest/client"
import {
  ensureEmailLogRecord,
  findFailedEmailLogs,
  getEmailLogStatus,
  markEmailFailed,
  markEmailSent,
} from "@/inngest/email-log-helpers"
import {
  actionItemCreatedEvent,
  actionItemStatusChangedEvent,
  announcementPublishedEvent,
} from "@/inngest/events"
import { render } from "@react-email/components"
import { and, eq, inArray } from "drizzle-orm"

import sendEmail from "@/lib/send-email"

type OrgRecipient = {
  userId: string
  name: string
  email: string
  role: string
}

const getOrgRecipientsByRoles = async (
  organizationId: string,
  roles: readonly string[]
): Promise<OrgRecipient[]> => {
  const rows = await db
    .select({
      userId: user.id,
      name: user.name,
      email: user.email,
      role: member.role,
    })
    .from(member)
    .innerJoin(user, eq(member.userId, user.id))
    .where(
      and(
        eq(member.organizationId, organizationId),
        inArray(member.role, [...roles])
      )
    )

  const deduped = new Map<string, OrgRecipient>()
  for (const row of rows) {
    if (!row.email) continue
    deduped.set(row.userId, row)
  }

  return [...deduped.values()]
}

const getAudienceRoles = (
  audience: "members" | "committee" | "public"
): readonly string[] => {
  if (audience === "committee") {
    return ["admin", "president", "secretary", "treasurer"]
  }

  // "members" and "public" both target all org participants - in an ikimina
  // every role holder (admin, president, secretary, treasurer, member) is also
  // an active member of the group and should receive member-facing broadcasts.
  return ["admin", "president", "secretary", "treasurer", "member"]
}

// ---------------------------------------------------------------------------
// Announcement published
// ---------------------------------------------------------------------------

export const announcementPublishedEmailNotifier = inngest.createFunction(
  {
    id: "ikimina-announcement-published-email-notifier",
    retries: 3,
    concurrency: 4,
    triggers: [announcementPublishedEvent],
  },
  async ({ event, step, logger }) => {
    const {
      organizationId,
      announcementId,
      title,
      summary,
      content,
      audience,
      publishedAt,
      expiresAt,
      pinned,
      createdByName,
    } = event.data

    const recipients = await step.run("resolve-announcement-recipients", () =>
      getOrgRecipientsByRoles(organizationId, getAudienceRoles(audience))
    )

    if (recipients.length === 0) {
      logger.info("No recipients for announcement", {
        announcementId,
        audience,
      })
      return { announcementId, sent: 0 }
    }

    const eventType = "announcement_published" as const

    // ── Initial send - one step per recipient ────────────────────────────
    for (const r of recipients) {
      await step.run(`send-email-${r.userId}`, async () => {
        await ensureEmailLogRecord(r.userId, r.email, eventType, announcementId)

        const status = await getEmailLogStatus(
          r.userId,
          eventType,
          announcementId
        )
        if (status === "sent") return

        const html = await render(
          AnnouncementPublishedEmail({
            recipientName: r.name,
            title,
            summary,
            content,
            audience,
            publishedAt,
            expiresAt,
            pinned,
            createdByName,
            announcementId,
          })
        )

        const result = await sendEmail({
          to: r.email,
          subject: `New announcement: ${title}`,
          html,
        })

        if (result.success) {
          await markEmailSent(r.userId, eventType, announcementId)
        } else {
          await markEmailFailed(
            r.userId,
            eventType,
            announcementId,
            String(result.error)
          )
        }
      })
    }

    // ── Retry failed emails after a pause ────────────────────────────────
    const failedUserIds = await step.run("find-failed-emails", () =>
      findFailedEmailLogs(eventType, announcementId)
    )

    if (failedUserIds.length > 0) {
      logger.info("Retrying failed announcement emails", {
        announcementId,
        count: failedUserIds.length,
      })

      await step.sleep("wait-before-retry", "5 minutes")

      const recipientById = new Map(recipients.map((r) => [r.userId, r]))

      for (const userId of failedUserIds) {
        const r = recipientById.get(userId)
        if (!r) continue

        await step.run(`retry-email-${r.userId}`, async () => {
          const status = await getEmailLogStatus(
            r.userId,
            eventType,
            announcementId
          )
          if (status === "sent") return

          const html = await render(
            AnnouncementPublishedEmail({
              recipientName: r.name,
              title,
              summary,
              content,
              audience,
              publishedAt,
              expiresAt,
              pinned,
              createdByName,
              announcementId,
            })
          )

          const result = await sendEmail({
            to: r.email,
            subject: `New announcement: ${title}`,
            html,
          })

          if (result.success) {
            await markEmailSent(r.userId, eventType, announcementId)
          } else {
            await markEmailFailed(
              r.userId,
              eventType,
              announcementId,
              String(result.error)
            )
          }
        })
      }
    }

    logger.info("Announcement notifications sent", {
      announcementId,
      audience,
      recipientCount: recipients.length,
      retried: failedUserIds.length,
    })

    return { announcementId, sent: recipients.length }
  }
)

// ---------------------------------------------------------------------------
// Action item created
// ---------------------------------------------------------------------------

export const actionItemCreatedEmailNotifier = inngest.createFunction(
  {
    id: "ikimina-action-item-created-email-notifier",
    retries: 3,
    concurrency: 5,
    triggers: [actionItemCreatedEvent],
  },
  async ({ event, step, logger }) => {
    const {
      organizationId,
      actionItemId,
      title,
      description,
      priority,
      status,
      dueDate,
      meetingTitle,
      notes,
      ownerId,
      ownerName,
      ownerEmail,
      createdByName,
      createdByRole,
    } = event.data

    // Owner assignment email - already a single step, no change needed
    if (ownerEmail) {
      await step.run("send-action-item-owner-assignment", async () => {
        const html = await render(
          ActionItemAssignedEmail({
            recipientName: ownerName || "Member",
            title,
            description,
            priority,
            status,
            dueDate,
            meetingTitle,
            notes,
            assignedByName: createdByName,
            actionItemId,
          })
        )

        await sendEmail({
          to: ownerEmail,
          subject: `New action item assigned: ${title}`,
          html,
        })
      })
    }

    if (createdByRole !== "secretary") {
      return
    }

    const leadershipRecipients = await step.run(
      "resolve-action-item-leadership-recipients",
      () => getOrgRecipientsByRoles(organizationId, ["admin", "president"])
    )

    const targets = leadershipRecipients.filter((r) => r.userId !== ownerId)

    if (targets.length === 0) return

    const eventType = "action_item_created_leadership" as const

    // ── One step per leadership recipient ─────────────────────────────────
    for (const r of targets) {
      await step.run(`send-leadership-email-${r.userId}`, async () => {
        await ensureEmailLogRecord(r.userId, r.email, eventType, actionItemId)

        const status = await getEmailLogStatus(
          r.userId,
          eventType,
          actionItemId
        )
        if (status === "sent") return

        const html = await render(
          ActionItemCreatedLeadershipEmail({
            recipientName: r.name,
            title,
            description,
            priority,
            status: event.data.status,
            dueDate,
            meetingTitle,
            notes,
            ownerName,
            ownerEmail,
            createdByName,
            actionItemId,
          })
        )

        const result = await sendEmail({
          to: r.email,
          subject: `Action item created by secretary: ${title}`,
          html,
        })

        if (result.success) {
          await markEmailSent(r.userId, eventType, actionItemId)
        } else {
          await markEmailFailed(
            r.userId,
            eventType,
            actionItemId,
            String(result.error)
          )
        }
      })
    }

    // ── Retry ─────────────────────────────────────────────────────────────
    const failedUserIds = await step.run("find-failed-emails", () =>
      findFailedEmailLogs(eventType, actionItemId)
    )

    if (failedUserIds.length > 0) {
      await step.sleep("wait-before-retry", "5 minutes")

      const targetById = new Map(targets.map((r) => [r.userId, r]))

      for (const userId of failedUserIds) {
        const r = targetById.get(userId)
        if (!r) continue

        await step.run(`retry-leadership-email-${r.userId}`, async () => {
          const status = await getEmailLogStatus(
            r.userId,
            eventType,
            actionItemId
          )
          if (status === "sent") return

          const html = await render(
            ActionItemCreatedLeadershipEmail({
              recipientName: r.name,
              title,
              description,
              priority,
              status: event.data.status,
              dueDate,
              meetingTitle,
              notes,
              ownerName,
              ownerEmail,
              createdByName,
              actionItemId,
            })
          )

          const result = await sendEmail({
            to: r.email,
            subject: `Action item created by secretary: ${title}`,
            html,
          })

          if (result.success) {
            await markEmailSent(r.userId, eventType, actionItemId)
          } else {
            await markEmailFailed(
              r.userId,
              eventType,
              actionItemId,
              String(result.error)
            )
          }
        })
      }
    }

    logger.info("Action item creation emails sent", {
      actionItemId,
      leadershipRecipients: targets.length,
      retried: failedUserIds.length,
    })
  }
)

// ---------------------------------------------------------------------------
// Action item status changed
// ---------------------------------------------------------------------------

export const actionItemStatusChangedEmailNotifier = inngest.createFunction(
  {
    id: "ikimina-action-item-status-changed-email-notifier",
    retries: 3,
    concurrency: 5,
    triggers: [actionItemStatusChangedEvent],
  },
  async ({ event, step, logger }) => {
    const {
      organizationId,
      actionItemId,
      title,
      oldStatus,
      newStatus,
      priority,
      dueDate,
      ownerId,
      ownerName,
      ownerEmail,
      notes,
      changedByName,
      changedByRole,
    } = event.data

    // Owner status email - single step, no change needed
    if (ownerEmail) {
      await step.run("send-action-item-owner-status-email", async () => {
        const html = await render(
          ActionItemStatusChangedOwnerEmail({
            recipientName: ownerName || "Member",
            title,
            oldStatus,
            newStatus,
            priority,
            dueDate,
            notes,
            changedByName,
            actionItemId,
          })
        )

        await sendEmail({
          to: ownerEmail,
          subject: `Action item status updated: ${title}`,
          html,
        })
      })
    }

    if (changedByRole !== "member") {
      return
    }

    const leadershipRecipients = await step.run(
      "resolve-action-item-status-leadership-recipients",
      () => getOrgRecipientsByRoles(organizationId, ["admin", "president"])
    )

    const targets = leadershipRecipients.filter((r) => r.userId !== ownerId)

    if (targets.length === 0) return

    const eventType = "action_item_status_changed_leadership" as const

    // ── One step per leadership recipient ─────────────────────────────────
    for (const r of targets) {
      await step.run(`send-status-email-${r.userId}`, async () => {
        await ensureEmailLogRecord(r.userId, r.email, eventType, actionItemId)

        const status = await getEmailLogStatus(
          r.userId,
          eventType,
          actionItemId
        )
        if (status === "sent") return

        const html = await render(
          ActionItemStatusChangedLeadershipEmail({
            recipientName: r.name,
            title,
            oldStatus,
            newStatus,
            priority,
            dueDate,
            ownerName,
            ownerEmail,
            notes,
            changedByName,
            actionItemId,
          })
        )

        const result = await sendEmail({
          to: r.email,
          subject: `Action item status changed: ${title}`,
          html,
        })

        if (result.success) {
          await markEmailSent(r.userId, eventType, actionItemId)
        } else {
          await markEmailFailed(
            r.userId,
            eventType,
            actionItemId,
            String(result.error)
          )
        }
      })
    }

    // ── Retry ─────────────────────────────────────────────────────────────
    const failedUserIds = await step.run("find-failed-emails", () =>
      findFailedEmailLogs(eventType, actionItemId)
    )

    if (failedUserIds.length > 0) {
      await step.sleep("wait-before-retry", "5 minutes")

      const targetById = new Map(targets.map((r) => [r.userId, r]))

      for (const userId of failedUserIds) {
        const r = targetById.get(userId)
        if (!r) continue

        await step.run(`retry-status-email-${r.userId}`, async () => {
          const status = await getEmailLogStatus(
            r.userId,
            eventType,
            actionItemId
          )
          if (status === "sent") return

          const html = await render(
            ActionItemStatusChangedLeadershipEmail({
              recipientName: r.name,
              title,
              oldStatus,
              newStatus,
              priority,
              dueDate,
              ownerName,
              ownerEmail,
              notes,
              changedByName,
              actionItemId,
            })
          )

          const result = await sendEmail({
            to: r.email,
            subject: `Action item status changed: ${title}`,
            html,
          })

          if (result.success) {
            await markEmailSent(r.userId, eventType, actionItemId)
          } else {
            await markEmailFailed(
              r.userId,
              eventType,
              actionItemId,
              String(result.error)
            )
          }
        })
      }
    }

    logger.info("Action item status emails sent", {
      actionItemId,
      oldStatus,
      newStatus,
      leadershipRecipients: targets.length,
      retried: failedUserIds.length,
    })
  }
)
