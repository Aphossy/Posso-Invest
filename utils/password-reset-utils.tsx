import PasswordChangeConfirmationEmail from "@/emails/password-change-confirmation-email"
import PasswordResetEmail from "@/emails/password-reset-email"
// import logger from "@/utils/logger"
import { render } from "@react-email/render"

import sendEmail from "@/lib/send-email"

export const sendPasswordResetEmail = async (
  email: string,
  userName: string,
  token: string,
  url?: string
) => {
  try {
    const resetUrl =
      url ||
      `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password?token=${token}&email=${encodeURIComponent(email)}&user=${encodeURIComponent(userName)}`
    const emailHtml = await render(
      <PasswordResetEmail userName={userName} resetUrl={resetUrl} />
    )
    const result = await sendEmail({
      to: email,
      subject: "Reset Your TrustLink Group Password",
      html: emailHtml,
    })

    // logger.info(
    //   `Password reset email sent to ${email}: ${JSON.stringify(result)}`
    // )
    return result
  } catch (error) {
    console.error(`Failed to send password reset email to ${email}: ${error}`)
    throw error
  }
}

export const sendPasswordChangeConfirmationEmail = async (
  email: string,
  userName: string
) => {
  try {
    const emailHtml = await render(
      <PasswordChangeConfirmationEmail userName={userName} />
    )

    const result = await sendEmail({
      to: email,
      subject: "Your TrustLink Group Password Has Been Changed",
      html: emailHtml,
    })

    // logger.info(
    //   `Password change confirmation email sent to ${email}: ${JSON.stringify(result)}`
    // )
    return result
  } catch (error) {
    console.error(
      `Failed to send password change confirmation email to ${email}: ${error}`
    )
    throw error
  }
}
