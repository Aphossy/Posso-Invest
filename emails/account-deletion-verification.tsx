// emails\account-deletion-verification.tsx
import {
  organisationEmail,
  organisationLogo,
  organisationName,
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

interface AccountDeletionVerificationEmailProps {
  userName: string
  deletionUrl: string
}

export default function AccountDeletionVerificationEmail({
  userName,
  deletionUrl,
}: AccountDeletionVerificationEmailProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>Verify your account deletion request</Preview>
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
            <Heading style={h1}>Account Deletion Request</Heading>
          </Section>
          <Section style={contentWrapper}>
            <Text style={heroText}>Hi {userName},</Text>
            <Text style={text}>
              We received a request to permanently delete your {organisationName}
              account. This action cannot be undone and will result in:
            </Text>
            <Section style={warningBox}>
              <Text style={warningText}>
                • Permanent deletion of all your personal data
                <br />
                • Loss of access to all linked accounts and services
                <br />• Removal of all projects and settings
              </Text>
            </Section>
            <Text style={text}>
              If you're sure you want to proceed with deleting your account,
              click the button below:
            </Text>
            <Section style={buttonContainer}>
              <Button style={button} href={deletionUrl}>
                Confirm Account Deletion
              </Button>
            </Section>
            <Text style={text}>
              <strong>Didn't request this?</strong> If you didn't request
              account deletion, please ignore this email and your account will
              remain active. For security, we recommend changing your password
              immediately.
            </Text>
            <Text style={text}>
              This deletion verification link will expire in 24 hours for
              security reasons.
            </Text>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerDetailText}>{organisationName} | Ikimina</Text>
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
              {` We're sorry to see you go, but we respect your decision.`}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

AccountDeletionVerificationEmail.PreviewProps = {
  userName: "Florence Uwamahoro",
  deletionUrl: "https://possocapital.vercel.app/account/delete?token=example",
} satisfies AccountDeletionVerificationEmailProps

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
  backgroundColor: "#dc2626",
  backgroundImage: "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)",
}

const logo = {
  margin: "0 auto",
  borderRadius: "50%",
  display: "block",
}

const headerSection = {
  textAlign: "center" as const,
  backgroundColor: "#dc2626",
  backgroundImage: "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)",
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

const warningBox = {
  backgroundColor: "#fef2f2",
  border: "1px solid #fecaca",
  borderRadius: "6px",
  padding: "20px",
  margin: "24px 0",
}

const warningText = {
  color: "#991b1b",
  fontSize: "14px",
  lineHeight: "24px",
  margin: "0",
}

const buttonContainer = {
  textAlign: "center" as const,
  margin: "32px 0",
}

const button = {
  backgroundColor: "#dc2626",
  borderRadius: "3px",
  color: "#fff",
  fontSize: "16px",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "block",
  padding: "12px 24px",
  boxSizing: "border-box" as const,
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
