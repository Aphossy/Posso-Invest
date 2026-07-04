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

interface MonthlyComplianceSummaryTreasurerEmailProps {
  treasurerName: string
  periodKey: string
  periodLabel: string
  totalContributions: number
  confirmedContributions: number
  pendingContributions: number
  lateContributions: number
  totalLoans: number
  activeLoanCount: number
  totalPenalties: number
  activePenaltyCount: number
  confirmedAmount: number
}

export function MonthlyComplianceSummaryTreasurerEmail({
  treasurerName,
  periodKey,
  periodLabel,
  totalContributions,
  confirmedContributions,
  pendingContributions,
  lateContributions,
  totalLoans,
  activeLoanCount,
  totalPenalties,
  activePenaltyCount,
  confirmedAmount,
}: MonthlyComplianceSummaryTreasurerEmailProps) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || organisationWebsite

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  return (
    <Html lang="en">
      <Head />
      <Preview>
        {`Monthly compliance summary for ${periodLabel} - ${totalContributions} contributions, ${activeLoanCount} active loans`}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={brand}>{organisationName}</Text>
            <Text style={subtitle}>Treasurer Report - Monthly Compliance</Text>
          </Section>

          <Section style={content}>
            <Heading style={heading}>
              Monthly compliance report - {periodLabel}
            </Heading>
            <Text style={paragraph}>Muraho {treasurerName},</Text>
            <Text style={paragraph}>
              Here is your monthly compliance summary for{" "}
              <strong>{periodLabel}</strong>. This report covers all financial
              activities and member obligations.
            </Text>

            <Section style={statusBox}>
              <Text style={sectionTitle}>Contributions Summary</Text>
              <table style={statusTable}>
                <tbody>
                  <tr>
                    <td style={statusLabelCell}>Total Members</td>
                    <td style={statusValueCell}>{totalContributions}</td>
                  </tr>
                  <tr>
                    <td style={statusLabelCell}>Confirmed</td>
                    <td style={statusBadgeGreen}>{confirmedContributions}</td>
                  </tr>
                  <tr>
                    <td style={statusLabelCell}>Pending</td>
                    <td style={statusBadgeRed}>{pendingContributions}</td>
                  </tr>
                  <tr>
                    <td style={statusLabelCell}>Late</td>
                    <td style={statusBadgeAmber}>{lateContributions}</td>
                  </tr>
                  <tr style={summaryRowStyle}>
                    <td style={statusLabelCell}>
                      <strong>Total Collected</strong>
                    </td>
                    <td style={statusValueCellBold}>
                      {formatCurrency(confirmedAmount)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </Section>

            <Section style={statusBox}>
              <Text style={sectionTitle}>Loans & Penalties</Text>
              <table style={statusTable}>
                <tbody>
                  <tr>
                    <td style={statusLabelCell}>Total Loans</td>
                    <td style={statusValueCell}>{totalLoans}</td>
                  </tr>
                  <tr>
                    <td style={statusLabelCell}>Active Loans</td>
                    <td style={statusBadgeAmber}>{activeLoanCount}</td>
                  </tr>
                  <tr>
                    <td style={statusLabelCell}>Total Penalties</td>
                    <td style={statusValueCell}>{totalPenalties}</td>
                  </tr>
                  <tr>
                    <td style={statusLabelCell}>Active Penalties</td>
                    <td style={statusBadgeRed}>{activePenaltyCount}</td>
                  </tr>
                </tbody>
              </table>
            </Section>

            {pendingContributions > 0 && (
              <Section style={alertBox}>
                <Text style={alertText}>
                  <strong>{pendingContributions} member(s)</strong> still have
                  pending contributions for <strong>{periodLabel}</strong>.
                  Follow up to ensure timely payment before penalties are
                  imposed.
                </Text>
              </Section>
            )}

            <Section style={buttonSection}>
              <Button
                href={`${baseUrl}/treasurer/dashboard`}
                style={primaryButton}>
                Open Treasurer Dashboard
              </Button>
            </Section>

            <Hr style={divider} />

            <Text style={smallText}>
              This report is generated monthly for the period{" "}
              <strong>{periodKey}</strong>. For questions or discrepancies,
              contact{" "}
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

MonthlyComplianceSummaryTreasurerEmail.PreviewProps = {
  treasurerName: "Jean Mukamukiza",
  periodKey: "2026-04",
  periodLabel: "April 2026",
  totalContributions: 45,
  confirmedContributions: 42,
  pendingContributions: 2,
  lateContributions: 1,
  totalLoans: 8,
  activeLoanCount: 3,
  totalPenalties: 12,
  activePenaltyCount: 2,
  confirmedAmount: 4050,
} satisfies MonthlyComplianceSummaryTreasurerEmailProps

export default MonthlyComplianceSummaryTreasurerEmail

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
  backgroundColor: "#165598",
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

const sectionTitle = {
  color: "#165598",
  fontSize: "13px",
  fontWeight: "700",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  margin: "0 0 12px",
}

const statusBox = {
  border: "1px solid #e5e7eb",
  borderRadius: "8px",
  padding: "16px 20px",
  backgroundColor: "#fafafa",
  marginBottom: "18px",
}

const statusTable = {
  width: "100%",
  borderCollapse: "collapse" as const,
}

const statusLabelCell = {
  color: "#374151",
  fontSize: "14px",
  padding: "7px 0",
  width: "60%",
}

const statusValueCell = {
  color: "#374151",
  fontSize: "14px",
  fontWeight: "600",
  padding: "7px 0",
  width: "40%",
  textAlign: "right" as const,
}

const statusValueCellBold = {
  color: "#111827",
  fontSize: "14px",
  fontWeight: "700",
  padding: "7px 0",
  width: "40%",
  textAlign: "right" as const,
}

const summaryRowStyle = {
  borderTop: "1px solid #e5e7eb",
  paddingTop: "8px",
}

const statusBadgeGreen = {
  color: "#166534",
  backgroundColor: "#dcfce7",
  fontSize: "12px",
  fontWeight: "700",
  padding: "3px 10px",
  borderRadius: "20px",
  textAlign: "center" as const,
  width: "40%",
}

const statusBadgeRed = {
  color: "#991b1b",
  backgroundColor: "#fee2e2",
  fontSize: "12px",
  fontWeight: "700",
  padding: "3px 10px",
  borderRadius: "20px",
  textAlign: "center" as const,
  width: "40%",
}

const statusBadgeAmber = {
  color: "#92400e",
  backgroundColor: "#fef3c7",
  fontSize: "12px",
  fontWeight: "700",
  padding: "3px 10px",
  borderRadius: "20px",
  textAlign: "center" as const,
  width: "40%",
}

const alertBox = {
  backgroundColor: "#fff7ed",
  border: "1px solid #fed7aa",
  borderRadius: "8px",
  padding: "14px 18px",
  marginBottom: "20px",
}

const alertText = {
  color: "#9a3412",
  fontSize: "14px",
  lineHeight: "22px",
  margin: "0",
}

const buttonSection = {
  textAlign: "center" as const,
  margin: "24px 0 16px",
}

const primaryButton = {
  backgroundColor: "#165598",
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
  color: "#165598",
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
