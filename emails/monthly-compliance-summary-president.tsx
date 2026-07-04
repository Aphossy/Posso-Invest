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

interface MonthlyComplianceSummaryPresidentEmailProps {
  presidentName: string
  periodKey: string
  periodLabel: string
  totalMembers: number
  activeMembers: number
  membershipChangePercentage: number
  organizationalScore: number
  criticalActionItems: number
  upcomingDeadlines: number
  memberEngagementRate: number
  financialHealthStatus: string
}

export function MonthlyComplianceSummaryPresidentEmail({
  presidentName,
  periodKey,
  periodLabel,
  totalMembers,
  activeMembers,
  membershipChangePercentage,
  organizationalScore,
  criticalActionItems,
  upcomingDeadlines,
  memberEngagementRate,
  financialHealthStatus,
}: MonthlyComplianceSummaryPresidentEmailProps) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || organisationWebsite

  return (
    <Html lang="en">
      <Head />
      <Preview>
        {`Executive summary for ${periodLabel} - Score: ${organizationalScore}%, ${totalMembers} members`}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={brand}>{organisationName}</Text>
            <Text style={subtitle}>President Report - Monthly Compliance</Text>
          </Section>

          <Section style={content}>
            <Heading style={heading}>Executive summary - {periodLabel}</Heading>
            <Text style={paragraph}>Muraho {presidentName},</Text>
            <Text style={paragraph}>
              Here is your executive summary for <strong>{periodLabel}</strong>.
              This report provides a high-level overview of organizational
              health and critical action items.
            </Text>

            <Section style={scoreBox}>
              <Text style={scoreLabel}>Organizational Health Score</Text>
              <Text style={scoreValue}>{organizationalScore}%</Text>
              <Text style={scoreSubtext}>
                {organizationalScore >= 80
                  ? "Excellent"
                  : organizationalScore >= 60
                    ? "Satisfactory"
                    : "Requires improvement"}
              </Text>
            </Section>

            <Section style={statusBox}>
              <Text style={sectionTitle}>Membership Summary</Text>
              <table style={statusTable}>
                <tbody>
                  <tr>
                    <td style={statusLabelCell}>Total Members</td>
                    <td style={statusValueCell}>{totalMembers}</td>
                  </tr>
                  <tr>
                    <td style={statusLabelCell}>Active Members</td>
                    <td style={statusBadgeGreen}>{activeMembers}</td>
                  </tr>
                  <tr>
                    <td style={statusLabelCell}>Membership Change</td>
                    <td
                      style={
                        membershipChangePercentage > 0
                          ? statusValueCell
                          : statusValueCell
                      }>
                      {membershipChangePercentage > 0 ? "+" : ""}
                      {membershipChangePercentage}%
                    </td>
                  </tr>
                  <tr>
                    <td style={statusLabelCell}>Member Engagement</td>
                    <td style={statusValueCell}>{memberEngagementRate}%</td>
                  </tr>
                </tbody>
              </table>
            </Section>

            <Section style={statusBox}>
              <Text style={sectionTitle}>Organizational Status</Text>
              <table style={statusTable}>
                <tbody>
                  <tr>
                    <td style={statusLabelCell}>Critical Action Items</td>
                    <td
                      style={
                        criticalActionItems > 0
                          ? statusBadgeRed
                          : statusBadgeGreen
                      }>
                      {criticalActionItems}
                    </td>
                  </tr>
                  <tr>
                    <td style={statusLabelCell}>Upcoming Deadlines</td>
                    <td
                      style={
                        upcomingDeadlines > 0
                          ? statusBadgeAmber
                          : statusBadgeGreen
                      }>
                      {upcomingDeadlines}
                    </td>
                  </tr>
                  <tr>
                    <td style={statusLabelCell}>Financial Health</td>
                    <td
                      style={
                        financialHealthStatus === "at-risk"
                          ? statusBadgeRed
                          : financialHealthStatus === "caution"
                            ? statusBadgeAmber
                            : statusBadgeGreen
                      }>
                      {financialHealthStatus === "healthy"
                        ? "Healthy"
                        : financialHealthStatus === "caution"
                          ? "Caution"
                          : "At Risk"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </Section>

            {criticalActionItems > 0 && (
              <Section style={alertBox}>
                <Text style={alertText}>
                  ⚠️ There are{" "}
                  <strong>{criticalActionItems} critical action item(s)</strong>{" "}
                  requiring leadership attention. Please review the dashboard
                  for details.
                </Text>
              </Section>
            )}

            <Section style={buttonSection}>
              <Button
                href={`${baseUrl}/president/dashboard`}
                style={primaryButton}>
                Open President Dashboard
              </Button>
            </Section>

            <Hr style={divider} />

            <Text style={smallText}>
              This executive summary is generated monthly for the period{" "}
              <strong>{periodKey}</strong>. For detailed reports and analytics,
              access the president dashboard or contact{" "}
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

MonthlyComplianceSummaryPresidentEmail.PreviewProps = {
  presidentName: "Emmanuel Nkurunziza",
  periodKey: "2026-04",
  periodLabel: "April 2026",
  totalMembers: 45,
  activeMembers: 42,
  membershipChangePercentage: 2,
  organizationalScore: 82,
  criticalActionItems: 1,
  upcomingDeadlines: 2,
  memberEngagementRate: 88,
  financialHealthStatus: "healthy",
} satisfies MonthlyComplianceSummaryPresidentEmailProps

export default MonthlyComplianceSummaryPresidentEmail

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

const scoreBox = {
  backgroundColor: "#f3f4f6",
  border: "2px solid #165598",
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
  color: "#165598",
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
