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

interface UnverifiedAccountEmailProps {
  userName: string
  userEmail: string
  attemptTime: string
  location: {
    ip: string
    city: string
    country: string
    browser: string
    os: string
  }
  verificationUrl: string
  supportEmail: string
}

export default function UnverifiedAccountEmail({
  userName,
  userEmail,
  attemptTime,
  location,
  verificationUrl,
  supportEmail,
}: UnverifiedAccountEmailProps) {
  const previewText =
    "Verify your email to access your TrustLink Group Ikimina dashboard."

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
              alt="TrustLink Group"
              style={logo}
            />
          </Section>
          <Section style={headerSection}>
            <Heading style={h1}>Email Verification Required</Heading>
          </Section>

          <Section style={content}>
            <Text style={text}>Hello {userName},</Text>

            <Text style={text}>
              We detected a login attempt to your TrustLink Group account, but
              your email address hasn't been verified yet. For security reasons,
              you need to verify your email before you can access your account.
            </Text>

            <Section style={alertBox}>
              <Text style={alertText}>
                <strong>Login Attempt Details:</strong>
              </Text>
              <Text style={detailText}>
                <strong>Email:</strong> {userEmail}
                <br />
                <strong>Time:</strong> {attemptTime}
                <br />
                <strong>Location:</strong> {location.city}, {location.country}
                <br />
                <strong>IP Address:</strong> {location.ip}
                <br />
                <strong>Browser:</strong> {location.browser}
                <br />
                <strong>Device:</strong> {location.os}
              </Text>
            </Section>

            <Text style={text}>
              To complete your account setup and gain access, please verify your
              email address by clicking the button below:
            </Text>

            <Section style={buttonSection}>
              <Button style={button} href={verificationUrl}>
                Verify Email Address
              </Button>
            </Section>

            <Text style={smallText}>
              If the button doesn't work, copy and paste this link into your
              browser:
              <br />
              <Link href={verificationUrl} style={link}>
                {verificationUrl}
              </Link>
            </Text>

            <Hr style={hr} />

            <Text style={text}>
              <strong>Why is email verification important?</strong>
            </Text>
            <Text style={text}>
              • Ensures account security and prevents unauthorized access
              <br />• Enables contribution, loan, and meeting notifications
              <br />• Required for password recovery and account management
              <br />• Helps us maintain a trusted Ikimina member community
            </Text>

            <Hr style={hr} />

            <Text style={footerText}>
              If you didn't attempt to log in or have concerns about your
              account security, please contact our support team immediately at{" "}
              <Link href={`mailto:${supportEmail}`} style={link}>
                {supportEmail}
              </Link>
            </Text>

            <Text style={footerText}>
              This email was sent from {organisationName}. Please if you have
              any questions, reply to this email.
            </Text>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerDetailText}>{organisationName} - Ikimina</Text>
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

UnverifiedAccountEmail.PreviewProps = {
  userName: "Gaspard Niyezi...",
  userEmail: "gaspard@example.com",
  attemptTime: "Tue, Mar 03, 2026 11:15 PM CAT",
  location: {
    ip: "196.223.12.44",
    city: "Kigali",
    country: "Rwanda",
    browser: "Chrome",
    os: "Windows",
  },
  verificationUrl: "https://possocapital.vercel.app/verify?token=example",
  supportEmail: "possowiba01@gmail.com",
} satisfies UnverifiedAccountEmailProps

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  maxWidth: "600px",
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
  display: "block",
  borderRadius: "50%",
}

const headerSection = {
  textAlign: "center" as const,
  backgroundColor: "#2563eb",
  backgroundImage: "linear-gradient(135deg, #2563eb 0%, #1e40af 100%)",
  padding: "30px 20px 24px",
}

const content = {
  padding: "30px 40px",
}

const h1 = {
  color: "#ffffff",
  fontSize: "24px",
  fontWeight: "700",
  lineHeight: "1.25",
  margin: 0,
}

const text = {
  color: "#525f7f",
  fontSize: "16px",
  lineHeight: "1.5",
  margin: "16px 0",
}

const alertBox = {
  backgroundColor: "#fff3cd",
  border: "1px solid #ffeaa7",
  borderRadius: "8px",
  padding: "16px",
  margin: "24px 0",
}

const alertText = {
  color: "#856404",
  fontSize: "16px",
  fontWeight: "600",
  margin: "0 0 8px 0",
}

const detailText = {
  color: "#856404",
  fontSize: "14px",
  lineHeight: "1.5",
  margin: "0",
}

const buttonSection = {
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
  display: "inline-block",
  padding: "12px 24px",
  boxSizing: "border-box" as const,
}

const smallText = {
  color: "#8898aa",
  fontSize: "14px",
  lineHeight: "1.5",
  margin: "16px 0",
}

const link = {
  color: "#165598",
  textDecoration: "underline",
}

const hr = {
  borderColor: "#e6ebf1",
  margin: "32px 0",
}

const footerText = {
  color: "#8898aa",
  fontSize: "12px",
  lineHeight: "1.5",
  margin: "8px 0",
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
