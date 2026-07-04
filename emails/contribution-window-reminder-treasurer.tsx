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

export interface UnpaidMemberItem {
  name: string
  email: string
}

interface ContributionWindowReminderTreasurerEmailProps {
  treasurerName: string
  period: string
  periodLabel: string
  windowEnd: string
  daysRemaining: number
  totalMembers: number
  paidCount: number
  unpaidMembers: UnpaidMemberItem[]
  amountCollected: string
  amountExpected: string
  currency: string
}

export function ContributionWindowReminderTreasurerEmail({
  treasurerName,
  period,
  periodLabel,
  windowEnd,
  daysRemaining,
  totalMembers,
  paidCount,
  unpaidMembers,
  amountCollected,
  amountExpected,
  currency,
}: ContributionWindowReminderTreasurerEmailProps) {
  const baseUrl = organisationWebsite
  const unpaidCount = totalMembers - paidCount

  return (
    <Html lang="en">
      <Head />
      <Preview>
        {`${daysRemaining} days left - ${unpaidCount} members have not yet paid for ${periodLabel}.`}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={brand}>{organisationName}</Text>
            <Text style={subtitle}>Treasurer - Contribution Reminder</Text>
          </Section>

          <Section style={content}>
            <Heading style={heading}>
              ⏰ {String(daysRemaining)} days until window closes
            </Heading>
            <Text style={paragraph}>Muraho {treasurerName},</Text>
            <Text style={paragraph}>
              The contribution window for <strong>{periodLabel}</strong> closes
              on <strong>{windowEnd}</strong>. Here is the current payment
              status. Please follow up with members who have not yet paid.
            </Text>

            <Section style={statsGrid}>
              <table style={statsTable}>
                <tbody>
                  <tr>
                    <td style={statBox}>
                      <Text style={statNumber}>{String(paidCount)}</Text>
                      <Text style={statLabel}>Paid</Text>
                    </td>
                    <td style={statBoxWarning}>
                      <Text style={statNumberWarning}>
                        {String(unpaidCount)}
                      </Text>
                      <Text style={statLabelWarning}>Unpaid</Text>
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
                    <td style={labelCell}>Window closes</td>
                    <td style={valueCell}>
                      <strong>{windowEnd}</strong>
                    </td>
                  </tr>
                  <tr>
                    <td style={labelCell}>Days remaining</td>
                    <td style={valueCell}>
                      <strong>{String(daysRemaining)} days</strong>
                    </td>
                  </tr>
                  <tr>
                    <td style={labelCell}>Collected so far</td>
                    <td style={valueCell}>
                      {currency} {amountCollected}
                    </td>
                  </tr>
                  <tr>
                    <td style={labelCell}>Total expected</td>
                    <td style={valueCell}>
                      {currency} {amountExpected}
                    </td>
                  </tr>
                </tbody>
              </table>
            </Section>

            {unpaidMembers.length > 0 && (
              <Section style={unpaidBox}>
                <Text style={sectionTitle}>
                  Members who have not paid ({String(unpaidCount)})
                </Text>
                {unpaidMembers.map((m, i) => (
                  <Text key={i} style={memberRow}>
                    {i + 1}. <strong>{m.name}</strong> - {m.email}
                  </Text>
                ))}
              </Section>
            )}

            <Text style={actionText}>
              Reminder emails have been sent automatically to the members above.
              You may also follow up directly with them.
            </Text>

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

ContributionWindowReminderTreasurerEmail.PreviewProps = {
  treasurerName: "Wiclef Hirwa",
  period: "2026-02",
  periodLabel: "February 2026",
  windowEnd: "6 March 2026",
  daysRemaining: 3,
  totalMembers: 11,
  paidCount: 7,
  unpaidMembers: [
    { name: "Aline Mukamana", email: "aline@example.com" },
    { name: "Jean Baptiste", email: "jean@example.com" },
    { name: "Marie Claire", email: "marie@example.com" },
    { name: "Eric Mutabazi", email: "eric@example.com" },
  ],
  amountCollected: "560,000",
  amountExpected: "880,000",
  currency: "RWF",
} satisfies ContributionWindowReminderTreasurerEmailProps

export default ContributionWindowReminderTreasurerEmail

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

const statBoxWarning = {
  textAlign: "center" as const,
  backgroundColor: "#fffbeb",
  border: "1px solid #fde68a",
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

const statNumberWarning = {
  color: "#92400e",
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

const statLabelWarning = {
  color: "#b45309",
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
  width: "50%",
}

const valueCell = {
  color: "#111827",
  fontSize: "13px",
  padding: "4px 0",
  width: "50%",
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

const actionText = {
  color: "#6b7280",
  fontSize: "13px",
  lineHeight: "20px",
  margin: "0 0 20px",
  fontStyle: "italic" as const,
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
