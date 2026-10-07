import {
  organisationEmail,
  organisationName,
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

interface ContributionCatchupReminderProps {
  memberName: string
  periodsDue: string[]
  amountPerMonth: string
  totalDue: string
  currency: string
}

export function ContributionCatchupReminder({
  memberName,
  periodsDue,
  amountPerMonth,
  totalDue,
  currency,
}: ContributionCatchupReminderProps) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || organisationWebsite
  const periodNames = periodsDue.join(" and ")

  return (
    <Html lang="en">
      <Head />
      <Preview>
        {`Reminder: your ${periodNames} 2026 contribution is due by November 5, 2026.`}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={brand}>{organisationName}</Text>
            <Text style={subtitle}>Contribution Reminder</Text>
          </Section>

          <Section style={content}>
            <Heading style={heading}>September and October contributions</Heading>
            <Text style={paragraph}>Muraho {memberName},</Text>
            <Text style={paragraph}>
              Please remember to pay your contribution
              {periodsDue.length > 1 ? "s" : ""} for{" "}
              <strong>{periodNames} 2026</strong>. The closing date for these
              contributions is <strong>November 5, 2026</strong>.
            </Text>

            <Section style={detailsBox}>
              <Text style={detail}>
                <strong>Periods due:</strong> {periodNames} 2026
              </Text>
              <Text style={detail}>
                <strong>Contribution per month:</strong> {currency}{" "}
                {amountPerMonth}
              </Text>
              <Text style={detail}>
                <strong>Total currently due:</strong> {currency} {totalDue}
              </Text>
              <Text style={detail}>
                <strong>Closing date:</strong> November 5, 2026
              </Text>
            </Section>

            <Text style={paragraph}>
              If you have already paid, please disregard this reminder.
            </Text>

            <Section style={buttonSection}>
              <Button
                href={`${baseUrl}/member/contributions`}
                style={primaryButton}>
                View My Contributions
              </Button>
            </Section>

            <Hr style={divider} />
            <Text style={smallText}>
              Questions? Contact us at{" "}
              <Link href={`mailto:${organisationEmail}`} style={link}>
                {organisationEmail}
              </Link>
              .
            </Text>
          </Section>

          <Section style={footer}>
            <Text style={footerText}>
              © {new Date().getFullYear()} {organisationName}. All rights
              reserved.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

const main = {
  backgroundColor: "#f4f7fb",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif',
  padding: "24px 5px",
}
const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  maxWidth: "600px",
  borderRadius: "10px",
  border: "1px solid #e6ebf1",
  overflow: "hidden",
}
const header = {
  backgroundColor: "#004225",
  textAlign: "center" as const,
  padding: "24px 20px 18px",
}
const brand = {
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "700",
  margin: "0 0 4px",
}
const subtitle = { color: "#d1d5db", fontSize: "12px", margin: "0" }
const content = { padding: "28px 32px 20px" }
const heading = {
  color: "#111827",
  fontSize: "22px",
  fontWeight: "700",
  margin: "0 0 14px",
}
const paragraph = {
  color: "#374151",
  fontSize: "15px",
  lineHeight: "24px",
  margin: "0 0 16px",
}
const detailsBox = {
  backgroundColor: "#f0fdf4",
  border: "1px solid #bbf7d0",
  borderRadius: "8px",
  padding: "14px 20px",
  marginBottom: "18px",
}
const detail = {
  color: "#1f2937",
  fontSize: "14px",
  lineHeight: "22px",
  margin: "0 0 6px",
}
const buttonSection = { textAlign: "center" as const, margin: "24px 0 16px" }
const primaryButton = {
  backgroundColor: "#004225",
  color: "#ffffff",
  borderRadius: "8px",
  padding: "12px 24px",
  textDecoration: "none",
  fontWeight: "600",
  fontSize: "15px",
}
const divider = { borderTop: "1px solid #e5e7eb", margin: "24px 0 18px" }
const smallText = { color: "#6b7280", fontSize: "13px", lineHeight: "20px" }
const link = { color: "#004225", textDecoration: "underline" }
const footer = {
  textAlign: "center" as const,
  backgroundColor: "#f9fafb",
  padding: "18px 20px",
  borderTop: "1px solid #e5e7eb",
}
const footerText = { color: "#9ca3af", fontSize: "12px", margin: "0" }
