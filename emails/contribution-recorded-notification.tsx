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

interface ContributionRecordedNotificationEmailProps {
  recipientName: string
  memberName: string
  memberEmail: string
  amount: string
  currency: string
  period: string
  status: string
  paidAt?: string
  dueDate?: string
  penaltyAmount?: string | null
  recordedByName: string
  contributionId: string
}

const formatDate = (value?: string) => {
  if (!value) return "Not specified"
  return new Date(value).toLocaleString("en-RW", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Kigali",
  })
}

export function ContributionRecordedNotificationEmail({
  recipientName,
  memberName,
  memberEmail,
  amount,
  currency,
  period,
  status,
  paidAt,
  dueDate,
  penaltyAmount,
  recordedByName,
  contributionId,
}: ContributionRecordedNotificationEmailProps) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || organisationWebsite

  return (
    <Html lang="en">
      <Head />
      <Preview>
        Treasurer {recordedByName} recorded a contribution for {memberName}.
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={brand}>{organisationName}</Text>
            <Text style={subtitle}>Contribution Audit Alert</Text>
          </Section>

          <Section style={content}>
            <Heading style={heading}>New contribution recorded</Heading>
            <Text style={paragraph}>Muraho {recipientName},</Text>
            <Text style={paragraph}>
              Treasurer {recordedByName} recorded a contribution. Details are
              below for oversight.
            </Text>

            <Section style={details}>
              <Text style={detail}>Member: {memberName}</Text>
              <Text style={detail}>Member email: {memberEmail}</Text>
              <Text style={detail}>
                Amount: {currency} {amount}
              </Text>
              <Text style={detail}>Period: {period}</Text>
              <Text style={detail}>Status: {status}</Text>
              <Text style={detail}>Paid at: {formatDate(paidAt)}</Text>
              <Text style={detail}>Due date: {formatDate(dueDate)}</Text>
              {penaltyAmount ? (
                <Text style={detail}>
                  Penalty: {currency} {penaltyAmount}
                </Text>
              ) : null}
              <Text style={detail}>Reference: {contributionId}</Text>
            </Section>

            <Section style={buttonSection}>
              <Button
                href={`${baseUrl}/admin/finance/contributions`}
                style={button}>
                Open Contributions
              </Button>
            </Section>

            <Text style={smallText}>
              This alert is sent because your role can monitor contribution
              records.
            </Text>

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

ContributionRecordedNotificationEmail.PreviewProps = {
  recipientName: "Admin User",
  memberName: "Aline Mukamana",
  memberEmail: "aline@example.com",
  amount: "25,000",
  currency: "RWF",
  period: "2026-03",
  status: "paid",
  paidAt: "2026-03-03T10:00:00.000Z",
  dueDate: "2026-03-30T00:00:00.000Z",
  penaltyAmount: null,
  recordedByName: "Treasurer",
  contributionId: "contrib_01JABCDEF",
} satisfies ContributionRecordedNotificationEmailProps

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

const link = {
  color: "#165598",
  textDecoration: "underline",
}
