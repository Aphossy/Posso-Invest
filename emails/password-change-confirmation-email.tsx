// emails\password-change-confirmation-email.tsx
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

interface PasswordChangeConfirmationEmailProps {
  userName: string
}

export default function PasswordChangeConfirmationEmail({
  userName,
}: PasswordChangeConfirmationEmailProps) {
  const supportEmail =
    process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "trustlinkgrouprw@gmail.com"

  return (
    <Html lang="en">
      <Head />
      <Preview>Your TrustLink Group password has been changed</Preview>
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
            <Heading style={h1}>Password Changed Successfully</Heading>
          </Section>
          <Section style={contentWrapper}>
            <Text style={heroText}>Hi {userName},</Text>
            <Text style={text}>
              This email confirms that your TrustLink Group account password has
              been successfully changed.
            </Text>
            <Text style={text}>
              If you made this change, no further action is required. You can
              now log in to your account using your new password.
            </Text>
            <Section style={alertSection}>
              <Text style={alertText}>
                <strong>Didn&apos;t change your password?</strong>
              </Text>
              <Text style={text}>
                If you didn&apos;t request this password change, your account
                may have been compromised. Please contact our support team
                immediately at{" "}
                <Link href={`mailto:${supportEmail}`} style={link}>
                  {supportEmail}
                </Link>
              </Text>
            </Section>
            <Section style={securitySection}>
              <Text style={sectionTitle}>Security Tips:</Text>
              <Text style={text}>
                • Use a strong, unique password for your TrustLink Group account
                <br />• Enable two-factor authentication for added security
                <br />• Never share your password with anyone
                <br />• Log out of shared or public computers
              </Text>
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

PasswordChangeConfirmationEmail.PreviewProps = {
  userName: "Fabrice Nshimiyimana",
} satisfies PasswordChangeConfirmationEmailProps

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

const link = {
  color: "#165598",
  textDecoration: "underline",
}

const alertSection = {
  backgroundColor: "#fff3cd",
  border: "1px solid #ffeaa7",
  borderRadius: "4px",
  padding: "16px",
  margin: "24px 0",
}

const alertText = {
  color: "#856404",
  fontSize: "16px",
  fontWeight: "bold",
  marginBottom: "8px",
}

const securitySection = {
  backgroundColor: "#f8f9fa",
  borderRadius: "4px",
  padding: "16px",
  margin: "24px 0",
}

const sectionTitle = {
  color: "#495057",
  fontSize: "16px",
  fontWeight: "bold",
  marginBottom: "12px",
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
