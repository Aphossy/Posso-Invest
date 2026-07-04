// db/operations/notification-operations.ts
import { db } from "@/db/connection"
import {
  notification,
  type NewNotification,
  type Notification,
  type NotificationChannel,
  type NotificationType,
} from "@/db/schemas"
import { generateUUID } from "@/utils/generate-id"
import { and, count, desc, eq, gte, isNull, lte } from "drizzle-orm"

export const notificationOperations = {
  // === Notification CRUD Operations ===

  async findById(id: string): Promise<Notification | null> {
    const result = await db
      .select()
      .from(notification)
      .where(eq(notification.id, id))
      .limit(1)
    return result[0] || null
  },

  async create(notificationData: NewNotification): Promise<Notification> {
    const result = await db
      .insert(notification)
      .values({
        ...notificationData,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning()
    return result[0]
  },

  async bulkCreate(notifications: NewNotification[]): Promise<Notification[]> {
    const result = await db
      .insert(notification)
      .values(
        notifications.map((notif) => ({
          ...notif,
          createdAt: new Date(),
          updatedAt: new Date(),
        }))
      )
      .returning()
    return result
  },

  async updateById(
    id: string,
    updates: Partial<Notification>
  ): Promise<Notification | null> {
    const result = await db
      .update(notification)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(notification.id, id))
      .returning()
    return result[0] || null
  },

  async deleteById(id: string): Promise<boolean> {
    const result = await db.delete(notification).where(eq(notification.id, id))
    return result.rowCount > 0
  },

  // === Status Management ===

  async markAsRead(id: string): Promise<Notification | null> {
    const result = await db
      .update(notification)
      .set({
        isRead: true,
        readAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(notification.id, id))
      .returning()
    return result[0] || null
  },

  async markAllAsRead(userId: string): Promise<void> {
    await db
      .update(notification)
      .set({
        isRead: true,
        readAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(eq(notification.userId, userId), eq(notification.isRead, false))
      )
  },

  async markAllAsReadForUser(userId: string): Promise<number> {
    const result = await db
      .update(notification)
      .set({
        isRead: true,
        readAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(eq(notification.userId, userId), eq(notification.isRead, false))
      )
    return result.rowCount
  },

  async markAsSent(id: string): Promise<Notification | null> {
    const result = await db
      .update(notification)
      .set({
        sentAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(notification.id, id))
      .returning()
    return result[0] || null
  },

  async markAsDelivered(id: string): Promise<Notification | null> {
    const result = await db
      .update(notification)
      .set({
        deliveredAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(notification.id, id))
      .returning()
    return result[0] || null
  },

  async markAsFailed(id: string, reason: string): Promise<Notification | null> {
    const result = await db
      .update(notification)
      .set({
        failedAt: new Date(),
        failureReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(notification.id, id))
      .returning()
    return result[0] || null
  },

  // === Query Operations ===

  async findByUserId(
    userId: string,
    limit = 50,
    offset = 0
  ): Promise<Notification[]> {
    return await db
      .select()
      .from(notification)
      .where(eq(notification.userId, userId))
      .orderBy(desc(notification.createdAt))
      .limit(limit)
      .offset(offset)
  },

  async findUnreadByUserId(userId: string): Promise<Notification[]> {
    return await db
      .select()
      .from(notification)
      .where(
        and(eq(notification.userId, userId), eq(notification.isRead, false))
      )
      .orderBy(desc(notification.createdAt))
  },

  async findByType(
    type: NotificationType,
    limit = 50,
    offset = 0
  ): Promise<Notification[]> {
    return await db
      .select()
      .from(notification)
      .where(eq(notification.type, type))
      .orderBy(desc(notification.createdAt))
      .limit(limit)
      .offset(offset)
  },

  async findByChannel(
    channel: NotificationChannel,
    limit = 50,
    offset = 0
  ): Promise<Notification[]> {
    return await db
      .select()
      .from(notification)
      .where(eq(notification.channel, channel))
      .orderBy(desc(notification.createdAt))
      .limit(limit)
      .offset(offset)
  },

  async findByRelatedEntity(
    relatedType: string,
    relatedId: string
  ): Promise<Notification[]> {
    return await db
      .select()
      .from(notification)
      .where(
        and(
          eq(notification.relatedType, relatedType),
          eq(notification.relatedId, relatedId)
        )
      )
      .orderBy(desc(notification.createdAt))
  },

  async findPendingSend(limit = 100): Promise<Notification[]> {
    return await db
      .select()
      .from(notification)
      .where(isNull(notification.sentAt))
      .orderBy(notification.createdAt)
      .limit(limit)
  },

  async findByDateRange(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Notification[]> {
    return await db
      .select()
      .from(notification)
      .where(
        and(
          eq(notification.userId, userId),
          gte(notification.createdAt, startDate),
          lte(notification.createdAt, endDate)
        )
      )
      .orderBy(desc(notification.createdAt))
  },

  // === Statistics ===

  async getUnreadCount(userId: string): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(notification)
      .where(
        and(eq(notification.userId, userId), eq(notification.isRead, false))
      )
    return result.count
  },

  async getUserNotificationStats(userId: string): Promise<{
    total: number
    unread: number
    read: number
    byType: Record<string, number>
    byChannel: Record<string, number>
  }> {
    const [totalResult] = await db
      .select({ count: count() })
      .from(notification)
      .where(eq(notification.userId, userId))

    const [unreadResult] = await db
      .select({ count: count() })
      .from(notification)
      .where(
        and(eq(notification.userId, userId), eq(notification.isRead, false))
      )

    const [readResult] = await db
      .select({ count: count() })
      .from(notification)
      .where(
        and(eq(notification.userId, userId), eq(notification.isRead, true))
      )

    // Type distribution
    const typeStats = await db
      .select({ type: notification.type, count: count() })
      .from(notification)
      .where(eq(notification.userId, userId))
      .groupBy(notification.type)

    const byType = typeStats.reduce(
      (acc: Record<string, number>, { type, count }: any) => {
        acc[type] = count
        return acc
      },
      {}
    )

    // Channel distribution
    const channelStats = await db
      .select({ channel: notification.channel, count: count() })
      .from(notification)
      .where(eq(notification.userId, userId))
      .groupBy(notification.channel)

    const byChannel = channelStats.reduce(
      (acc: Record<string, number>, { channel, count }: any) => {
        acc[channel] = count
        return acc
      },
      {}
    )

    return {
      total: totalResult.count,
      unread: unreadResult.count,
      read: readResult.count,
      byType,
      byChannel,
    }
  },

  // === Bulk Operations ===

  async deleteOldNotifications(daysOld = 90): Promise<number> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysOld)

    const result = await db
      .delete(notification)
      .where(
        and(
          lte(notification.createdAt, cutoffDate),
          eq(notification.isRead, true)
        )
      )
    return result.rowCount
  },

  async deleteAllForUser(userId: string): Promise<number> {
    const result = await db
      .delete(notification)
      .where(eq(notification.userId, userId))
    return result.rowCount
  },

  async deleteReadForUser(userId: string): Promise<number> {
    const result = await db
      .delete(notification)
      .where(
        and(eq(notification.userId, userId), eq(notification.isRead, true))
      )
    return result.rowCount
  },

  // === Helper Methods ===

  async createRelatedNotification(
    userId: string,
    type: NotificationType,
    relatedType: string,
    relatedId: string,
    message: string,
    title: string,
    data: Record<string, any> = {}
  ): Promise<Notification> {
    return await this.create({
      userId,
      type,
      title,
      message,
      channel: "in_app",
      relatedId,
      relatedType,
      data,
      id: generateUUID(),
    })
  },

  async createPaymentNotification(
    userId: string,
    paymentId: string,
    amount: number,
    message: string,
    title: string
  ): Promise<Notification> {
    return await this.create({
      userId,
      type: "payment_received",
      title,
      message,
      channel: "in_app",
      relatedId: paymentId,
      relatedType: "payment",
      data: { paymentId, amount },
      id: generateUUID(),
    })
  },
}
