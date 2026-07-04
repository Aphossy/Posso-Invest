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

interface ContributionDeadlinePassedMemberEmailProps {
  memberName: string
  period: string
  periodLabel: string
  windowEndedOn: string
  amountDue: string
  penaltyAmount: string
  totalDue: string
  penaltyRate: string
  currency: string
}

export function ContributionDeadlinePassedMemberEmail({
  memberName,
  period,
  periodLabel,
  windowEndedOn,
  amountDue,
  penaltyAmount,
  totalDue,
  penaltyRate,
  currency,
}: ContributionDeadlinePassedMemberEmailProps) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || organisationWebsite

  return (
    <Html lang="en">
      <Head />
      <Preview>
        Overdue: Your {periodLabel} contribution is past due - a {penaltyRate}{" "}
        penalty has been applied.
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={brand}>{organisationName}</Text>
            <Text style={subtitle}>⚠️ Overdue Contribution Notice</Text>
          </Section>

          <Section style={content}>
            <Heading style={heading}>
              Contribution overdue - penalty applied
            </Heading>
            <Text style={paragraph}>Muraho {memberName},</Text>
            <Text style={paragraph}>
              The contribution window for <strong>{periodLabel}</strong> closed
              on <strong>{windowEndedOn}</strong> and your contribution has not
              been received. A{" "}
              <strong>{penaltyRate} late-payment penalty</strong> has been
              applied to your account.
            </Text>

            <Section style={overdueBox}>
              <Text style={overdueTitle}>Outstanding Balance</Text>
              <table style={overdueTable}>
                <tbody>
                  <tr>
                    <td style={overdueLabel}>Contribution</td>
                    <td style={overdueValue}>
                      {currency} {amountDue}
                    </td>
                  </tr>
                  <tr>
                    <td style={overdueLabel}>Late penalty ({penaltyRate})</td>
                    <td style={overdueValueRed}>
                      + {currency} {penaltyAmount}
                    </td>
                  </tr>
                  <tr>
                    <td style={overdueLabelTotal}>Total due</td>
                    <td style={overdueValueTotal}>
                      {currency} {totalDue}
                    </td>
                  </tr>
                </tbody>
              </table>
            </Section>

            <Text style={infoText}>
              Please pay{" "}
              <strong>
                {currency} {totalDue}
              </strong>{" "}
              as soon as possible. Contact your treasurer to confirm the payment
              once made. Further delays may affect your standing in the group.
            </Text>

            <Section style={buttonSection}>
              <Button
                href={`${baseUrl}/member/contributions`}
                style={urgentButton}>
                View My Contributions
              </Button>
            </Section>

            <Hr style={divider} />

            <Text style={smallText}>
              If you believe this is an error or need to discuss your situation,
              contact us at{" "}
              <Link href={`mailto:${organisationEmail}`} style={link}>
                {organisationEmail}
              </Link>
              .
            </Text>

            <Text style={refText}>Period reference: {period}</Text>
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

ContributionDeadlinePassedMemberEmail.PreviewProps = {
  memberName: "Aline Mukamana",
  period: "2026-02",
  periodLabel: "February 2026",
  windowEndedOn: "6 March 2026",
  amountDue: "80,000",
  penaltyAmount: "8,000",
  totalDue: "88,000",
  penaltyRate: "10%",
  currency: "RWF",
} satisfies ContributionDeadlinePassedMemberEmailProps

export default ContributionDeadlinePassedMemberEmail

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
  color: "#e9d5ff",
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

const overdueBox = {
  backgroundColor: "#faf5ff",
  border: "2px solid #004225",
  borderRadius: "8px",
  padding: "16px 20px",
  marginBottom: "18px",
}

const overdueTitle = {
  color: "#004225",
  fontSize: "13px",
  fontWeight: "700",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  margin: "0 0 12px",
}

const overdueTable = {
  width: "100%",
  borderCollapse: "collapse" as const,
}

const overdueLabel = {
  color: "#4b5563",
  fontSize: "14px",
  padding: "4px 0",
  width: "60%",
}

const overdueLabelTotal = {
  color: "#111827",
  fontSize: "15px",
  fontWeight: "700",
  padding: "10px 0 4px",
  borderTop: "1px solid #ddd6fe",
  width: "60%",
}

const overdueValue = {
  color: "#374151",
  fontSize: "14px",
  fontWeight: "600",
  padding: "4px 0",
  textAlign: "right" as const,
}

const overdueValueRed = {
  color: "#dc2626",
  fontSize: "14px",
  fontWeight: "600",
  padding: "4px 0",
  textAlign: "right" as const,
}

const overdueValueTotal = {
  color: "#004225",
  fontSize: "18px",
  fontWeight: "700",
  padding: "10px 0 4px",
  borderTop: "1px solid #ddd6fe",
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
  backgroundColor: "#004225",
  color: "#ffffff",
  borderRadius: "8px",
  padding: "13px 28px",
  textDecoration: "none",
  fontWeight: "700",
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
