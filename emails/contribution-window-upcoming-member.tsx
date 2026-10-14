import {
  organisationEmail,
  organisationName,
  organisationWebsite,
} from "@/constants/organisation"
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components"

interface ContributionWindowUpcomingMemberEmailProps {
  memberName: string
  period: string
  periodLabel: string
  windowStart: string
  windowEnd: string
  amountDue: string
  currency: string
  penaltyApplies: boolean
}

export function ContributionWindowUpcomingMemberEmail({
  memberName,
  period,
  periodLabel,
  windowStart,
  windowEnd,
  amountDue,
  currency,
  penaltyApplies,
}: ContributionWindowUpcomingMemberEmailProps) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || organisationWebsite

  return (
    <Html lang="en">
      <Head />
      <Preview>
        {`Your ${periodLabel} contribution window opens tomorrow, ${windowStart}.`}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={brand}>{organisationName}</Text>
            <Text style={subtitle}>Contribution Window Reminder</Text>
          </Section>
          <Section style={content}>
            <Heading style={heading}>
              Your contribution window opens tomorrow
            </Heading>
            <Text style={paragraph}>Muraho {memberName},</Text>
            <Text style={paragraph}>
              The contribution window for <strong>{periodLabel}</strong> opens
              tomorrow, <strong>{windowStart}</strong>. You can contribute
              <strong>
                {" "}
                {currency} {amountDue}
              </strong>{" "}
              through <strong>{windowEnd}</strong>.
            </Text>
            {penaltyApplies ? (
              <Text style={warning}>
                Please pay by {windowEnd}. A 10% late penalty will apply to
                contributions paid after the deadline.
              </Text>
            ) : null}
            <Section style={buttonSection}>
              <Button href={`${baseUrl}/member/contributions`} style={button}>
                View My Contributions
              </Button>
            </Section>
            <Text style={smallText}>
              Period: {period}. Questions? Contact{" "}
              <Link href={`mailto:${organisationEmail}`} style={link}>
                {organisationEmail}
              </Link>
              .
            </Text>
          </Section>
          <Section style={footer}>
            <Text style={footerText}>
              © {new Date().getFullYear()} {organisationName}. All rights
              reserved.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

ContributionWindowUpcomingMemberEmail.PreviewProps = {
  memberName: "Aline Mukamana",
  period: "2026-10",
  periodLabel: "October 2026",
  windowStart: "25 October 2026",
  windowEnd: "5 November 2026",
  amountDue: "100,000",
  currency: "RWF",
  penaltyApplies: true,
} satisfies ContributionWindowUpcomingMemberEmailProps

export default ContributionWindowUpcomingMemberEmail

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

const header = {
  backgroundColor: "#004225",
  textAlign: "center" as const,
  padding: "24px 20px 18px",
}

const brand = {
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "700",
  margin: "0 0 4px",
}

const subtitle = {
  color: "#d1d5db",
  fontSize: "12px",
  margin: "0",
}

const content = {
  padding: "28px 32px 20px",
}

const heading = {
  color: "#111827",
  fontSize: "22px",
  fontWeight: "700",
  margin: "0 0 14px",
}

const paragraph = {
  color: "#374151",
  fontSize: "15px",
  lineHeight: "24px",
  margin: "0 0 16px",
}

const warning = {
  color: "#92400e",
  backgroundColor: "#fffbeb",
  border: "1px solid #fde68a",
  borderRadius: "6px",
  padding: "10px 14px",
  fontSize: "13px",
  lineHeight: "20px",
  margin: "0 0 22px",
}

const buttonSection = {
  textAlign: "center" as const,
  margin: "24px 0 16px",
}

const button = {
  backgroundColor: "#004225",
  color: "#ffffff",
  borderRadius: "8px",
  padding: "12px 24px",
  textDecoration: "none",
  fontWeight: "600",
  fontSize: "15px",
}

const smallText = {
  color: "#6b7280",
  fontSize: "13px",
  lineHeight: "20px",
  margin: "0 0 8px",
}

const link = {
  color: "#004225",
  textDecoration: "underline",
}

const footer = {
  textAlign: "center" as const,
  backgroundColor: "#f9fafb",
  padding: "18px 20px",
  borderTop: "1px solid #e5e7eb",
}

const footerText = {
  color: "#9ca3af",
  fontSize: "12px",
  margin: "0",
}
