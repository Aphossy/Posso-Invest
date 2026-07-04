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

interface LeadershipEmailProps {
  leaderName: string
  period: string
  periodLabel: string
  windowEnd: string
  daysRemaining: number
  totalMembers: number
  paidCount: number
  unpaidMembers: { name: string; email: string }[]
  amountCollected: string
  amountExpected: string
  currency: string
}

export function ContributionWindowLeadershipEmail({
  leaderName,
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
}: LeadershipEmailProps) {
  const baseUrl = organisationWebsite
  const unpaidCount = totalMembers - paidCount

  return (
    <Html lang="en">
      <Head />
      <Preview>
        {`${daysRemaining} days left - ${unpaidCount} members have not paid for ${periodLabel}.`}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={brand}>{organisationName}</Text>
            <Text style={subtitle}>Leadership - Contribution Summary</Text>
          </Section>

          <Section style={content}>
            <Heading style={heading}>
              ⏰ {String(daysRemaining)} days until window closes
            </Heading>
            <Text style={paragraph}>Muraho {leaderName},</Text>
            <Text style={paragraph}>
              The contribution window for <strong>{periodLabel}</strong> closes
              on <strong>{windowEnd}</strong>. Below is the current collection
              status for leadership awareness.
            </Text>

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
              This message is for leadership awareness. If follow-up is required
              you may contact the treasurer or reach out directly to members.
            </Text>

            <Section style={buttonSection}>
              <Button href={`${baseUrl}/login`} style={primaryButton}>
                View Contributions
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

export default ContributionWindowLeadershipEmail

ContributionWindowLeadershipEmail.PreviewProps = {
  leaderName: "Alex Uwimana",
  period: "2026-05",
  periodLabel: "May 2026",
  windowEnd: "10 May 2026",
  daysRemaining: 5,
  totalMembers: 12,
  paidCount: 7,
  unpaidMembers: [
    { name: "Jean Bosco", email: "jean@example.com" },
    { name: "Marta Uwase", email: "marta@example.com" },
    { name: "Olivier", email: "olivier@example.com" },
  ],
  amountCollected: "420,000",
  amountExpected: "720,000",
  currency: "RWF",
} satisfies LeadershipEmailProps

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
  backgroundColor: "#1f2937",
  textAlign: "center" as const,
  padding: "24px 20px 18px",
}
const brand = {
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "700",
  margin: "0 0 4px",
}
const subtitle = { color: "#e5e7eb", fontSize: "12px", margin: "0" }
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
const detailsBox = { padding: "12px 0 18px" }
const sectionTitle = {
  color: "#374151",
  fontSize: "15px",
  fontWeight: "600",
  margin: "0 0 8px",
}
const detailsTable = { width: "100%" }
const link = { color: "#2563eb", textDecoration: "none" }
const labelCell = { width: "40%", color: "#6b7280", padding: "6px 0" }
const valueCell = { color: "#111827", padding: "6px 0" }
const unpaidBox = { marginTop: "14px" }
const memberRow = { color: "#374151", fontSize: "14px", margin: "6px 0" }
const actionText = { color: "#6b7280", fontSize: "13px", margin: "12px 0 18px" }
const buttonSection = { textAlign: "center" as const, margin: "18px 0" }
const primaryButton = {
  backgroundColor: "#2563eb",
  color: "#ffffff",
  padding: "12px 18px",
  borderRadius: "8px",
  textDecoration: "none",
}
const divider = { borderColor: "#e6ebf1", margin: "18px 0" }
const smallText = { color: "#6b7280", fontSize: "13px" }
const footer = { textAlign: "center" as const, padding: "12px 20px 20px" }
const footerText = { color: "#9ca3af", fontSize: "12px" }
