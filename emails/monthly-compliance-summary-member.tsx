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

interface MonthlyComplianceSummaryMemberEmailProps {
  memberName: string
  periodKey: string
  periodLabel: string
  pendingContribution: boolean
  activeLoanCount: number
  activePenaltyCount: number
}

export function MonthlyComplianceSummaryMemberEmail({
  memberName,
  periodKey,
  periodLabel,
  pendingContribution,
  activeLoanCount,
  activePenaltyCount,
}: MonthlyComplianceSummaryMemberEmailProps) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || organisationWebsite
  const issueCount =
    (pendingContribution ? 1 : 0) +
    (activeLoanCount > 0 ? 1 : 0) +
    (activePenaltyCount > 0 ? 1 : 0)

  return (
    <Html lang="en">
      <Head />
      <Preview>
        {`Your compliance summary for ${periodLabel} - ${issueCount} item${issueCount !== 1 ? "s" : ""} need${issueCount === 1 ? "s" : ""} your attention.`}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={brand}>{organisationName}</Text>
            <Text style={subtitle}>Monthly Compliance Summary</Text>
          </Section>

          <Section style={content}>
            <Heading style={heading}>
              Compliance summary - {periodLabel}
            </Heading>
            <Text style={paragraph}>Muraho {memberName},</Text>
            <Text style={paragraph}>
              Here is your compliance snapshot for{" "}
              <strong>{periodLabel}</strong>. Please review the items below and
              take action where needed.
            </Text>

            <Section style={statusBox}>
              <Text style={sectionTitle}>Status overview</Text>
              <table style={statusTable}>
                <tbody>
                  <tr>
                    <td style={statusLabelCell}>Contribution</td>
                    <td
                      style={
                        pendingContribution ? statusBadgeRed : statusBadgeGreen
                      }>
                      {pendingContribution ? "Pending" : "Up to date"}
                    </td>
                  </tr>
                  <tr>
                    <td style={statusLabelCell}>Active loans</td>
                    <td
                      style={
                        activeLoanCount > 0
                          ? statusBadgeAmber
                          : statusBadgeGreen
                      }>
                      {activeLoanCount > 0 ? String(activeLoanCount) : "None"}
                    </td>
                  </tr>
                  <tr>
                    <td style={statusLabelCell}>Active penalties</td>
                    <td
                      style={
                        activePenaltyCount > 0
                          ? statusBadgeRed
                          : statusBadgeGreen
                      }>
                      {activePenaltyCount > 0
                        ? String(activePenaltyCount)
                        : "None"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </Section>

            {pendingContribution && (
              <Section style={alertBox}>
                <Text style={alertText}>
                  Your contribution for <strong>{periodLabel}</strong> has not
                  been recorded yet. Please contact your treasurer or pay before
                  the window closes to avoid a penalty.
                </Text>
              </Section>
            )}

            <Section style={buttonSection}>
              <Button
                href={`${baseUrl}/member/dashboard`}
                style={primaryButton}>
                Open My Dashboard
              </Button>
            </Section>

            <Hr style={divider} />

            <Text style={smallText}>
              This summary is generated monthly for the period{" "}
              <strong>{periodKey}</strong>. Questions? Contact us at{" "}
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

MonthlyComplianceSummaryMemberEmail.PreviewProps = {
  memberName: "Aline Mukamana",
  periodKey: "2026-04",
  periodLabel: "April 2026",
  pendingContribution: true,
  activeLoanCount: 1,
  activePenaltyCount: 0,
} satisfies MonthlyComplianceSummaryMemberEmailProps

export default MonthlyComplianceSummaryMemberEmail

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
