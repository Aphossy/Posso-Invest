// db\schemas\message-schema.ts
import { POSSO_MESSAGE_SERVICE_VALUES } from "@/constants/message-services"
import { relations } from "drizzle-orm"
import {
  boolean,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core"
import { createInsertSchema, createSelectSchema } from "drizzle-zod"
import { z } from "zod"

// ============================================
// ENUMS
// ============================================

export const messageServiceEnum = pgEnum(
  "message_service",
  POSSO_MESSAGE_SERVICE_VALUES
)

export const messageStatusEnum = pgEnum("message_status", [
  "new", // Just received, not yet read
  "read", // Message has been read
  "in-progress", // Being handled/responded to
  "resolved", // Issue/query resolved
  "archived", // Archived for record keeping
])

export const messagePriorityEnum = pgEnum("message_priority", [
  "low",
  "medium",
  "high",
  "urgent",
])

// ============================================
// TABLES
// ============================================

export const messages = pgTable(
  "messages",
  {
    // Core identification
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    messageCode: varchar("message_code", { length: 50 }).unique(), // e.g., "MSG-2025-001"

    // Sender Information
    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    phone: varchar("phone", { length: 50 }),

    // Message Details
    service: messageServiceEnum("service").notNull(),
    subject: varchar("subject", { length: 500 }).notNull(),
    message: text("message").notNull(),

    // Status & Management
    status: messageStatusEnum("status").default("new").notNull(),
    priority: messagePriorityEnum("priority").default("medium"),
    isRead: boolean("is_read").default(false),
    isStarred: boolean("is_starred").default(false),
    isArchived: boolean("is_archived").default(false),

    // Assignment
    assignedTo: text("assigned_to"), // User ID who is handling this
    assignedAt: timestamp("assigned_at"),

    // Response tracking
    responseCount: text("response_count").default("0"), // Number of responses sent
    lastResponseAt: timestamp("last_response_at"),

    // Metadata
    ipAddress: varchar("ip_address", { length: 50 }),
    userAgent: text("user_agent"),
    referrer: text("referrer"),

    // Notes (internal, not visible to sender)
    internalNotes: text("internal_notes"),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    readAt: timestamp("read_at"),
    resolvedAt: timestamp("resolved_at"),
  },
  (table) => ({
    emailIdx: index("message_email_idx").on(table.email),
    statusIdx: index("message_status_idx").on(table.status),
    serviceIdx: index("message_service_idx").on(table.service),
    priorityIdx: index("message_priority_idx").on(table.priority),
    isReadIdx: index("message_is_read_idx").on(table.isRead),
    assignedToIdx: index("message_assigned_to_idx").on(table.assignedTo),
    createdAtIdx: index("message_created_at_idx").on(table.createdAt),
  })
)

// ============================================
// RELATED TABLES
// ============================================

// Message Responses/Replies
export const messageResponses = pgTable(
  "message_responses",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    messageId: text("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),

    // Response details
    content: text("content").notNull(),
    isInternal: boolean("is_internal").default(false), // Internal note vs actual reply to client

    // Sender info (admin/president/secretary who responded)
    responderId: text("responder_id"), // User ID
    responderName: varchar("responder_name", { length: 255 }),
    responderEmail: varchar("responder_email", { length: 255 }),

    // Email tracking
    emailSent: boolean("email_sent").default(false),
    emailSentAt: timestamp("email_sent_at"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    messageIdx: index("response_message_idx").on(table.messageId),
    createdAtIdx: index("response_created_at_idx").on(table.createdAt),
  })
)

// Message Attachments (if you want to allow file uploads later)
export const messageAttachments = pgTable(
  "message_attachments",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    messageId: text("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),

    fileName: varchar("file_name", { length: 255 }).notNull(),
    fileUrl: text("file_url").notNull(),
    fileType: varchar("file_type", { length: 100 }),
    fileSize: text("file_size"), // in bytes, stored as text to avoid integer limits

    uploadedBy: varchar("uploaded_by", { length: 255 }), // 'client' or user ID
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    messageIdx: index("attachment_message_idx").on(table.messageId),
  })
)

// ============================================
// RELATIONS
// ============================================

export const messagesRelations = relations(messages, ({ many }) => ({
  responses: many(messageResponses),
  attachments: many(messageAttachments),
}))

export const messageResponsesRelations = relations(
  messageResponses,
  ({ one }) => ({
    message: one(messages, {
      fields: [messageResponses.messageId],
      references: [messages.id],
    }),
  })
)

export const messageAttachmentsRelations = relations(
  messageAttachments,
  ({ one }) => ({
    message: one(messages, {
      fields: [messageAttachments.messageId],
      references: [messages.id],
    }),
  })
)

// ============================================
// SCHEMAS FOR VALIDATION
// ============================================

export const insertMessageSchema = createInsertSchema(messages).extend({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().optional(),
  service: z.enum(POSSO_MESSAGE_SERVICE_VALUES).default("other"),
  subject: z.string().min(5, "Subject must be at least 5 characters"),
  message: z.string().min(10, "Message must be at least 10 characters"),
})

export const selectMessageSchema = createSelectSchema(messages)

export const insertMessageResponseSchema = createInsertSchema(messageResponses)
export const selectMessageResponseSchema = createSelectSchema(messageResponses)

export const insertMessageAttachmentSchema =
  createInsertSchema(messageAttachments)
export const selectMessageAttachmentSchema =
  createSelectSchema(messageAttachments)

// Type exports
export type Message = typeof messages.$inferSelect
export type NewMessage = typeof messages.$inferInsert
export type MessageResponse = typeof messageResponses.$inferSelect
export type NewMessageResponse = typeof messageResponses.$inferInsert
export type MessageAttachment = typeof messageAttachments.$inferSelect
export type NewMessageAttachment = typeof messageAttachments.$inferInsert
export type MessageStatus = (typeof messageStatusEnum.enumValues)[number]
export type MessagePriority = (typeof messagePriorityEnum.enumValues)[number]
// export type ServiceType = (typeof serviceTypeEnum.enumValues)[number]
