import {
  organisationEmail,
  organisationName,
  organisationSlogan,
  organisationWebsite,
} from "@/constants/organisation"
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components"

interface AccountUnbannedNotificationProps {
  userName: string
  unbannedDate: string
  originalBanReason?: string
  wasPermanent?: boolean
}

const formatDate = (value: string) => {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleString("en-RW", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Kigali",
  })
}

export const AccountUnbannedNotification = ({
  userName,
  unbannedDate,
  originalBanReason,
  wasPermanent = false,
}: AccountUnbannedNotificationProps) => {
  return (
    <Html lang="en">
      <Head />
      <Preview>
        Your {organisationName} account has been reinstated. You can now sign in
        again.
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={successHeader}>
            <Text style={successKicker}>Account Restored</Text>
            <Heading style={heading}>Welcome Back</Heading>
            <Text style={subheading}>Your access has been reinstated.</Text>
          </Section>

          <Section style={contentSection}>
            <Text style={paragraph}>Muraho {userName},</Text>
            <Text style={paragraph}>
              Your account suspension has been lifted. You now have access to
              the TrustLink Group Ikimina platform again.
            </Text>

            <Section style={card}>
              <Text style={label}>Reinstated on</Text>
              <Text style={value}>{formatDate(unbannedDate)}</Text>
              <Text style={label}>Previous status</Text>
              <Text style={value}>
                {wasPermanent
                  ? "Previously permanently suspended"
                  : "Temporary suspension completed"}
              </Text>
              {originalBanReason ? (
                <>
                  <Text style={label}>Previous reason</Text>
                  <Text style={value}>{originalBanReason}</Text>
                </>
              ) : null}
            </Section>

            <Section style={card}>
              <Text style={label}>What is restored</Text>
              <Text style={listItem}>• Sign-in and session access</Text>
              <Text style={listItem}>
                • Dashboard and member data visibility
              </Text>
              <Text style={listItem}>
                • Contributions, loans, and payment workflows
              </Text>
              <Text style={listItem}>• Internal communication tools</Text>
            </Section>

            <Section style={tipCard}>
              <Text style={tipHeading}>Stay in good standing</Text>
              <Text style={listItem}>
                • Follow platform rules and committee decisions
              </Text>
              <Text style={listItem}>
                • Keep your profile and contact details accurate
              </Text>
              <Text style={listItem}>
                • Contact support early when you need clarification
              </Text>
            </Section>

            <Section style={buttonRow}>
              <Button
                style={primaryButton}
                href={`${organisationWebsite}/login`}>
                Sign In
              </Button>
              <Button
                style={secondaryButton}
                href={`${organisationWebsite}/member/dashboard`}>
                Open Dashboard
              </Button>
            </Section>
          </Section>

          <Section style={footer}>
            <Hr style={divider} />
            <Text style={footerText}>Need help returning to your account?</Text>
            <Text style={footerText}>
              <Link
                href={`mailto:${organisationEmail}?subject=Account Unbanned Inquiry - ${userName}`}
                style={link}>
                {organisationEmail}
              </Link>{" "}
            </Text>
            <Text style={footerText}>
              <Link href={organisationWebsite} style={link}>
                {organisationWebsite}
              </Link>
            </Text>
            <Text style={copyrightText}>
              © {new Date().getFullYear()} {organisationName}.{" "}
              {organisationSlogan}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

AccountUnbannedNotification.PreviewProps = {
  userName: "Mwizerwa Clem..",
  unbannedDate: "2026-03-04T09:45:00.000Z",
  originalBanReason: "Policy violation resolved",
  wasPermanent: false,
} satisfies AccountUnbannedNotificationProps

const main = {
  backgroundColor: "#f4f7fb",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif',
  padding: "24px 12px",
}

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  maxWidth: "620px",
  borderRadius: "10px",
  border: "1px solid #e5e7eb",
  overflow: "hidden",
}

const successHeader = {
  backgroundColor: "#065f46",
  textAlign: "center" as const,
  padding: "24px 22px",
}

const successKicker = {
  color: "#a7f3d0",
  fontSize: "12px",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  margin: "0 0 8px",
}

const heading = {
  color: "#ffffff",
  fontSize: "26px",
  fontWeight: "700",
  margin: "0 0 8px",
}

const subheading = {
  color: "#d1fae5",
  fontSize: "14px",
  margin: "0",
}

const contentSection = {
  padding: "24px",
}

const paragraph = {
  color: "#374151",
  fontSize: "14px",
  lineHeight: "22px",
  margin: "0 0 14px",
}

const card = {
  border: "1px solid #e5e7eb",
  borderRadius: "8px",
  backgroundColor: "#f9fafb",
  padding: "14px 12px",
  margin: "0 0 14px",
}

const tipCard = {
  ...card,
  backgroundColor: "#ecfeff",
  border: "1px solid #a5f3fc",
}

const tipHeading = {
  color: "#0f766e",
  fontSize: "13px",
  fontWeight: "700",
  margin: "0 0 8px",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
}

const label = {
  color: "#6b7280",
  fontSize: "12px",
  margin: "0 0 4px",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
}

const value = {
  color: "#111827",
  fontSize: "14px",
  margin: "0 0 10px",
  lineHeight: "21px",
}

const listItem = {
  color: "#374151",
  fontSize: "13px",
  margin: "0 0 8px",
  lineHeight: "20px",
}

const buttonRow = {
  textAlign: "center" as const,
  margin: "18px 0 4px",
}

const primaryButton = {
  backgroundColor: "#065f46",
  color: "#ffffff",
  textDecoration: "none",
  borderRadius: "6px",
  padding: "12px 20px",
  fontSize: "14px",
  fontWeight: "600",
  boxSizing: "border-box" as const,
  margin: "0 4px 10px",
}

const secondaryButton = {
  backgroundColor: "#004225",
  color: "#ffffff",
  textDecoration: "none",
  borderRadius: "6px",
  padding: "12px 20px",
  fontSize: "14px",
  fontWeight: "600",
  boxSizing: "border-box" as const,
}

const footer = {
  textAlign: "center" as const,
  padding: "0 24px 22px",
}

const divider = {
  borderTop: "1px solid #e5e7eb",
  margin: "0 0 14px",
}

const footerText = {
  color: "#6b7280",
  fontSize: "12px",
  lineHeight: "18px",
  margin: "0 0 6px",
}

const copyrightText = {
  color: "#9ca3af",
  fontSize: "12px",
  margin: "8px 0 0",
}

const link = {
  color: "#004225",
  textDecoration: "underline",
}

export default AccountUnbannedNotification
