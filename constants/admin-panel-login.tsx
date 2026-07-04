import {
  BadgeQuestionMark,
  Bell,
  Calendar,
  CreditCard,
  FileCode,
  FileText,
  HelpCircle,
  History,
  ImageIcon,
  LayoutDashboard,
  ListChecks,
  MessageSquareText,
  Settings,
  Sparkles,
  User,
  Wallet,
  Webhook,
} from "lucide-react"
import { BiSolidDonateHeart } from "react-icons/bi"

// Map icon names to Lucide React components
export const getIconComponent = (iconName: string) => {
  switch (iconName.toLowerCase()) {
    case "dashboard":
      return <LayoutDashboard className="h-5 w-5" />
    case "savings":
      return <Sparkles className="h-5 w-5" />
    case "calendar":
      return <Calendar className="h-5 w-5" />
    case "wallet":
      return <Wallet className="h-5 w-5" />
    case "creditcard":
      return <CreditCard className="h-5 w-5" />
    case "history":
      return <History className="h-5 w-5" />
    case "bell":
      return <Bell className="h-5 w-5" />
    case "messagesquaretext":
      return <MessageSquareText className="h-5 w-5" />
    case "badgequestionmark":
      return <BadgeQuestionMark className="h-5 w-5" />
    case "post":
      return <FileText className="h-5 w-5" />
    case "media":
      return <ImageIcon className="h-5 w-5" />
    case "listcheck":
      return <ListChecks className="h-5 w-5" />
    case "help":
      return <HelpCircle className="h-5 w-5" />
    case "user":
      return <User className="h-5 w-5" />
    case "settings":
      return <Settings className="h-5 w-5" />
    case "webhooks":
      return <Webhook className="h-5 w-5" />
    case "donateicon":
      return <BiSolidDonateHeart className="h-5 w-5" />
    default:
      return <FileCode className="h-5 w-5" />
  }
}

// TrustLink member dashboard preview cards for the login page
export const adminPages = [
  {
    id: 0,
    title: "Dashboard",
    description:
      "See your savings status, contribution summary, and current notices at a glance.",
    url: "/member/dashboard",
    icon: "dashboard",
  },
  {
    id: 1,
    title: "My Savings",
    description:
      "Track monthly savings progress and the balance you have already built.",
    url: "/member/savings",
    icon: "savings",
  },
  {
    id: 2,
    title: "Contribution Calendar",
    description:
      "Follow the contribution window and payment reminders for each month.",
    url: "/member/contributions/calendar",
    icon: "calendar",
  },
  {
    id: 3,
    title: "My Contributions",
    description: "Review contribution history, receipts, and payment records.",
    url: "/member/contributions/history",
    icon: "wallet",
  },
  {
    id: 4,
    title: "Loan Requests",
    description:
      "Request support, track approvals, and monitor disbursement progress.",
    url: "/member/loans",
    icon: "creditcard",
  },
  {
    id: 5,
    title: "Meetings",
    description:
      "Check upcoming meetings, locations, and governance timelines.",
    url: "/member/meetings",
    icon: "history",
  },
  {
    id: 6,
    title: "Announcements",
    description:
      "Stay up to date with group notices, reminders, and member updates.",
    url: "/member/announcements",
    icon: "bell",
  },
  {
    id: 7,
    title: "Support",
    description:
      "Reach helpdesk resources for account, access, or technical issues.",
    url: "/member/support",
    icon: "badgequestionmark",
  },
  {
    id: 8,
    title: "Settings",
    description:
      "Manage account preferences, profile details, and session settings.",
    url: "/member/settings",
    icon: "settings",
  },
]
