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

interface LoanUpdatedMemberEmailProps {
  memberName: string
  oldStatus: string
  newStatus: string
  requestedAmount: string
  approvedAmount?: string | null
  currency: string
  termMonths?: number | null
  dueDate?: string
  approvedAt?: string
  disbursedAt?: string
  repaidAt?: string
  notes?: string | null
  updatedByName: string
  loanId: string
}

const formatDate = (value?: string) => {
  if (!value) return "Not specified"
  return new Date(value).toLocaleString("en-RW", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Kigali",
  })
}

export function LoanUpdatedMemberEmail({
  memberName,
  oldStatus,
  newStatus,
  requestedAmount,
  approvedAmount,
  currency,
  termMonths,
  dueDate,
  approvedAt,
  disbursedAt,
  repaidAt,
  notes,
  updatedByName,
  loanId,
}: LoanUpdatedMemberEmailProps) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || organisationWebsite

  return (
    <Html lang="en">
      <Head />
      <Preview>
        Your loan status changed from {oldStatus} to {newStatus}.
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={brand}>{organisationName}</Text>
            <Text style={subtitle}>Loan Update</Text>
          </Section>

          <Section style={content}>
            <Heading style={heading}>Loan updated</Heading>
            <Text style={paragraph}>Muraho {memberName},</Text>
            <Text style={paragraph}>
              {updatedByName} updated your loan record. Please review the latest
              details.
            </Text>

            <Section style={details}>
              <Text style={detail}>
                Status: {oldStatus} to {newStatus}
              </Text>
              <Text style={detail}>
                Requested amount: {currency} {requestedAmount}
              </Text>
              {approvedAmount ? (
                <Text style={detail}>
                  Approved amount: {currency} {approvedAmount}
                </Text>
              ) : null}
              <Text style={detail}>
                Term: {termMonths ? `${termMonths} month(s)` : "Not specified"}
              </Text>
              <Text style={detail}>Approved at: {formatDate(approvedAt)}</Text>
              <Text style={detail}>
                Disbursed at: {formatDate(disbursedAt)}
              </Text>
              <Text style={detail}>Repaid at: {formatDate(repaidAt)}</Text>
              <Text style={detail}>Due date: {formatDate(dueDate)}</Text>
              {notes ? <Text style={detail}>Notes: {notes}</Text> : null}
              <Text style={detail}>Reference: {loanId}</Text>
            </Section>

            <Section style={buttonSection}>
              <Button href={`${baseUrl}/member/loans`} style={button}>
                View My Loans
              </Button>
            </Section>

            <Text style={smallText}>
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

LoanUpdatedMemberEmail.PreviewProps = {
  memberName: "Theogene Iradukunda",
  oldStatus: "approved",
  newStatus: "disbursed",
  requestedAmount: "250,000",
  approvedAmount: "200,000",
  currency: "RWF",
  termMonths: 12,
  dueDate: "2026-12-31T00:00:00.000Z",
  approvedAt: "2026-03-10T10:00:00.000Z",
  disbursedAt: "2026-03-12T11:00:00.000Z",
  repaidAt: undefined,
  notes: "Disbursed via bank transfer.",
  updatedByName: "Treasurer",
  loanId: "loan_01JABCDEF",
} satisfies LoanUpdatedMemberEmailProps

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
  backgroundColor: "#004225",
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

const link = {
  color: "#004225",
  textDecoration: "underline",
}
