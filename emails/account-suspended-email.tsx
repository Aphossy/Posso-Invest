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
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components"

interface AccountSuspendedEmailProps {
  userName: string
  userEmail: string
  banReason: string
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

export const AccountSuspendedEmail = ({
  userName,
  userEmail,
  banReason,
  attemptTime,
  location,
  supportEmail,
}: AccountSuspendedEmailProps) => {
  const previewText = `Account suspended - Login attempt detected`

  return (
    <Html lang="en">
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={logoSection}>
            <Img
              src={`${organisationLogo}`}
              width="60"
              height="60"
              alt="Posso Ventures Logo"
              style={logo}
            />
          </Section>
          <Section style={headerSection}>
            <Heading style={heading}>Account Suspended</Heading>
          </Section>

          <Section style={contentWrapper}>
            <Text style={paragraph}>Hello {userName},</Text>

            <Text style={paragraph}>
              We detected a login attempt on your Posso Ventures account, but
              your account is currently suspended.
            </Text>

            <Section style={alertContainer}>
              <Text style={alertHeading}>Account Status:</Text>
              <Text style={alertText}>
                <strong>Status:</strong> Suspended
                <br />
                <strong>Reason:</strong> {banReason}
                <br />
                <strong>Account:</strong> {userEmail}
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
              Your account has been suspended due to a violation of our terms of
              service. To appeal this suspension or get more information, please
              contact our support team.
            </Text>

            <Section style={actionContainer}>
              <Button
                style={actionButton}
                href={`mailto:${supportEmail}?subject=Account Suspension Appeal - ${userEmail}`}>
                Contact Support
              </Button>
            </Section>

            <Text style={footer}>
              If you believe this suspension was made in error, please reach out
              to our support team at{" "}
              <Link href={`mailto:${supportEmail}`} style={link}>
                {supportEmail}
              </Link>
              . We&apos;re here to help resolve any issues.
            </Text>

            <Text style={signature}>
              Best regards,
              <br />
              {organisationName}
            </Text>
          </Section>

          {/* Footer */}
          <Section style={footerSection}>
            <Text style={footerDetailText}>{organisationName} | Ikimina</Text>
            <Text style={footerDetailText}>
              Email:{" "}
              <Link href={`mailto:${organisationEmail}`} style={footerLink}>
                {organisationEmail}
              </Link>
            </Text>
            <Text style={footerDetailText}>
              <Link href={organisationWebsite} style={footerLink}>
                {organisationWebsite}
              </Link>
            </Text>
            <Hr style={footerDivider} />
            <Text style={copyrightText}>
              © {new Date().getFullYear()} {organisationName}. All rights
              reserved.
              <br />
              {` ${organisationSlogan}`}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

AccountSuspendedEmail.PreviewProps = {
  userName: "Alphonse Uwimana",
  userEmail: "alphonse@example.com",
  banReason: "Repeated policy violations",
  attemptTime: "Wed, Mar 04, 2026 09:10 AM CAT",
  location: {
    ip: "41.186.10.22",
    city: "Kigali",
    country: "Rwanda",
    browser: "Chrome",
    os: "Windows",
  },
  supportEmail: "possowiba01@gmail.com",
} satisfies AccountSuspendedEmailProps

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
}

const container = {
  margin: "0 auto",
  maxWidth: "600px",
  backgroundColor: "#ffffff",
  borderRadius: "12px",
  overflow: "hidden",
  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
}

const logoSection = {
  padding: "20px 40px 0",
  textAlign: "center" as const,
  backgroundColor: "#991b1b",
  backgroundImage: "linear-gradient(135deg, #991b1b 0%, #7f1d1d 100%)",
}

const logo = {
  margin: "0 auto",
  borderRadius: "50%",
}

const headerSection = {
  textAlign: "center" as const,
  backgroundColor: "#dc2626",
  backgroundImage: "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)",
  padding: "30px 20px 24px",
}

const heading = {
  fontSize: "24px",
  letterSpacing: "-0.5px",
  lineHeight: "1.3",
  fontWeight: "700",
  color: "#ffffff",
  margin: 0,
}

const contentWrapper = {
  padding: "30px 40px",
}

const paragraph = {
  margin: "0 0 15px",
  fontSize: "15px",
  lineHeight: "1.4",
  color: "#3c4149",
}

const alertContainer = {
  backgroundColor: "#fef2f2",
  borderLeft: "4px solid #dc2626",
  borderRadius: "4px",
  padding: "16px",
  margin: "24px 0",
}

const link = {
  color: "#dc2626",
  textDecoration: "underline",
}

const alertHeading = {
  fontSize: "16px",
  fontWeight: "600",
  color: "#dc2626",
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
  color: "#dc2626",
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
  color: "#dc2626",
  fontWeight: "500",
  margin: "24px 0 16px",
}

const actionContainer = {
  textAlign: "center" as const,
  margin: "24px 0",
}

const actionButton = {
  backgroundColor: "#dc2626",
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
  color: "#dc2626",
  fontWeight: "600",
  margin: "30px 0 10px 0",
}

const footerSection = {
  textAlign: "center" as const,
  backgroundColor: "#333333",
  padding: "30px 20px",
  color: "#ffffff",
}

const footerDetailText = {
  fontSize: "14px",
  color: "#ffffff",
  margin: "0 0 10px",
}

const footerLink = {
  color: "#ffffff",
  textDecoration: "underline",
}

const footerDivider = {
  borderColor: "#555555",
  margin: "20px 0",
}

const copyrightText = {
  fontSize: "12px",
  color: "#aaaaaa",
  margin: "0",
}

export default AccountSuspendedEmail
