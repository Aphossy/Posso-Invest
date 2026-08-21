// app\siteMetadata.ts
import type { Metadata } from "next"

const baseUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "https://possocapital.vercel.app"

export const siteMetadata: Metadata = {
  metadataBase: new URL(`${baseUrl}`),
  title: {
    default: "10/10 Ventures - Save Together, Build Together",
    template: "%s | 10/10 Ventures",
  },
  description:
    "10/10 Ventures is a professional group that enables members to save, invest, and build a modern infrastructure together.",
  applicationName: "10/10 Ventures",
  authors: [
    {
      name: "10/10 Ventures",
      url: `${baseUrl}`,
    },
  ],
  creator: "10/10 Ventures",
  generator: "Next.js",
  keywords: [
    "10/10 Ventures",
    "Investment Group",
    "Dental Clinic Investment",
    "Group Savings",
    "Investment Opportunities",
    "Financial Growth",
    "Community Building",
    "Modern Dental Clinic",
    "Rwanda Investment Group",
  ],
  manifest: "/manifest.ts",
  referrer: "origin-when-cross-origin",
  publisher: "10/10 Ventures",
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: `${baseUrl}`,
    languages: {
      en: `${baseUrl}`,
    },
  },
  icons: {
    icon: "/favicon.ico",
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION || "",
  },
  twitter: {
    card: "summary_large_image",

    title: "10/10 Ventures",
    description:
      "10/10 Ventures is a professional group that enables members to save, invest, and build a modern infrastructure together.",
    images: [`${baseUrl}/og.jpg`],
  },
  openGraph: {
    title: "10/10 Ventures",
    description:
      "10/10 Ventures is a professional group that enables members to save, invest, and build a modern infrastructure together.",
    type: "website",
    locale: "en_RW",
    url: `${baseUrl}`,
    siteName: "10/10 Ventures",
    images: [
      {
        url: "/og.jpg",
        width: 1200,
        height: 630,
        alt: "10/10 Ventures",
        type: "image/jpeg",
      },
    ],
    countryName: "Rwanda",
  },
  appleWebApp: {
    capable: true,
    title: "10/10 Ventures",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: true,
    date: true,
    address: true,
    email: true,
    url: true,
  },
  category: "Organization",
  classification: "Business",
  abstract:
    "10/10 Ventures is a professional group that enables members to save, invest, and build a modern infrastructure together.",
  other: {
    "theme-color": "#004225",
    "msapplication-TileColor": "#004225",
    // "msapplication-TileImage": "/mstile-144x144.png",
  },
}
