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

interface LoanNearDueReminderEmailProps {
  recipientName: string
  recipientRole?: string
  requesterName: string
  requesterEmail?: string
  loanCode: string
  approvedAmount: string
  currency: string
  dueDate: string
  daysUntilDue: number
}

const formatDate = (value: string) =>
  new Date(value).toLocaleString("en-RW", {
    dateStyle: "long",
    timeZone: "Africa/Kigali",
  })

export function LoanNearDueReminderEmail({
  recipientName,
  recipientRole,
  requesterName,
  requesterEmail,
  loanCode,
  approvedAmount,
  currency,
  dueDate,
  daysUntilDue,
}: LoanNearDueReminderEmailProps) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || organisationWebsite
  const isMember = !recipientRole || recipientRole === "member"
  const isUrgent = daysUntilDue <= 3
  const dayLabel = daysUntilDue === 1 ? "1 day" : `${daysUntilDue} days`

  const buttonHref = isMember
    ? `${baseUrl}/member/loans`
    : recipientRole === "president"
      ? `${baseUrl}/president/loans`
      : recipientRole === "treasurer"
        ? `${baseUrl}/treasurer/loans/requests`
        : `${baseUrl}/admin/financial/loans`

  const previewText = isMember
    ? `${isUrgent ? "URGENT: " : ""}Your loan repayment is due in ${dayLabel}.`
    : `${isUrgent ? "URGENT: " : ""}Loan due in ${dayLabel} — ${requesterName}.`

  const headingText = isMember
    ? `Your loan is due in ${dayLabel}`
    : `Loan due in ${dayLabel} — ${requesterName}`

  const message = isMember
    ? `This is a reminder that your loan repayment is due in ${dayLabel}. Please ensure you have made the necessary arrangements to repay on time to avoid any penalties.`
    : `The following loan is due in ${dayLabel}. Please follow up as appropriate.`

  const headerBg = isUrgent ? "#b45309" : "#111827"

  return (
    <Html lang="en">
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={{ ...header, backgroundColor: headerBg }}>
            <Text style={brand}>{organisationName}</Text>
            <Text style={subtitle}>Loan Due Date Reminder</Text>
          </Section>

          <Section style={content}>
            <Heading style={heading}>{headingText}</Heading>
            <Text style={paragraph}>Muraho {recipientName},</Text>
            <Text style={paragraph}>{message}</Text>

            <Section style={details}>
              {!isMember && <Text style={detail}>Member: {requesterName}</Text>}
              {!isMember && requesterEmail && (
                <Text style={detail}>Email: {requesterEmail}</Text>
              )}
              <Text style={detail}>
                Amount: {currency} {approvedAmount}
              </Text>
              <Text style={detail}>Due date: {formatDate(dueDate)}</Text>
              <Text style={detail}>Days remaining: {dayLabel}</Text>
              <Text style={detail}>Reference: {loanCode}</Text>
            </Section>

            <Section style={buttonSection}>
              <Button
                href={buttonHref}
                style={{ ...button, backgroundColor: headerBg }}>
                {isMember ? "View My Loans" : "View Loans"}
              </Button>
            </Section>

            <Text style={smallText}>
              You received this reminder because a loan associated with your
              account is approaching its due date.
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

LoanNearDueReminderEmail.PreviewProps = {
  recipientName: "Theogene Iradukunda",
  recipientRole: "member",
  requesterName: "",
  requesterEmail: "aline@example.com",
  loanCode: "loan_01JABCDEF",
  approvedAmount: "250,000",
  currency: "RWF",
  dueDate: "2027-03-10T00:00:00.000Z",
  daysUntilDue: 7,
} satisfies LoanNearDueReminderEmailProps

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
  color: "#004225",
  textDecoration: "underline",
}
