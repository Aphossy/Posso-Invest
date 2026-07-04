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

interface PenaltyUpdatedMemberEmailProps {
  memberName: string
  oldStatus: string
  newStatus: string
  oldAmount: string
  newAmount: string
  currency: string
  period: string
  reason?: string | null
  waivedReason?: string | null
  notes?: string | null
  updatedByName: string
  penaltyId: string
}

export function PenaltyUpdatedMemberEmail({
  memberName,
  oldStatus,
  newStatus,
  oldAmount,
  newAmount,
  currency,
  period,
  reason,
  waivedReason,
  notes,
  updatedByName,
  penaltyId,
}: PenaltyUpdatedMemberEmailProps) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || organisationWebsite

  return (
    <Html lang="en">
      <Head />
      <Preview>
        Your penalty record has been updated for period {period}.
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={brand}>{organisationName}</Text>
            <Text style={subtitle}>Penalty Update Notice</Text>
          </Section>

          <Section style={content}>
            <Heading style={heading}>Penalty updated</Heading>
            <Text style={paragraph}>Muraho {memberName},</Text>
            <Text style={paragraph}>
              {updatedByName} updated your penalty record. Please review the
              latest details.
            </Text>

            <Section style={details}>
              <Text style={detail}>Period: {period}</Text>
              <Text style={detail}>
                Status: {oldStatus} to {newStatus}
              </Text>
              <Text style={detail}>
                Amount: {currency} {oldAmount} to {currency} {newAmount}
              </Text>
              {reason ? <Text style={detail}>Reason: {reason}</Text> : null}
              {waivedReason ? (
                <Text style={detail}>Waiver reason: {waivedReason}</Text>
              ) : null}
              {notes ? <Text style={detail}>Notes: {notes}</Text> : null}
              <Text style={detail}>Reference: {penaltyId}</Text>
            </Section>

            <Section style={buttonSection}>
              <Button href={`${baseUrl}/member/penalties`} style={button}>
                View My Penalties
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

PenaltyUpdatedMemberEmail.PreviewProps = {
  memberName: "Theogene Iraduk.",
  oldStatus: "active",
  newStatus: "waived",
  oldAmount: "5,000",
  newAmount: "0",
  currency: "RWF",
  period: "2026-03",
  reason: "Late payment for period 2026-03",
  waivedReason: "Committee approved waiver",
  notes: "Waived after review.",
  updatedByName: "Treasurer",
  penaltyId: "pen_01JABCDEF",
} satisfies PenaltyUpdatedMemberEmailProps

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
