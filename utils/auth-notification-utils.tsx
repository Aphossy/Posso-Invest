// utils\notificationUtils.tsx
import type { User } from "@/db/schemas"
import AccountDeletionVerificationEmail from "@/emails/account-deletion-verification"
import AccountInactiveEmail from "@/emails/account-inactive-email"
import AccountSuspendedEmail from "@/emails/account-suspended-email"
import AccountBannedNotification from "@/emails/account-suspended-notification"
import AccountUnbannedNotification from "@/emails/account-unbanned-notification"
import LoginNotificationEmail from "@/emails/login-notification"
import UnverifiedAccountEmail from "@/emails/unverified-account-email"
import VerificationEmail from "@/emails/verification-code"
import WelcomeEmail from "@/emails/welcome-email"
// import logger from "@/utils/logger"
import { render } from "@react-email/components"
import { UAParser } from "ua-parser-js"

import sendEmail from "@/lib/send-email"

// Parse the allowlisted emails from environment variable
const getAllowlistedEmails = (): string[] => {
  const allowlist = process.env.ALLOWLISTED_DEVELOPER_EMAILS || ""
  return allowlist.split(",").map((email) => email.trim().toLowerCase())
}

interface LocationInfo {
  ip: string
  city?: string
  country?: string
  userAgent: string
  device?: string
}

export const sendLoginNotificationEmail = async (
  userDetails: {
    name: string
    email: string
  },
  locationInfo: LocationInfo
) => {
  try {
    const allowlistedEmails = getAllowlistedEmails()

    // Skip notification if user email is in the allowlist
    if (allowlistedEmails.includes(userDetails.email.toLowerCase())) {
      // logger.info(
      //   `Login notification skipped for allowlisted email: ${userDetails.email}`
      // )
      return { id: "skipped", message: "Email in allowlist" }
    }

    const parser = new UAParser(locationInfo.userAgent)
    const browser = parser.getBrowser()
    const os = parser.getOS()
    const device = parser.getDevice()

    const loginTime = new Date().toLocaleString("en-US", {
      timeZone: "Africa/Kigali",
      dateStyle: "full",
      timeStyle: "long",
    })

    const emailHtml = await render(
      <LoginNotificationEmail
        userName={userDetails.name}
        userEmail={userDetails.email}
        loginTime={loginTime}
        location={{
          ip: locationInfo.ip,
          city: locationInfo.city || "Unknown",
          country: locationInfo.country || "Unknown",
          browser: `${browser.name || "Unknown"} ${browser.version || ""}`,
          os: `${os.name || "Unknown"} ${os.version || ""}`,
          device: `${device.vendor || "Unknown"} ${device.model || ""} ${device.type || ""}`,
        }}
      />
    )

    const result = await sendEmail({
      to: userDetails.email,
      subject: `Login Alert - TrustLink Group`,
      html: emailHtml,
    })

    // logger.info(
    //   `Login notification email sent to admin: ${JSON.stringify(result)}`
    // )
    return result
  } catch (error) {
    console.error(`Failed to send login notification email: ${error}`)
    return null
  }
}

// type NotificationType = "error" | "warning" | "success" | "info"

// interface CreateNotificationOptions {
//   title: string
//   message: string
//   type: NotificationType
//   link?: string
// }

interface LocationInfo {
  ip: string
  city?: string
  country?: string
  userAgent: string
}

export const sendAccountSuspendedEmail = async (
  user: User,
  locationInfo: LocationInfo
) => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || "support@bidrw.com"

    const parser = new UAParser(locationInfo.userAgent)
    const browser = parser.getBrowser()
    const os = parser.getOS()

    const attemptTime = new Date().toLocaleString("en-US", {
      timeZone: "Africa/Kigali",
      dateStyle: "full",
      timeStyle: "long",
    })

    const emailHtml = await render(
      <AccountSuspendedEmail
        userName={`${user.name}`}
        userEmail={user.email}
        banReason={user.banReason || "Policy violation"}
        attemptTime={attemptTime}
        location={{
          ip: locationInfo.ip,
          city: locationInfo.city || "Unknown",
          country: locationInfo.country || "Unknown",
          browser: `${browser.name || "Unknown"} ${browser.version || ""}`,
          os: `${os.name || "Unknown"} ${os.version || ""}`,
        }}
        supportEmail={adminEmail}
      />
    )

    const result = await sendEmail({
      to: [user.email],
      subject: `Account Suspended - Login Attempt Detected`,
      html: emailHtml,
    })

    // logger.info(`Account suspended email sent to ${user.email}: ${result}`)
    return result
  } catch (error) {
    console.error(`Failed to send account suspended email: ${error}`)
    return null
  }
}

export const sendAccountInactiveEmail = async (
  user: User,
  locationInfo: LocationInfo
) => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || "support@bidrw.com"

    const parser = new UAParser(locationInfo.userAgent)
    const browser = parser.getBrowser()
    const os = parser.getOS()

    const attemptTime = new Date().toLocaleString("en-US", {
      timeZone: "Africa/Kigali",
      dateStyle: "full",
      timeStyle: "long",
    })

    const emailHtml = await render(
      <AccountInactiveEmail
        userName={`${user.name}`}
        userEmail={user.email}
        attemptTime={attemptTime}
        location={{
          ip: locationInfo.ip,
          city: locationInfo.city || "Unknown",
          country: locationInfo.country || "Unknown",
          browser: `${browser.name || "Unknown"} ${browser.version || ""}`,
          os: `${os.name || "Unknown"} ${os.version || ""}`,
        }}
        supportEmail={adminEmail}
      />
    )

    const result = await sendEmail({
      to: [user.email],
      subject: `Account Inactive - Login Attempt Detected`,
      html: emailHtml,
    })

    // logger.info(`Account inactive email sent to ${user.email}: ${result}`)
    return result
  } catch (error) {
    console.error(`Failed to send account inactive email: ${error}`)
    return null
  }
}

export const sendUnverifiedAccountEmail = async (
  user: User,
  locationInfo: LocationInfo
) => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || "support@bidrw.com"

    const parser = new UAParser(locationInfo.userAgent)
    const browser = parser.getBrowser()
    const os = parser.getOS()

    const attemptTime = new Date().toLocaleString("en-US", {
      timeZone: "Africa/Kigali",
      dateStyle: "full",
      timeStyle: "long",
    })

    const verificationUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/request-verification?email=${encodeURIComponent(user.email)}`

    const emailHtml = await render(
      <UnverifiedAccountEmail
        userName={`${user.name}`}
        userEmail={user.email}
        attemptTime={attemptTime}
        location={{
          ip: locationInfo.ip,
          city: locationInfo.city || "Unknown",
          country: locationInfo.country || "Unknown",
          browser: `${browser.name || "Unknown"} ${browser.version || ""}`,
          os: `${os.name || "Unknown"} ${os.version || ""}`,
        }}
        verificationUrl={verificationUrl}
        supportEmail={adminEmail}
      />
    )

    const result = await sendEmail({
      to: [user.email],
      subject: `Email Verification Required - Login Attempt Detected`,
      html: emailHtml,
    })

    // logger.info(`Unverified account email sent to ${user.email} : ${result}`)
    return result
  } catch (error) {
    console.error(`Failed to send unverified account email: ${error}`)
    return null
  }
}

export const sendWelcomeEmail = async (email: string, userName: string) => {
  try {
    const emailHtml = await render(
      <WelcomeEmail userEmail={email} userName={userName} />
    )

    const result = await sendEmail({
      to: email,
      subject: "Welcome to TrustLink Group - Your Account is Ready!",
      html: emailHtml,
    })

    // logger.info(`Welcome email sent to ${email}:`, result)
    return result
  } catch (error) {
    console.error(`Failed to send welcome email to ${email}: ${error}`)
    throw error
  }
}

// ============================== 2FA OTP ======================

interface Send2FAOTPEmailParams {
  user: {
    name: string
    email: string
  }
  otp: string
  expiresInMinutes?: number
  request?: Request
}

export const send2FAOTPEmail = async ({
  user,
  otp,
  expiresInMinutes = 10,
  request,
}: Send2FAOTPEmailParams) => {
  try {
    // Get request details for device/location info
    const headers = request?.headers
    const userAgent = headers?.get("user-agent") || "Unknown"
    const ipAddress =
      headers?.get("x-forwarded-for")?.split(",")[0].trim() ||
      headers?.get("x-real-ip") ||
      "Unknown"

    // Parse user agent for device info
    const parser = new UAParser(userAgent)
    const browser = parser.getBrowser()
    const os = parser.getOS()
    const device = parser.getDevice()

    const emailHtml = await render(
      <VerificationEmail
        code={otp}
        expiresInMinutes={expiresInMinutes}
        userName={user.name}
        location={{
          ip: ipAddress,
          city: undefined, // You can integrate IP geolocation API here if needed
          country: undefined,
          browser: `${browser.name || "Unknown"} ${browser.version || ""}`,
          os: `${os.name || "Unknown"} ${os.version || ""}`,
          device:
            `${device.vendor || "Unknown"} ${device.model || ""} ${device.type || ""}`.trim() ||
            "Unknown",
        }}
      />
    )

    const result = await sendEmail({
      to: user.email,
      subject: `Your TrustLink Group verification code is ${otp}`,
      html: emailHtml,
    })

    console.log(`2FA OTP email sent to ${user.email}`)
    return result
  } catch (error) {
    console.error(`Failed to send 2FA OTP email to ${user.email}: ${error}`)
    return { success: false, error }
  }
}

/**
 * Send account deletion verification email
 * @param email User's email address
 * @param userName User's name
 * @param deletionUrl URL to confirm account deletion
 */
export const sendAccountDeletionVerificationEmail = async (
  email: string,
  userName: string,
  deletionUrl: string
) => {
  try {
    const emailHtml = await render(
      <AccountDeletionVerificationEmail
        userName={userName}
        deletionUrl={deletionUrl}
      />
    )

    const result = await sendEmail({
      to: email,
      subject: "⚠️ Confirm Your Account Deletion Request",
      html: emailHtml,
    })

    console.log(`Account deletion verification email sent to ${email}`)
    return result
  } catch (error) {
    console.error(
      `Failed to send account deletion verification email to ${email}: ${error}`
    )
    return { success: false, error }
  }
}

export const sendAccountBannedEmail = async (
  userName: string,
  userEmail: string,
  banType: "temporary" | "permanent",
  banExpiresInDays?: string,
  banReason?: string
) => {
  try {
    const supportEmail =
      process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "trustlinkgrouprw@gmail.com"
    const startDate = new Date()

    // Calculate end date if temporary ban with duration
    let endDate: string | undefined
    if (banType === "temporary" && banExpiresInDays) {
      const daysToAdd = Number(banExpiresInDays)
      if (!isNaN(daysToAdd) && daysToAdd > 0) {
        const calculatedEndDate = new Date(startDate)
        calculatedEndDate.setDate(calculatedEndDate.getDate() + daysToAdd)
        endDate = calculatedEndDate.toISOString()
      }
    }

    // Prepare the email subject
    const subject =
      banType === "temporary"
        ? `Account Temporarily Suspended - Action Required`
        : `Account Permanently Suspended - Important Notice`

    const result = await sendEmail({
      to: userEmail,
      subject: subject,
      react: (
        <AccountBannedNotification
          userName={userName}
          bannedType={banType}
          reason={banReason || "Terms of Service violation"}
          severity="high"
          startDate={startDate.toISOString()}
          endDate={endDate}
          banExpiresInDays={banExpiresInDays}
          banReason={banReason}
          restrictions={{
            accountAccess: true,
            dashboardAccess: true,
            projectManagement: true,
            messaging: true,
          }}
          appealProcess={{
            canAppeal: true,
            appealInstructions: `Please contact our support team at ${supportEmail} with your account details and any relevant information that may help us review your case.`,
          }}
        />
      ),
    })

    if (result.success) {
      console.log(`Account banned notification email sent to ${userEmail}`)
    }
    return result
  } catch (error) {
    console.error(`Failed to send account banned notification email: ${error}`)
    return { success: false, error }
  }
}

export const sendAccountUnbannedEmail = async (
  userName: string,
  userEmail: string,
  originalBanReason?: string,
  wasPermanent?: boolean
) => {
  try {
    const unbannedDate = new Date()

    const subject =
      "Great News! Your TrustLink Group Account Has Been Reinstated"

    const result = await sendEmail({
      to: userEmail,
      subject: subject,
      react: (
        <AccountUnbannedNotification
          userName={userName}
          unbannedDate={unbannedDate.toISOString()}
          originalBanReason={originalBanReason}
          wasPermanent={wasPermanent}
        />
      ),
    })

    if (result.success) {
      console.log(`Account unbanned notification email sent to ${userEmail}`)
    }
    return result
  } catch (error) {
    console.error(
      `Failed to send account unbanned notification email: ${error}`
    )
    return { success: false, error }
  }
}
