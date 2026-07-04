// C:\Users\user\OneDrive\Desktop\trustlink-group\lib\send-email.ts
import type { ReactNode } from "react"
import { organisationEmail } from "@/constants/organisation"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

// check required env variables
if (!process.env.RESEND_API_KEY) {
  throw new Error("Missing RESEND_API_KEY environment variable")
}

if (!process.env.SENDER_EMAIL) {
  throw new Error("Missing SENDER_EMAIL environment variable")
}
if (!process.env.NEXT_PUBLIC_SUPPORT_EMAIL) {
  throw new Error("Missing NEXT_PUBLIC_SUPPORT_EMAIL environment variable")
}
if (!process.env.SENDER_NAME) {
  console.warn(
    "SENDER_NAME environment variable not set, defaulting to 'TrustLink Group Platform'"
  )
}

const senderEmail = process.env.SENDER_EMAIL
const replyToEmail = organisationEmail
const senderName = process.env.SENDER_NAME

interface EmailOptions {
  to: string | string[]
  subject: string
  cc?: string | string[]
  text?: string
  bcc?: string | string[]
  react?: ReactNode
  html?: string
}

interface SendEmailResult {
  success: boolean
  error?: any
  data?: any
}

const sendEmail = async ({
  to,
  subject,
  text,
  react,
  html,
}: EmailOptions): Promise<SendEmailResult> => {
  if (process.env.EMAIL_NOTIFICATIONS_ENABLED !== "true") {
    console.log("Email notifications are disabled")
    return { success: true }
  }

  try {
    await resend.emails.send({
      from: `${senderName} <${senderEmail}>`,
      to,
      replyTo: replyToEmail,
      subject,
      text,
      react,
      html,
    })
    return { success: true }
  } catch (error) {
    console.error(`Failed to send email to ${to}:`, error)
    return { success: false, error }
  }
}

export default sendEmail
