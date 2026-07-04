// constants/site-config.ts

export const siteConfig = {
  name: "Posso Ventures",
  title: "Posso Ventures - Professional Ventures Group for Dental Therapy Graduates",
  description:
    "Posso Ventures is a transparent Ventures Group that empowers members to save, invest, and build a modern dental clinic together.",
  url: "https://possocapital.vercel.app",
  ogImage: "https://possocapital.vercel.app/og.jpg",
  tagline: "Save together. Build together.",
  keywords: [
    "Ventures Group",
    "savings group",
    "Posso Ventures",
    "dental therapy graduates",
    "Rwanda savings",
    "group loans",
    "collective investment",
    "meeting minutes",
  ],

  links: {
    support: "mailto:possowiba01@gmail.com",
    contact: "/contact",
    constitution: "/constitution",
    minutes: "/minutes",
  },

  contact: {
    email: "possowiba01@gmail.com",
    support: "possowiba01@gmail.com",
    phone: "+250 784 343 073",
    address: " Kigali, Rwanda",
  },

  platform: {
    savings: {
      monthlyContributionRwf: 100000,
      contributionWindow: {
        startDay: 5,
        endDay: 1,
      },
      latePenaltyRate: 0.1,
    },
    loans: {
      maxLoanToSavingsRatio: 1,
      interestRate: 0.05,
      disbursementDays: 3,
      defaultDismissalMonths: 3,
    },
    meetings: {
      hostContributionRwf: 10000,
      auditCadenceMonths: 4,
    },
    governance: {
      membershipCount: 10,
      quorumRatio: 0.67,
      leadershipTermMonths: 12,
    },
  },

  features: {
    chat: true,
    announcements: true,
    documents: true,
    multiLanguage: false,
    darkMode: true,
  },

  mainNav: [
    {
      title: "Home",
      href: "/",
    },
    {
      title: "About",
      href: "/about",
    },
    {
      title: "Constitution",
      href: "/constitution",
    },
    {
      title: "Meetings",
      href: "/minutes",
    },
    {
      title: "Contact",
      href: "/contact",
    },
  ],

  footerNav: {
    company: [
      { title: "About", href: "/about" },
      { title: "Leadership", href: "/about#leadership" },
      { title: "Contact", href: "/contact" },
    ],
    governance: [
      { title: "Constitution", href: "/constitution" },
      { title: "Meeting Minutes", href: "/minutes" },
      { title: "Policies", href: "/policies" },
      { title: "Membership", href: "/membership" },
    ],
    support: [
      { title: "Help Center", href: "/help" },
      { title: "FAQs", href: "/faqs" },
      { title: "Contact Support", href: "/support" },
      { title: "Report Issue", href: "/report" },
    ],
    legal: [
      { title: "Terms of Service", href: "/terms" },
      { title: "Privacy Policy", href: "/privacy" },
      { title: "Cookie Policy", href: "/cookies" },
    ],
  },

  seo: {
    defaultTitle: "Posso Ventures - Professional Ventures Group in Rwanda",
    titleTemplate: "%s | Posso Ventures",
    description:
      "A transparent Ventures Group for Dental Therapy graduates focused on saving, investing, and establishing a modern dental clinic.",
    openGraph: {
      type: "website",
      locale: "en_US",
      url: "https://possocapital.vercel.app",
      siteName: "Posso Ventures",
      images: [
        {
          url: "https://possocapital.vercel.app/og.jpg",
          width: 1200,
          height: 630,
          alt: "Posso Ventures",
        },
      ],
    },
    twitter: {
      handle: "@possocapital",
      site: "@possocapital",
      cardType: "summary_large_image",
    },
  },

  app: {
    version: "1.0.0",
    buildNumber: "1",
    minimumSupportedVersion: "1.0.0",
  },
} as const

export type SiteConfig = typeof siteConfig
