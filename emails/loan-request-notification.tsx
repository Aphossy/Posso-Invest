import { organisationName, organisationWebsite } from "@/constants/organisation"
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components"

interface LoanRequestNotificationEmailProps {
  recipientName: string
  recipientRole?: string
  requesterName: string
  requesterEmail: string
  loanCode: string
  requestedAmount: string
  currency: string
  purpose: string
  termMonths: string
  submittedAt: string
}

const formatDate = (value: string) =>
  new Date(value).toLocaleString("en-RW", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Kigali",
  })

function getRoleConfig(role: string | undefined, baseUrl: string) {
  switch (role) {
    case "president":
      return {
        subtitle: "Approval Required",
        previewText: "A loan request is awaiting your approval.",
        headingText: "Loan request awaiting your approval",
        message:
          "As president, your approval is the required step before this loan can be disbursed. Please review the details below and take action in the dashboard.",
        showTreasurerNote: false,
        buttonLabel: "Review & Approve",
        buttonHref: `${baseUrl}/president/loans`,
      }
    case "treasurer":
      return {
        subtitle: "Loan Request Alert",
        previewText: "New loan request received — president approval pending.",
        headingText: "New loan request received",
        message:
          "A member has submitted a loan request. The details are below for your records. The request is currently pending president approval.",
        showTreasurerNote: true,
        buttonLabel: "View Loan Requests",
        buttonHref: `${baseUrl}/treasurer/loans/requests`,
      }
    default:
      return {
        subtitle: "Loan Request Alert",
        previewText: "New loan request submitted — oversight notice.",
        headingText: "New loan request for oversight",
        message:
          "A member has submitted a loan request. This notification is for your oversight.",
        showTreasurerNote: false,
        buttonLabel: "View Loans",
        buttonHref: `${baseUrl}/admin/financial/loans`,
      }
  }
}

export function LoanRequestNotificationEmail({
  recipientName,
  recipientRole,
  requesterName,
  requesterEmail,
  loanCode,
  requestedAmount,
  currency,
  purpose,
  termMonths,
  submittedAt,
}: LoanRequestNotificationEmailProps) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || organisationWebsite
  const config = getRoleConfig(recipientRole, baseUrl)

  return (
    <Html lang="en">
      <Head />
      <Preview>{config.previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={brand}>{organisationName}</Text>
            <Text style={subtitle}>{config.subtitle}</Text>
          </Section>

          <Section style={content}>
            <Heading style={heading}>{config.headingText}</Heading>
            <Text style={paragraph}>Muraho {recipientName},</Text>
            <Text style={paragraph}>{config.message}</Text>

            <Section style={details}>
              <Text style={detail}>Requester: {requesterName}</Text>
              <Text style={detail}>Email: {requesterEmail}</Text>
              <Text style={detail}>
                Requested amount: {currency} {requestedAmount}
              </Text>
              <Text style={detail}>Purpose: {purpose}</Text>
              <Text style={detail}>Term: {termMonths}</Text>
              <Text style={detail}>Submitted: {formatDate(submittedAt)}</Text>
              <Text style={detail}>Reference: {loanCode}</Text>
            </Section>

            {config.showTreasurerNote && (
              <Section style={warningBox}>
                <Text style={warningText}>
                  <strong>Note:</strong> You may begin preparing for
                  disbursement, however disbursing without formal president
                  approval bypasses the standard review process.
                </Text>
              </Section>
            )}

            <Section style={buttonSection}>
              <Button href={config.buttonHref} style={button}>
                {config.buttonLabel}
              </Button>
            </Section>

            <Text style={smallText}>
              You received this email because your role is authorized to review
              loan requests.
            </Text>
          </Section>

          <Section style={footer}>
            <Text style={footerText}>
              <Link href={organisationWebsite} style={link}>
                {organisationWebsite}
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

LoanRequestNotificationEmail.PreviewProps = {
  recipientName: "Jean Paul",
  recipientRole: "president",
  requesterName: "Aline Mukamana",
  requesterEmail: "aline@example.com",
  loanCode: "loan_01JABCDEF",
  requestedAmount: "250,000",
  currency: "RWF",
  purpose: "School fees support",
  termMonths: "12 months",
  submittedAt: "2026-03-03T10:00:00.000Z",
} satisfies LoanRequestNotificationEmailProps

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
  backgroundColor: "#111827",
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
  padding: "24px",
}

const heading = {
  color: "#111827",
  fontSize: "24px",
  fontWeight: "700",
  margin: "0 0 12px",
}

const paragraph = {
  color: "#374151",
  fontSize: "15px",
  lineHeight: "24px",
  margin: "0 0 16px",
}

const details = {
  border: "1px solid #e5e7eb",
  borderRadius: "8px",
  padding: "14px 16px",
  backgroundColor: "#fafafa",
  marginBottom: "18px",
}

const detail = {
  color: "#374151",
  fontSize: "14px",
  lineHeight: "22px",
  margin: "0 0 8px",
}

const warningBox = {
  border: "1px solid #fcd34d",
  borderLeft: "4px solid #f59e0b",
  backgroundColor: "#fffbeb",
  borderRadius: "6px",
  padding: "12px 16px",
  marginBottom: "18px",
}

const warningText = {
  color: "#92400e",
  fontSize: "13px",
  lineHeight: "20px",
  margin: "0",
}

const buttonSection = {
  textAlign: "center" as const,
  margin: "24px 0 16px",
}

const button = {
  backgroundColor: "#111827",
  color: "#ffffff",
  borderRadius: "8px",
  padding: "12px 18px",
  textDecoration: "none",
  fontWeight: "600",
}

const smallText = {
  color: "#6b7280",
  fontSize: "13px",
  lineHeight: "20px",
  margin: "0 0 12px",
}

const footer = {
  borderTop: "1px solid #e5e7eb",
  padding: "18px 24px 24px",
  backgroundColor: "#fafafa",
}

const footerText = {
  color: "#6b7280",
  fontSize: "12px",
  lineHeight: "18px",
  margin: "0 0 8px",
  textAlign: "center" as const,
}

const link = {
  color: "#165598",
  textDecoration: "underline",
}
