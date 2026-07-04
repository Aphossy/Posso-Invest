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

export interface UnpaidMemberFinalItem {
  name: string
  email: string
}

interface ContributionWindowLastDayTreasurerEmailProps {
  treasurerName: string
  period: string
  periodLabel: string
  windowEnd: string
  totalMembers: number
  paidCount: number
  unpaidMembers: UnpaidMemberFinalItem[]
  amountCollected: string
  amountRemaining: string
  totalExpected: string
  penaltyPerMember: string
  currency: string
}

export function ContributionWindowLastDayTreasurerEmail({
  treasurerName,
  period,
  periodLabel,
  windowEnd,
  totalMembers,
  paidCount,
  unpaidMembers,
  amountCollected,
  amountRemaining,
  totalExpected,
  penaltyPerMember,
  currency,
}: ContributionWindowLastDayTreasurerEmailProps) {
  const baseUrl = organisationWebsite
  const unpaidCount = totalMembers - paidCount

  return (
    <Html lang="en">
      <Head />
      <Preview>
        {`🚨 Today is the last day - ${unpaidCount} members still unpaid for ${periodLabel}.`}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={brand}>{organisationName}</Text>
            <Text style={subtitle}>Treasurer - Final Day Alert</Text>
          </Section>

          <Section style={content}>
            <Heading style={heading}>🚨 Window closes today</Heading>
            <Text style={paragraph}>Muraho {treasurerName},</Text>
            <Text style={paragraph}>
              Today, <strong>{windowEnd}</strong>, is the last day of the
              contribution window for <strong>{periodLabel}</strong>. Members
              who do not pay today will have their contributions marked as{" "}
              <strong>late</strong> and a 10% penalty will be applied starting
              tomorrow.
            </Text>

            <Section style={statsGrid}>
              <table style={statsTable}>
                <tbody>
                  <tr>
                    <td style={statBox}>
                      <Text style={statNumber}>{String(paidCount)}</Text>
                      <Text style={statLabel}>Paid</Text>
                    </td>
                    <td style={statBoxAlert}>
                      <Text style={statNumberAlert}>{String(unpaidCount)}</Text>
                      <Text style={statLabelAlert}>Unpaid</Text>
                    </td>
                    <td style={statBox}>
                      <Text style={statNumber}>{String(totalMembers)}</Text>
                      <Text style={statLabel}>Total</Text>
                    </td>
                  </tr>
                </tbody>
              </table>
            </Section>

            <Section style={detailsBox}>
              <Text style={sectionTitle}>Collection Status</Text>
              <table style={detailsTable}>
                <tbody>
                  <tr>
                    <td style={labelCell}>Period</td>
                    <td style={valueCell}>
                      {periodLabel} ({period})
                    </td>
                  </tr>
                  <tr>
                    <td style={labelCell}>Deadline</td>
                    <td style={valueCell}>
                      <strong>{windowEnd} (today)</strong>
                    </td>
                  </tr>
                  <tr>
                    <td style={labelCell}>Collected</td>
                    <td style={valueCell}>
                      {currency} {amountCollected}
                    </td>
                  </tr>
                  <tr>
                    <td style={labelCell}>Still outstanding</td>
                    <td style={valueCell}>
                      <strong>
                        {currency} {amountRemaining}
                      </strong>
                    </td>
                  </tr>
                  <tr>
                    <td style={labelCell}>Total expected</td>
                    <td style={valueCell}>
                      {currency} {totalExpected}
                    </td>
                  </tr>
                  <tr>
                    <td style={labelCell}>Penalty per late member (10%)</td>
                    <td style={valueCellRed}>
                      {currency} {penaltyPerMember}
                    </td>
                  </tr>
                </tbody>
              </table>
            </Section>

            {unpaidMembers.length > 0 && (
              <Section style={unpaidBox}>
                <Text style={sectionTitle}>
                  Still unpaid - final day ({String(unpaidCount)} members)
                </Text>
                {unpaidMembers.map((m, i) => (
                  <Text key={i} style={memberRow}>
                    {i + 1}. <strong>{m.name}</strong> - {m.email}
                  </Text>
                ))}
                <Text style={penaltyNote}>
                  ⚠️ If these members do not pay today, each will incur a
                  penalty of {currency} {penaltyPerMember} starting tomorrow.
                </Text>
              </Section>
            )}

            <Section style={buttonSection}>
              <Button
                href={`${baseUrl}/treasurer/contributions/members?period=${period}`}
                style={primaryButton}>
                Manage Contributions
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

ContributionWindowLastDayTreasurerEmail.PreviewProps = {
  treasurerName: "Wiclef Hirwa",
  period: "2026-02",
  periodLabel: "February 2026",
  windowEnd: "6 March 2026",
  totalMembers: 11,
  paidCount: 8,
  unpaidMembers: [
    { name: "Aline Mukamana", email: "aline@example.com" },
    { name: "Eric Mutabazi", email: "eric@example.com" },
    { name: "Marie Claire", email: "marie@example.com" },
  ],
  amountCollected: "640,000",
  amountRemaining: "240,000",
  totalExpected: "880,000",
  penaltyPerMember: "8,000",
  currency: "RWF",
} satisfies ContributionWindowLastDayTreasurerEmailProps

export default ContributionWindowLastDayTreasurerEmail

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

const statBox = {
  textAlign: "center" as const,
  backgroundColor: "#f0fdf4",
  border: "1px solid #bbf7d0",
  borderRadius: "8px",
  padding: "12px 8px",
  width: "33%",
}

const statBoxAlert = {
  textAlign: "center" as const,
  backgroundColor: "#fef2f2",
  border: "2px solid #dc2626",
  borderRadius: "8px",
  padding: "12px 8px",
  width: "33%",
}

const statNumber = {
  color: "#166534",
  fontSize: "24px",
  fontWeight: "700",
  margin: "0 0 2px",
}

const statNumberAlert = {
  color: "#dc2626",
  fontSize: "24px",
  fontWeight: "700",
  margin: "0 0 2px",
}

const statLabel = {
  color: "#15803d",
  fontSize: "12px",
  fontWeight: "600",
  margin: "0",
  textTransform: "uppercase" as const,
}

const statLabelAlert = {
  color: "#dc2626",
  fontSize: "12px",
  fontWeight: "600",
  margin: "0",
  textTransform: "uppercase" as const,
}

const detailsBox = {
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

const valueCellRed = {
  color: "#dc2626",
  fontSize: "13px",
  fontWeight: "600",
  padding: "4px 0",
  width: "45%",
}

const unpaidBox = {
  backgroundColor: "#fef2f2",
  border: "1px solid #fecaca",
  borderRadius: "8px",
  padding: "16px 20px",
  marginBottom: "18px",
}

const memberRow = {
  color: "#374151",
  fontSize: "13px",
  lineHeight: "22px",
  margin: "0 0 4px",
}

const penaltyNote = {
  color: "#dc2626",
  fontSize: "13px",
  lineHeight: "20px",
  margin: "12px 0 0",
  fontWeight: "600",
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
