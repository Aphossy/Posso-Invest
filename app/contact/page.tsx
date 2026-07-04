import { Metadata } from "next"
import { ContactClient } from "./contact-client"

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with the Posso Ventures Platform leadership committee.",
}

interface ContactPageProps {
  searchParams: Promise<{
    service?: string | string[]
  }>
}

export default async function ContactPage({ searchParams }: ContactPageProps) {
  const params = await searchParams
  const serviceParam = Array.isArray(params.service)
    ? params.service[0]
    : params.service
  const initialService =
    serviceParam === "request-access" ? "access" : undefined
  const initialSubject =
    serviceParam === "request-access"
      ? "Request Access to 10/10 Ventures Platform"
      : undefined
  const initialMessage =
    serviceParam === "request-access"
      ? "Hello Ventures Platform leadership, I would like to request access to join the platform. Please review my request and let me know the next steps."
      : undefined

  return (
    <ContactClient
      initialService={initialService}
      initialSubject={initialSubject}
      initialMessage={initialMessage}
    />
  )
}
