// constants/site-config.ts

export const siteConfig = {
  name: "10/10 Ventures",
  legalName: "10/10 Ventures Ltd",
  title: "10/10 Ventures Ltd - Member-Owned Savings and Investment Company",
  description:
    "10/10 Ventures is a transparent Ventures Group that empowers members to save, invest, and build a modern dental clinic together.",
  url: "https://www.1010ventures.online",
  ogImage: "https://www.1010ventures.online/og.jpg",
  tagline: "Save together. Build together.",
  keywords: [
    "Ventures Group",
    "savings group",
    "10/10 Ventures",
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
      savingsCommitmentMonths: 30,
      contributionWindow: {
        startDay: 1,
        endDay: 5,
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
      membershipCount: 12,
      quorumRatio: 0.67,
      leadershipTermMonths: 36,
      investmentSpecialResolutionThresholdRwf: 5000000,
      foundingCohortDeadline: "2026-09-01",
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
    defaultTitle: "10/10 Ventures - Professional Ventures Group in Rwanda",
    titleTemplate: "%s | 10/10 Ventures",
    description:
      "A transparent Ventures Group for Dental Therapy graduates focused on saving, investing, and establishing a modern dental clinic.",
    openGraph: {
      type: "website",
      locale: "en_US",
      url: "https://www.1010ventures.online",
      siteName: "10/10 Ventures",
      images: [
        {
          url: "https://www.1010ventures.online/og.jpg",
          width: 1200,
          height: 630,
          alt: "10/10 Ventures",
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
