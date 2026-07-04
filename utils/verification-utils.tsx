// import crypto from "crypto"
import { verificationTokenOperations } from "@/db/operations/user-operations"
import AccountVerificationEmail from "@/emails/account-verification"
// import logger from "@/utils/logger"
import { render } from "@react-email/render"

import sendEmail from "@/lib/send-email"

const EXPIRES_IN_HOURS = 2
export const generateVerificationToken = async () => {
  const token = crypto.randomUUID()
  const expires = new Date(
    new Date().getTime() + EXPIRES_IN_HOURS * 60 * 60 * 1000
  )

  const verificationToken = await verificationTokenOperations.create({
    value: token,
    expiresAt: expires,
    id: crypto.randomUUID(),
    identifier: token,
  })

  return verificationToken
}

// export const sendVerificationEmail = async (
//   email: string,
//   userName: string
// ) => {
//   try {
//     const verificationToken = (await generateVerificationToken(email)) as {
//       value: string
//     }
//     const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify-account?token=${verificationToken.value}`

//     logger.info(`Sending verification email to ${email}`)
//     logger.debug(`Verification URL: ${verificationUrl}`)
//     const emailHtml = await render(
//       <AccountVerificationEmail
//         userName={userName}
//         verificationUrl={verificationUrl}
//         expiresInHours={EXPIRES_IN_HOURS}
//       />
//     )

//     const result = await resend.emails.send({
//       from: `TrustLink Group <${process.env.SENDER_EMAIL}>`,
//       to: email,
//       subject: "Verify Your TrustLink Group Account",
//       html: emailHtml,
//     })

//     logger.info(`Verification email sent to ${email}: ${result}`)
//     return result
//   } catch (error) {
//     logger.error(`Failed to send verification email to ${email}: ${error}`)
//     throw error
//   }
// }

export const sendVerificationUserEmail = async (
  email: string,
  name?: string,
  token?: string,
  url?: string
) => {
  try {
    const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify-account?token=${token}`

    // logger.info(`Sending verification email to ${email}`)
    // logger.debug(`Verification URL: ${verificationUrl}`)
    const emailHtml = await render(
      <AccountVerificationEmail
        userName={name || "User"}
        verificationUrl={url || verificationUrl}
        expiresInHours={EXPIRES_IN_HOURS}
      />
    )

    const result = await sendEmail({
      to: email,
      subject: "Verify Your TrustLink Group Account",
      html: emailHtml,
    })

    // logger.info(`Verification email sent to ${email}: ${result}`)
    return result
  } catch (error) {
    console.error(`Failed to send verification email to ${email}: ${error}`)

    throw error
  }
}

export const verifyEmailToken = async (
  token: string
): Promise<{ success: boolean; email?: string }> => {
  try {
    const verificationToken =
      await verificationTokenOperations.findByToken(token)

    if (!verificationToken) {
      return { success: false }
    }

    if (new Date(verificationToken.expiresAt) < new Date()) {
      await verificationTokenOperations.deleteByToken(token)
      return { success: false }
    }

    await verificationTokenOperations.deleteByToken(token)
    return { success: true, email: verificationToken.value }
  } catch (error) {
    console.error(`Error verifying email token: ${error}`)
    return { success: false }
  }
}
