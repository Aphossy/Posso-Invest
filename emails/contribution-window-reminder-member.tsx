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

interface ContributionWindowReminderMemberEmailProps {
  memberName: string
  period: string
  periodLabel: string
  windowEnd: string
  daysRemaining: number
  amountDue: string
  penaltyAmount: string
  currency: string
}

export function ContributionWindowReminderMemberEmail({
  memberName,
  period,
  periodLabel,
  windowEnd,
  daysRemaining,
  amountDue,
  penaltyAmount,
  currency,
}: ContributionWindowReminderMemberEmailProps) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || organisationWebsite

  return (
    <Html lang="en">
      <Head />
      <Preview>
        {`Reminder: ${daysRemaining} days left to pay your ${periodLabel} contribution.`}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={brand}>{organisationName}</Text>
            <Text style={subtitle}>Contribution Reminder</Text>
          </Section>

          <Section style={content}>
            <Heading style={heading}>
              ⏰ {String(daysRemaining)} days left to pay
            </Heading>
            <Text style={paragraph}>Muraho {memberName},</Text>
            <Text style={paragraph}>
              This is a friendly reminder that your contribution for{" "}
              <strong>{periodLabel}</strong> is still outstanding. The
              contribution window closes on <strong>{windowEnd}</strong>.
            </Text>

            <Section style={urgencyBox}>
              <Text style={urgencyItem}>
                📅 <strong>Deadline:</strong> {windowEnd}
              </Text>
              <Text style={urgencyItem}>
                ⏳ <strong>Days remaining:</strong> {String(daysRemaining)} days
              </Text>
              <Text style={urgencyItem}>
                💰 <strong>Amount due:</strong> {currency} {amountDue}
              </Text>
              <Text style={urgencyItem}>
                ⚠️ <strong>Late penalty (10%):</strong> {currency}{" "}
                {penaltyAmount}
              </Text>
            </Section>

            <Text style={warningText}>
              If you pay after <strong>{windowEnd}</strong>, your contribution
              will be recorded as <strong>late</strong> and a penalty of{" "}
              <strong>
                {currency} {penaltyAmount}
              </strong>{" "}
              will be automatically added.
            </Text>

            <Section style={buttonSection}>
              <Button
                href={`${baseUrl}/member/contributions`}
                style={primaryButton}>
                Pay Now - {currency} {amountDue}
              </Button>
            </Section>

            <Hr style={divider} />

            <Text style={smallText}>
              If you have already paid, please disregard this email. For
              questions, contact{" "}
              <Link href={`mailto:${organisationEmail}`} style={link}>
                {organisationEmail}
              </Link>
              .
            </Text>

            <Text style={refText}>Period: {period}</Text>
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

ContributionWindowReminderMemberEmail.PreviewProps = {
  memberName: "Aline Mukamana",
  period: "2026-02",
  periodLabel: "February 2026",
  windowEnd: "6 March 2026",
  daysRemaining: 3,
  amountDue: "80,000",
  penaltyAmount: "8,000",
  currency: "RWF",
} satisfies ContributionWindowReminderMemberEmailProps

export default ContributionWindowReminderMemberEmail

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
  backgroundColor: "#d97706",
  textAlign: "center" as const,
  padding: "24px 20px 18px",
}

const brand = {
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "700",
  margin: "0 0 4px",
}

const subtitle = {
  color: "#fef3c7",
  fontSize: "12px",
  margin: "0",
}

const content = {
  padding: "28px 32px 20px",
}

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

const urgencyBox = {
  backgroundColor: "#fffbeb",
  border: "1px solid #fde68a",
  borderRadius: "8px",
  padding: "16px 20px",
  marginBottom: "18px",
}

const urgencyItem = {
  color: "#78350f",
  fontSize: "14px",
  lineHeight: "22px",
  margin: "0 0 6px",
}

const warningText = {
  color: "#374151",
  fontSize: "14px",
  lineHeight: "22px",
  margin: "0 0 22px",
  padding: "12px 16px",
  backgroundColor: "#fef2f2",
  border: "1px solid #fecaca",
  borderRadius: "6px",
}

const buttonSection = {
  textAlign: "center" as const,
  margin: "24px 0 16px",
}

const primaryButton = {
  backgroundColor: "#d97706",
  color: "#ffffff",
  borderRadius: "8px",
  padding: "12px 24px",
  textDecoration: "none",
  fontWeight: "600",
  fontSize: "15px",
}

const divider = {
  borderTop: "1px solid #e5e7eb",
  margin: "24px 0 18px",
}

const smallText = {
  color: "#6b7280",
  fontSize: "13px",
  lineHeight: "20px",
  margin: "0 0 8px",
}

const refText = {
  color: "#9ca3af",
  fontSize: "11px",
  margin: "8px 0 0",
}

const link = {
  color: "#004225",
  textDecoration: "underline",
}

const footer = {
  textAlign: "center" as const,
  backgroundColor: "#f9fafb",
  padding: "18px 20px",
  borderTop: "1px solid #e5e7eb",
}

const footerText = {
  color: "#9ca3af",
  fontSize: "12px",
  margin: "0",
}
