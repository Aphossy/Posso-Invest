// constants/navigation.ts
import {
  Activity,
  AlertCircle,
  Award,
  BadgeQuestionMark,
  BarChart3,
  BarChartBig,
  Bell,
  BookOpen,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle,
  ClipboardList,
  Clock,
  CreditCard,
  FileText,
  FolderIcon,
  FolderOpen,
  Gavel,
  History,
  Home,
  IdCard,
  LayoutDashboard,
  Mail,
  MessageSquare,
  Phone,
  PiggyBank,
  Settings,
  Shield,
  Sparkles,
  User,
  UserCheck,
  Users,
  Wallet,
} from "lucide-react"

export type UserRole =
  | "member"
  | "treasurer"
  | "secretary"
  | "president"
  | "admin"

export interface NavigationItem {
  title: string
  url: string
  icon: any
  description?: string
  shortcut?: string
  badge?: string
  isNew?: boolean
  external?: boolean
}

export interface NavigationGroup {
  label: string
  items: NavigationItem[]
}

// ============================================
// PUBLIC PAGES (Landing Site)
// ============================================
export const PUBLIC_PAGES: NavigationItem[] = [
  {
    title: "Home",
    url: "/",
    icon: Home,
    description: "Back to homepage",
  },

  {
    title: "Contact",
    url: "/contact",
    icon: Phone,
    description: "Get in touch",
  },
]

// ============================================
// MEMBER NAVIGATION
// ============================================
export const MEMBER_NAVIGATION: NavigationGroup[] = [
  {
    label: "Overview",
    items: [
      {
        title: "Dashboard",
        url: "/member/dashboard",
        icon: LayoutDashboard,
        description: "Your Ikimina overview",
        shortcut: "mod+1",
      },
      {
        title: "My Savings",
        url: "/member/savings",
        icon: Sparkles,
        description: "Track your monthly savings",
        shortcut: "mod+s",
        isNew: true,
      },
      {
        title: "My Share-out",
        url: "/member/share-out",
        icon: Wallet,
        description: "Year-end fund distribution",
        isNew: true,
      },
    ],
  },
  {
    label: "Contributions & Loans",
    items: [
      {
        title: "Contribution Calendar",
        url: "/member/contributions/calendar",
        icon: Calendar,
        description: "Payment window reminders",
        shortcut: "mod+3",
      },
      {
        title: "My Contributions",
        url: "/member/contributions/history",
        icon: Wallet,
        description: "History and receipts",
        shortcut: "mod+4",
      },
      {
        title: "Loan Requests",
        url: "/member/loans",
        icon: CreditCard,
        description: "Request and track loans",
        shortcut: "mod+l",
      },
      {
        title: "My Penalties",
        url: "/member/penalties",
        icon: AlertCircle,
        description: "View late payment penalties",
      },
    ],
  },
  {
    label: "Meetings",
    items: [
      {
        title: "Meeting Schedule",
        url: "/member/meetings",
        icon: Clock,
        description: "Upcoming meetings and locations",
        shortcut: "mod+5",
      },
      {
        title: "Minutes & Resolutions",
        url: "/member/minutes",
        icon: History,
        description: "Review past meetings",
        shortcut: "mod+m",
      },
      {
        title: "My Attendance",
        url: "/member/attendance",
        icon: Users,
        description: "Attendance history",
      },
      {
        title: "My Action Items",
        url: "/member/actions",
        icon: CheckCircle,
        description: "Your assigned tasks",
      },
    ],
  },
  {
    label: "Documents & Governance",
    items: [
      {
        title: "Constitution & Policies",
        url: "/member/documents/constitution",
        icon: FileText,
        description: "Rules and governance",
        shortcut: "mod+6",
      },
      {
        title: "Leadership Term",
        url: "/member/leadership",
        icon: Award,
        description: "Track committee mandate",
      },
      {
        title: "Files & Documents",
        url: "/member/documents/files",
        icon: FolderIcon,
        description: "Uploaded files and personal documents",
      },
      {
        title: "Shared Assets",
        url: "/member/assets",
        icon: FolderOpen,
        description: "Photos, media, and files shared with all members",
      },
    ],
  },

  {
    label: "Communication",
    items: [
      {
        title: "Support",
        url: "/member/support",
        icon: BadgeQuestionMark,
        description: "Contact helpdesk for assistance",
        shortcut: "mod+7",
      },
      {
        title: "Announcements",
        url: "/member/announcements",
        icon: Bell,
        description: "Group notices",
      },
    ],
  },
  {
    label: "Account",
    items: [
      {
        title: "My Card",
        url: "/member/card",
        icon: IdCard,
        description: "View your interactive membership card",
      },
      {
        title: "My Profile",
        url: "/member/profile",
        icon: User,
        description: "Personal information",
        shortcut: "mod+8",
      },
      {
        title: "Settings",
        url: "/member/settings",
        icon: Settings,
        description: "Account preferences",
        shortcut: "mod+9",
      },
    ],
  },
]

// ============================================
// TREASURER NAVIGATION
// ============================================
export const TREASURER_NAVIGATION: NavigationGroup[] = [
  {
    label: "Overview",
    items: [
      {
        title: "Dashboard",
        url: "/treasurer/dashboard",
        icon: LayoutDashboard,
        description: "Group financial overview",
        shortcut: "mod+1",
      },
      {
        title: "Contribution Window",
        url: "/treasurer/contributions/window",
        icon: Clock,
        description: "Open and close payment period",
        shortcut: "mod+a",
        isNew: false,
      },
    ],
  },
  {
    label: "Contributions",
    items: [
      {
        title: "Member Contributions",
        url: "/treasurer/contributions/members",
        icon: Wallet,
        description: "Record and verify payments",
        shortcut: "mod+2",
      },
      {
        title: "Late Penalties",
        url: "/treasurer/penalties",
        icon: AlertCircle,
        description: "Track penalties and waivers",
        shortcut: "mod+3",
      },
      {
        title: "Receipts",
        url: "/treasurer/contributions/receipts",
        icon: FileText,
        description: "Issue and archive receipts",
      },
    ],
  },
  {
    label: "Loans",
    items: [
      {
        title: "Loan Requests",
        url: "/treasurer/loans/requests",
        icon: Bell,
        description: "Pending approvals",
        shortcut: "mod+2",
      },
      {
        title: "Disbursements",
        url: "/treasurer/loans/disbursements",
        icon: CreditCard,
        description: "Track approved payouts",
        shortcut: "mod+4",
      },
      {
        title: "Repayments",
        url: "/treasurer/loans/repayments",
        icon: History,
        description: "Monitor repayment status",
      },
    ],
  },
  {
    label: "Expenses",
    items: [
      {
        title: "Operational Expenses",
        url: "/treasurer/expenses",
        icon: Briefcase,
        description: "Approve and track committee expenses",
        isNew: true,
      },
    ],
  },
  {
    label: "Reports",
    items: [
      {
        title: "Fund Tracker",
        url: "/treasurer/funds",
        icon: Wallet,
        description: "Income, expenses, and net balance",
        isNew: true,
      },
      {
        title: "Share-out",
        url: "/treasurer/share-out",
        icon: Wallet,
        description: "Year-end fund distribution to members",
        isNew: true,
      },
      {
        title: "Monthly Summary",
        url: "/treasurer/reports/monthly",
        icon: BarChart3,
        description: "Income and outflows",
      },
      {
        title: "Audit Prep",
        url: "/treasurer/reports/audit",
        icon: Shield,
        description: "Four-month audit pack",
      },
      {
        title: "Projections",
        url: "/treasurer/reports/projections",
        icon: Activity,
        description: "Forward-looking fund and compliance forecasts",
        isNew: true,
      },
    ],
  },
  {
    label: "Communication",
    items: [
      {
        title: "Announcements",
        url: "/treasurer/announcements",
        icon: Bell,
        description: "Group notices and updates",
      },
    ],
  },
  {
    label: "Documents",
    items: [
      {
        title: "Financial Files",
        url: "/treasurer/documents",
        icon: FileText,
        description: "Reports, statements, and financial proofs",
      },
      {
        title: "Shared Assets",
        url: "/treasurer/assets",
        icon: FolderOpen,
        description: "Group photos, media, and shared files",
      },
    ],
  },
  {
    label: "Account",
    items: [
      {
        title: "My Profile",
        url: "/treasurer/profile",
        icon: User,
        description: "Personal profile",
      },
      {
        title: "Settings",
        url: "/treasurer/settings",
        icon: Settings,
        description: "Account preferences",
      },
    ],
  },
]

// ============================================
// SECRETARY NAVIGATION
// ============================================
export const SECRETARY_NAVIGATION: NavigationGroup[] = [
  {
    label: "Overview",
    items: [
      {
        title: "Dashboard",
        url: "/secretary/dashboard",
        icon: LayoutDashboard,
        description: "Meeting and governance overview",
        shortcut: "mod+1",
      },
      {
        title: "Meeting Schedule",
        url: "/secretary/meetings",
        icon: Calendar,
        description: "Set agendas and venues",
        shortcut: "mod+2",
      },
    ],
  },
  {
    label: "Governance",
    items: [
      {
        title: "Minutes",
        url: "/secretary/minutes",
        icon: ClipboardList,
        description: "Capture and publish minutes",
        shortcut: "mod+m",
      },
      {
        title: "Attendance Register",
        url: "/secretary/attendance",
        icon: Users,
        description: "Track meeting attendance",
      },
      {
        title: "Action Tracker",
        url: "/secretary/actions",
        icon: CheckCircle,
        description: "Follow up on decisions",
      },
    ],
  },
  // {
  //   label: "Members",
  //   items: [
  //     {
  //       title: "Member Directory",
  //       url: "/secretary/members",
  //       icon: Users,
  //       description: "Roster and contact info",
  //     },
  //     {
  //       title: "Join Requests",
  //       url: "/secretary/requests",
  //       icon: Mail,
  //       description: "Review applications",
  //     },
  //   ],
  // },
  {
    label: "Expenses",
    items: [
      {
        title: "My Expenses",
        url: "/secretary/expenses",
        icon: Briefcase,
        description: "Submit and track operational expenses",
        isNew: true,
      },
    ],
  },
  {
    label: "Communication",
    items: [
      {
        title: "Announcements",
        url: "/secretary/announcements",
        icon: Bell,
        description: "Broadcast key updates",
      },
      {
        title: "Messages",
        url: "/secretary/messages",
        icon: MessageSquare,
        description: "Member support and correspondence",
      },
    ],
  },
  {
    label: "Documents",
    items: [
      {
        title: "Document Library",
        url: "/secretary/documents/files",
        icon: FileText,
        description: "Minutes, reports, and group files",
      },
      {
        title: "Constitution",
        url: "/secretary/documents/constitution",
        icon: BookOpen,
        description: "Maintain governance docs",
      },
      {
        title: "Letters & Approvals",
        url: "/secretary/documents/letters",
        icon: Mail,
        description: "Correspondence and formal letters",
      },
      {
        title: "Shared Assets",
        url: "/secretary/assets",
        icon: FolderOpen,
        description: "Group photos, media, and shared files",
      },
    ],
  },

  {
    label: "Account",
    items: [
      {
        title: "My Profile",
        url: "/secretary/profile",
        icon: User,
        description: "Personal profile",
      },
      {
        title: "Settings",
        url: "/secretary/settings",
        icon: Settings,
        description: "Account preferences",
      },
    ],
  },
]

// ============================================
// PRESIDENT NAVIGATION
// ============================================
export const PRESIDENT_NAVIGATION: NavigationGroup[] = [
  {
    label: "Overview",
    items: [
      {
        title: "Dashboard",
        url: "/president/dashboard",
        icon: LayoutDashboard,
        description: "Group governance overview",
        shortcut: "mod+1",
      },
      {
        title: "Ikimina Health",
        url: "/president/health",
        icon: Activity,
        description: "Contributions, loans, and governance risk",
        shortcut: "mod+2",
      },
      {
        title: "Meeting Chair",
        url: "/president/meetings",
        icon: Calendar,
        description: "Preside over monthly meetings",
        shortcut: "mod+3",
      },
    ],
  },
  {
    label: "Governance",
    items: [
      // {
      //   title: "Resolutions & Decisions",
      //   url: "/president/governance",
      //   icon: Gavel,
      //   description: "Meeting outcomes and binding decisions",
      // },
      {
        title: "Member Directory",
        url: "/president/members",
        icon: Users,
        description: "Roster, contact info, and standing",
      },
      {
        title: "Attendance Overview",
        url: "/president/attendance",
        icon: UserCheck,
        description: "Quorum tracking and member attendance",
      },
      {
        title: "Action Items",
        url: "/president/actions",
        icon: CheckCircle,
        description: "Follow up on committee decisions",
      },
    ],
  },
  {
    label: "Financial Oversight",
    items: [
      // {
      //   title: "Pending Approvals",
      //   url: "/president/financial/approvals",
      //   icon: Shield,
      //   description: "Dual-auth transactions above 50,000 RWF",
      //   isNew: true,
      // },
      {
        title: "Financial Overview",
        url: "/president/financial/overview",
        icon: BarChart3,
        description: "Group fund summary and trends",
      },
      {
        title: "Loan Overview",
        url: "/president/loans",
        icon: CreditCard,
        description: "Requests, disbursements, and repayments",
      },
      {
        title: "Contributions",
        url: "/president/financial/contributions",
        icon: Wallet,
        description: "Monthly savings flow",
        shortcut: "mod+5",
        isNew: true,
      },

      {
        title: "Penalties",
        url: "/president/financial/penalties",
        icon: AlertCircle,
        description: "Late payment penalties overview",
        shortcut: "mod+6",
        isNew: true,
      },
      {
        title: "Share-out",
        url: "/president/share-out",
        icon: PiggyBank,
        description: "Approve year-end fund distribution",
        isNew: true,
      },
    ],
  },
  {
    label: "Expenses",
    items: [
      {
        title: "My Expenses",
        url: "/president/expenses",
        icon: Briefcase,
        description: "Submit and track operational expenses",
        isNew: true,
      },
    ],
  },
  {
    label: "Communication",
    items: [
      {
        title: "Announcements",
        url: "/president/announcements",
        icon: Bell,
        description: "Broadcast updates to all members",
      },
      {
        title: "Messages",
        url: "/president/messages",
        icon: MessageSquare,
        description: "Member support and correspondence",
      },
    ],
  },
  {
    label: "Documents",
    items: [
      {
        title: "Constitution",
        url: "/president/documents/constitution",
        icon: BookOpen,
        description: "Group governing rules and principles",
      },
      {
        title: "Formal Letters",
        url: "/president/documents/letters",
        icon: Mail,
        description: "Official correspondence and approvals",
      },
      {
        title: "Shared Assets",
        url: "/president/assets",
        icon: FolderOpen,
        description: "Group photos, media, and shared files",
      },
    ],
  },
  {
    label: "Account",
    items: [
      {
        title: "My Profile",
        url: "/president/profile",
        icon: User,
        description: "Personal profile",
      },
      {
        title: "Settings",
        url: "/president/settings",
        icon: Settings,
        description: "Account preferences",
      },
    ],
  },
]

// ============================================
// ADMIN NAVIGATION
// ============================================
export const ADMIN_NAVIGATION: NavigationGroup[] = [
  {
    label: "Platform",
    items: [
      {
        title: "Dashboard",
        url: "/admin/dashboard",
        icon: LayoutDashboard,
        description: "TrustLink Group overview",
        shortcut: "mod+1",
      },
      {
        title: "Group Health",
        url: "/admin/health",
        icon: Activity,
        description: "Savings, loans, attendance",
        shortcut: "mod+2",
      },
    ],
  },
  {
    label: "Members & Organization",
    items: [
      {
        title: "Members",
        url: "/admin/members",
        icon: Users,
        description: "Member database",
        shortcut: "mod+3",
      },
      // {
      //   title: "Invitations",
      //   url: "/admin/members/invitations",
      //   icon: Mail,
      //   description: "Pending invites and resend queue",
      // },
      // {
      //   title: "Roles & Permissions",
      //   url: "/admin/roles",
      //   icon: Shield,
      //   description: "Committee access",
      // },
      {
        title: "Organization",
        url: "/admin/organization",
        icon: Building2,
        description: "Organization settings",
      },
      {
        title: "Leadership Term",
        url: "/admin/leadership",
        icon: Award,
        description: "Track committee mandate",
      },
    ],
  },
  {
    label: "Financial Oversight",
    items: [
      {
        title: "Contributions",
        url: "/admin/financial/contributions",
        icon: Wallet,
        description: "Monthly savings flow",
        shortcut: "mod+5",
      },
      {
        title: "Loans",
        url: "/admin/financial/loans",
        icon: CreditCard,
        description: "Approvals and repayments",
      },
      {
        title: "Penalties",
        url: "/admin/financial/penalties",
        icon: AlertCircle,
        description: "Late payment penalties overview",
      },
      {
        title: "Audit Reports",
        url: "/admin/financial/audits",
        icon: BarChartBig,
        description: "Four-month reviews",
      },
      {
        title: "Share-out",
        url: "/admin/share-out",
        icon: PiggyBank,
        description: "Approve year-end fund distribution",
        isNew: true,
      },
    ],
  },
  {
    label: "Legal & Banking",
    items: [
      {
        title: "Legalization",
        url: "/admin/legal",
        icon: Briefcase,
        description: "Registration milestones",
      },
      {
        title: "Bank Accounts",
        url: "/admin/banking",
        icon: Wallet,
        description: "Account setup and access",
      },
    ],
  },
  {
    label: "Communication",
    items: [
      {
        title: "Messages",
        url: "/admin/messages",
        icon: MessageSquare,
        description: "Support ticket management",
        shortcut: "mod+9",
      },
      {
        title: "Announcements",
        url: "/admin/announcements",
        icon: Bell,
        description: "Broadcast updates",
      },
    ],
  },
  {
    label: "Governance",
    items: [
      {
        title: "Attendance",
        url: "/admin/attendance",
        icon: Users,
        description: "Meeting attendance records",
      },
      {
        title: "Action Items",
        url: "/admin/actions",
        icon: CheckCircle,
        description: "Track committee follow-ups",
      },
    ],
  },
  {
    label: "Documents & Files",
    items: [
      {
        title: "Document Library",
        url: "/admin/files",
        icon: FileText,
        description: "Minutes, financial reports, legal documents",
      },
      {
        title: "Shared Assets",
        url: "/admin/assets",
        icon: FolderOpen,
        description: "Group photos, media, and shared files",
      },
    ],
  },

  {
    label: "Account",
    items: [
      {
        title: "My Profile",
        url: "/admin/profile",
        icon: User,
        description: "Admin profile",
      },
      // {
      //   title: "Committee Management",
      //   url: "/admin/committee",
      //   icon: Users,
      //   description: "Admin committee",
      // },
      {
        title: "Settings",
        url: "/admin/settings",
        icon: Settings,
        description: "Account preferences",
      },
    ],
  },
]

// ============================================
// UTILITY FUNCTIONS
// ============================================
export function getNavigationByRole(role: UserRole): NavigationGroup[] {
  switch (role) {
    case "admin":
      return ADMIN_NAVIGATION
    case "president":
      return PRESIDENT_NAVIGATION
    case "treasurer":
      return TREASURER_NAVIGATION
    case "secretary":
      return SECRETARY_NAVIGATION
    case "member":
      return MEMBER_NAVIGATION
    default:
      return []
  }
}

export function getAllNavigationItems(role: UserRole): NavigationItem[] {
  const groups = getNavigationByRole(role)
  return groups.flatMap((group) => group.items)
}

export function searchNavigationItems(
  role: UserRole,
  query: string
): NavigationItem[] {
  const allItems = getAllNavigationItems(role)
  const lowerQuery = query.toLowerCase()

  return allItems.filter(
    (item) =>
      item.title.toLowerCase().includes(lowerQuery) ||
      item.description?.toLowerCase().includes(lowerQuery) ||
      item.url.toLowerCase().includes(lowerQuery)
  )
}

// ============================================
// QUICK ACTIONS (For Command Bar)
// ============================================
export const QUICK_ACTIONS: Record<UserRole, NavigationItem[]> = {
  president: [
    {
      title: "Pending Approvals",
      url: "/president/financial/approvals",
      icon: Shield,
      description: "Authorize dual-auth transactions",
      shortcut: "mod+a",
    },
    {
      title: "Chair Meeting",
      url: "/president/meetings",
      icon: Calendar,
      description: "Manage upcoming meeting",
      shortcut: "mod+m",
    },
    {
      title: "Post Announcement",
      url: "/president/announcements",
      icon: Bell,
      description: "Broadcast update to members",
      shortcut: "mod+shift+a",
    },
  ],
  member: [
    {
      title: "Request Loan",
      url: "/member/loans",
      icon: CreditCard,
      description: "Start a loan request",
      shortcut: "mod+l",
    },
  ],
  treasurer: [
    {
      title: "Verify Contribution",
      url: "/treasurer/contributions",
      icon: Wallet,
      description: "Mark payment received",
      shortcut: "mod+v",
    },
    {
      title: "Approve Loan",
      url: "/treasurer/loans/requests",
      icon: CheckCircle,
      description: "Review pending loans",
      shortcut: "mod+shift+l",
    },
  ],
  secretary: [
    {
      title: "Capture Minutes",
      url: "/secretary/minutes",
      icon: ClipboardList,
      description: "Log meeting minutes",
      shortcut: "mod+m",
    },
    {
      title: "Post Announcement",
      url: "/secretary/announcements",
      icon: Bell,
      description: "Share an update",
      shortcut: "mod+shift+a",
    },
  ],
  admin: [
    {
      title: "Group Health",
      url: "/admin/health",
      icon: Activity,
      description: "Performance snapshot",
      shortcut: "mod+h",
    },
    {
      title: "Invite Member",
      url: "/admin/members",
      icon: UserCheck,
      description: "Add committee members",
      shortcut: "mod+v",
    },
    {
      title: "Announcements",
      url: "/admin/announcements",
      icon: Bell,
      description: "Publish updates",
    },
    {
      title: "Attendance",
      url: "/admin/attendance",
      icon: Users,
      description: "Attendance overview",
    },
    {
      title: "Action Items",
      url: "/admin/actions",
      icon: CheckCircle,
      description: "Track follow-ups",
    },
  ],
}
