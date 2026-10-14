import {
  organisationEmail,
  organisationName,
  organisationWebsite,
} from "@/constants/organisation"
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components"

interface ReceiptIssuedEmailProps {
  memberName: string
  receiptNumber: string
  amount: string
  currency: string
}

export function ReceiptIssuedEmail({
  memberName,
  receiptNumber,
  amount,
  currency,
}: ReceiptIssuedEmailProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>Your receipt {receiptNumber} is attached.</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={brand}>{organisationName}</Text>
            <Text style={subtitle}>Official payment receipt</Text>
          </Section>
          <Section style={content}>
            <Heading style={heading}>Your receipt is ready</Heading>
            <Text style={paragraph}>Muraho {memberName},</Text>
            <Text style={paragraph}>
              A receipt has been issued for your payment. The designed,
              printable PDF is attached to this email.
            </Text>
            <Section style={details}>
              <Text style={detail}>Receipt number: {receiptNumber}</Text>
              <Text style={detail}>
                Amount received: {currency} {amount}
              </Text>
            </Section>
            <Text style={paragraph}>
              Keep the attached receipt for your records. If you have questions,
              reply to this email or contact{" "}
              <Link href={`mailto:${organisationEmail}`} style={link}>
                {organisationEmail}
              </Link>
              .
            </Text>
            <Text style={smallText}>
              <Link href={organisationWebsite} style={link}>
                {organisationWebsite}
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

const main = { backgroundColor: "#f4f6f4", fontFamily: "Arial, sans-serif" }
const container = {
  backgroundColor: "#ffffff",
  margin: "32px auto",
  maxWidth: "600px",
  borderRadius: "12px",
  overflow: "hidden" as const,
}
const header = { backgroundColor: "#123d30", padding: "24px 32px" }
const brand = {
  color: "#ffffff",
  fontSize: "20px",
  fontWeight: "bold",
  margin: "0",
}
const subtitle = { color: "#d8aa4c", fontSize: "13px", margin: "6px 0 0" }
const content = { padding: "28px 32px" }
const heading = { color: "#1f2933", fontSize: "22px", margin: "0 0 20px" }
const paragraph = { color: "#48545e", fontSize: "14px", lineHeight: "1.6" }
const details = {
  backgroundColor: "#f4f7f5",
  border: "1px solid #e1e9e4",
  borderRadius: "8px",
  margin: "20px 0",
  padding: "8px 18px",
}
const detail = { color: "#123d30", fontSize: "14px", fontWeight: "bold" }
const link = { color: "#17654f" }
const smallText = { color: "#738078", fontSize: "12px", marginTop: "24px" }
