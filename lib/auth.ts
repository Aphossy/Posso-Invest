// lib\auth.ts
import { db } from "@/db"
import OrganizationInvitationEmail from "@/emails/organization-invitation-email"
import { sendWelcomeEmail } from "@/utils/auth-notification-utils"
import {
  sendPasswordChangeConfirmationEmail,
  sendPasswordResetEmail,
} from "@/utils/password-reset-utils"
import { sendVerificationUserEmail } from "@/utils/verification-utils"
import { render } from "@react-email/components"
import { sql } from "drizzle-orm"
import { APIError, betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { createAuthMiddleware } from "better-auth/api"
import {
  admin,
  emailOTP,
  lastLoginMethod,
  oneTap,
  organization,
  twoFactor,
} from "better-auth/plugins"

import { organizationAccess, organizationRoles } from "@/lib/organization-roles"
import sendEmail from "@/lib/send-email"

const teamsEnabled = process.env.BETTER_AUTH_ENABLE_TEAMS === "true"

async function validateBetterAuthSchema() {
  if (!teamsEnabled || process.env.NODE_ENV === "test") {
    return
  }

  const checks = [
    { table: "invitation", column: "team_id" },
    { table: "session", column: "active_team_id" },
    { table: "member", column: "team_id" },
  ]

  for (const { table, column } of checks) {
    try {
      const result = (await db.execute(
        sql`SELECT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = ${table}
            AND column_name = ${column}
        ) AS exists`
      )) as { rows: Array<{ exists: boolean }> }

      if (!result.rows[0]?.exists) {
        console.warn(
          `[better-auth] Missing column ${column} on table ${table}. Enable teams or run the auth schema migration.`
        )
      }
    } catch (error) {
      console.warn(
        `[better-auth] Unable to validate column ${column} on table ${table}:`,
        error instanceof Error ? error.message : error
      )
    }
  }
}

void validateBetterAuthSchema().catch((error) => {
  console.warn(
    "[better-auth] Schema validation failed:",
    error instanceof Error ? error.message : error
  )
})

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  user: {
    deleteUser: {
      enabled: true,
      sendDeleteAccountVerification: async ({ user, url, token }) => {
        // Import the email sending function
        const { sendAccountDeletionVerificationEmail } =
          await import("@/utils/auth-notification-utils")

        // Send deletion verification email
        await sendAccountDeletionVerificationEmail(
          user.email,
          user.name || "User",
          url
        )

        console.log(
          `Delete account verification email sent to ${user.email}, token: ${token}`
        )
      },
    },
  },

  session: {
    expiresIn: 60 * 60 * 6, // 6 hours
    updateAge: 60 * 60 * 4, // 4` hours (every 8 hours the session expiration is updated)
  },
  // Advanced settings for cross-origin authentication (mobile app support)
  advanced: {
    cookiePrefix: "better-auth",
    crossOriginCookies: {
      enabled: true,
      // Allow credentials from mobile origins
      credentials: "include",
      // Additional cookie settings for mobile compatibility
      sameSite: "none",
      secure: process.env.NODE_ENV === "production",
    },
    // Disable CSRF check entirely to support mobile apps
    // Mobile apps don't send Origin headers, so we handle security via trustedOrigins
    disableCSRFCheck: true,
  },

  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      // Intercept error URL redirects for banned users
      if (ctx.path === "/error") {
        if (ctx.query && "error" in ctx.query && ctx.query.error === "banned") {
          // Redirect to custom banned page instead of error page
          throw ctx.redirect("/banned")
        }
      }
    }),
    after: createAuthMiddleware(async (ctx) => {
      // Catch banned user errors and send notification email
      if (ctx.context.returned instanceof APIError) {
        const returned = ctx.context.returned
        if (returned.body?.code === "BANNED_USER") {
          // Get user information from the request
          const body = ctx.body as any
          const email = body?.email

          if (email) {
            try {
              // Import the email action dynamically to avoid circular dependency
              const { sendBannedUserLoginAttemptEmail } =
                await import("@/lib/email-actions")

              // Get request details
              const headers = ctx.request?.headers
              const ipAddress =
                headers?.get("x-forwarded-for")?.split(",")[0].trim() ||
                headers?.get("x-real-ip") ||
                "Unknown"
              const userAgent = headers?.get("user-agent") || "Unknown"

              // Find the user to get their details
              const { user: users } = await import("@/db/schemas")
              const { eq } = await import("drizzle-orm")
              const [user] = await db
                .select()
                .from(users)
                .where(eq(users.email, email))
                .limit(1)

              if (user) {
                // Send the login attempt notification
                await sendBannedUserLoginAttemptEmail({
                  user: {
                    name: user.name,
                    email: user.email,
                    banReason: user.banReason,
                  },
                  ipAddress,
                  userAgent,
                  attemptTime: new Date().toISOString(),
                  location: {
                    city: undefined,
                    country: undefined,
                  },
                })
              }
            } catch (error) {
              console.error(
                "Failed to send banned user login attempt email:",
                error
              )
              // Don't fail the auth flow if email fails
            }
          }

          // Redirect to custom banned page
          throw ctx.redirect("/banned")
        }
      }
    }),
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    autoSignIn: false,
    sendResetPassword: async ({ user, url, token }) => {
      await sendPasswordResetEmail(user.email, user.name || "User", token, url)

      console.log(
        `Password reset email sent to ${user.email}, token: ${token}, url: ${url}, user: ${user.name || "User"}`
      ) // Log the token for debugging
    },
    onPasswordReset: async ({ user }) => {
      // Send confirmation email after successful reset
      await sendPasswordChangeConfirmationEmail(user.email, user.name || "User")
      console.log(`Password for user ${user.email} has been reset.`)
    },
  },

  emailVerification: {
    autoSignInAfterVerification: true,
    sendOnSignUp: true,

    async afterEmailVerification(user, request?: Request) {
      const redirectTarget = `/redirect?from=${encodeURIComponent(
        "/member/dashboard?email-verified=true"
      )}`

      // Redirect user to dashboard with email verified flag.
      // Some runtimes expose request.redirect as a callable function, others do not,
      // so check before calling and fall back to throwing a 302 Response so we don't return a Response value.
      try {
        if (request && typeof (request as any).redirect === "function") {
          ;(request as any).redirect(redirectTarget)
        } else {
          // Fallback: throw a Response redirect (works in edge/node runtimes) instead of returning it
          throw new Response(null, {
            status: 302,
            headers: { Location: redirectTarget },
          })
        }
      } catch (err) {
        console.error("Redirect failed in afterEmailVerification:", err)
      }

      // Send welcome email after verification
      try {
        await sendWelcomeEmail(user.email, user.name || "User")
      } catch (error) {
        console.error("Error sending welcome email:", error)
      }
      // Your custom logic here, e.g., grant access to premium features
      // console.log(`${user.email} has been successfully verified!`)
      // redirect him/her to user/dashboard?email-verified=true
    },
    sendVerificationEmail: async ({ user, url, token }) => {
      console.log("Triggering sendVerificationEmail callback with:", {
        user,
        url,
        token,
      })
      try {
        await sendVerificationUserEmail(
          user.email,
          user.name || "User",
          token,
          url
        )
      } catch (error) {
        console.error("Error sending verification email:", error)
      }
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },

  account: {
    accountLinking: {
      enabled: true,
    },
  },

  plugins: [
    oneTap(),
    organization({
      ac: organizationAccess,
      roles: organizationRoles,
      creatorRole: "admin",
      allowUserToCreateOrganization: (user) => user.role === "admin",
      membershipLimit: 50,
      invitationExpiresIn: 60 * 60 * 24 * 7,

      teams: teamsEnabled
        ? {
            enabled: true,
            maximumTeams: 10,
            maximumMembersPerTeam: 50,
            allowRemovingAllTeams: false,
          }
        : {
            enabled: false,
          },

      schema: {
        organization: {
          additionalFields: {
            description: { type: "string", required: false },
            contributionCycleAmount: { type: "number", required: false },
            meetingFrequency: { type: "string", required: false },
            foundedDate: { type: "string", required: false },
          },
        },
        member: {
          additionalFields: {
            memberNumber: { type: "string", required: false },
            title: { type: "string", required: false },
            department: { type: "string", required: false },
          },
        },
      },

      hooks: {
        organization: {
          afterCreate: async ({
            organization,
            member,
          }: {
            organization: { id: string; name: string }
            member: { userId: string }
          }) => {
            try {
              const { auditLogOperations } =
                await import("@/db/operations/audit-log-operations")
              await auditLogOperations.create({
                action: "organization.created",
                userId: member.userId,
                resourceType: "organization",
                resourceId: organization.id,
                details: `Organization "${organization.name}" created`,
                severity: "info",
              })
            } catch {
              // Non-fatal: audit log failure must not block org creation
            }
          },
          beforeDelete: async ({
            organization,
          }: {
            organization: { id: string; name: string }
          }) => {
            try {
              const { auditLogOperations } =
                await import("@/db/operations/audit-log-operations")
              await auditLogOperations.create({
                action: "organization.deleted",
                resourceType: "organization",
                resourceId: organization.id,
                details: `Organization "${organization.name}" deleted`,
                severity: "high",
              })
            } catch {
              // Non-fatal: audit log failure must not block deletion
            }
          },
        },
        member: {
          afterCreate: async ({
            member,
            organization,
          }: {
            member: { userId: string; role: string }
            organization: { id: string; name: string }
          }) => {
            try {
              const { auditLogOperations } =
                await import("@/db/operations/audit-log-operations")
              await auditLogOperations.create({
                action: "member.joined",
                userId: member.userId,
                resourceType: "organization",
                resourceId: organization.id,
                details: `Member joined "${organization.name}" as ${member.role}`,
                severity: "info",
              })
            } catch {
              // Non-fatal
            }
          },
        },
        invitation: {
          afterCreate: async ({
            invitation,
            organization,
          }: {
            invitation: { email: string }
            organization: { id: string; name: string }
          }) => {
            try {
              const { auditLogOperations } =
                await import("@/db/operations/audit-log-operations")
              await auditLogOperations.create({
                action: "invitation.sent",
                resourceType: "organization",
                resourceId: organization.id,
                details: `Invitation sent to ${invitation.email} for "${organization.name}"`,
                severity: "info",
              })
            } catch {
              // Non-fatal
            }
          },
        },
      },

      sendInvitationEmail: async (data) => {
        const baseUrl =
          process.env.NEXT_PUBLIC_SITE_URL ||
          process.env.NEXT_PUBLIC_APP_URL ||
          "http://localhost:3000"
        const invitationUrl = new URL("/accept-invitation", baseUrl)
        invitationUrl.searchParams.set("invitationId", data.id)
        const inviterName = data.inviter?.user?.name || "TrustLink Group"
        const roleLabel = Array.isArray(data.role)
          ? data.role.join(", ")
          : data.role
        const expiresAt = data.invitation.expiresAt
          ? new Date(data.invitation.expiresAt).toLocaleString("en-RW", {
              dateStyle: "medium",
              timeStyle: "short",
              timeZone: "Africa/Kigali",
            })
          : "in 7 days"
        const supportEmail =
          process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "trustlinkgrouprw@gmail.com"
        const loginUrl = new URL("/login", baseUrl)
        loginUrl.searchParams.set(
          "from",
          `/accept-invitation?invitationId=${encodeURIComponent(data.id)}`
        )
        const html = await render(
          OrganizationInvitationEmail({
            inviterName,
            organizationName: data.organization.name,
            roleLabel,
            expiresAt,
            invitationUrl: invitationUrl.toString(),
            loginUrl: loginUrl.toString(),
            supportEmail,
            recipientEmail: data.email,
          })
        )
        await sendEmail({
          to: data.email,
          subject: `Invitation to join ${data.organization.name}`,
          html,
        })
      },
    }),
    twoFactor({
      otpOptions: {
        async sendOTP({ user, otp }) {
          // Import the email sending function
          const { send2FAOTPEmail } =
            await import("@/utils/auth-notification-utils")

          // Send OTP email with device/location info
          await send2FAOTPEmail({
            user: {
              name: user.name,
              email: user.email,
            },
            otp,
            expiresInMinutes: 10,
          })
        },
      },
    }),
    lastLoginMethod({
      storeInDatabase: true,
    }),
    admin({
      bannedUserMessage:
        "Your account has been suspended. You will be redirected to a page with more information and appeal options.",
    }),
    emailOTP({
      async sendVerificationOTP({ type }) {
        if (type === "sign-in") {
          // Send the OTP for sign in
          // await sendSignInOTP(email, otp);
        } else if (type === "email-verification") {
          // Send the OTP for email verification
          // await sendEmailVerificationOTP(email, otp);
        } else {
          // Send the OTP for password reset
          // await sendPasswordResetOTP(email, otp);
        }
      },
    }),
  ],
})
