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

export interface OverdueMemberItem {
  name: string
  email: string
  penaltyAmount: string
}

interface ContributionDeadlineSummaryTreasurerEmailProps {
  treasurerName: string
  period: string
  periodLabel: string
  windowEndedOn: string
  totalMembers: number
  paidOnTimeCount: number
  overdueMembers: OverdueMemberItem[]
  totalCollected: string
  totalPending: string
  totalExpected: string
  totalPenalties: string
  currency: string
}

export function ContributionDeadlineSummaryTreasurerEmail({
  treasurerName,
  period,
  periodLabel,
  windowEndedOn,
  totalMembers,
  paidOnTimeCount,
  overdueMembers,
  totalCollected,
  totalPending,
  totalExpected,
  totalPenalties,
  currency,
}: ContributionDeadlineSummaryTreasurerEmailProps) {
  const baseUrl = organisationWebsite
  const overdueCount = overdueMembers.length

  return (
    <Html lang="en">
      <Head />
      <Preview>
        {`Window closed: ${paidOnTimeCount}/${totalMembers} paid on time for ${periodLabel}. ${overdueCount} members overdue.`}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={brand}>{organisationName}</Text>
            <Text style={subtitle}>Treasurer - Window Closed Summary</Text>
          </Section>

          <Section style={content}>
            <Heading style={heading}>
              Contribution window closed - {periodLabel}
            </Heading>
            <Text style={paragraph}>Muraho {treasurerName},</Text>
            <Text style={paragraph}>
              The contribution window for <strong>{periodLabel}</strong> closed
              on <strong>{windowEndedOn}</strong>. Below is the final summary.
              Members who did not pay have been notified and penalties have been
              recorded.
            </Text>

            <Section style={statsGrid}>
              <table style={statsTable}>
                <tbody>
                  <tr>
                    <td style={statBoxGreen}>
                      <Text style={statNumberGreen}>
                        {String(paidOnTimeCount)}
                      </Text>
                      <Text style={statLabelGreen}>Paid on time</Text>
                    </td>
                    <td style={statBoxRed}>
                      <Text style={statNumberRed}>{String(overdueCount)}</Text>
                      <Text style={statLabelRed}>Overdue</Text>
                    </td>
                    <td style={statBoxGray}>
                      <Text style={statNumberGray}>{String(totalMembers)}</Text>
                      <Text style={statLabelGray}>Total</Text>
                    </td>
                  </tr>
                </tbody>
              </table>
            </Section>

            <Section style={financialBox}>
              <Text style={sectionTitle}>Financial Summary</Text>
              <table style={detailsTable}>
                <tbody>
                  <tr>
                    <td style={labelCell}>Period</td>
                    <td style={valueCell}>
                      {periodLabel} ({period})
                    </td>
                  </tr>
                  <tr>
                    <td style={labelCell}>Window closed</td>
                    <td style={valueCell}>{windowEndedOn}</td>
                  </tr>
                  <tr>
                    <td style={labelCell}>Total expected</td>
                    <td style={valueCell}>
                      {currency} {totalExpected}
                    </td>
                  </tr>
                  <tr>
                    <td style={labelCell}>Total collected</td>
                    <td style={valueCellGreen}>
                      {currency} {totalCollected}
                    </td>
                  </tr>
                  <tr>
                    <td style={labelCell}>Still pending</td>
                    <td style={valueCellRed}>
                      {currency} {totalPending}
                    </td>
                  </tr>
                  <tr>
                    <td style={labelCell}>Penalties generated</td>
                    <td style={valueCellOrange}>
                      {currency} {totalPenalties}
                    </td>
                  </tr>
                </tbody>
              </table>
            </Section>

            {overdueMembers.length > 0 && (
              <Section style={overdueBox}>
                <Text style={sectionTitle}>
                  Overdue members - penalties applied ({String(overdueCount)})
                </Text>
                <table style={memberTable}>
                  <thead>
                    <tr>
                      <td style={tableHeaderCell}>#</td>
                      <td style={tableHeaderCell}>Name</td>
                      <td style={tableHeaderCell}>Email</td>
                      <td style={tableHeaderCellRight}>Penalty</td>
                    </tr>
                  </thead>
                  <tbody>
                    {overdueMembers.map((m, i) => (
                      <tr key={i}>
                        <td style={tableCellNum}>{i + 1}</td>
                        <td style={tableCell}>
                          <strong>{m.name}</strong>
                        </td>
                        <td style={tableCellMuted}>{m.email}</td>
                        <td style={tableCellPenalty}>
                          {currency} {m.penaltyAmount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Section>
            )}

            {overdueCount === 0 && (
              <Section style={allPaidBox}>
                <Text style={allPaidText}>
                  🎉 All members paid on time! No penalties were applied.
                </Text>
              </Section>
            )}

            <Section style={nextStepsBox}>
              <Text style={sectionTitle}>Recommended next steps</Text>
              <Text style={nextStepItem}>
                ☐ Follow up with overdue members to collect outstanding amounts
              </Text>
              <Text style={nextStepItem}>
                ☐ Confirm any late contributions as they arrive
              </Text>
              <Text style={nextStepItem}>
                ☐ Review and waive penalties if applicable
              </Text>
              <Text style={nextStepItem}>
                ☐ Update financial records and prepare monthly report
              </Text>
            </Section>

            <Section style={buttonSection}>
              <Button
                href={`${baseUrl}/treasurer/contributions/members?period=${period}`}
                style={primaryButton}>
                Open Contributions Dashboard
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

ContributionDeadlineSummaryTreasurerEmail.PreviewProps = {
  treasurerName: "Wiclef Hirwa",
  period: "2026-02",
  periodLabel: "February 2026",
  windowEndedOn: "6 March 2026",
  totalMembers: 11,
  paidOnTimeCount: 9,
  overdueMembers: [
    {
      name: "Aline Mukamana",
      email: "aline@example.com",
      penaltyAmount: "8,000",
    },
    {
      name: "Eric Mutabazi",
      email: "eric@example.com",
      penaltyAmount: "8,000",
    },
  ],
  totalCollected: "720,000",
  totalPending: "160,000",
  totalExpected: "880,000",
  totalPenalties: "16,000",
  currency: "RWF",
} satisfies ContributionDeadlineSummaryTreasurerEmailProps

export default ContributionDeadlineSummaryTreasurerEmail

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

const statsGrid = {
  marginBottom: "18px",
}

const statsTable = {
  width: "100%",
  borderCollapse: "separate" as const,
  borderSpacing: "8px 0",
}

const statBoxGreen = {
  textAlign: "center" as const,
  backgroundColor: "#f0fdf4",
  border: "1px solid #bbf7d0",
  borderRadius: "8px",
  padding: "12px 8px",
  width: "33%",
}

const statBoxRed = {
  textAlign: "center" as const,
  backgroundColor: "#fef2f2",
  border: "1px solid #fecaca",
  borderRadius: "8px",
  padding: "12px 8px",
  width: "33%",
}

const statBoxGray = {
  textAlign: "center" as const,
  backgroundColor: "#f9fafb",
  border: "1px solid #e5e7eb",
  borderRadius: "8px",
  padding: "12px 8px",
  width: "33%",
}

const statNumberGreen = {
  color: "#166534",
  fontSize: "24px",
  fontWeight: "700",
  margin: "0 0 2px",
}

const statNumberRed = {
  color: "#dc2626",
  fontSize: "24px",
  fontWeight: "700",
  margin: "0 0 2px",
}

const statNumberGray = {
  color: "#374151",
  fontSize: "24px",
  fontWeight: "700",
  margin: "0 0 2px",
}

const statLabelGreen = {
  color: "#15803d",
  fontSize: "11px",
  fontWeight: "600",
  margin: "0",
  textTransform: "uppercase" as const,
}

const statLabelRed = {
  color: "#dc2626",
  fontSize: "11px",
  fontWeight: "600",
  margin: "0",
  textTransform: "uppercase" as const,
}

const statLabelGray = {
  color: "#6b7280",
  fontSize: "11px",
  fontWeight: "600",
  margin: "0",
  textTransform: "uppercase" as const,
}

const financialBox = {
  border: "1px solid #e5e7eb",
  borderRadius: "8px",
  padding: "16px 20px",
  backgroundColor: "#fafafa",
  marginBottom: "18px",
}

const detailsTable = {
  width: "100%",
  borderCollapse: "collapse" as const,
}

const labelCell = {
  color: "#6b7280",
  fontSize: "13px",
  padding: "4px 0",
  width: "55%",
}

const valueCell = {
  color: "#111827",
  fontSize: "13px",
  padding: "4px 0",
  width: "45%",
}

const valueCellGreen = {
  color: "#166534",
  fontSize: "13px",
  fontWeight: "600",
  padding: "4px 0",
}

const valueCellRed = {
  color: "#dc2626",
  fontSize: "13px",
  fontWeight: "600",
  padding: "4px 0",
}

const valueCellOrange = {
  color: "#d97706",
  fontSize: "13px",
  fontWeight: "600",
  padding: "4px 0",
}

const overdueBox = {
  border: "1px solid #fecaca",
  borderRadius: "8px",
  padding: "16px 20px",
  backgroundColor: "#fef2f2",
  marginBottom: "18px",
}

const memberTable = {
  width: "100%",
  borderCollapse: "collapse" as const,
}

const tableHeaderCell = {
  color: "#6b7280",
  fontSize: "11px",
  fontWeight: "700",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  padding: "0 0 8px",
  borderBottom: "1px solid #fecaca",
}

const tableHeaderCellRight = {
  color: "#6b7280",
  fontSize: "11px",
  fontWeight: "700",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  padding: "0 0 8px",
  borderBottom: "1px solid #fecaca",
  textAlign: "right" as const,
}

const tableCellNum = {
  color: "#9ca3af",
  fontSize: "12px",
  padding: "6px 4px 6px 0",
  verticalAlign: "top" as const,
  width: "20px",
}

const tableCell = {
  color: "#111827",
  fontSize: "13px",
  padding: "6px 8px",
  verticalAlign: "top" as const,
}

const tableCellMuted = {
  color: "#6b7280",
  fontSize: "12px",
  padding: "6px 8px",
  verticalAlign: "top" as const,
}

const tableCellPenalty = {
  color: "#dc2626",
  fontSize: "13px",
  fontWeight: "600",
  padding: "6px 0 6px 8px",
  textAlign: "right" as const,
  verticalAlign: "top" as const,
}

const allPaidBox = {
  backgroundColor: "#f0fdf4",
  border: "1px solid #bbf7d0",
  borderRadius: "8px",
  padding: "16px 20px",
  marginBottom: "18px",
  textAlign: "center" as const,
}

const allPaidText = {
  color: "#166534",
  fontSize: "15px",
  fontWeight: "600",
  margin: "0",
}

const nextStepsBox = {
  backgroundColor: "#eff6ff",
  border: "1px solid #bfdbfe",
  borderRadius: "8px",
  padding: "16px 20px",
  marginBottom: "18px",
}

const nextStepItem = {
  color: "#1e3a5f",
  fontSize: "13px",
  lineHeight: "22px",
  margin: "0 0 4px",
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
