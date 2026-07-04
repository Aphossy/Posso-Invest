import { POSSO_MESSAGE_SERVICE_LABELS } from "@/constants/message-services"
import {
  organisationEmail,
  organisationLogo,
  organisationName,
  organisationSlogan,
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

interface ClientMessageConfirmationEmailProps {
  name: string
  messageCode: string
  subject?: string
  service?: string
  createdAt?: string
}

const serviceLabels: Record<string, string> = POSSO_MESSAGE_SERVICE_LABELS

const formatDate = (value?: string) => {
  const date = value ? new Date(value) : new Date()
  return date.toLocaleString("en-RW", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Kigali",
  })
}

export function ClientMessageConfirmationEmail({
  name,
  messageCode,
  subject,
  service,
  createdAt,
}: ClientMessageConfirmationEmailProps) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || organisationWebsite
  const serviceLabel = service
    ? serviceLabels[service] || service
    : "General Inquiry"
  const isAccessRequest = service === "access-technical"

  return (
    <Html lang="en">
      <Head />
      <Preview>
        We received your message ({messageCode}). Our team will follow up soon.
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={brandHeader}>
            <Img
              src={organisationLogo}
              width="60"
              height="60"
              alt={`${organisationName} logo`}
              style={logo}
            />
            <Text style={brandName}>{organisationName}</Text>
          </Section>

          <Section style={contentSection}>
            <Heading style={heading}>Message Received</Heading>
            <Text style={paragraph}>Muraho {name},</Text>
            <Text style={paragraph}>
              Thank you for contacting {organisationName}. This is a
              confirmation that your message has been received and recorded.
            </Text>

            <Section style={codeSection}>
              <Text style={codeLabel}>Reference Code</Text>
              <Text style={codeValue}>{messageCode}</Text>
              <Text style={codeHint}>
                Keep this code for follow-up support.
              </Text>
            </Section>

            <Section style={detailsCard}>
              <Row>
                <Column style={labelColumn}>
                  <Text style={detailLabel}>Subject</Text>
                </Column>
                <Column>
                  <Text style={detailValue}>
                    {subject || "No subject provided"}
                  </Text>
                </Column>
              </Row>
              <Row>
                <Column style={labelColumn}>
                  <Text style={detailLabel}>Topic</Text>
                </Column>
                <Column>
                  <Text style={detailValue}>{serviceLabel}</Text>
                </Column>
              </Row>
              <Row>
                <Column style={labelColumn}>
                  <Text style={detailLabel}>Received</Text>
                </Column>
                <Column>
                  <Text style={detailValue}>{formatDate(createdAt)}</Text>
                </Column>
              </Row>
            </Section>

            <Text style={paragraph}>
              {isAccessRequest
                ? "Your access request is under review. You will receive an invitation email when your role is approved."
                : "A member of our team will reply as soon as possible, typically within one business day."}
            </Text>

            <Section style={buttonSection}>
              <Button
                href={
                  isAccessRequest ? `${baseUrl}/` : `${baseUrl}/member/support`
                }
                style={button}>
                {isAccessRequest
                  ? "Return to TrustLink Group"
                  : "Open Support Page"}
              </Button>
            </Section>

            <Text style={smallText}>
              If you did not send this message, please contact us immediately at{" "}
              <Link href={`mailto:${organisationEmail}`} style={link}>
                {organisationEmail}
              </Link>
              .
            </Text>
          </Section>

          <Section style={footerSection}>
            <Hr style={footerDivider} />
            <Text style={footerText}>
              You received this transactional email because a message was
              submitted with your email address.
            </Text>

            <Text style={footerText}>
              <Link href={organisationWebsite} style={link}>
                {organisationWebsite}
              </Link>
            </Text>
            <Text style={copyrightText}>
              © {new Date().getFullYear()} {organisationName}.{" "}
              {organisationSlogan}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

ClientMessageConfirmationEmail.PreviewProps = {
  name: "Aline Mukamana",
  messageCode: "MSG-2026-0007",
  subject: "Contribution receipt clarification",
  service: "contributions-savings",
  createdAt: "2026-03-03T10:00:00.000Z",
} satisfies ClientMessageConfirmationEmailProps

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

const brandHeader = {
  backgroundColor: "#004225",
  textAlign: "center" as const,
  padding: "24px 20px 20px",
}

const logo = {
  display: "block",
  margin: "0 auto 10px",
  borderRadius: "50%",
}

const brandName = {
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "700",
  margin: "0",
}

const contentSection = {
  padding: "28px 16px 20px",
}

const heading = {
  color: "#111827",
  fontSize: "24px",
  margin: "0 0 16px",
  fontWeight: "700",
}

const paragraph = {
  color: "#374151",
  fontSize: "15px",
  lineHeight: "24px",
  margin: "0 0 16px",
}

const codeSection = {
  border: "1px solid #dbe7f7",
  backgroundColor: "#f8fbff",
  borderRadius: "8px",
  textAlign: "center" as const,
  padding: "16px",
  margin: "20px 0",
}

const codeLabel = {
  color: "#6b7280",
  fontSize: "12px",
  textTransform: "uppercase" as const,
  letterSpacing: "0.6px",
  margin: "0 0 6px",
}

const codeValue = {
  color: "#111827",
  fontSize: "26px",
  fontWeight: "700",
  letterSpacing: "1.6px",
  margin: "0 0 6px",
  fontFamily: "'Courier New', monospace",
}

const codeHint = {
  color: "#6b7280",
  fontSize: "12px",
  margin: "0",
}

const detailsCard = {
  border: "1px solid #e5e7eb",
  borderRadius: "8px",
  padding: "14px 12px",
  backgroundColor: "#f9fafb",
  margin: "0 0 18px",
}

const labelColumn = {
  width: "120px",
}

const detailLabel = {
  color: "#6b7280",
  fontSize: "13px",
  margin: "0 0 8px",
  fontWeight: "600",
}

const detailValue = {
  color: "#111827",
  fontSize: "13px",
  margin: "0 0 8px",
}

const buttonSection = {
  textAlign: "center" as const,
  margin: "22px 0 16px",
}

const button = {
  backgroundColor: "#004225",
  color: "#ffffff",
  textDecoration: "none",
  borderRadius: "6px",
  padding: "12px 22px",
  fontSize: "15px",
  fontWeight: "600",
  textAlign: "center" as const,
  boxSizing: "border-box" as const,
}

const smallText = {
  color: "#6b7280",
  fontSize: "13px",
  lineHeight: "21px",
  margin: "0",
}

const footerSection = {
  padding: "0 24px 24px",
  textAlign: "center" as const,
}

const footerDivider = {
  borderTop: "1px solid #e5e7eb",
  margin: "0 0 16px",
}

const footerText = {
  color: "#6b7280",
  fontSize: "12px",
  lineHeight: "18px",
  margin: "0 0 6px",
}

const copyrightText = {
  color: "#9ca3af",
  fontSize: "12px",
  margin: "8px 0 0",
}

const link = {
  color: "#004225",
  textDecoration: "underline",
}

export default ClientMessageConfirmationEmail
