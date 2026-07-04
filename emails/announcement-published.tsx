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

interface AnnouncementPublishedEmailProps {
  recipientName: string
  title: string
  summary?: string | null
  content: string
  audience: string
  publishedAt?: string
  expiresAt?: string
  pinned: boolean
  createdByName: string
  announcementId: string
}

const formatDate = (value?: string) => {
  if (!value) return "Not specified"
  return new Date(value).toLocaleString("en-RW", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Kigali",
  })
}

export function AnnouncementPublishedEmail({
  recipientName,
  title,
  summary,
  content,
  audience,
  publishedAt,
  expiresAt,
  pinned,
  createdByName,
  announcementId,
}: AnnouncementPublishedEmailProps) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || organisationWebsite

  return (
    <Html lang="en">
      <Head />
      <Preview>
        {title} - new announcement from {organisationName}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={brand}>{organisationName}</Text>
            <Text style={subtitle}>Announcement</Text>
          </Section>

          <Section style={contentSection}>
            <Heading style={heading}>{title}</Heading>
            <Text style={paragraph}>Muraho {recipientName},</Text>
            <Text style={paragraph}>
              {createdByName} published a new announcement for {audience}.
            </Text>

            <Section style={details}>
              {summary ? <Text style={detail}>Summary: {summary}</Text> : null}
              <Text style={detail}>Published: {formatDate(publishedAt)}</Text>
              <Text style={detail}>Expires: {formatDate(expiresAt)}</Text>
              <Text style={detail}>Pinned: {pinned ? "Yes" : "No"}</Text>
              <Text style={detail}>Reference: {announcementId}</Text>
            </Section>

            <Section style={bodyCard}>
              <Text style={bodyLabel}>Announcement Content</Text>
              <Text style={bodyText}>{content}</Text>
            </Section>

            <Section style={buttonSection}>
              <Button href={`${baseUrl}/member/announcements`} style={button}>
                View Announcements
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

AnnouncementPublishedEmail.PreviewProps = {
  recipientName: "Theogene Iradukunda",
  title: "Upcoming committee meeting",
  summary: "Monthly review meeting schedule",
  content: "The committee meeting will be held on Friday at 18:00.",
  audience: "members",
  publishedAt: "2026-03-10T10:00:00.000Z",
  expiresAt: "2026-03-25T10:00:00.000Z",
  pinned: true,
  createdByName: "Secretary",
  announcementId: "ann_01JABCDEF",
} satisfies AnnouncementPublishedEmailProps

const main = {
  backgroundColor: "#f4f7fb",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif',
  padding: "24px 5px",
}

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  maxWidth: "620px",
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

const contentSection = {
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

const bodyCard = {
  border: "1px solid #dbe7f7",
  borderRadius: "8px",
  padding: "14px 16px",
  backgroundColor: "#f8fbff",
  marginBottom: "18px",
}

const bodyLabel = {
  color: "#6b7280",
  fontSize: "12px",
  textTransform: "uppercase" as const,
  letterSpacing: "0.6px",
  margin: "0 0 8px",
}

const bodyText = {
  color: "#111827",
  fontSize: "14px",
  lineHeight: "22px",
  margin: "0",
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
