import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components"

interface AdminDirectUserMessageEmailProps {
  userName: string
  subject: string
  message: string
}

export default function AdminDirectUserMessageEmail({
  userName,
  subject,
  message,
}: AdminDirectUserMessageEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{subject}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>Message from Posso Ventures Admin</Heading>

          <Text style={text}>Hello {userName},</Text>
          <Text style={text}>You have received a message from our team.</Text>

          <Section style={card}>
            <Text style={label}>Subject</Text>
            <Text style={value}>{subject}</Text>

            <Hr style={divider} />

            <Text style={label}>Message</Text>
            <Text style={messageStyle}>{message}</Text>
          </Section>

          <Text style={footer}>
            If you have any questions, reply to this email and our team will
            assist you.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

const main = {
  backgroundColor: "#f8fafc",
  fontFamily: "Arial, sans-serif",
  margin: 0,
  padding: "24px 0",
}

const container = {
  backgroundColor: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "8px",
  margin: "0 auto",
  maxWidth: "560px",
  padding: "24px",
}

const heading = {
  color: "#0f172a",
  fontSize: "22px",
  fontWeight: "700",
  margin: "0 0 16px",
}

const text = {
  color: "#334155",
  fontSize: "14px",
  lineHeight: "22px",
  margin: "0 0 12px",
}

const card = {
  backgroundColor: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "8px",
  padding: "16px",
}

const label = {
  color: "#64748b",
  fontSize: "12px",
  fontWeight: "700",
  letterSpacing: "0.02em",
  margin: "0 0 6px",
  textTransform: "uppercase" as const,
}

const value = {
  color: "#0f172a",
  fontSize: "14px",
  fontWeight: "600",
  lineHeight: "22px",
  margin: "0",
}

const divider = {
  borderColor: "#e2e8f0",
  margin: "14px 0",
}

const messageStyle = {
  color: "#0f172a",
  fontSize: "14px",
  lineHeight: "22px",
  margin: "0",
  whiteSpace: "pre-line" as const,
}

const footer = {
  color: "#64748b",
  fontSize: "12px",
  lineHeight: "18px",
  margin: "16px 0 0",
}
