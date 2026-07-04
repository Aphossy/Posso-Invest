// C:\Users\user\OneDrive\Desktop\trustlink-group\db\operations\index.ts
// Import all operations for unified export
import { actionItemOperations } from "./action-item-operations"
import { announcementOperations } from "./announcement-operations"
import { assetOperations } from "./asset-operations"
import { attendanceOperations } from "./attendance-operations"
import { auditLogOperations } from "./audit-log-operations"
import { cleanupOperations } from "./cleanup-operations"
import { contributionOperations } from "./contribution-operations"
import { financialDocumentOperations } from "./financial-document-operations"
import { letterOperations } from "./letter-operations"
import { loanOperations } from "./loan-operations"
import { meetingOperations } from "./meeting-operations"
import { messageOperations } from "./message-operations"
import { minutesOperations } from "./minutes-operations"
import { notificationOperations } from "./notification-operations"
import { operationalExpenseOperations } from "./operational-expense-operations"
import { penaltyOperations } from "./penalty-operations"
import { receiptOperations } from "./receipt-operations"
import { sessionOperations } from "./session-operations"
import { userOperations } from "./user-operations"

// Re-export all operations
export * from "./user-operations"
export * from "./session-operations"
export * from "./notification-operations"
export * from "./audit-log-operations"
export * from "./action-item-operations"
export * from "./announcement-operations"
export * from "./attendance-operations"
export * from "./cleanup-operations"
export * from "./contribution-operations"
export * from "./financial-document-operations"
export * from "./letter-operations"
export * from "./penalty-operations"
export * from "./message-operations"
export * from "./loan-operations"
export * from "./meeting-operations"
export * from "./minutes-operations"
export * from "./asset-operations"
export * from "./receipt-operations"
export * from "./operational-expense-operations"
export * from "./share-out-operations"

// Unified operations object for easier imports
export const dbOperations = {
  users: userOperations,
  sessions: sessionOperations,
  cleanup: cleanupOperations,
  auditLog: auditLogOperations,
  actionItems: actionItemOperations,
  announcements: announcementOperations,
  attendance: attendanceOperations,
  notification: notificationOperations,
  contributions: contributionOperations,
  financialDocuments: financialDocumentOperations,
  letters: letterOperations,
  penalties: penaltyOperations,
  loans: loanOperations,
  meetings: meetingOperations,
  minutes: minutesOperations,
  messages: messageOperations,
  assets: assetOperations,
  receipts: receiptOperations,
  operationalExpenses: operationalExpenseOperations,
}

// Type-safe operation interfaces
export interface DatabaseOperations {
  users: typeof userOperations
  sessions: typeof sessionOperations
  cleanup: typeof cleanupOperations
  auditLog: typeof auditLogOperations
  actionItems: typeof actionItemOperations
  announcements: typeof announcementOperations
  attendance: typeof attendanceOperations
  notification: typeof notificationOperations
  contributions: typeof contributionOperations
  financialDocuments: typeof financialDocumentOperations
  letters: typeof letterOperations
  penalties: typeof penaltyOperations
  loans: typeof loanOperations
  meetings: typeof meetingOperations
  minutes: typeof minutesOperations
  messages: typeof messageOperations
  assets: typeof assetOperations
  receipts: typeof receiptOperations
  operationalExpenses: typeof operationalExpenseOperations
}

// Export type for the operations object
export type DbOperations = typeof dbOperations
