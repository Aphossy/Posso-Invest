// C:\Users\user\OneDrive\Desktop\trustlink-group\emails\welcome-email.tsx
import {
  organisationEmail,
  organisationLogo,
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

interface WelcomeEmailProps {
  userName: string
  userEmail: string
}

export const WelcomeEmail = ({ userName }: WelcomeEmailProps) => {
  const previewText =
    "Welcome to Posso Ventures! Your account is ready to start saving."

  return (
    <Html lang="en">
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header with logo */}
          <Section style={headerSection}>
            <Img
              src={`${organisationLogo}`}
              alt="Posso Ventures Logo"
              width="60"
              height="60"
              style={logo}
            />
          </Section>

          {/* Welcome Banner */}
          <Section style={welcomeBanner}>
            <Heading style={bannerHeading}>Welcome to Posso Ventures!</Heading>
            <Text style={bannerText}>
              Your account is verified and ready to participate
            </Text>
          </Section>

          {/* Main Content */}
          <Section style={contentSection}>
            <Text style={greeting}>Hello {userName},</Text>

            <Text style={text}>
              We're thrilled to have you join the Posso Ventures family! Your
              account has been successfully verified, and you now have full
              access to our Ikimina platform.
            </Text>

            <Text style={tagline}>
              <strong>Save together. Build together.</strong>
            </Text>

            <Text style={text}>
              Build financial discipline, contribute with confidence, and grow
              our shared clinic vision with the rest of the committee.
            </Text>

            {/* Quick Start Card */}
            <Section style={quickStartCard}>
              <Heading as="h3" style={cardHeading}>
                Quick Start Guide
              </Heading>

              <table style={quickStartTable}>
                <tbody>
                  <tr>
                    <td style={stepCell}>
                      <Text style={stepNumber}>1</Text>
                    </td>
                    <td style={stepContentCell}>
                      <Text style={stepTitle}>Complete Your Profile</Text>
                      <Text style={stepDesc}>
                        Add your contact details and preferences
                      </Text>
                    </td>
                  </tr>
                  <tr>
                    <td style={stepCell}>
                      <Text style={stepNumber}>2</Text>
                    </td>
                    <td style={stepContentCell}>
                      <Text style={stepTitle}>Review the Constitution</Text>
                      <Text style={stepDesc}>
                        Understand the savings and loan rules
                      </Text>
                    </td>
                  </tr>
                </tbody>
              </table>
            </Section>

            {/* CTA Section */}
            <Section style={ctaSection}>
              <Button
                style={primaryButton}
                href={`${organisationWebsite}/member/dashboard`}>
                Go to Your Dashboard
              </Button>
              <Button
                style={secondaryButton}
                href={`${organisationWebsite}/member/constitution`}>
                Read the Constitution
              </Button>
            </Section>

            <Text style={securityText}>
              Want to set a password login? You can do it anytime in your{" "}
              <Link
                href={`${organisationWebsite}/member/settings?tab=security`}
                style={securityLink}>
                security settings
              </Link>
              .
            </Text>

            <Hr style={divider} />

            {/* Help Section */}
            <Section style={helpSection}>
              <Heading as="h4" style={helpHeading}>
                💬 Need Help Getting Started?
              </Heading>
              <Text style={helpText}>
                Our team is here to support you every step of the way.
              </Text>
              <table style={contactTable}>
                <tbody>
                  <tr>
                    <td style={contactCell}>
                      <Text style={contactLabel}>Email us:</Text>
                      <Link
                        href={`mailto:${organisationEmail}`}
                        style={contactLink}>
                        {organisationEmail}
                      </Link>
                    </td>
                  </tr>
                </tbody>
              </table>
            </Section>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              You're receiving this email because you created an account at
              Posso Ventures. We're excited to have you on board!
            </Text>
            <Section style={copyright}>
              <Text style={copyrightText}>
                © {new Date().getFullYear()} Posso Ventures. All rights
                reserved.
              </Text>
            </Section>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

WelcomeEmail.PreviewProps = {
  userName: "Theogene Uwase",
  userEmail: "uwase@example.com",
} satisfies WelcomeEmailProps

export default WelcomeEmail

// Styles
const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  padding: "20px 0",
}

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  maxWidth: "600px",
  borderRadius: "12px",
  overflow: "hidden",
  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
}

const headerSection = {
  padding: "30px 0",
  textAlign: "center" as const,
  backgroundColor: "#ffffff",
  borderBottom: "1px solid #e6e9f0",
}

const logo = {
  margin: "0 auto",
  display: "block",
  borderRadius: "50%",
}

const welcomeBanner = {
  backgroundColor: "#165598",
  background: "linear-gradient(135deg, #165598 0%, #28bcd6 100%)",
  padding: "40px 20px",
  textAlign: "center" as const,
}

const bannerHeading = {
  color: "#ffffff",
  fontSize: "22px",
  fontWeight: "700",
  margin: "0 0 10px",
  textAlign: "center" as const,
}

const bannerText = {
  color: "#ffffff",
  fontSize: "16px",
  margin: "0",
  opacity: "0.95",
  textAlign: "center" as const,
}

const contentSection = {
  padding: "40px 40px 20px",
  backgroundColor: "#ffffff",
}

const greeting = {
  color: "#1f2937",
  fontSize: "18px",
  lineHeight: "28px",
  fontWeight: "600",
  margin: "0 0 20px",
}

const text = {
  color: "#4b5563",
  fontSize: "16px",
  lineHeight: "26px",
  margin: "0 0 20px",
}

const tagline = {
  color: "#165598",
  fontSize: "18px",
  textAlign: "center" as const,
  margin: "25px 0",
  padding: "15px",
  backgroundColor: "#e6f2ff",
  borderRadius: "8px",
  border: "1px solid #b3d9ff",
}

const quickStartCard = {
  backgroundColor: "#f0fdf4",
  borderRadius: "10px",
  padding: "25px",
  border: "1px solid #bbf7d0",
  marginBottom: "25px",
}

const cardHeading = {
  color: "#166534",
  fontSize: "18px",
  fontWeight: "700",
  margin: "0 0 20px",
}

const quickStartTable = {
  width: "100%",
}

const stepCell = {
  width: "40px",
  verticalAlign: "top",
  paddingBottom: "15px",
}

const stepContentCell = {
  verticalAlign: "top",
  paddingBottom: "15px",
  paddingLeft: "10px",
}

const stepNumber = {
  display: "inline-block",
  width: "32px",
  height: "32px",
  borderRadius: "50%",
  backgroundColor: "#10b981",
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "700",
  textAlign: "center" as const,
  lineHeight: "32px",
  margin: "0",
}

const stepTitle = {
  color: "#166534",
  fontSize: "15px",
  fontWeight: "600",
  margin: "0 0 4px",
}

const stepDesc = {
  color: "#15803d",
  fontSize: "13px",
  margin: "0",
}

const ctaSection = {
  textAlign: "center" as const,
  margin: "35px 0",
}

const securityText = {
  color: "#4b5563",
  fontSize: "14px",
  lineHeight: "22px",
  margin: "0 0 22px",
  textAlign: "center" as const,
}

const securityLink = {
  color: "#165598",
  fontWeight: "600",
  textDecoration: "underline",
}

const primaryButton = {
  backgroundColor: "#165598",
  borderRadius: "8px",
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  padding: "14px 28px",
  display: "inline-block",
  margin: "0 8px 10px",
  boxShadow: "0 4px 6px rgba(22, 85, 152, 0.25)",
  boxSizing: "border-box" as const,
}

const secondaryButton = {
  backgroundColor: "#10b981",
  borderRadius: "8px",
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  padding: "14px 28px",
  display: "inline-block",
  margin: "0 8px 10px",
  boxShadow: "0 4px 6px rgba(16, 185, 129, 0.25)",
  boxSizing: "border-box" as const,
}

const divider = {
  borderTop: "1px solid #e5e7eb",
  margin: "30px 0",
}

const helpSection = {
  textAlign: "center" as const,
  marginBottom: "25px",
}

const helpHeading = {
  color: "#111827",
  fontSize: "18px",
  fontWeight: "700",
  margin: "0 0 10px",
  textAlign: "center" as const,
}

const helpText = {
  color: "#6b7280",
  fontSize: "14px",
  margin: "0 0 20px",
}

const contactTable = {
  margin: "0 auto",
}

const contactCell = {
  padding: "0 14px",
  textAlign: "center" as const,
  verticalAlign: "top",
}

const contactLabel = {
  color: "#6b7280",
  fontSize: "13px",
  fontWeight: "500",
  margin: "0 0 5px",
}

const contactLink = {
  color: "#3b82f6",
  fontSize: "15px",
  fontWeight: "600",
  textDecoration: "none",
}

const footer = {
  textAlign: "center" as const,
  backgroundColor: "#f9fafb",
  padding: "30px 20px",
  borderTop: "1px solid #e5e7eb",
}

const footerText = {
  color: "#6b7280",
  fontSize: "13px",
  lineHeight: "20px",
  margin: "0 0 12px",
}

const copyright = {
  marginTop: "15px",
}

const copyrightText = {
  color: "#9ca3af",
  fontSize: "12px",
  margin: "5px 0",
}
