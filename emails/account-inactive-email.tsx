import { organisationName } from "@/constants/organisation"
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components"

interface AccountInactiveEmailProps {
  userName: string
  userEmail: string
  attemptTime: string
  location: {
    ip: string
    city?: string
    country?: string
    browser?: string
    os?: string
  }
  supportEmail: string
}

export const AccountInactiveEmail = ({
  userName,
  userEmail,
  attemptTime,
  location,
  supportEmail,
}: AccountInactiveEmailProps) => {
  const previewText = `Account inactive - Login attempt detected`

  return (
    <Html lang="en">
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>Account Inactive</Heading>

          <Text style={paragraph}>Hello {userName},</Text>

          <Text style={paragraph}>
            We detected a login attempt on your {organisationName} account, but
            your account is currently inactive.
          </Text>

          <Section style={alertContainer}>
            <Text style={alertHeading}>Account Status:</Text>
            <Text style={alertText}>
              <strong>Status:</strong> Inactive
              <br />
              <strong>Account:</strong> {userEmail}
              <br />
              <strong>Action Required:</strong> Account reactivation needed
            </Text>
          </Section>

          <Section style={deviceInfo}>
            <Text style={deviceInfoText}>Login Attempt Details:</Text>
            <Text style={deviceInfoDetail}>
              <strong>Time:</strong> {attemptTime}
              <br />
              <strong>IP Address:</strong> {location.ip}
              <br />
              <strong>Location:</strong> {location.city || "Unknown"},{" "}
              {location.country || "Unknown"}
              <br />
              <strong>Browser:</strong> {location.browser || "Unknown"}
              <br />
              <strong>Operating System:</strong> {location.os || "Unknown"}
            </Text>
          </Section>

          <Hr style={hr} />

          <Text style={warningText}>
            Your account has been marked as inactive. This could be due to
            prolonged inactivity or administrative action. To reactivate your
            account, please contact our support team.
          </Text>

          <Section style={actionContainer}>
            <Button
              style={actionButton}
              href={`mailto:${supportEmail}?subject=Account Reactivation Request - ${userEmail}`}>
              Request Reactivation
            </Button>
          </Section>

          <Text style={footer}>
            To reactivate your account, please contact our support team at{" "}
            <Link href={`mailto:${supportEmail}`} style={link}>
              {supportEmail}
            </Link>
            . We&apos;ll help you regain access as quickly as possible.
          </Text>

          <Text style={signature}>
            Best regards,
            <br />
            TrustLink Group - Save together. Build together.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

AccountInactiveEmail.PreviewProps = {
  userName: "Jean Bosco",
  userEmail: "jean.bosco@example.com",
  attemptTime: "Wed, Mar 04, 2026 08:50 AM CAT",
  location: {
    ip: "197.157.20.40",
    city: "Kigali",
    country: "Rwanda",
    browser: "Firefox",
    os: "Linux",
  },
  supportEmail: "possowiba01@gmail.com",
} satisfies AccountInactiveEmailProps

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
}

const container = {
  margin: "0 auto",
  padding: "40px 20px",
  maxWidth: "600px",
  backgroundColor: "#ffffff",
  borderRadius: "8px",
  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
}

const heading = {
  fontSize: "24px",
  letterSpacing: "-0.5px",
  lineHeight: "1.3",
  fontWeight: "700",
  color: "#f59e0b",
  textAlign: "center" as const,
  padding: "0 0 20px",
}

const paragraph = {
  margin: "0 0 15px",
  fontSize: "15px",
  lineHeight: "1.4",
  color: "#3c4149",
}

const alertContainer = {
  backgroundColor: "#fffbeb",
  borderLeft: "4px solid #f59e0b",
  borderRadius: "4px",
  padding: "16px",
  margin: "24px 0",
}

const link = {
  color: "#f59e0b",
  textDecoration: "underline",
}

const alertHeading = {
  fontSize: "16px",
  fontWeight: "600",
  color: "#f59e0b",
  margin: "0 0 8px",
}

const alertText = {
  fontSize: "14px",
  lineHeight: "1.6",
  color: "#3c4149",
  margin: "0",
}

const deviceInfo = {
  background: "#f8fafc",
  borderRadius: "8px",
  padding: "20px",
  margin: "24px 0",
  border: "1px solid #e2e8f0",
}

const deviceInfoText = {
  fontSize: "14px",
  lineHeight: "1.4",
  color: "#f59e0b",
  fontWeight: "600",
  margin: "0 0 8px",
}

const deviceInfoDetail = {
  fontSize: "14px",
  lineHeight: "1.6",
  color: "#4a5568",
  margin: 0,
}

const warningText = {
  fontSize: "15px",
  lineHeight: "1.5",
  color: "#f59e0b",
  fontWeight: "500",
  margin: "24px 0 16px",
}

const actionContainer = {
  textAlign: "center" as const,
  margin: "24px 0",
}

const actionButton = {
  backgroundColor: "#f59e0b",
  borderRadius: "4px",
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  padding: "12px 20px",
  boxSizing: "border-box" as const,
}

const hr = {
  borderColor: "#e2e8f0",
  margin: "24px 0",
}

const footer = {
  fontSize: "14px",
  lineHeight: "1.5",
  color: "#64748b",
  margin: "0 0 16px",
}

const signature = {
  fontSize: "14px",
  lineHeight: "1.5",
  color: "#f59e0b",
  fontWeight: "600",
  margin: "30px 0 10px 0",
}

export default AccountInactiveEmail
