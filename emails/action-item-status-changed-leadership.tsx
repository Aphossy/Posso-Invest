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

interface ActionItemStatusChangedLeadershipEmailProps {
  recipientName: string
  title: string
  oldStatus: string
  newStatus: string
  priority: string
  dueDate?: string
  ownerName?: string | null
  ownerEmail?: string | null
  notes?: string | null
  changedByName: string
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

export function ActionItemStatusChangedLeadershipEmail({
  recipientName,
  title,
  oldStatus,
  newStatus,
  priority,
  dueDate,
  ownerName,
  ownerEmail,
  notes,
  changedByName,
  actionItemId,
}: ActionItemStatusChangedLeadershipEmailProps) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || organisationWebsite

  return (
    <Html lang="en">
      <Head />
      <Preview>
        Action item status changed: {title} ({oldStatus} to {newStatus})
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={brand}>{organisationName}</Text>
            <Text style={subtitle}>Action Item Oversight Alert</Text>
          </Section>

          <Section style={content}>
            <Heading style={heading}>Action item status changed</Heading>
            <Text style={paragraph}>Muraho {recipientName},</Text>
            <Text style={paragraph}>
              {changedByName} updated an action item status. Details are below
              for leadership visibility.
            </Text>

            <Section style={details}>
              <Text style={detail}>Title: {title}</Text>
              <Text style={detail}>Previous status: {oldStatus}</Text>
              <Text style={detail}>New status: {newStatus}</Text>
              <Text style={detail}>Priority: {priority}</Text>
              <Text style={detail}>Due date: {formatDate(dueDate)}</Text>
              {ownerName ? (
                <Text style={detail}>Owner: {ownerName}</Text>
              ) : null}
              {ownerEmail ? (
                <Text style={detail}>Owner email: {ownerEmail}</Text>
              ) : null}
              {notes ? <Text style={detail}>Notes: {notes}</Text> : null}
              <Text style={detail}>Reference: {actionItemId}</Text>
            </Section>

            <Section style={buttonSection}>
              <Button href={`${baseUrl}/admin/actions`} style={button}>
                Open Action Items
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

ActionItemStatusChangedLeadershipEmail.PreviewProps = {
  recipientName: "Admin User",
  title: "Prepare monthly finance summary",
  oldStatus: "open",
  newStatus: "in_progress",
  priority: "high",
  dueDate: "2026-03-20T10:00:00.000Z",
  ownerName: "Aline Mukamana",
  ownerEmail: "aline@example.com",
  notes: "Started preparing figures.",
  changedByName: "Aline Mukamana",
  actionItemId: "act_01JABCDEF",
} satisfies ActionItemStatusChangedLeadershipEmailProps

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
  color: "#004225",
  textDecoration: "underline",
}
