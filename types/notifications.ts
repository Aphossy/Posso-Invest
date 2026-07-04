// types\notifications.ts
import type { NotificationType } from "@/db"

export const NOTIFICATION_ACTION = {
  VIEW_DASHBOARD: "view_dashboard",
  VIEW_PROFILE: "view_profile",
  VIEW_SECURITY_SETTINGS: "view_security_settings",
  VIEW_MESSAGE: "view_message",
  VIEW_CONTRIBUTION: "view_contribution",
  VIEW_PENALTY: "view_penalty",
  VIEW_LOAN: "view_loan",
  VIEW_ANNOUNCEMENT: "view_announcement",
  VIEW_ACTION_ITEM: "view_action_item",
  VIEW_MEETING: "view_meeting",
  VIEW_PAYMENT: "view_payment",
} as const

export type NotificationAction =
  (typeof NOTIFICATION_ACTION)[keyof typeof NOTIFICATION_ACTION]

export const DOMAIN_NOTIFICATION_TYPE = {
  CONTRIBUTION: "contribution",
  PENALTY: "penalty",
  LOAN: "loan",
  ANNOUNCEMENT: "announcement",
  ACTION_ITEM: "action_item",
  MEETING: "meeting",
  MESSAGE: "message",
  PAYMENT_RECEIVED: "payment_received",
  PAYMENT_FAILED: "payment_failed",
  SYSTEM: "system",
  INFO: "info",
} as const satisfies Record<string, NotificationType>

export interface NotificationData {
  action?: NotificationAction
  href?: string
  organizationId?: string
  messageCode?: string
  contributionId?: string
  penaltyId?: string
  loanId?: string
  actionItemId?: string
  announcementId?: string
  meetingId?: string
  period?: string
  amount?: number | string
  [key: string]: unknown
}
