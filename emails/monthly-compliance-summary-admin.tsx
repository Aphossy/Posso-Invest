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

interface MonthlyComplianceSummaryAdminEmailProps {
  adminName: string
  periodKey: string
  periodLabel: string
  totalMembers: number
  complianceScore: number
  criticalIssues: number
  warningIssues: number
  totalLoans: number
  activeLoanCount: number
  overdueLoansCount: number
  totalPenalties: number
  activePenaltyCount: number
  suspendedMembersCount: number
}

export function MonthlyComplianceSummaryAdminEmail({
  adminName,
  periodKey,
  periodLabel,
  totalMembers,
  complianceScore,
  criticalIssues,
  warningIssues,
  totalLoans,
  activeLoanCount,
  overdueLoansCount,
  totalPenalties,
  activePenaltyCount,
  suspendedMembersCount,
}: MonthlyComplianceSummaryAdminEmailProps) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || organisationWebsite

  return (
    <Html lang="en">
      <Head />
      <Preview>
        {`Monthly compliance summary for ${periodLabel} - Score: ${complianceScore}%, ${criticalIssues} critical issues`}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={brand}>{organisationName}</Text>
            <Text style={subtitle}>Admin Report - Monthly Compliance</Text>
          </Section>

          <Section style={content}>
            <Heading style={heading}>
              Organizational compliance summary - {periodLabel}
            </Heading>
            <Text style={paragraph}>Muraho {adminName},</Text>
            <Text style={paragraph}>
              Here is your comprehensive organizational compliance report for{" "}
              <strong>{periodLabel}</strong>. This includes all critical metrics
              and issues requiring oversight.
            </Text>

            <Section style={scoreBox}>
              <Text style={scoreLabel}>Overall Compliance Score</Text>
              <Text style={scoreValue}>{complianceScore}%</Text>
              <Text style={scoreSubtext}>
                {complianceScore >= 80
                  ? "Good standing"
                  : complianceScore >= 60
                    ? "Needs improvement"
                    : "Critical attention required"}
              </Text>
            </Section>

            <Section style={statusBox}>
              <Text style={sectionTitle}>Critical Metrics</Text>
              <table style={statusTable}>
                <tbody>
                  <tr>
                    <td style={statusLabelCell}>Total Members</td>
                    <td style={statusValueCell}>{totalMembers}</td>
                  </tr>
                  <tr>
                    <td style={statusLabelCell}>Critical Issues</td>
                    <td
                      style={
                        criticalIssues > 0 ? statusBadgeRed : statusBadgeGreen
                      }>
                      {criticalIssues}
                    </td>
                  </tr>
                  <tr>
                    <td style={statusLabelCell}>Warning Issues</td>
                    <td
                      style={
                        warningIssues > 0 ? statusBadgeAmber : statusBadgeGreen
                      }>
                      {warningIssues}
                    </td>
                  </tr>
                  <tr>
                    <td style={statusLabelCell}>Suspended Members</td>
                    <td
                      style={
                        suspendedMembersCount > 0
                          ? statusBadgeRed
                          : statusBadgeGreen
                      }>
                      {suspendedMembersCount}
                    </td>
                  </tr>
                </tbody>
              </table>
            </Section>

            <Section style={statusBox}>
              <Text style={sectionTitle}>Financial Overview</Text>
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
                    <td style={statusLabelCell}>Overdue Loans</td>
                    <td
                      style={
                        overdueLoansCount > 0
                          ? statusBadgeRed
                          : statusBadgeGreen
                      }>
                      {overdueLoansCount}
                    </td>
                  </tr>
                  <tr>
                    <td style={statusLabelCell}>Total Penalties</td>
                    <td style={statusValueCell}>{totalPenalties}</td>
                  </tr>
                  <tr>
                    <td style={statusLabelCell}>Active Penalties</td>
                    <td
                      style={
                        activePenaltyCount > 0
                          ? statusBadgeRed
                          : statusBadgeGreen
                      }>
                      {activePenaltyCount}
                    </td>
                  </tr>
                </tbody>
              </table>
            </Section>

            {criticalIssues > 0 && (
              <Section style={alertBox}>
                <Text style={alertText}>
                  ⚠️ <strong>{criticalIssues} critical issue(s)</strong> require
                  immediate attention. Please review the admin dashboard for
                  details and take appropriate action.
                </Text>
              </Section>
            )}

            <Section style={buttonSection}>
              <Button href={`${baseUrl}/admin/dashboard`} style={primaryButton}>
                Open Admin Dashboard
              </Button>
            </Section>

            <Hr style={divider} />

            <Text style={smallText}>
              This report is generated monthly for the period{" "}
              <strong>{periodKey}</strong>. For detailed analytics and
              configurations, visit the admin dashboard or contact{" "}
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

MonthlyComplianceSummaryAdminEmail.PreviewProps = {
  adminName: "Admin User",
  periodKey: "2026-04",
  periodLabel: "April 2026",
  totalMembers: 45,
  complianceScore: 78,
  criticalIssues: 2,
  warningIssues: 5,
  totalLoans: 8,
  activeLoanCount: 3,
  overdueLoansCount: 1,
  totalPenalties: 12,
  activePenaltyCount: 2,
  suspendedMembersCount: 1,
} satisfies MonthlyComplianceSummaryAdminEmailProps

export default MonthlyComplianceSummaryAdminEmail

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

const scoreBox = {
  backgroundColor: "#f3f4f6",
  border: "2px solid #004225",
  borderRadius: "8px",
  padding: "20px",
  textAlign: "center" as const,
  marginBottom: "20px",
}

const scoreLabel = {
  color: "#6b7280",
  fontSize: "12px",
  fontWeight: "600",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  margin: "0 0 8px",
}

const scoreValue = {
  color: "#004225",
  fontSize: "36px",
  fontWeight: "700",
  margin: "0 0 8px",
}

const scoreSubtext = {
  color: "#6b7280",
  fontSize: "13px",
  margin: "0",
}

const sectionTitle = {
  color: "#004225",
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
  backgroundColor: "#fee2e2",
  border: "1px solid #fca5a5",
  borderRadius: "8px",
  padding: "14px 18px",
  marginBottom: "20px",
}

const alertText = {
  color: "#991b1b",
  fontSize: "14px",
  lineHeight: "22px",
  margin: "0",
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
