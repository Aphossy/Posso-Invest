// ============================================================================
// utils/notification-utils.ts
// Notification helper utilities for creating and managing in-app notifications
// ============================================================================

import { type NotificationType } from "@/db"
import { notificationOperations } from "@/db/operations"
import logger from "@/utils/logger"

import {
  DOMAIN_NOTIFICATION_TYPE,
  NOTIFICATION_ACTION,
  type NotificationData,
} from "@/types/notifications"

import { generateUUID } from "./generate-id"

// ============================================================================
// Notification Templates and Helpers
// ============================================================================

export interface NotificationPayload {
  userId: string
  type: NotificationType
  title: string
  message: string
  data?: NotificationData
  expiresAt?: Date
}

/**
 * Create a single notification
 */
export async function createNotification(
  payload: NotificationPayload
): Promise<any | null> {
  try {
    const notification = await notificationOperations.create({
      userId: payload.userId,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      data: payload.data || {},
      id: generateUUID(),
    })
    return notification
  } catch (error) {
    logger.error("Failed to create notification", { error, payload })
    return null
  }
}

/**
 * Create notifications for multiple users
 */
export async function createBulkNotifications(
  payloads: NotificationPayload[]
): Promise<any[]> {
  try {
    const notifications = await notificationOperations.bulkCreate(
      payloads.map((p) => ({
        id: generateUUID(),
        userId: p.userId,
        type: p.type,
        title: p.title,
        message: p.message,
        data: p.data || {},
      }))
    )
    return notifications
  } catch (error) {
    logger.error("Failed to create bulk notifications", { error, payloads })
    return []
  }
}

// ============================================================================
// Payment-related notifications
// ============================================================================

export async function notifyPaymentCreated(
  clientUserId: string | undefined,
  adminUserIds: string[],
  paymentData: {
    paymentCode: string
    amount: string
    currency: string
    projectName: string
    paidBy: string
  }
): Promise<void> {
  const payloads: NotificationPayload[] = []

  // Notify client
  if (clientUserId) {
    payloads.push({
      userId: clientUserId,
      type: "payment_received",
      title: "Payment Recorded",
      message: `Your payment of ${paymentData.currency} ${paymentData.amount} for "${paymentData.projectName}" has been recorded`,
      data: {
        paymentCode: paymentData.paymentCode,
        amount: paymentData.amount,
        currency: paymentData.currency,
        projectName: paymentData.projectName,
        action: NOTIFICATION_ACTION.VIEW_PAYMENT,
      },
    })
  }

  // Notify admins
  adminUserIds.forEach((userId) => {
    payloads.push({
      userId,
      type: "payment_received",
      title: "New Payment Recorded",
      message: `Payment of ${paymentData.currency} ${paymentData.amount} recorded for "${paymentData.projectName}"`,
      data: {
        paymentCode: paymentData.paymentCode,
        amount: paymentData.amount,
        currency: paymentData.currency,
        paidBy: paymentData.paidBy,
        action: NOTIFICATION_ACTION.VIEW_PAYMENT,
      },
    })
  })

  await createBulkNotifications(payloads)
}

export async function notifyPaymentStatusChanged(
  clientUserId: string | undefined,
  paymentData: {
    paymentCode: string
    amount: string
    currency: string
    oldStatus: string
    newStatus: string
  }
): Promise<void> {
  if (!clientUserId) return

  await createNotification({
    userId: clientUserId,
    type: getNotificationTypeForStatus(paymentData.newStatus),
    title: "Payment Status Updated",
    message: `Payment ${paymentData.paymentCode} (${paymentData.currency} ${paymentData.amount}) status changed to ${formatStatus(paymentData.newStatus)}`,
    data: {
      paymentCode: paymentData.paymentCode,
      amount: paymentData.amount,
      currency: paymentData.currency,
      oldStatus: paymentData.oldStatus,
      newStatus: paymentData.newStatus,
      action: NOTIFICATION_ACTION.VIEW_PAYMENT,
    },
  })
}

// ============================================================================
// User-related notifications
// ============================================================================

export async function notifyUserWelcome(
  userId: string,
  userName: string
): Promise<void> {
  await createNotification({
    userId,
    type: "system",
    title: "Welcome to TrustLink Group Digital Solutions!",
    message: `Hi ${userName}! Welcome aboard. We're excited to have you here. Explore your dashboard to get started.`,
    data: {
      action: NOTIFICATION_ACTION.VIEW_DASHBOARD,
      isWelcome: true,
    },
  })
}

export async function notifyEmailVerified(userId: string): Promise<void> {
  await createNotification({
    userId,
    type: "system",
    title: "Email Verified Successfully",
    message:
      "Your email has been verified. You now have full access to all features.",
    data: {
      action: NOTIFICATION_ACTION.VIEW_PROFILE,
    },
  })
}

export async function notifyPasswordChanged(userId: string): Promise<void> {
  await createNotification({
    userId,
    type: "system",
    title: "Password Changed",
    message:
      "Your password was recently changed. If you didn't make this change, please contact support immediately.",
    data: {
      action: NOTIFICATION_ACTION.VIEW_SECURITY_SETTINGS,
      isSecurityAlert: true,
    },
  })
}

export async function notifySettingsUpdated(
  userId: string,
  changes: string[]
): Promise<void> {
  const hasSecurityChange = changes.some((c) =>
    ["email", "newPassword", "twoFactorEnabled"].includes(c)
  )

  await createNotification({
    userId,
    type: hasSecurityChange ? "system" : "info",
    title: "Settings Updated",
    message: `Your account settings have been updated successfully. Changes: ${changes.join(", ")}`,
    data: {
      action: NOTIFICATION_ACTION.VIEW_PROFILE,
      changes,
      isSecurityRelated: hasSecurityChange,
    },
  })
}

export async function notify2FAEnabled(userId: string): Promise<void> {
  await createNotification({
    userId,
    type: "system",
    title: "Two-Factor Authentication Enabled",
    message:
      "Two-factor authentication has been enabled for your account. Your account is now more secure!",
    data: {
      action: NOTIFICATION_ACTION.VIEW_SECURITY_SETTINGS,
      isSecurityAlert: true,
    },
  })
}

// ============================================================================
// Message-related notifications
// ============================================================================

export async function notifyMessageReceived(
  recipientUserIds: string[],
  messageData: {
    messageCode: string
    name: string
    email: string
    subject: string
    service: string
  }
): Promise<void> {
  const payloads: NotificationPayload[] = recipientUserIds.map((userId) => ({
    userId,
    type: DOMAIN_NOTIFICATION_TYPE.MESSAGE,
    title: "New Message Received",
    message: `${messageData.name} sent a message: "${messageData.subject}"`,
    data: {
      messageCode: messageData.messageCode,
      senderName: messageData.name,
      senderEmail: messageData.email,
      subject: messageData.subject,
      service: messageData.service,
      action: NOTIFICATION_ACTION.VIEW_MESSAGE,
    },
  }))

  await createBulkNotifications(payloads)
}

export async function notifyMessageResponse(
  userId: string,
  messageData: {
    messageCode: string
    subject: string
    responderName: string
  }
): Promise<void> {
  await createNotification({
    userId,
    type: DOMAIN_NOTIFICATION_TYPE.MESSAGE,
    title: "Message Response Received",
    message: `${messageData.responderName} responded to your message: "${messageData.subject}"`,
    data: {
      messageCode: messageData.messageCode,
      subject: messageData.subject,
      action: NOTIFICATION_ACTION.VIEW_MESSAGE,
    },
  })
}

// ============================================================================
// Helper functions
// ============================================================================

function formatStatus(status: string): string {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

function getNotificationTypeForStatus(status: string): NotificationType {
  const successStatuses = [
    "completed",
    "accepted",
    "converted",
    "paid",
    "verified",
    "approved",
  ]
  const warningStatuses = [
    "pending",
    "reviewing",
    "processing",
    "on-hold",
    "paused",
  ]
  const errorStatuses = [
    "rejected",
    "cancelled",
    "failed",
    "expired",
    "overdue",
  ]

  if (successStatuses.some((s) => status.toLowerCase().includes(s))) {
    return "system"
  }
  if (errorStatuses.some((s) => status.toLowerCase().includes(s))) {
    return "system"
  }
  if (warningStatuses.some((s) => status.toLowerCase().includes(s))) {
    return "info"
  }

  return "info"
}

/**
 * Get all admin user IDs for sending notifications
 */
export async function getAdminUserIds(): Promise<string[]> {
  try {
    const { userOperations } = await import("@/db/operations")
    const adminUsers = await userOperations.findByRole("admin")
    return adminUsers.map((user: any) => user.id)
  } catch (error) {
    logger.error("Failed to get admin user IDs", { error })
    return []
  }
}

/**
 * Get all secretary user IDs for sending notifications
 */
export async function getSecretaryUserIds(): Promise<string[]> {
  try {
    const { userOperations } = await import("@/db/operations")
    const secretaryUsers = await userOperations.findByRole("secretary")
    return secretaryUsers.map((user: any) => user.id)
  } catch (error) {
    logger.error("Failed to get secretary user IDs", { error })
    return []
  }
}

/**
 * Get all president user IDs for sending notifications
 */
export async function getPresidentUserIds(): Promise<string[]> {
  try {
    const { userOperations } = await import("@/db/operations")
    const presidentUsers = await userOperations.findByRole("president")
    return presidentUsers.map((user: any) => user.id)
  } catch (error) {
    logger.error("Failed to get president user IDs", { error })
    return []
  }
}

/**
 * Get all leadership user IDs who should receive support message notifications
 */
export async function getMessageLeadershipUserIds(): Promise<string[]> {
  const [admins, presidents, secretaries] = await Promise.all([
    getAdminUserIds(),
    getPresidentUserIds(),
    getSecretaryUserIds(),
  ])
  return [...new Set([...admins, ...presidents, ...secretaries])]
}
