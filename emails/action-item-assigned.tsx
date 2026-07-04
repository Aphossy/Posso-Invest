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

interface ActionItemAssignedEmailProps {
  recipientName: string
  title: string
  description?: string | null
  priority: string
  status: string
  dueDate?: string
  meetingTitle?: string | null
  notes?: string | null
  assignedByName: string
  actionItemId: string
}

const formatDate = (value?: string) => {
  if (!value) return "Not specified"
  return new Date(value).toLocaleString("en-RW", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Kigali",
  })
}

export function ActionItemAssignedEmail({
  recipientName,
  title,
  description,
  priority,
  status,
  dueDate,
  meetingTitle,
  notes,
  assignedByName,
  actionItemId,
}: ActionItemAssignedEmailProps) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || organisationWebsite

  return (
    <Html lang="en">
      <Head />
      <Preview>You have been assigned a new action item: {title}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={brand}>{organisationName}</Text>
            <Text style={subtitle}>Action Item Assignment</Text>
          </Section>

          <Section style={content}>
            <Heading style={heading}>New action item assigned</Heading>
            <Text style={paragraph}>Muraho {recipientName},</Text>
            <Text style={paragraph}>
              {assignedByName} assigned you a new action item. Please review it
              and track progress in your dashboard.
            </Text>

            <Section style={details}>
              <Text style={detail}>Title: {title}</Text>
              {description ? (
                <Text style={detail}>Description: {description}</Text>
              ) : null}
              <Text style={detail}>Priority: {priority}</Text>
              <Text style={detail}>Status: {status}</Text>
              <Text style={detail}>Due date: {formatDate(dueDate)}</Text>
              {meetingTitle ? (
                <Text style={detail}>Meeting: {meetingTitle}</Text>
              ) : null}
              {notes ? <Text style={detail}>Notes: {notes}</Text> : null}
              <Text style={detail}>Reference: {actionItemId}</Text>
            </Section>

            <Section style={buttonSection}>
              <Button href={`${baseUrl}/member/actions`} style={button}>
                Open My Action Items
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

ActionItemAssignedEmail.PreviewProps = {
  recipientName: "Aline Mukamana",
  title: "Prepare monthly finance summary",
  description: "Compile contribution and penalty totals for review.",
  priority: "high",
  status: "open",
  dueDate: "2026-03-20T10:00:00.000Z",
  meetingTitle: "March Review Meeting",
  notes: "Share with committee before Friday.",
  assignedByName: "Secretary",
  actionItemId: "act_01JABCDEF",
} satisfies ActionItemAssignedEmailProps

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
