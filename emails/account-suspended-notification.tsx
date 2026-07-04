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

interface AccountBannedNotificationProps {
  userName: string
  bannedType: "temporary" | "permanent"
  reason: string
  severity?: "low" | "medium" | "high" | "critical"
  startDate: string
  endDate?: string
  restrictions?: {
    dashboardAccess?: boolean
    projectManagement?: boolean
    messaging?: boolean
    accountAccess?: boolean
  }
  appealProcess?: {
    canAppeal: boolean
    appealDeadline?: string
    appealInstructions?: string
  }
  violationDetails?: string
  banExpiresInDays?: string
  banReason?: string
}

const formatDate = (value?: string) => {
  if (!value) return "N/A"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleString("en-RW", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Kigali",
  })
}

const severityColor: Record<string, string> = {
  low: "#16a34a",
  medium: "#ca8a04",
  high: "#dc2626",
  critical: "#991b1b",
}

export const AccountBannedNotification = ({
  userName,
  bannedType,
  reason,
  severity = "high",
  startDate,
  endDate,
  restrictions,
  appealProcess,
  violationDetails,
  banExpiresInDays,
  banReason,
}: AccountBannedNotificationProps) => {
  const previewText = `Account ${bannedType === "temporary" ? "temporarily" : "permanently"} suspended - review details and appeal options`

  return (
    <Html lang="en">
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={alertHeader}>
            <Text style={alertKicker}>Account Status Update</Text>
            <Heading style={heading}>Account Suspended</Heading>
            <Text style={subheading}>
              {bannedType === "temporary"
                ? "Temporary suspension is active."
                : "Permanent suspension is active."}
            </Text>
          </Section>

          <Section style={contentSection}>
            <Text style={paragraph}>Muraho {userName},</Text>
            <Text style={paragraph}>
              Your {organisationName} account has been suspended. Please review
              the details below and follow the appeal instructions if you
              believe this decision should be reviewed.
            </Text>

            <Section style={card}>
              <Text style={label}>Type</Text>
              <Text style={value}>
                {bannedType === "temporary"
                  ? "Temporary suspension"
                  : "Permanent suspension"}
              </Text>
              <Text style={label}>Reason</Text>
              <Text style={value}>{banReason || reason}</Text>
              <Text style={label}>Severity</Text>
              <Text
                style={{
                  ...value,
                  color: severityColor[severity],
                  fontWeight: "700",
                }}>
                {severity.toUpperCase()}
              </Text>
              <Text style={label}>Effective date</Text>
              <Text style={value}>{formatDate(startDate)}</Text>
              {bannedType === "temporary" && banExpiresInDays ? (
                <>
                  <Text style={label}>Duration</Text>
                  <Text style={value}>
                    {banExpiresInDays} day{banExpiresInDays === "1" ? "" : "s"}
                  </Text>
                </>
              ) : null}
              {endDate ? (
                <>
                  <Text style={label}>Estimated reinstatement</Text>
                  <Text style={value}>{formatDate(endDate)}</Text>
                </>
              ) : null}
            </Section>

            {violationDetails ? (
              <Section style={noteCard}>
                <Text style={noteHeading}>Additional details</Text>
                <Text style={paragraphCompact}>{violationDetails}</Text>
              </Section>
            ) : null}

            <Section style={card}>
              <Text style={noteHeading}>Access restrictions</Text>
              <Text style={listItem}>
                • Sign-in:{" "}
                {restrictions?.accountAccess !== false ? "Disabled" : "Limited"}
              </Text>
              <Text style={listItem}>
                • Dashboard:{" "}
                {restrictions?.dashboardAccess !== false
                  ? "Unavailable"
                  : "Restricted"}
              </Text>
              <Text style={listItem}>
                • Member records:{" "}
                {restrictions?.projectManagement !== false
                  ? "Unavailable"
                  : "Restricted"}
              </Text>
              <Text style={listItem}>
                • Messaging:{" "}
                {restrictions?.messaging !== false
                  ? "Unavailable"
                  : "Restricted"}
              </Text>
            </Section>

            <Section style={noteCard}>
              <Text style={noteHeading}>Appeal process</Text>
              <Text style={paragraphCompact}>
                {appealProcess?.canAppeal === false
                  ? "This suspension is final and cannot be appealed."
                  : "You can submit an appeal by contacting support with your account details and supporting evidence."}
              </Text>
              {appealProcess?.appealDeadline ? (
                <Text style={paragraphCompact}>
                  Appeal deadline:{" "}
                  <strong>{formatDate(appealProcess.appealDeadline)}</strong>
                </Text>
              ) : null}
              {appealProcess?.appealInstructions ? (
                <Text style={paragraphCompact}>
                  {appealProcess.appealInstructions}
                </Text>
              ) : null}
            </Section>

            <Section style={buttonRow}>
              <Button
                style={primaryButton}
                href={`mailto:${organisationEmail}?subject=Account Suspension Appeal - ${userName}`}>
                Contact Support
              </Button>
            </Section>
          </Section>

          <Section style={footer}>
            <Hr style={divider} />
            <Text style={footerText}>
              This is a transactional notification about account access.
            </Text>

            <Text style={footerText}>
              <Link
                href={`mailto:${organisationEmail}?subject=Account Suspension Appeal - ${userName}`}
                style={link}>
                {organisationEmail}
              </Link>{" "}
              |{" "}
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

AccountBannedNotification.PreviewProps = {
  userName: "Claude Tuyisenge",
  bannedType: "temporary",
  reason: "Repeated policy violations",
  severity: "high",
  startDate: "2026-03-04T08:00:00.000Z",
  endDate: "2026-03-11T08:00:00.000Z",
  restrictions: {
    accountAccess: true,
    dashboardAccess: true,
    projectManagement: true,
    messaging: true,
  },
  appealProcess: {
    canAppeal: true,
    appealDeadline: "2026-03-08T23:59:00.000Z",
    appealInstructions:
      "Reply to this email with any context you want the committee to review.",
  },
  banExpiresInDays: "7",
  banReason: "Unauthorized account activity",
} satisfies AccountBannedNotificationProps

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

const alertHeader = {
  backgroundColor: "#991b1b",
  padding: "24px 22px",
  textAlign: "center" as const,
}

const alertKicker = {
  color: "#fecaca",
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
  color: "#fee2e2",
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

const paragraphCompact = {
  ...paragraph,
  margin: "0 0 10px",
}

const card = {
  border: "1px solid #e5e7eb",
  borderRadius: "8px",
  backgroundColor: "#f9fafb",
  padding: "14px 12px",
  margin: "0 0 14px",
}

const noteCard = {
  ...card,
  backgroundColor: "#fff7ed",
  border: "1px solid #fed7aa",
}

const noteHeading = {
  color: "#111827",
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
  backgroundColor: "#991b1b",
  color: "#ffffff",
  textDecoration: "none",
  borderRadius: "6px",
  padding: "12px 20px",
  fontSize: "14px",
  fontWeight: "600",
  boxSizing: "border-box" as const,
  margin: "0 0 10px",
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

export default AccountBannedNotification
