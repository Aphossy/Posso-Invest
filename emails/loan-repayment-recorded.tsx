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

interface LoanRepaymentRecordedEmailProps {
  memberName: string
  amount: string
  currency: string
  paymentMethod?: string | null
  paidAt?: string
  totalRepaid: string
  totalRepayable: string
  outstanding: string
  progressPercent: number
  fullyRepaid: boolean
  recordedByName: string
  receiptNumber?: string | null
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

export function LoanRepaymentRecordedEmail({
  memberName,
  amount,
  currency,
  paymentMethod,
  paidAt,
  totalRepaid,
  totalRepayable,
  outstanding,
  progressPercent,
  fullyRepaid,
  recordedByName,
  receiptNumber,
  loanId,
}: LoanRepaymentRecordedEmailProps) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || organisationWebsite

  return (
    <Html lang="en">
      <Head />
      <Preview>
        {fullyRepaid
          ? "Your loan is now fully repaid."
          : `Repayment of ${currency} ${amount} recorded.`}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={brand}>{organisationName}</Text>
            <Text style={subtitle}>Loan Repayment</Text>
          </Section>

          <Section style={content}>
            <Heading style={heading}>
              {fullyRepaid ? "Loan fully repaid" : "Repayment recorded"}
            </Heading>
            <Text style={paragraph}>Muraho {memberName},</Text>
            <Text style={paragraph}>
              {recordedByName} recorded a repayment on your loan.
              {fullyRepaid
                ? " Your loan has now been fully repaid. Congratulations!"
                : " Here is your updated repayment summary."}
            </Text>

            <Section style={details}>
              <Text style={detail}>
                Payment: {currency} {amount}
              </Text>
              {paymentMethod ? (
                <Text style={detail}>Method: {paymentMethod}</Text>
              ) : null}
              <Text style={detail}>Paid at: {formatDate(paidAt)}</Text>
              <Text style={detail}>
                Total repaid: {currency} {totalRepaid} of {currency}{" "}
                {totalRepayable} ({progressPercent}%)
              </Text>
              <Text style={detail}>
                Outstanding balance: {currency} {outstanding}
              </Text>
              {receiptNumber ? (
                <Text style={detail}>Receipt: {receiptNumber}</Text>
              ) : null}
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

LoanRepaymentRecordedEmail.PreviewProps = {
  memberName: "Aline Mukamana",
  amount: "50,000",
  currency: "RWF",
  paymentMethod: "mobile_money",
  paidAt: "2026-05-22T10:00:00.000Z",
  totalRepaid: "150,000",
  totalRepayable: "210,000",
  outstanding: "60,000",
  progressPercent: 71,
  fullyRepaid: false,
  recordedByName: "Treasurer",
  receiptNumber: "TLG-R-2026-014",
  loanId: "loan_01JABCDEF",
} satisfies LoanRepaymentRecordedEmailProps

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

const link = {
  color: "#165598",
  textDecoration: "underline",
}
