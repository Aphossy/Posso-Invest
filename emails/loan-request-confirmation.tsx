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
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components"

interface LoanRequestConfirmationEmailProps {
  name: string
  loanCode: string
  requestedAmount: string
  currency: string
  purpose: string
  termMonths: string
  createdAt: string
}

const formatDate = (value: string) =>
  new Date(value).toLocaleString("en-RW", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Kigali",
  })

export function LoanRequestConfirmationEmail({
  name,
  loanCode,
  requestedAmount,
  currency,
  purpose,
  termMonths,
  createdAt,
}: LoanRequestConfirmationEmailProps) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || organisationWebsite

  return (
    <Html lang="en">
      <Head />
      <Preview>
        Your loan request {loanCode} has been received and is awaiting review.
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={brand}>{organisationName}</Text>
            <Text style={subtitle}>Loan Request Confirmation</Text>
          </Section>

          <Section style={content}>
            <Heading style={heading}>Loan request received</Heading>
            <Text style={paragraph}>Muraho {name},</Text>
            <Text style={paragraph}>
              We have received your loan request and it is now waiting for
              review by the leadership team.
            </Text>

            <Section style={card}>
              <Text style={label}>Reference code</Text>
              <Text style={reference}>{loanCode}</Text>
            </Section>

            <Section style={details}>
              <Text style={detail}>
                Requested amount: {currency} {requestedAmount}
              </Text>
              <Text style={detail}>Purpose: {purpose}</Text>
              <Text style={detail}>Term: {termMonths}</Text>
              <Text style={detail}>Submitted: {formatDate(createdAt)}</Text>
            </Section>

            <Text style={paragraph}>
              Please keep this reference for follow-up. You will be notified
              once the request is reviewed.
            </Text>

            <Section style={buttonSection}>
              <Button href={`${baseUrl}/member/loans`} style={button}>
                View My Loans
              </Button>
            </Section>

            <Text style={smallText}>
              If you did not submit this request, contact us at{" "}
              <Link href={`mailto:${organisationEmail}`} style={link}>
                {organisationEmail}
              </Link>
              .
            </Text>
          </Section>

          <Section style={footer}>
            <Text style={footerText}>
              You received this email because a loan request was submitted with
              your account.
            </Text>
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

LoanRequestConfirmationEmail.PreviewProps = {
  name: "Aline Mukamana",
  loanCode: "loan_01JABCDEF",
  requestedAmount: "250,000",
  currency: "RWF",
  purpose: "School fees support",
  termMonths: "12 months",
  createdAt: "2026-03-03T10:00:00.000Z",
} satisfies LoanRequestConfirmationEmailProps

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

const card = {
  border: "1px solid #dbe7f7",
  backgroundColor: "#f8fbff",
  borderRadius: "8px",
  textAlign: "center" as const,
  padding: "16px",
  margin: "20px 0",
}

const label = {
  color: "#6b7280",
  fontSize: "12px",
  textTransform: "uppercase" as const,
  letterSpacing: "0.6px",
  margin: "0 0 6px",
}

const reference = {
  color: "#111827",
  fontSize: "22px",
  fontWeight: "700",
  letterSpacing: "0.8px",
  margin: "0",
  fontFamily: "'Courier New', monospace",
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
  backgroundColor: "#165598",
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
