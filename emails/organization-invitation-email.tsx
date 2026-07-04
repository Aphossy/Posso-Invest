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

interface OrganizationInvitationEmailProps {
  inviterName: string
  organizationName: string
  roleLabel: string
  expiresAt: string
  invitationUrl: string
  loginUrl: string
  supportEmail: string
  recipientEmail: string
}

export default function OrganizationInvitationEmail({
  inviterName,
  organizationName,
  roleLabel,
  expiresAt,
  invitationUrl,
  loginUrl,
  supportEmail,
  recipientEmail,
}: OrganizationInvitationEmailProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>
        {inviterName} invited you to join {organizationName} on Posso Ventures.
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
            <Heading style={heading}>Invitation to Join Workspace</Heading>
            <Text style={paragraph}>
              <strong>{inviterName}</strong> invited you to join{" "}
              <strong>{organizationName}</strong> as{" "}
              <strong style={role}>{roleLabel}</strong>.
            </Text>
            <Text style={paragraph}>
              This invitation expires on <strong>{expiresAt}</strong>.
            </Text>

            <Section style={detailsCard}>
              <Text style={detailLabel}>Invited Email</Text>
              <Text style={detailValue}>{recipientEmail}</Text>
            </Section>

            <Text style={paragraph}>
              To avoid invitation errors, follow these steps:
            </Text>
            <Text style={stepsText}>1. Click Login First.</Text>
            <Text style={stepsText}>
              2. Sign in with Google using this invited email: {recipientEmail}
            </Text>
            <Text style={stepsText}>
              3. Return to this page and click Accept Invitation.
            </Text>
            <Text style={stepsText}>
              4. If you use a different Google account, invitation acceptance
              will fail.
            </Text>

            <Section style={buttonWrap}>
              <Button href={loginUrl} style={secondaryButton}>
                Login First
              </Button>
            </Section>

            <Text style={flowHint}>After login, continue with step 2:</Text>

            <Section style={buttonWrapCompact}>
              <Button href={invitationUrl} style={button}>
                Accept Invitation
              </Button>
            </Section>

            <Text style={smallText}>
              If you were not expecting this invitation, you can ignore this
              email or contact{" "}
              <Link href={`mailto:${organisationEmail}`} style={link}>
                {organisationEmail}
              </Link>
              .
            </Text>
          </Section>

          <Section style={footerSection}>
            <Hr style={footerDivider} />
            <Text style={footerText}>
              This invitation was sent to {recipientEmail}.
            </Text>
            <Text style={footerText}>
              If the address is incorrect, sign out and use the invited account
              before accepting.
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

OrganizationInvitationEmail.PreviewProps = {
  inviterName: "Posso Ventures Admin",
  organizationName: "Posso Ventures",
  roleLabel: "member",
  expiresAt: "Mar 11, 2026, 6:00 PM",
  invitationUrl:
    "https://possocapital.vercel.app/accept-invitation?invitationId=abc",
  loginUrl: "https://possocapital.vercel.app/login",
  supportEmail: "possowiba01@gmail.com",
  recipientEmail: "invitee@example.com",
} satisfies OrganizationInvitationEmailProps

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
  backgroundColor: "#165598",
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

const detailsCard = {
  border: "1px solid #e5e7eb",
  borderRadius: "8px",
  padding: "12px",
  backgroundColor: "#f9fafb",
  margin: "0 0 18px",
}

const detailLabel = {
  color: "#6b7280",
  fontSize: "12px",
  textTransform: "uppercase" as const,
  letterSpacing: "0.6px",
  margin: "0 0 4px",
}

const detailValue = {
  color: "#111827",
  fontSize: "14px",
  margin: "0",
  fontWeight: "600",
}

const stepsText = {
  margin: "0 0 8px",
  fontSize: "13px",
  lineHeight: "21px",
  color: "#374151",
}

const role = {
  textTransform: "capitalize" as const,
}

const buttonWrap = {
  textAlign: "center" as const,
  margin: "18px 0",
}

const buttonWrapCompact = {
  textAlign: "center" as const,
  margin: "10px 0 18px",
}

const button = {
  backgroundColor: "#165598",
  color: "#ffffff",
  borderRadius: "6px",
  textDecoration: "none",
  fontSize: "15px",
  fontWeight: "600",
  padding: "12px 22px",
  boxSizing: "border-box" as const,
}

const secondaryButton = {
  backgroundColor: "#ffffff",
  color: "#165598",
  border: "1px solid #165598",
  borderRadius: "6px",
  textDecoration: "none",
  fontSize: "15px",
  fontWeight: "600",
  padding: "12px 22px",
  boxSizing: "border-box" as const,
}

const flowHint = {
  margin: "0 0 4px",
  fontSize: "12px",
  lineHeight: "18px",
  color: "#64748b",
  textAlign: "center" as const,
}

const smallText = {
  margin: "0",
  fontSize: "13px",
  lineHeight: "21px",
  color: "#6b7280",
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
  margin: "8px 0 0",
  fontSize: "12px",
}

const link = {
  color: "#165598",
  textDecoration: "underline",
}
