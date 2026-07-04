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

interface LoanApprovedNotificationEmailProps {
  recipientName: string
  recipientRole?: string
  requesterName: string
  requesterEmail: string
  loanCode: string
  approvedAmount: string
  currency: string
  purpose: string
  termMonths: string
  approvedAt: string
  approvedByName: string
  dueDate?: string
}

const formatDate = (value?: string) => {
  if (!value) return "Not specified"
  return new Date(value).toLocaleString("en-RW", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Kigali",
  })
}

export function LoanApprovedNotificationEmail({
  recipientName,
  recipientRole,
  requesterName,
  requesterEmail,
  loanCode,
  approvedAmount,
  currency,
  purpose,
  termMonths,
  approvedAt,
  approvedByName,
  dueDate,
}: LoanApprovedNotificationEmailProps) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || organisationWebsite
  const isTreasurer = recipientRole === "treasurer"

  const previewText = isTreasurer
    ? `Loan approved by ${approvedByName} — disbursement required for ${requesterName}.`
    : `Loan approved for ${requesterName} — for your oversight.`

  const headingText = isTreasurer
    ? "Loan approved — disbursement required"
    : "Loan approved — oversight notice"

  const message = isTreasurer
    ? `President ${approvedByName} has approved the loan request below. Please proceed with the disbursement at your earliest convenience.`
    : `President ${approvedByName} has approved a loan request. This notification is for your oversight.`

  const buttonLabel = isTreasurer ? "Process Disbursement" : "View Loans"
  const buttonHref = isTreasurer
    ? `${baseUrl}/treasurer/loans/requests`
    : `${baseUrl}/admin/financial/loans`

  const headerBg = isTreasurer ? "#15803d" : "#111827"

  return (
    <Html lang="en">
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={{ ...header, backgroundColor: headerBg }}>
            <Text style={brand}>{organisationName}</Text>
            <Text style={subtitleStyle}>
              {isTreasurer ? "Disbursement Required" : "Loan Approval Notice"}
            </Text>
          </Section>

          <Section style={content}>
            <Heading style={heading}>{headingText}</Heading>
            <Text style={paragraph}>Muraho {recipientName},</Text>
            <Text style={paragraph}>{message}</Text>

            <Section style={details}>
              <Text style={detail}>Member: {requesterName}</Text>
              <Text style={detail}>Email: {requesterEmail}</Text>
              <Text style={detail}>
                Approved amount: {currency} {approvedAmount}
              </Text>
              <Text style={detail}>Purpose: {purpose}</Text>
              <Text style={detail}>Term: {termMonths}</Text>
              <Text style={detail}>Approved by: {approvedByName}</Text>
              <Text style={detail}>Approved at: {formatDate(approvedAt)}</Text>
              <Text style={detail}>Due date: {formatDate(dueDate)}</Text>
              <Text style={detail}>Reference: {loanCode}</Text>
            </Section>

            <Section style={buttonSection}>
              <Button
                href={buttonHref}
                style={{ ...button, backgroundColor: headerBg }}>
                {buttonLabel}
              </Button>
            </Section>

            <Text style={smallText}>
              You received this email because your role is authorized to manage
              loan disbursements.
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

LoanApprovedNotificationEmail.PreviewProps = {
  recipientName: "Treasurer User",
  recipientRole: "treasurer",
  requesterName: "Theogene Iradukunda",
  requesterEmail: "aline@example.com",
  loanCode: "loan_01JABCDEF",
  approvedAmount: "250,000",
  currency: "RWF",
  purpose: "School fees support",
  termMonths: "12 months",
  approvedAt: "2026-03-10T10:00:00.000Z",
  approvedByName: "President Kagabo",
  dueDate: "2027-03-10T00:00:00.000Z",
} satisfies LoanApprovedNotificationEmailProps

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
  textAlign: "center" as const,
  padding: "24px 20px 18px",
}

const brand = {
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "700",
  margin: "0 0 4px",
}

const subtitleStyle = {
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

const buttonSection = {
  textAlign: "center" as const,
  margin: "24px 0 16px",
}

const button = {
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
