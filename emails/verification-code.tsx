// C:\Users\user\OneDrive\Desktop\trustlink-group\emails\verification-code.tsx
import {
  organisationEmail,
  organisationLogo,
  organisationName,
  organisationSlogan,
  organisationWebsite,
} from "@/constants/organisation"
import {
  Body,
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

interface VerificationEmailProps {
  code: string
  expiresInMinutes: number
  userName: string
  location: {
    city?: string
    country?: string
    browser?: string
    os?: string
    ip: string
    device?: string
  }
}

export const VerificationEmail = ({
  code,
  expiresInMinutes,
  userName,
  location,
}: VerificationEmailProps) => {
  const previewText = `Your TrustLink Group verification code is ${code}`

  const supportEmail =
    process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "possowiba01@gmail.com"

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
            <Heading style={heading}>Authentication</Heading>
          </Section>
          <Section style={contentWrapper}>
            <Text style={greeting}>Dear {userName},</Text>
            <Text style={paragraph}>
              You are receiving this email because you have enabled Two-Factor
              Authentication for your Posso Ventures account. To complete the
              sign-in process, please enter the verification code below.
            </Text>

            <Section style={codeContainer}>
              <Text style={codeStyle}>{code}</Text>
            </Section>

            <Text style={paragraph}>
              This verification code will expire in {expiresInMinutes} minutes.
            </Text>

            <Section style={deviceInfo}>
              <Text style={deviceInfoText}>Login Attempt Details:</Text>
              <Text style={deviceInfoDetail}>
                Location: {location.city || "Unknown"},{" "}
                {location.country || "Unknown"}
                <br />
                Browser: {location.browser || "Unknown"}
                <br />
                Operating System: {location.os || "Unknown"}
                <br />
                IP Address: {location.ip}
                <br />
                Device: {location.device || "Unknown"}
              </Text>
            </Section>

            <Hr style={hr} />

            <Text style={footer}>
              If you did not attempt to sign in to your Posso Ventures
              Dashboard, please ignore this email and report immediately to{" "}
              <Link href={`mailto:${supportEmail}`} style={link}>
                the Posso Ventures support team
              </Link>
              . Your account security is our top priority.
            </Text>

            <Text style={signature}>Best regards</Text>
          </Section>

          {/* Footer */}
          <Section style={footerSection}>
            <Text style={footerText}>{organisationName} - Ikimina</Text>
            <Text style={footerText}>
              Email:{" "}
              <Link href={`mailto:${organisationEmail}`} style={footerLink}>
                {organisationEmail}
              </Link>
            </Text>
            <Text style={footerText}>
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

VerificationEmail.PreviewProps = {
  code: "829331",
  expiresInMinutes: 10,
  userName: "Ariane Nyiranziza",
  location: {
    ip: "105.178.5.21",
    city: "Kigali",
    country: "Rwanda",
    browser: "Chrome 123",
    os: "Android 14",
    device: "Mobile",
  },
} satisfies VerificationEmailProps

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
  backgroundColor: "#2563eb",
  backgroundImage: "linear-gradient(135deg, #2563eb 0%, #1e40af 100%)",
}

const logo = {
  margin: "0 auto",
  borderRadius: "50%",
}

const headerSection = {
  textAlign: "center" as const,
  backgroundColor: "#2563eb",
  backgroundImage: "linear-gradient(135deg, #2563eb 0%, #1e40af 100%)",
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

const greeting = {
  margin: "0 0 15px",
  fontSize: "16px",
  lineHeight: "1.4",
  color: "#165598",
  fontWeight: "600",
}

const codeContainer = {
  background: "linear-gradient(to right, #165598, #3182ce)",
  borderRadius: "8px",
  margin: "24px 0",
  padding: "24px",
  textAlign: "center" as const,
}

const codeStyle = {
  fontFamily: "monospace",
  fontSize: "32px",
  fontWeight: "700",
  color: "#ffffff",
  letterSpacing: "8px",
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
  color: "#165598",
  fontWeight: "600",
  margin: "0 0 8px",
}

const deviceInfoDetail = {
  fontSize: "14px",
  lineHeight: "1.6",
  color: "#4a5568",
  margin: 0,
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
  color: "#165598",
  fontWeight: "600",
  margin: "30px 0 10px 0",
}

const link = {
  color: "#165598",
  textDecoration: "underline",
}

const footerSection = {
  textAlign: "center" as const,
  backgroundColor: "#333333",
  padding: "30px 20px",
  color: "#ffffff",
}

const footerText = {
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

export default VerificationEmail
