import { POSSO_MESSAGE_SERVICE_LABELS } from "@/constants/message-services"
import {
  organisationLogo,
  organisationName,
  organisationWebsite,
} from "@/constants/organisation"
import {
  Body,
  Button,
  Column,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Text,
} from "@react-email/components"

interface AdminMessageNotificationEmailProps {
  messageCode: string
  name: string
  email: string
  phone?: string | null
  service: string
  subject?: string
  message: string
  createdAt: string
}

const serviceLabels: Record<string, string> = POSSO_MESSAGE_SERVICE_LABELS

const formatDate = (value: string) =>
  new Date(value).toLocaleString("en-RW", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Kigali",
  })

export function AdminMessageNotificationEmail({
  messageCode,
  name,
  email,
  phone,
  service,
  subject,
  message,
  createdAt,
}: AdminMessageNotificationEmailProps) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || organisationWebsite
  const serviceLabel = serviceLabels[service] || service
  const isAccessRequest = service === "access-technical"
  const replySubject = encodeURIComponent(
    `Re: ${subject || "Your message to TrustLink Group"}`
  )
  const replyBody = encodeURIComponent(
    `Muraho ${name},\n\nThank you for your message. We have reviewed your request and will guide you on the next steps.\n\nBest regards,\n${organisationName}`
  )

  return (
    <Html lang="en">
      <Head />
      <Preview>
        New {isAccessRequest ? "access request" : "support message"} from {name}{" "}
        ({messageCode})
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={brandHeader}>
            <Img
              src={organisationLogo}
              width="56"
              height="56"
              alt={`${organisationName} logo`}
              style={logo}
            />
            <Text style={brandName}>{organisationName}</Text>
            <Text style={brandSubtext}>
              {isAccessRequest
                ? "Role Assignment Queue"
                : "Member Support Inbox Alert"}
            </Text>
          </Section>

          <Section style={contentSection}>
            <Heading style={heading}>
              {isAccessRequest ? "New Access Request" : "New Support Message"}
            </Heading>
            <Text style={paragraph}>
              A new inbound message requires review. Use the details below to
              respond and update message status in the dashboard.
            </Text>

            <Section style={summaryCard}>
              <Row>
                <Column style={labelColumn}>
                  <Text style={label}>Message ID</Text>
                </Column>
                <Column>
                  <Text style={valueMono}>{messageCode}</Text>
                </Column>
              </Row>
              <Row>
                <Column style={labelColumn}>
                  <Text style={label}>Topic</Text>
                </Column>
                <Column>
                  <Text style={value}>{serviceLabel}</Text>
                </Column>
              </Row>
              <Row>
                <Column style={labelColumn}>
                  <Text style={label}>Received</Text>
                </Column>
                <Column>
                  <Text style={value}>{formatDate(createdAt)}</Text>
                </Column>
              </Row>
            </Section>

            <Section style={detailsCard}>
              <Text style={sectionTitle}>Contact Details</Text>
              <Row>
                <Column style={labelColumn}>
                  <Text style={label}>Name</Text>
                </Column>
                <Column>
                  <Text style={value}>{name}</Text>
                </Column>
              </Row>
              <Row>
                <Column style={labelColumn}>
                  <Text style={label}>Email</Text>
                </Column>
                <Column>
                  <Link href={`mailto:${email}`} style={link}>
                    {email}
                  </Link>
                </Column>
              </Row>
              {phone ? (
                <Row>
                  <Column style={labelColumn}>
                    <Text style={label}>Phone</Text>
                  </Column>
                  <Column>
                    <Link href={`tel:${phone}`} style={link}>
                      {phone}
                    </Link>
                  </Column>
                </Row>
              ) : null}
            </Section>

            <Section style={detailsCard}>
              <Text style={sectionTitle}>Message</Text>
              <Text style={messageLabel}>Subject</Text>
              <Text style={value}>{subject || "No subject provided"}</Text>
              <Text style={messageLabel}>Body</Text>
              <Text style={messageBody}>{message}</Text>
            </Section>

            <Section style={actionsSection}>
              <Button href={`${baseUrl}/admin/messages`} style={primaryButton}>
                Open Admin Messages
              </Button>
              <Button
                href={`mailto:${email}?subject=${replySubject}&body=${replyBody}`}
                style={secondaryButton}>
                Reply by Email
              </Button>
            </Section>
          </Section>

          <Section style={footerSection}>
            <Hr style={footerDivider} />
            <Text style={footerText}>
              Internal transactional alert from {organisationName} contact
              workflow.
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

AdminMessageNotificationEmail.PreviewProps = {
  messageCode: "MSG-2026-0012",
  name: "Jean Paul",
  email: "jean.paul@example.com",
  phone: "+250788000000",
  service: "access-technical",
  subject: "Request for treasurer access",
  message: "Please help me access the dashboard with treasurer permissions.",
  createdAt: "2026-03-03T11:30:00.000Z",
} satisfies AdminMessageNotificationEmailProps

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

const brandHeader = {
  backgroundColor: "#165598",
  textAlign: "center" as const,
  padding: "24px 20px 18px",
}

const logo = {
  display: "block",
  margin: "0 auto 8px",
  borderRadius: "50%",
}

const brandName = {
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "700",
  margin: "0 0 4px",
}

const brandSubtext = {
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
  fontSize: "14px",
  lineHeight: "22px",
  margin: "0 0 16px",
}

const summaryCard = {
  border: "1px solid #dbe7f7",
  borderRadius: "8px",
  backgroundColor: "#f8fbff",
  padding: "12px 10px 4px",
  margin: "0 0 16px",
}

const detailsCard = {
  border: "1px solid #e5e7eb",
  borderRadius: "8px",
  backgroundColor: "#f9fafb",
  padding: "14px 12px",
  margin: "0 0 16px",
}

const sectionTitle = {
  color: "#111827",
  fontSize: "14px",
  fontWeight: "700",
  margin: "0 0 10px",
}

const labelColumn = {
  width: "120px",
}

const label = {
  color: "#6b7280",
  fontSize: "12px",
  fontWeight: "600",
  margin: "0 0 8px",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
}

const value = {
  color: "#111827",
  fontSize: "13px",
  margin: "0 0 8px",
  lineHeight: "20px",
}

const valueMono = {
  ...value,
  fontFamily: "'Courier New', monospace",
  letterSpacing: "0.8px",
  fontWeight: "700",
}

const messageLabel = {
  color: "#6b7280",
  fontSize: "12px",
  fontWeight: "600",
  margin: "0 0 4px",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
}

const messageBody = {
  color: "#111827",
  fontSize: "13px",
  lineHeight: "21px",
  margin: "0",
  whiteSpace: "pre-wrap" as const,
}

const actionsSection = {
  textAlign: "center" as const,
  margin: "6px 0 0",
  padding: "20px 0 0",
  borderTop: "1px solid #e5e7eb",
}

const primaryButton = {
  backgroundColor: "#165598",
  color: "#ffffff",
  textDecoration: "none",
  borderRadius: "6px",
  padding: "12px 20px",
  fontSize: "14px",
  fontWeight: "600",
  boxSizing: "border-box" as const,
  margin: "0 4px 10px",
}

const secondaryButton = {
  backgroundColor: "#0f766e",
  color: "#ffffff",
  textDecoration: "none",
  borderRadius: "6px",
  padding: "12px 20px",
  fontSize: "14px",
  fontWeight: "600",
  boxSizing: "border-box" as const,
}

const footerSection = {
  padding: "0 24px 22px",
  textAlign: "center" as const,
}

const footerDivider = {
  borderTop: "1px solid #e5e7eb",
  margin: "0 0 14px",
}

const footerText = {
  color: "#6b7280",
  fontSize: "12px",
  lineHeight: "18px",
  margin: "0 0 6px",
}

const link = {
  color: "#165598",
  textDecoration: "underline",
}

export default AdminMessageNotificationEmail
