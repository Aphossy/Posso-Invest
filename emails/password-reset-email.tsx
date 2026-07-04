// emails\password-reset-email.tsx
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

interface PasswordResetEmailProps {
  userName: string
  resetUrl: string
}

export default function PasswordResetEmail({
  userName,
  resetUrl,
}: PasswordResetEmailProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>Reset your TrustLink Group password</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={logoSection}>
            <Img
              src={`${organisationLogo}`}
              width="60"
              height="60"
              alt="Posso Ventures"
              style={logo}
            />
          </Section>
          <Section style={headerSection}>
            <Heading style={h1}>Reset your password</Heading>
          </Section>
          <Section style={contentWrapper}>
            <Text style={heroText}>Hi {userName},</Text>
            <Text style={text}>
              Someone recently requested a password change for your 
              Posso Ventures account. If this was you, you can set a new password here:
            </Text>
            <Section style={buttonContainer}>
              <Button style={button} href={resetUrl}>
                Reset Password
              </Button>
            </Section>
            <Text style={text}>
              If you don't want to change your password or didn't request this,
              just ignore and delete this message.
            </Text>
            <Text style={text}>
              This password reset link will expire in 1 hour for security
              reasons.
            </Text>
            <Text style={text}>
              To keep your account secure, please don't forward this email to
              anyone.
            </Text>
            <Section style={footerSection}>
              <Text style={footerText}>
                If you're having trouble clicking the password reset button,
                copy and paste the URL below into your web browser:
              </Text>
              <Link href={resetUrl} style={footerLink}>
                {resetUrl}
              </Link>
            </Section>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerDetailText}>{organisationName} - Ikimina</Text>
            <Text style={footerDetailText}>
              Email:{" "}
              <Link
                href={`mailto:${organisationEmail}`}
                style={footerLinkStyle}>
                {organisationEmail}
              </Link>
            </Text>
            <Text style={footerDetailText}>
              <Link href={organisationWebsite} style={footerLinkStyle}>
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

PasswordResetEmail.PreviewProps = {
  userName: "Abel Mutsinzi",
  resetUrl: "https://possocapital.vercel.app/reset-password?token=example",
} satisfies PasswordResetEmailProps

const main = {
  backgroundColor: "#ffffff",
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

const h1 = {
  color: "#ffffff",
  fontSize: "24px",
  fontWeight: "bold",
  margin: 0,
}

const contentWrapper = {
  padding: "30px 40px",
}

const heroText = {
  fontSize: "18px",
  lineHeight: "28px",
  marginBottom: "30px",
}

const text = {
  color: "#484848",
  fontSize: "16px",
  lineHeight: "26px",
  marginBottom: "10px",
}

const buttonContainer = {
  textAlign: "center" as const,
  margin: "32px 0",
}

const button = {
  backgroundColor: "#165598",
  borderRadius: "3px",
  color: "#fff",
  fontSize: "16px",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "block",
  padding: "12px 24px",
  boxSizing: "border-box" as const,
}

const footerSection = {
  marginTop: "32px",
  paddingTop: "32px",
  borderTop: "1px solid #eaeaea",
}

const footerText = {
  color: "#666666",
  fontSize: "12px",
  lineHeight: "16px",
}

const footerLink = {
  color: "#165598",
  fontSize: "12px",
  textDecoration: "underline",
}

const footer = {
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

const footerLinkStyle = {
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
