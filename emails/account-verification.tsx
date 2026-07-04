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

interface AccountVerificationEmailProps {
  userName: string
  verificationUrl: string
  expiresInHours: number
}

export const AccountVerificationEmail = ({
  userName,
  verificationUrl,
  expiresInHours,
}: AccountVerificationEmailProps) => {
  const previewText = `Welcome to ${organisationName}! Please verify your account to get started.`

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
              alt={`${organisationName} Logo`}
              style={logo}
            />
          </Section>
          <Section style={headerSection}>
            <Heading style={heading}>Welcome to {organisationName}!</Heading>
          </Section>
          <Section style={contentWrapper}>
            <Text style={greeting}>Dear {userName},</Text>
            <Text style={paragraph}>
              Thank you for creating your {organisationName}  account! We're excited
              to have you join a professional Ikimina focused on transparent
              saving, responsible lending, and building a modern dental clinic.
            </Text>

            <Text style={paragraph}>
              To complete your registration and start participating, please
              verify your email address by clicking the button below:
            </Text>
    
            <Section style={buttonContainer}>
              <Button style={button} href={verificationUrl}>
                Verify My Account
              </Button>
            </Section>

            <Text style={paragraph}>
              This verification link will expire in {expiresInHours} hours for
              security reasons.
            </Text>

            <Text style={paragraph}>
              If the button doesn't work, you can also copy and paste this link
              into your browser:
            </Text>
            <Text style={linkText}>{verificationUrl}</Text>

            <Hr style={hr} />

            <Text style={footer}>
              If you didn't create a TrustLink Group account, please ignore this
              email or contact is at{" "}
              <Link href={`mailto:${organisationEmail}`} style={link}>
                {organisationEmail}
              </Link>
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

AccountVerificationEmail.PreviewProps = {
  userName: "Sandrine Mukandayisenga",
  verificationUrl: "https://trustlink-group.rw/verify?token=example",
  expiresInHours: 24,
} satisfies AccountVerificationEmailProps

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

const buttonContainer = {
  textAlign: "center" as const,
  margin: "32px 0",
}

const button = {
  backgroundColor: "#165598",
  borderRadius: "8px",
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  padding: "16px 32px",
  display: "inline-block",
  boxSizing: "border-box" as const,
}

const linkText = {
  fontSize: "14px",
  color: "#165598",
  textDecoration: "underline",
  wordBreak: "break-all" as const,
  margin: "0 0 15px",
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

export default AccountVerificationEmail
