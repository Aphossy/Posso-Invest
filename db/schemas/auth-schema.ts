// db/schemas/auth-schema.ts
import { relations } from "drizzle-orm"
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core"
import { createInsertSchema, createSelectSchema } from "drizzle-zod"
import type { z } from "zod"

export type IkiminaProfileMetadata = {
  bankName?: string
  bankAccountNumber?: string
  bankAccountHolder?: string
  preferredPayoutMethod?: "bank" | "mobile_money" | "cash"
  mobileMoneyProvider?: "mtn" | "airtel" | "other"
  mobileMoneyNumber?: string
  emergencyContactName?: string
  emergencyContactPhone?: string
}

export const user = pgTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").default(false).notNull(),
    image: text("image"),
    twoFactorEnabled: boolean("two_factor_enabled").default(false),

    // Additional user information
    phone: varchar("phone", { length: 20 }),
    dateOfBirth: date("date_of_birth"),
    bio: text("bio"),

    // Address information
    address: jsonb("address").$type<{
      district?: string
      sector?: string
      cell?: string
      village?: string
      city?: string
    }>(),

    // User role and type for TrustLink Group platform
    role: text("role").default("member"),

    // User preferences
    preferences: jsonb("preferences")
      .$type<{
        notifications?: {
          email?: boolean
          sms?: boolean
          security?: boolean
        }
        language?: "en" | "rw" | "fr"
        theme?: "light" | "dark" | "system"
      }>()
      .default({}),

    // Metadata
    metadata: jsonb("metadata")
      .$type<{
        signupSource?: string
        referralCode?: string
        ipAddress?: string
        userAgent?: string
        ikiminaProfile?: IkiminaProfileMetadata
      }>()
      .default({}),

    // Security tracking
    lastLoginAt: timestamp("last_login_at"),
    passwordLastChanged: timestamp("password_last_changed"),
    emailVerifiedAt: timestamp("email_verified_at"),
    twoFactorEnabledAt: timestamp("two_factor_enabled_at"),
    failedLoginAttempts: text("failed_login_attempts").default("0"),
    lockoutUntil: timestamp("lockout_until"),

    lastLoginMethod: text("last_login_method"),
    banned: boolean("banned").default(false),
    banReason: text("ban_reason"),
    banExpires: timestamp("ban_expires"),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => ({
    emailIdx: uniqueIndex("user_email_idx").on(table.email),
    phoneIdx: index("user_phone_idx").on(table.phone),
    roleIdx: index("user_role_idx").on(table.role),
    createdAtIdx: index("user_created_at_idx").on(table.createdAt),
  })
)

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    role: varchar("role", { length: 20 }).notNull().default("member"),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    location: jsonb("location").$type<{
      city?: string
      country?: string
      region?: string
      timezone?: string
    }>(),
    deviceInfo: jsonb("device_info").$type<{
      browser?: string
      os?: string
      device?: string
      isMobile?: boolean
    }>(),
    isActive: boolean("is_active").default(true),
    lastAccessedAt: timestamp("last_accessed_at").defaultNow(),
    lastAction: text("last_action"),
    lastActionAt: timestamp("last_action_at"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    activeOrganizationId: text("active_organization_id"),
    activeTeamId: text("active_team_id"),
    impersonatedBy: text("impersonated_by"),
  },
  (table) => ({
    tokenIdx: uniqueIndex("session_token_idx").on(table.token),
    userIdIdx: index("session_user_id_idx").on(table.userId),
  })
)

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => ({
    userIdIdx: index("account_user_id_idx").on(table.userId),
    providerIdx: index("account_provider_idx").on(table.providerId),
  })
)

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => ({
    identifierIdx: index("verification_identifier_idx").on(table.identifier),
    expiresAtIdx: index("verification_expires_at_idx").on(table.expiresAt),
  })
)

export const organization = pgTable(
  "organization",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    logo: text("logo"),
    createdAt: timestamp("created_at").notNull(),
    metadata: text("metadata"),
  },
  (table) => [uniqueIndex("organization_slug_uidx").on(table.slug)]
)

export const member = pgTable(
  "member",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role").default("member").notNull(),
    teamId: text("team_id"),
    createdAt: timestamp("created_at").notNull(),
  },
  (table) => [
    index("member_organizationId_idx").on(table.organizationId),
    index("member_userId_idx").on(table.userId),
  ]
)

export const invitation = pgTable(
  "invitation",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: text("role"),
    status: text("status").default("pending").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    inviterId: text("inviter_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    teamId: text("team_id"),
  },
  (table) => [
    index("invitation_organizationId_idx").on(table.organizationId),
    index("invitation_email_idx").on(table.email),
  ]
)

export const team = pgTable(
  "team",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at"),
  },
  (table) => [index("team_organizationId_idx").on(table.organizationId)]
)

export const teamMember = pgTable(
  "teamMember",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id")
      .notNull()
      .references(() => team.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull(),
  },
  (table) => [
    index("teamMember_teamId_idx").on(table.teamId),
    index("teamMember_userId_idx").on(table.userId),
    index("teamMember_organizationId_idx").on(table.organizationId),
  ]
)

export const twoFactor = pgTable(
  "two_factor",
  {
    id: text("id").primaryKey(),
    secret: text("secret").notNull(),
    backupCodes: text("backup_codes").notNull(),
    verified: boolean("verified").default(false).notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => ({
    secretIdx: index("two_factor_secret_idx").on(table.secret),
    userIdIdx: index("two_factor_user_id_idx").on(table.userId),
  })
)

// Relations

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  members: many(member),
  invitations: many(invitation),
  twoFactors: many(twoFactor),
}))

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}))

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}))

export const organizationRelations = relations(organization, ({ many }) => ({
  members: many(member),
  invitations: many(invitation),
  teams: many(team),
}))

export const memberRelations = relations(member, ({ one }) => ({
  organization: one(organization, {
    fields: [member.organizationId],
    references: [organization.id],
  }),
  user: one(user, {
    fields: [member.userId],
    references: [user.id],
  }),
}))

export const invitationRelations = relations(invitation, ({ one }) => ({
  organization: one(organization, {
    fields: [invitation.organizationId],
    references: [organization.id],
  }),
  user: one(user, {
    fields: [invitation.inviterId],
    references: [user.id],
  }),
}))

export const teamRelations = relations(team, ({ one, many }) => ({
  organization: one(organization, {
    fields: [team.organizationId],
    references: [organization.id],
  }),
  members: many(teamMember),
}))

export const teamMemberRelations = relations(teamMember, ({ one }) => ({
  team: one(team, {
    fields: [teamMember.teamId],
    references: [team.id],
  }),
  user: one(user, {
    fields: [teamMember.userId],
    references: [user.id],
  }),
  organization: one(organization, {
    fields: [teamMember.organizationId],
    references: [organization.id],
  }),
}))

export const twoFactorRelations = relations(twoFactor, ({ one }) => ({
  user: one(user, {
    fields: [twoFactor.userId],
    references: [user.id],
  }),
}))

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(user)
export const selectUserSchema = createSelectSchema(user)
export const insertSessionSchema = createInsertSchema(session)
export const selectSessionSchema = createSelectSchema(session)
export const insertAccountSchema = createInsertSchema(account)
export const selectAccountSchema = createSelectSchema(account)
export const insertVerificationSchema = createInsertSchema(verification)
export const selectVerificationSchema = createSelectSchema(verification)
export const insertOrganizationSchema = createInsertSchema(organization)
export const selectOrganizationSchema = createSelectSchema(organization)
export const insertMemberSchema = createInsertSchema(member)
export const selectMemberSchema = createSelectSchema(member)
export const insertInvitationSchema = createInsertSchema(invitation)
export const selectInvitationSchema = createSelectSchema(invitation)
export const insertTwoFactorSchema = createInsertSchema(twoFactor)
export const selectTwoFactorSchema = createSelectSchema(twoFactor)
export const insertTeamSchema = createInsertSchema(team)
export const selectTeamSchema = createSelectSchema(team)
export const insertTeamMemberSchema = createInsertSchema(teamMember)
export const selectTeamMemberSchema = createSelectSchema(teamMember)

// Type exports
export type User = z.infer<typeof selectUserSchema>
export type NewUser = z.infer<typeof insertUserSchema>
export type Session = z.infer<typeof selectSessionSchema>
export type NewSession = z.infer<typeof insertSessionSchema>
export type Account = z.infer<typeof selectAccountSchema>
export type NewAccount = z.infer<typeof insertAccountSchema>
export type Verification = z.infer<typeof selectVerificationSchema>
export type NewVerification = z.infer<typeof insertVerificationSchema>
export type Organization = z.infer<typeof selectOrganizationSchema>
export type NewOrganization = z.infer<typeof insertOrganizationSchema>
export type Member = z.infer<typeof selectMemberSchema>
export type NewMember = z.infer<typeof insertMemberSchema>
export type Invitation = z.infer<typeof selectInvitationSchema>
export type NewInvitation = z.infer<typeof insertInvitationSchema>
export type TwoFactor = z.infer<typeof selectTwoFactorSchema>
export type NewTwoFactor = z.infer<typeof insertTwoFactorSchema>
export type Team = z.infer<typeof selectTeamSchema>
export type NewTeam = z.infer<typeof insertTeamSchema>
export type TeamMember = z.infer<typeof selectTeamMemberSchema>
export type NewTeamMember = z.infer<typeof insertTeamMemberSchema>

// Enums
export type UserRole =
  | "admin"
  | "secretary"
  | "treasurer"
  | "member"
  | "president"
export type Language = "en" | "rw" | "fr"
export type Theme = "light" | "dark" | "system"
