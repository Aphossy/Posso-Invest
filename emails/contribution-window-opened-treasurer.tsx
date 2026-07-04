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

export interface MemberListItem {
  name: string
  email: string
}

interface ContributionWindowOpenedTreasurerEmailProps {
  treasurerName: string
  period: string
  periodLabel: string
  windowStart: string
  windowEnd: string
  daysRemaining: number
  totalMembers: number
  members: MemberListItem[]
  amountPerMember: string
  totalExpected: string
  currency: string
}

export function ContributionWindowOpenedTreasurerEmail({
  treasurerName,
  period,
  periodLabel,
  windowStart,
  windowEnd,
  daysRemaining,
  totalMembers,
  members,
  amountPerMember,
  totalExpected,
  currency,
}: ContributionWindowOpenedTreasurerEmailProps) {
  const baseUrl = organisationWebsite

  return (
    <Html lang="en">
      <Head />
      <Preview>
        {`Contribution window for ${periodLabel} opened - ${totalMembers} members to track.`}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={brand}>{organisationName}</Text>
            <Text style={subtitle}>Treasurer - Window Opened Notification</Text>
          </Section>

          <Section style={content}>
            <Heading style={heading}>Contribution window opened</Heading>
            <Text style={paragraph}>Muraho {treasurerName},</Text>
            <Text style={paragraph}>
              The contribution window for <strong>{periodLabel}</strong> is now
              open. All members have been notified by email. Below is a summary
              and your task list for this cycle. 
            </Text>

            <Section style={windowBox}>
              <Text style={sectionTitle}>Window Summary</Text>
              <table style={detailsTable}>
                <tbody>
                  <tr>
                    <td style={labelCell}>Period</td>
                    <td style={valueCell}>
                      {periodLabel} ({period})
                    </td>
                  </tr>
                  <tr>
                    <td style={labelCell}>Opens</td>
                    <td style={valueCell}>{windowStart}</td>
                  </tr>
                  <tr>
                    <td style={labelCell}>Closes</td>
                    <td style={valueCell}>{windowEnd}</td>
                  </tr>
                  <tr>
                    <td style={labelCell}>Days remaining</td>
                    <td style={valueCell}>
                      <strong>{String(daysRemaining)} days</strong>
                    </td>
                  </tr>
                  <tr>
                    <td style={labelCell}>Members to collect from</td>
                    <td style={valueCell}>{totalMembers}</td>
                  </tr>
                  <tr>
                    <td style={labelCell}>Amount per member</td>
                    <td style={valueCell}>
                      {currency} {amountPerMember}
                    </td>
                  </tr>
                  <tr>
                    <td style={labelCell}>Total expected</td>
                    <td style={{ ...valueCell, fontWeight: "700" }}>
                      {currency} {totalExpected}
                    </td>
                  </tr>
                </tbody>
              </table>
            </Section>

            <Section style={tasksBox}>
              <Text style={sectionTitle}>Your tasks this cycle</Text>
              <Text style={taskItem}>
                ☐ Confirm contributions as members pay
              </Text>
              <Text style={taskItem}>
                ☐ Record late contributions after {windowEnd}
              </Text>
              <Text style={taskItem}>
                ☐ Apply penalties for late or missing contributions
              </Text>
              <Text style={taskItem}>
                ☐ Follow up with members who haven't paid by the 3rd
              </Text>
              <Text style={taskItem}>
                ☐ Send final reminders on {windowEnd}
              </Text>
            </Section>

            <Section style={membersBox}>
              <Text style={sectionTitle}>
                All members ({totalMembers}) - awaiting contributions
              </Text>
              {members.map((m, i) => (
                <Text key={i} style={memberRow}>
                  {i + 1}. <strong>{m.name}</strong> - {m.email}
                </Text>
              ))}
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

ContributionWindowOpenedTreasurerEmail.PreviewProps = {
  treasurerName: "Wiclef Hirwa",
  period: "2026-02",
  periodLabel: "February 2026",
  windowStart: "25 February 2026",
  windowEnd: "6 March 2026",
  daysRemaining: 10,
  totalMembers: 11,
  members: [
    { name: "Aline Mukamana", email: "aline@example.com" },
    { name: "Jean Baptiste", email: "jean@example.com" },
    { name: "Marie Claire", email: "marie@example.com" },
  ],
  amountPerMember: "80,000",
  totalExpected: "880,000",
  currency: "RWF",
} satisfies ContributionWindowOpenedTreasurerEmailProps

export default ContributionWindowOpenedTreasurerEmail

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

const sectionTitle = {
  color: "#004225",
  fontSize: "13px",
  fontWeight: "700",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  margin: "0 0 12px",
}

const windowBox = {
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
  verticalAlign: "top" as const,
}

const valueCell = {
  color: "#111827",
  fontSize: "13px",
  padding: "4px 0",
  width: "50%",
  verticalAlign: "top" as const,
}

const tasksBox = {
  backgroundColor: "#eff6ff",
  border: "1px solid #bfdbfe",
  borderRadius: "8px",
  padding: "16px 20px",
  marginBottom: "18px",
}

const taskItem = {
  color: "#1e3a5f",
  fontSize: "13px",
  lineHeight: "22px",
  margin: "0 0 4px",
}

const membersBox = {
  border: "1px solid #e5e7eb",
  borderRadius: "8px",
  padding: "16px 20px",
  backgroundColor: "#fafafa",
  marginBottom: "18px",
}

const memberRow = {
  color: "#374151",
  fontSize: "13px",
  lineHeight: "22px",
  margin: "0 0 4px",
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
