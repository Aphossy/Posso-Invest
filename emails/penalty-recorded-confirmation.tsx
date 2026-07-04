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

interface PenaltyRecordedConfirmationEmailProps {
  memberName: string
  amount: string
  currency: string
  period: string
  reason: string
  status: string
  notes?: string | null
  contributionId?: string | null
  penaltyId: string
  issuedByName: string
}

export function PenaltyRecordedConfirmationEmail({
  memberName,
  amount,
  currency,
  period,
  reason,
  status,
  notes,
  contributionId,
  penaltyId,
  issuedByName,
}: PenaltyRecordedConfirmationEmailProps) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || organisationWebsite

  return (
    <Html lang="en">
      <Head />
      <Preview>
        A penalty has been recorded for period {period} on your account.
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={brand}>{organisationName}</Text>
            <Text style={subtitle}>Penalty Notice</Text>
          </Section>

          <Section style={content}>
            <Heading style={heading}>Penalty recorded</Heading>
            <Text style={paragraph}>Muraho {memberName},</Text>
            <Text style={paragraph}>
              A penalty was recorded by {issuedByName}. Please review the
              details below.
            </Text>

            <Section style={details}>
              <Text style={detail}>
                Amount: {currency} {amount}
              </Text>
              <Text style={detail}>Period: {period}</Text>
              <Text style={detail}>Status: {status}</Text>
              <Text style={detail}>Reason: {reason}</Text>
              {notes ? <Text style={detail}>Notes: {notes}</Text> : null}
              {contributionId ? (
                <Text style={detail}>
                  Linked contribution: {contributionId}
                </Text>
              ) : null}
              <Text style={detail}>Penalty reference: {penaltyId}</Text>
            </Section>

            <Section style={buttonSection}>
              <Button href={`${baseUrl}/member/penalties`} style={button}>
                View My Penalties
              </Button>
            </Section>

            <Text style={smallText}>
              If you believe this was recorded in error, contact{" "}
              <Link href={`mailto:${organisationEmail}`} style={link}>
                {organisationEmail}
              </Link>
              .
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

PenaltyRecordedConfirmationEmail.PreviewProps = {
  memberName: "Theogene Iradukunda",
  amount: "5,000",
  currency: "RWF",
  period: "2026-03",
  reason: "Late payment for period 2026-03",
  status: "active",
  notes: "Issued after grace period",
  contributionId: "contrib_01JABCDEF",
  penaltyId: "pen_01JABCDEF",
  issuedByName: "Treasurer",
} satisfies PenaltyRecordedConfirmationEmailProps

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
