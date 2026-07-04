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

interface ContributionWindowLastDayMemberEmailProps {
  memberName: string
  period: string
  periodLabel: string
  windowEnd: string
  amountDue: string
  penaltyAmount: string
  totalIfLate: string
  currency: string
}

export function ContributionWindowLastDayMemberEmail({
  memberName,
  period,
  periodLabel,
  windowEnd,
  amountDue,
  penaltyAmount,
  totalIfLate,
  currency,
}: ContributionWindowLastDayMemberEmailProps) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || organisationWebsite

  return (
    <Html lang="en">
      <Head />
      <Preview>
        LAST DAY: Pay your {periodLabel} contribution today or face a 10%
        penalty.
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={brand}>{organisationName}</Text>
            <Text style={subtitle}>🚨 Last Day - Contribution Deadline</Text>
          </Section>

          <Section style={content}>
            <Heading style={heading}>Today is the last day to pay</Heading>
            <Text style={paragraph}>Muraho {memberName},</Text>
            <Text style={paragraph}>
              This is your final reminder. The contribution window for{" "}
              <strong>{periodLabel}</strong> closes <strong>today</strong>,{" "}
              {windowEnd}. After today, a 10% late penalty will be applied
              automatically.
            </Text>

            <Section style={urgentBox}>
              <Text style={urgentTitle}>⚡ Act now - window closes today!</Text>
              <table style={urgentTable}>
                <tbody>
                  <tr>
                    <td style={urgentLabel}>Contribution due</td>
                    <td style={urgentValue}>
                      {currency} {amountDue}
                    </td>
                  </tr>
                  <tr>
                    <td style={urgentLabel}>Penalty if late (10%)</td>
                    <td style={urgentValueRed}>
                      + {currency} {penaltyAmount}
                    </td>
                  </tr>
                  <tr>
                    <td style={urgentLabelTotal}>Total if paid late</td>
                    <td style={urgentValueTotal}>
                      {currency} {totalIfLate}
                    </td>
                  </tr>
                </tbody>
              </table>
            </Section>

            <Text style={infoText}>
              Pay <strong>today</strong> to avoid the penalty. Notify your
              treasurer once payment is made so it can be confirmed promptly.
            </Text>

            <Section style={buttonSection}>
              <Button
                href={`${baseUrl}/member/contributions`}
                style={urgentButton}>
                Pay Now - {currency} {amountDue}
              </Button>
            </Section>

            <Hr style={divider} />

            <Text style={smallText}>
              Already paid? Please disregard this email. For questions, contact{" "}
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

ContributionWindowLastDayMemberEmail.PreviewProps = {
  memberName: "Theogene Iradukunda",
  period: "2026-02",
  periodLabel: "February 2026",
  windowEnd: "6 March 2026",
  amountDue: "80,000",
  penaltyAmount: "8,000",
  totalIfLate: "88,000",
  currency: "RWF",
} satisfies ContributionWindowLastDayMemberEmailProps

export default ContributionWindowLastDayMemberEmail

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
  backgroundColor: "#dc2626",
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
  color: "#fecaca",
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

const urgentBox = {
  backgroundColor: "#fef2f2",
  border: "2px solid #dc2626",
  borderRadius: "8px",
  padding: "16px 20px",
  marginBottom: "18px",
}

const urgentTitle = {
  color: "#dc2626",
  fontSize: "14px",
  fontWeight: "700",
  margin: "0 0 12px",
}

const urgentTable = {
  width: "100%",
  borderCollapse: "collapse" as const,
}

const urgentLabel = {
  color: "#374151",
  fontSize: "14px",
  padding: "4px 0",
  width: "60%",
}

const urgentLabelTotal = {
  color: "#111827",
  fontSize: "14px",
  fontWeight: "700",
  padding: "8px 0 4px",
  borderTop: "1px solid #fecaca",
  width: "60%",
}

const urgentValue = {
  color: "#374151",
  fontSize: "14px",
  fontWeight: "600",
  padding: "4px 0",
  textAlign: "right" as const,
}

const urgentValueRed = {
  color: "#dc2626",
  fontSize: "14px",
  fontWeight: "600",
  padding: "4px 0",
  textAlign: "right" as const,
}

const urgentValueTotal = {
  color: "#dc2626",
  fontSize: "16px",
  fontWeight: "700",
  padding: "8px 0 4px",
  borderTop: "1px solid #fecaca",
  textAlign: "right" as const,
}

const infoText = {
  color: "#374151",
  fontSize: "14px",
  lineHeight: "22px",
  margin: "0 0 20px",
}

const buttonSection = {
  textAlign: "center" as const,
  margin: "24px 0 16px",
}

const urgentButton = {
  backgroundColor: "#dc2626",
  color: "#ffffff",
  borderRadius: "8px",
  padding: "13px 28px",
  textDecoration: "none",
  fontWeight: "700",
  fontSize: "16px",
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
