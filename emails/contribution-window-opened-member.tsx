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

interface ContributionWindowOpenedMemberEmailProps {
  memberName: string
  period: string
  periodLabel: string
  windowStart: string
  windowEnd: string
  daysRemaining: number
  amountDue: string
  currency: string
}

export function ContributionWindowOpenedMemberEmail({
  memberName,
  period,
  periodLabel,
  windowStart,
  windowEnd,
  daysRemaining,
  amountDue,
  currency,
}: ContributionWindowOpenedMemberEmailProps) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || organisationWebsite

  return (
    <Html lang="en">
      <Head />
      <Preview>
        {`Contribution window for ${periodLabel} is now open - ${daysRemaining} days remaining.`}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={brand}>{organisationName}</Text>
            <Text style={subtitle}>Contribution Window - Now Open</Text>
          </Section>

          <Section style={content}>
            <Heading style={heading}>Contribution window is open</Heading>
            <Text style={paragraph}>Muraho {memberName},</Text>
            <Text style={paragraph}>
              The contribution window for <strong>{periodLabel}</strong> is now
              open. Please make your monthly contribution before the deadline to
              avoid a late-payment penalty.
            </Text>

            <Section style={highlightBox}>
              <Text style={highlightTitle}>Window Details</Text>
              <Text style={highlightItem}>
                📅 <strong>Period:</strong> {periodLabel} ({period})
              </Text>
              <Text style={highlightItem}>
                🟢 <strong>Opens:</strong> {windowStart}
              </Text>
              <Text style={highlightItem}>
                🔴 <strong>Closes:</strong> {windowEnd}
              </Text>
              <Text style={highlightItem}>
                ⏳ <strong>Days remaining:</strong> {String(daysRemaining)} days
              </Text>
            </Section>

            <Section style={amountBox}>
              <Text style={amountLabel}>Amount due</Text>
              <Text style={amountValue}>
                {currency} {amountDue}
              </Text>
            </Section>

            <Text style={warningText}>
              ⚠️ Contributions received after {windowEnd} will be marked as{" "}
              <strong>late</strong> and a <strong>10% penalty</strong> will be
              applied automatically.
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

ContributionWindowOpenedMemberEmail.PreviewProps = {
  memberName: "Aline Mukamana",
  period: "2026-02",
  periodLabel: "February 2026",
  windowStart: "25 February 2026",
  windowEnd: "6 March 2026",
  daysRemaining: 10,
  amountDue: "80,000",
  currency: "RWF",
} satisfies ContributionWindowOpenedMemberEmailProps

export default ContributionWindowOpenedMemberEmail

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

const subtitle = {
  color: "#d1d5db",
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

const highlightBox = {
  backgroundColor: "#eff6ff",
  border: "1px solid #bfdbfe",
  borderRadius: "8px",
  padding: "16px 20px",
  marginBottom: "18px",
}

const highlightTitle = {
  color: "#1e40af",
  fontSize: "13px",
  fontWeight: "700",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  margin: "0 0 10px",
}

const highlightItem = {
  color: "#1e3a5f",
  fontSize: "14px",
  lineHeight: "22px",
  margin: "0 0 6px",
}

const amountBox = {
  backgroundColor: "#f0fdf4",
  border: "1px solid #bbf7d0",
  borderRadius: "8px",
  padding: "14px 20px",
  marginBottom: "18px",
  textAlign: "center" as const,
}

const amountLabel = {
  color: "#15803d",
  fontSize: "12px",
  fontWeight: "600",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  margin: "0 0 4px",
}

const amountValue = {
  color: "#166534",
  fontSize: "24px",
  fontWeight: "700",
  margin: "0",
}

const warningText = {
  color: "#92400e",
  backgroundColor: "#fffbeb",
  border: "1px solid #fde68a",
  borderRadius: "6px",
  padding: "10px 14px",
  fontSize: "13px",
  lineHeight: "20px",
  margin: "0 0 22px",
}

const buttonSection = {
  textAlign: "center" as const,
  margin: "24px 0 16px",
}

const primaryButton = {
  backgroundColor: "#004225",
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
