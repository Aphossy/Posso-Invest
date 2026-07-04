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

interface MonthlyComplianceSummarySecretaryEmailProps {
  secretaryName: string
  periodKey: string
  periodLabel: string
  totalMembers: number
  activeMembers: number
  inactiveMembers: number
  suspendedMembers: number
  newMembersThisMonth: number
  departedMembersThisMonth: number
  pendingIssuesCount: number
}

export function MonthlyComplianceSummarySecretaryEmail({
  secretaryName,
  periodKey,
  periodLabel,
  totalMembers,
  activeMembers,
  inactiveMembers,
  suspendedMembers,
  newMembersThisMonth,
  departedMembersThisMonth,
  pendingIssuesCount,
}: MonthlyComplianceSummarySecretaryEmailProps) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || organisationWebsite

  return (
    <Html lang="en">
      <Head />
      <Preview>
        {`Monthly compliance summary for ${periodLabel} - ${totalMembers} members, ${pendingIssuesCount} items need attention`}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={brand}>{organisationName}</Text>
            <Text style={subtitle}>Secretary Report - Monthly Compliance</Text>
          </Section>

          <Section style={content}>
            <Heading style={heading}>
              Membership compliance report - {periodLabel}
            </Heading>
            <Text style={paragraph}>Muraho {secretaryName},</Text>
            <Text style={paragraph}>
              Here is your monthly membership and compliance summary for{" "}
              <strong>{periodLabel}</strong>. This report provides an overview
              of member status and organizational issues.
            </Text>

            <Section style={statusBox}>
              <Text style={sectionTitle}>Membership Overview</Text>
              <table style={statusTable}>
                <tbody>
                  <tr>
                    <td style={statusLabelCell}>Total Members</td>
                    <td style={statusValueCell}>{totalMembers}</td>
                  </tr>
                  <tr>
                    <td style={statusLabelCell}>Active</td>
                    <td style={statusBadgeGreen}>{activeMembers}</td>
                  </tr>
                  <tr>
                    <td style={statusLabelCell}>Inactive</td>
                    <td style={statusBadgeAmber}>{inactiveMembers}</td>
                  </tr>
                  <tr>
                    <td style={statusLabelCell}>Suspended</td>
                    <td style={statusBadgeRed}>{suspendedMembers}</td>
                  </tr>
                </tbody>
              </table>
            </Section>

            <Section style={statusBox}>
              <Text style={sectionTitle}>Member Changes</Text>
              <table style={statusTable}>
                <tbody>
                  <tr>
                    <td style={statusLabelCell}>New Members</td>
                    <td style={statusValueCell}>{newMembersThisMonth}</td>
                  </tr>
                  <tr>
                    <td style={statusLabelCell}>Members Departed</td>
                    <td style={statusValueCell}>{departedMembersThisMonth}</td>
                  </tr>
                  <tr>
                    <td style={statusLabelCell}>
                      <strong>Items Requiring Attention</strong>
                    </td>
                    <td
                      style={
                        pendingIssuesCount > 0
                          ? statusBadgeRed
                          : statusBadgeGreen
                      }>
                      {pendingIssuesCount}
                    </td>
                  </tr>
                </tbody>
              </table>
            </Section>

            {pendingIssuesCount > 0 && (
              <Section style={alertBox}>
                <Text style={alertText}>
                  There are <strong>{pendingIssuesCount} item(s)</strong> that
                  require your attention for <strong>{periodLabel}</strong>.
                  Please review the dashboard for member status updates,
                  suspensions, or other administrative matters.
                </Text>
              </Section>
            )}

            <Section style={buttonSection}>
              <Button
                href={`${baseUrl}/secretary/dashboard`}
                style={primaryButton}>
                Open Secretary Dashboard
              </Button>
            </Section>

            <Hr style={divider} />

            <Text style={smallText}>
              This report is generated monthly for the period{" "}
              <strong>{periodKey}</strong>. For questions, contact{" "}
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

MonthlyComplianceSummarySecretaryEmail.PreviewProps = {
  secretaryName: "Marie Ntukanyata",
  periodKey: "2026-04",
  periodLabel: "April 2026",
  totalMembers: 45,
  activeMembers: 42,
  inactiveMembers: 2,
  suspendedMembers: 1,
  newMembersThisMonth: 2,
  departedMembersThisMonth: 0,
  pendingIssuesCount: 3,
} satisfies MonthlyComplianceSummarySecretaryEmailProps

export default MonthlyComplianceSummarySecretaryEmail

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
