// C:\Users\user\OneDrive\Desktop\trustlink-group\db\schemas\index.ts
// Export combined schema object for Drizzle
// TrustLink Group specific schemas
import * as actionItemSchema from "./action-item-schema"
import * as announcementSchema from "./announcement-schema"
import * as assetSchema from "./asset-schema"
import * as attendanceSchema from "./attendance-schema"
import * as auditLogSchema from "./audit-log-schema"
import * as authSchema from "./auth-schema"
import * as contributionSchema from "./contribution-schema"
import * as emailSendLogSchema from "./email-send-log-schema"
import * as financialDocumentSchema from "./financial-document-schema"
import * as letterSchema from "./letter-schema"
import * as loanRepaymentSchema from "./loan-repayment-schema"
import * as loanSchema from "./loan-schema"
import * as meetingSchema from "./meeting-schema"
import * as messageSchema from "./message-schema"
import * as minutesSchema from "./minutes-schema"
import * as notificationSchema from "./notification-schema"
import * as operationalExpenseSchema from "./operational-expense-schema"
import * as penaltySchema from "./penalty-schema"
import * as receiptSchema from "./receipt-schema"
import * as shareOutSchema from "./share-out-schema"
import * as subscriberSchema from "./subscriber-schema"

// Unified schema file that exports everything
// Re-export all schemas and types
export * from "./auth-schema"
export * from "./announcement-schema"
export * from "./attendance-schema"
export * from "./action-item-schema"
export * from "./contribution-schema"
export * from "./email-send-log-schema"
export * from "./financial-document-schema"
export * from "./letter-schema"
export * from "./penalty-schema"
export * from "./loan-schema"
export * from "./loan-repayment-schema"
export * from "./meeting-schema"
export * from "./minutes-schema"
export * from "./notification-schema"
export * from "./audit-log-schema"
export * from "./asset-schema"
export * from "./receipt-schema"
export * from "./share-out-schema"
export * from "./subscriber-schema"
export * from "./message-schema"
export * from "./operational-expense-schema"

export const schema = {
  // TrustLink Group schemas
  ...authSchema,
  ...announcementSchema,
  ...attendanceSchema,
  ...actionItemSchema,
  ...contributionSchema,
  ...emailSendLogSchema,
  ...financialDocumentSchema,
  ...letterSchema,
  ...penaltySchema,
  ...loanSchema,
  ...loanRepaymentSchema,
  ...meetingSchema,
  ...minutesSchema,
  ...notificationSchema,
  ...auditLogSchema,
  ...assetSchema,
  ...receiptSchema,
  ...shareOutSchema,
  ...subscriberSchema,
  ...messageSchema,
  ...operationalExpenseSchema,
}

// Export database types for better type safety
export type DatabaseSchema = typeof schema

// Export commonly used types from all schemas

export type {
  User,
  IkiminaProfileMetadata,
  NewUser,
  Session,
  NewSession,
  Account,
  NewAccount,
  Verification,
  NewVerification,
  Organization,
  NewOrganization,
  Member,
  NewMember,
  Invitation,
  NewInvitation,
  TwoFactor,
  NewTwoFactor,
  Team,
  NewTeam,
  TeamMember,
  NewTeamMember,
  UserRole,
  Language,
  Theme,
} from "./auth-schema"

export type {
  EmailSendLog,
  EmailSendStatus,
  EmailEventType,
} from "./email-send-log-schema"

export type { AuditLog, NewAuditLog } from "./audit-log-schema"
export { AuditLogSeverity } from "./audit-log-schema"

export type { Asset, NewAsset, AssetType } from "./asset-schema"
export type {
  FinancialDocument,
  NewFinancialDocument,
  FinancialDocType,
  FinancialDocStatus,
} from "./financial-document-schema"
export type {
  Letter,
  NewLetter,
  LetterType,
  LetterStatus,
} from "./letter-schema"
export type {
  Receipt,
  NewReceipt,
  ReceiptType,
  ReceiptStatus,
  ReceiptPaymentMethod,
} from "./receipt-schema"
export type {
  ShareOut,
  NewShareOut,
  ShareOutAllocation,
  NewShareOutAllocation,
  ShareOutStatus,
  ShareOutAllocationStatus,
} from "./share-out-schema"
export type {
  Announcement,
  NewAnnouncement,
  AnnouncementStatus,
  AnnouncementAudience,
} from "./announcement-schema"
export type {
  Attendance,
  NewAttendance,
  AttendanceStatus,
} from "./attendance-schema"
export type {
  ActionItem,
  NewActionItem,
  ActionItemStatus,
  ActionItemPriority,
} from "./action-item-schema"
export type {
  Contribution,
  NewContribution,
  ContributionStatus,
} from "./contribution-schema"
export type { Penalty, NewPenalty, PenaltyStatus } from "./penalty-schema"
export type { Loan, NewLoan, LoanStatus } from "./loan-schema"
export type {
  LoanRepayment,
  NewLoanRepayment,
  LoanRepaymentMethod,
} from "./loan-repayment-schema"

export type {
  Notification,
  NewNotification,
  NotificationType,
  NotificationChannel,
  NotificationPriority,
} from "./notification-schema"
export type { Meeting, NewMeeting, MeetingStatus } from "./meeting-schema"
export type {
  MeetingMinutes,
  NewMeetingMinutes,
  MinutesStatus,
} from "./minutes-schema"

export {
  messageServiceEnum,
  messageStatusEnum,
  messagePriorityEnum,
} from "./message-schema"

export type {
  Subscriber,
  NewSubscriber,
  SubscriberStatus,
  SubscriberSource,
} from "./subscriber-schema"

export type {
  Message,
  NewMessage,
  MessageResponse,
  NewMessageResponse,
  MessageAttachment,
  NewMessageAttachment,
} from "./message-schema"

export type {
  OperationalExpense,
  NewOperationalExpense,
  ExpenseCategory,
  ExpenseStatus,
} from "./operational-expense-schema"
export { EXPENSE_CATEGORY_LABELS } from "./operational-expense-schema"
