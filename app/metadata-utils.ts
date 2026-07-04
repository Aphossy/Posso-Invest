// app\metadata-utils.ts
import type { Metadata } from "next"
import { organisationEmail } from "@/constants/organisation"

export function createMetadata({
  title,
  description,
  path,
  ogImage = "/og.jpg",
  type = "website",
  noIndex = false,
  author = "Trustlink Group - Ikimina",
  keywords = [],
  publishedTime,
  modifiedTime,
  tags = [],
  locale = "en",
}: {
  title: string
  description?: string
  path: string
  ogImage?: string
  type?: "website" | "article"
  noIndex?: boolean
  author?: string | string[]
  keywords?: string[]
  publishedTime?: string
  modifiedTime?: string
  tags?: string[]
  locale?: "en" | "fr"
}): Metadata {
  const BASE_URL =
    process.env.NEXT_PUBLIC_APP_URL || "https://possocapital.vercel.app"

  // Ensure base URL has proper protocol
  const baseUrl = BASE_URL.startsWith("http") ? BASE_URL : `https://${BASE_URL}`

  // Ensure path starts with a slash but doesn't end with one
  const normalizedPath = path.startsWith("/") ? path : `/${path}`
  const cleanPath =
    normalizedPath.endsWith("/") && normalizedPath !== "/"
      ? normalizedPath.slice(0, -1)
      : normalizedPath

  // Create the canonical URL
  const canonicalUrl = `${baseUrl}${cleanPath}`

  // Ensure image URL is absolute
  const imageUrl = ogImage.startsWith("http")
    ? ogImage
    : `${baseUrl}${ogImage.startsWith("/") ? ogImage : `/${ogImage}`}`

  // Default description fallback
  const defaultDescription =
    "Posso Ventures is a professional group that enables members to save, invest, and build a modern infrastructure together."
  // Enhanced title for SEO
  const enhancedTitle = `${title} | Posso Ventures`

  const metadata: Metadata = {
    title: enhancedTitle,
    description: description || defaultDescription,
    keywords: [...keywords, "Venture", "Posso Ventures", "Investing", "Saving", "Rwanda"],
    authors: Array.isArray(author)
      ? author.map((name) => ({ name }))
      : [{ name: author, url: baseUrl }],
    creator: "Posso Ventures",
    publisher: "Posso Ventures",
    formatDetection: {
      telephone: true,
      email: true,
      address: true,
    },
    alternates: {
      canonical: canonicalUrl,
      languages: {
        en: canonicalUrl,
      },
    },
    robots: {
      index: !noIndex,
      follow: !noIndex,
      nocache: false,
      googleBot: {
        index: !noIndex,
        follow: !noIndex,
        noimageindex: false,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    openGraph: {
      title: enhancedTitle,
      description: description || defaultDescription,
      url: canonicalUrl,
      siteName: "Posso Ventures",
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: title,
          type: "image/jpeg",
        },
      ],
      locale: "en_RW",
      alternateLocale: [],
      type: type as "website" | "article",
      countryName: "Rwanda",
      ...(type === "article" && {
        authors: Array.isArray(author) ? author : [author],
        publishedTime,
        modifiedTime,
        tags,
      }),
    },
    twitter: {
      card: "summary_large_image",
      title: enhancedTitle,
      description: description || defaultDescription,
      images: [imageUrl],
    },
  }

  return metadata
}

// Helper function to create page-specific JSON-LD
export function createPageJsonLd({
  title,
  description,
  path,
  type = "WebPage",
  author = "Trustlink Group",
  datePublished,
  dateModified,
  image,
}: {
  title: string
  description: string
  path: string
  type?: "WebPage" | "Article" | "BlogPosting" | "LocalBusiness"
  datePublished?: string
  dateModified?: string
  author?: string
  image?: string
}) {
  const BASE_URL =
    process.env.NEXT_PUBLIC_APP_URL || "https://possocapital.vercel.app"
  const url = `${BASE_URL}${path}`

  const baseJsonLd: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": type,
    "@id": `${url}#${type.toLowerCase()}`,
    url,
    name: title,
    description,
    isPartOf: {
      "@id": `${BASE_URL}/#website`,
    },
    author: {
      "@type": "Organization",
      "@id": `${BASE_URL}/#organization`,
      name: author,
    },
    publisher: {
      "@type": "Organization",
      "@id": `${BASE_URL}/#organization`,
      name: "Posso Ventures",
    },
  }

  // Add image if provided
  if (image) {
    baseJsonLd.image = {
      "@type": "ImageObject",
      url: image.startsWith("http") ? image : `${BASE_URL}${image}`,
      width: 1200,
      height: 630,
    }
  }

  // Add date information for articles
  if (type === "Article" || type === "BlogPosting") {
    baseJsonLd.datePublished = datePublished || new Date().toISOString()
    baseJsonLd.dateModified = dateModified || new Date().toISOString()
  }

  return baseJsonLd
}

// Helper to generate breadcrumb schema
export function createBreadcrumbSchema(
  items: Array<{ name: string; path: string }>
) {
  const BASE_URL =
    process.env.NEXT_PUBLIC_APP_URL || "https://possocapital.vercel.app"

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${BASE_URL}${item.path}`,
    })),
  }
}

// Helper to generate FAQ schema
export function createFAQSchema(
  faqs: Array<{ question: string; answer: string }>
) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  }
}

// Helper to generate organization schema
export function createOrganizationSchema() {
  const BASE_URL =
    process.env.NEXT_PUBLIC_APP_URL || "https://possocapital.vercel.app"

  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${BASE_URL}/#organization`,
    name: "Posso Ventures",
    url: BASE_URL,
    logo: `${BASE_URL}/brand/logo.png`,
    description:
      "Posso Ventures is a professional group that enables members to save, invest, and build a modern infrastructure together.",

    email: { organisationEmail },
    address: {
      "@type": "PostalAddress",
      addressLocality: "Kigali",
      addressCountry: "RW",
    },
    areaServed: {
      "@type": "Place",
      name: "Rwanda",
    },
    sameAs: [],
  }
}
