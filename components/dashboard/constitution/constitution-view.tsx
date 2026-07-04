"use client"

import { foundingMembers } from "@/constants/founding-members"
import {
  Award,
  BookOpen,
  Building2,
  Calendar,
  CheckCircle2,
  CreditCard,
  Download,
  FileText,
  Gavel,
  HandCoins,
  Landmark,
  MapPin,
  Printer,
  Scale,
  ScrollText,
  Shield,
  Users,
  Wallet,
} from "lucide-react"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// ─── Static data ────────────────────────────────────────────────────────────

const docMeta = [
  { label: "Group Name", value: "TrustLink Group", icon: BookOpen },
  {
    label: "Type",
    value: "Ikimina - Savings & Investment Group",
    icon: Building2,
  },
  { label: "Established", value: "January 10, 2026", icon: Calendar },
  {
    label: "Address",
    value: "Nyamata Sector, Bugesera District, Rwanda",
    icon: MapPin,
  },
  { label: "Founding Members", value: "Eleven (11)", icon: Users },
  { label: "Version", value: "Version 1.0 - January 2026", icon: ScrollText },
]

const keyTerms = [
  {
    label: "Monthly Contribution",
    value: "80,000",
    icon: Wallet,
  },
  {
    label: "Payment Window",
    value: "25th → 6th of following month",
    icon: Calendar,
  },
  { label: "Late Penalty", value: "10% of contribution amount", icon: Scale },
  { label: "Meeting Fee", value: "10,000 RWF per meeting", icon: Users },
  {
    label: "Max Loan",
    value: "Up to personal savings total",
    icon: CreditCard,
  },
  { label: "Loan Interest", value: "5% flat rate", icon: HandCoins },
  {
    label: "Loan Disbursement",
    value: "Within 3 business days",
    icon: CheckCircle2,
  },
  {
    label: "Dual Authorization Threshold",
    value: "Any transaction",
    icon: Shield,
  },
  { label: "Audit Cadence", value: "Every 4 months", icon: FileText },
  { label: "Meeting Quorum", value: "2/3 of registered members", icon: Users },
  { label: "Leadership Term", value: "1 year, max 2 consecutive", icon: Award },
  { label: "Amendment Threshold", value: "2/3 majority vote", icon: Gavel },
]

const articles = [
  {
    num: 1,
    title: "Name of the Group",
    icon: BookOpen,
    summary:
      "The official name is TRUSTLINK GROUP - also the future joint dental clinic name.",
    content: [
      'The official name of the group is TRUSTLINK GROUP, hereinafter referred to as "the Group" or "the Ikimina."',
      "The TrustLink Group name shall also serve as the name of the joint dental clinic that members intend to establish collectively in the future.",
    ],
  },
  {
    num: 2,
    title: "Nature and Legal Status",
    icon: Scale,
    summary:
      "Voluntary Ikimina by UR Dental Therapy graduates (Class of 2025), transitioning to a registered cooperative.",
    content: [
      "TrustLink Group is a voluntary savings and investment group (Ikimina) established by Dental Therapy graduates of the University of Rwanda (Class of 2025).",
      "The Group shall initially operate as an informal savings group under this mutually agreed Constitution while legal registration is being completed.",
      "Upon registration, the Group shall transition to a formally recognized association under Rwandan law, and subsequently to a cooperative registered with the Rwanda Cooperative Agency (RCA) for joint clinic ownership.",
      "The Group is non-partisan, non-discriminatory, and non-profit in nature at the savings level.",
    ],
  },
  {
    num: 3,
    title: "Registered Office and Jurisdiction",
    icon: MapPin,
    summary:
      "Principal address in Nyamata Sector, Bugesera District. Operates under Rwandan law.",
    content: [
      "The principal registered address of TrustLink Group shall be in Nyamata Sector, Bugesera District, Rwanda.",
      "The Group operates under the laws and regulations of the Republic of Rwanda.",
      "Any legal correspondence shall be directed to the Secretary at the registered contact address.",
    ],
  },
  {
    num: 4,
    title: "Vision",
    icon: Award,
    summary:
      "A strong, transparent Ikimina enabling members to save, invest, and build a modern dental clinic.",
    content: [
      "To become a strong, transparent, and legally recognized professional Ikimina that enables members to save, invest, and jointly establish a modern, state-of-the-art dental clinic serving the Rwandan community.",
    ],
  },
  {
    num: 5,
    title: "Mission",
    icon: CheckCircle2,
    summary:
      "Promote financial discipline, unity, and sustainable investment through saving and collective decision-making.",
    content: [
      "To promote financial discipline, unity, professional collaboration, and sustainable investment among Dental Therapy graduates of the University of Rwanda (Class of 2025) through regular saving, collective decision-making, and responsible fund management.",
    ],
  },
  {
    num: 6,
    title: "Objectives",
    icon: CheckCircle2,
    summary:
      "Six key objectives covering saving, investment, member support, unity, transparency, and legal compliance.",
    content: [
      "Encourage consistent and disciplined saving habits among all members.",
      "Build a collective fund sufficient for long-term investment, specifically the establishment and operation of a joint dental clinic.",
      "Provide financial and moral support to members experiencing genuine hardship.",
      "Strengthen professional unity, networking, and collaboration among Dental Therapy graduates.",
      "Ensure transparency, accountability, and trust in all financial and governance matters.",
      "Comply with all applicable laws and regulations of the Republic of Rwanda.",
    ],
    numbered: true,
  },
  {
    num: 7,
    title: "Membership",
    icon: Users,
    summary:
      "Open to UR Dental Therapy graduates (Class of 2025). New members require 2/3 approval. Equal rights for all 8 founding members.",
    sections: [
      {
        title: "7.1 Eligibility",
        items: [
          "Membership shall be open to Dental Therapy graduates of the University of Rwanda (Class of 2025) who voluntarily wish to join and who are approved by the existing membership.",
          "Prospective members must submit a formal written application letter to the Secretary.",
          "Admission of any new member shall require approval by at least two-thirds (2/3) of existing members at a duly constituted meeting.",
        ],
      },
      {
        title: "7.3 Rights of Members",
        items: [
          "To participate fully in all meetings and discussions.",
          "To vote on all matters brought before the general membership.",
          "To benefit from group activities, loans, and investments according to the rules herein.",
          "To access financial records and request a financial summary at any meeting.",
          "To nominate themselves or others for leadership positions.",
          "To raise concerns, complaints, or suggestions through proper channels.",
        ],
      },
      {
        title: "7.4 Obligations of Members",
        items: [
          "To make all contributions on time and within the stipulated payment window.",
          "To attend meetings regularly and notify the Secretary in advance if unable to attend.",
          "To respect and abide by this Constitution and all decisions made by the majority.",
          "To maintain the confidentiality of all internal financial and personal information.",
          "To act honestly, transparently, and in the best interests of the Group at all times.",
        ],
      },
      {
        title: "7.5 Withdrawal of a Member",
        items: [
          "A member wishing to withdraw must give written notice to the Secretary at least two (2) months in advance.",
          "Upon withdrawal, the member's personal savings shall be refunded in full, unless there are any outstanding loan balances or penalties.",
          "A withdrawing member shall not be entitled to any share of the Group's collective investment assets.",
          "A member dismissed for misconduct shall forfeit any right to claim savings until approved by a two-thirds (2/3) majority vote.",
        ],
      },
    ],
  },
  {
    num: 8,
    title: "Savings and Contributions",
    icon: Wallet,
    summary:
      "80,000 RWF/month. Payment window 25th–6th. Late penalty: 10%. Meeting fee: 10,000 RWF.",
    sections: [
      {
        title: "8.1 Monthly Contributions",
        items: [
          "Each registered member slot shall contribute between 80,000 RWF and 160,000 RWF per month.",
          "The minimum contribution is 80,000 RWF and the maximum is 160,000 RWF per registered slot per month.",
          "Contributions shall be made between the 25th of the current month and the 6th of the following month.",
          "Contributions shall be deposited directly to the Group's official Equity Bank Rwanda account.",
        ],
      },
      {
        title: "8.2 Meeting Facilitation Fee",
        items: [
          "Each member shall contribute 10,000 RWF per meeting to cover meeting logistics and hosting costs.",
          "This fee is separate from and in addition to the monthly savings contribution.",
        ],
      },
      {
        title: "8.3 Penalties",
        items: [
          "Late payment of monthly contributions shall attract a penalty of ten percent (10%) of the applicable monthly contribution amount.",
          "Repeated late payments (three or more times in a calendar year) may be grounds for disciplinary action.",
          "All penalties collected shall be added to the Group's general fund.",
        ],
      },
      {
        title: "8.4 Fund Usage",
        items: [
          "Funds shall be used strictly for purposes approved by the members, including savings accumulation, member loans, and collective investments.",
          "No funds shall be withdrawn or transferred without the dual authorization of the President and Treasurer.",
        ],
      },
    ],
  },
  {
    num: 9,
    title: "Loans",
    icon: HandCoins,
    summary:
      "Borrow up to personal savings. 5% flat interest. Disbursed within 3 days. Default = dismissal after 3 missed months.",
    sections: [
      {
        title: "9.1 Loan Eligibility",
        items: [
          "Any member of good standing (up to date with contributions and free of existing Group loans) may apply for a loan.",
          "The maximum loan amount shall not exceed the total personal savings the member has accumulated within the Group.",
        ],
      },
      {
        title: "9.2 Loan Application",
        items: [
          "Loan requests must be submitted in writing to the Treasurer.",
          "Loan approval shall be decided at the next scheduled meeting, or within three (3) business days for urgent cases.",
        ],
      },
      {
        title: "9.3 Disbursement",
        items: [
          "Approved loans shall be disbursed within three (3) business days of approval.",
        ],
      },
      {
        title: "9.4 Repayment and Interest",
        items: [
          "All loans shall be repaid with a flat interest rate of five percent (5%) on the principal amount.",
          "The repayment schedule shall be agreed upon at the time of disbursement.",
          "Interest collected shall be added to the Group's general fund.",
        ],
      },
      {
        title: "9.5 Default",
        items: [
          "A member who fails to repay their loan for three (3) consecutive months without a valid, documented reason shall be dismissed from the Group.",
          "Outstanding loan balances shall be deducted from the dismissed member's savings before any refund.",
        ],
      },
    ],
  },
  {
    num: 10,
    title: "Leadership and Management",
    icon: Award,
    summary:
      "Elected President, Secretary, Treasurer, Advisor. 1-year terms, max 2 consecutive. Removal by 2/3 majority.",
    sections: [
      {
        title: "10.2 Term of Office",
        items: [
          "Each elected leader shall serve a term of one (1) year from the date of election.",
          "Leaders may be re-elected for a maximum of two (2) consecutive terms.",
          "After two consecutive terms, a leader must step down for at least one (1) full term before standing again.",
        ],
      },
      {
        title: "10.3 Elections",
        items: [
          "Leadership elections shall be held annually at a duly constituted General Meeting.",
          "Any member in good standing may nominate themselves or another member for a leadership position.",
          "Elections shall be conducted by secret ballot or show of hands, as agreed at the meeting.",
          "A simple majority of members present shall suffice to elect a leader.",
        ],
      },
      {
        title: "10.4 Removal of a Leader",
        items: [
          "A leader may be removed from office by a two-thirds (2/3) majority vote of all members.",
          "Grounds for removal include financial misconduct, persistent absenteeism, breach of this Constitution, or loss of members' trust.",
          "The accused member shall be given the right to present their defense before any vote is held.",
        ],
      },
    ],
  },
  {
    num: 11,
    title: "Meetings",
    icon: Calendar,
    summary:
      "Monthly meetings, 10-day notice. Quorum: 2/3. Emergency meetings within 5 days. AGM annually with 30-day notice.",
    sections: [
      {
        title: "11.1 Regular Meetings",
        items: [
          "The Group shall hold a regular meeting at least once per month.",
          "Meetings shall be held in rotating locations among members' homes or at agreed venues.",
          "The Secretary shall give at least ten (10) days' notice of each regular meeting.",
        ],
      },
      {
        title: "11.2 Quorum",
        items: [
          "A quorum for any meeting shall be two-thirds (2/3) of all registered members.",
          "No binding financial decisions shall be made in the absence of a quorum.",
        ],
      },
      {
        title: "11.3 Special / Emergency Meetings",
        items: [
          "An emergency meeting may be convened at any time by the President, or upon written request by at least three (3) members.",
          "Emergency meetings shall be convened within five (5) business days of the request.",
        ],
      },
      {
        title: "11.4 Annual General Meeting (AGM)",
        items: [
          "An AGM shall be held once per year to review the annual financial report, elect leaders, and set objectives for the coming year.",
          "All members must be notified at least thirty (30) days in advance of the AGM.",
        ],
      },
    ],
  },
  {
    num: 12,
    title: "Decision Making",
    icon: Gavel,
    summary:
      "Consensus preferred. Simple majority generally. 2/3 for financial decisions over 500,000 RWF and constitutional changes.",
    content: [
      "Decisions shall be made by consensus where possible.",
      "When consensus cannot be reached, decisions shall be made by a simple majority vote (more than 50% of members present).",
      "Financial decisions exceeding 500,000 RWF shall require a two-thirds (2/3) majority vote.",
      "Constitutional amendments require a two-thirds (2/3) majority vote (see Article 16).",
      "The President shall have a casting vote in the event of a tie.",
      "All votes and their outcomes shall be recorded in the meeting minutes.",
    ],
    numbered: true,
  },
  {
    num: 13,
    title: "Auditing and Financial Oversight",
    icon: FileText,
    summary:
      "Audits every 4 months. All members may inspect records. Dual authorization for any transaction.",
    content: [
      "The Group's financial accounts shall be audited every four (4) months.",
      "The Leadership Committee shall conduct internal audits in coordination with at least one (1) other member appointed by the general membership.",
      "All members have the right to inspect the financial records upon reasonable request.",
      "An annual financial report shall be presented at the AGM.",
      "The Treasurer shall maintain a written ledger and digital records of all transactions.",
      "No single person shall have sole control over the Group's bank account; dual authorization (President + Treasurer) is required for all transactions.",
    ],
    numbered: true,
  },
  {
    num: 14,
    title: "Discipline and Conflict Resolution",
    icon: Scale,
    summary:
      "Written warning → formal hearing → suspension/expulsion. Disputes escalated through dialogue, leadership, and mediation.",
    sections: [
      {
        title: "14.1 Disciplinary Process",
        items: [
          "Any member found to have violated this Constitution shall first receive a written warning from the President.",
          "A second violation shall result in a formal hearing before the Leadership Committee.",
          "Persistent or serious misconduct may lead to suspension (temporary) or expulsion (permanent) upon approval by a two-thirds (2/3) majority of all members.",
          "The accused member has the right to be heard and to present evidence at all stages of the disciplinary process.",
        ],
      },
      {
        title: "14.2 Conflict Resolution",
        items: [
          "Disputes between members shall first be addressed through informal dialogue facilitated by the Leadership Committee.",
          "If unresolved, the matter shall be escalated to the full Leadership Committee for mediation.",
          "If still unresolved, the dispute may be referred to a mutually agreed mediator or, as a last resort, to the appropriate Rwandan legal authority.",
        ],
      },
    ],
  },
  {
    num: 15,
    title: "Banking and Financial Accounts",
    icon: Landmark,
    summary:
      "Official account with Equity Bank Rwanda. All 8 founders as signatories. Dual authorization for any transaction.",
    content: [
      "TrustLink Group shall maintain an official group bank account with Equity Bank Rwanda.",
      "In compliance with Equity Bank Rwanda requirements, the account shall have a maximum of eight (8) authorized signatories, as listed in Article 7.2 of this Constitution.",
      "All Group funds shall be deposited into and disbursed from this official account.",
      "Any transaction shall require dual authorization: the signature of both the President and the Treasurer.",
      "The Treasurer shall provide a monthly account statement to all members.",
    ],
    numbered: true,
  },
  {
    num: 16,
    title: "Amendments to the Constitution",
    icon: ScrollText,
    summary:
      "Amendments require 2/3 majority at a duly constituted meeting with 14 days' written notice.",
    content: [
      "This Constitution may be amended by a two-thirds (2/3) majority vote of all members at a duly constituted meeting.",
      "Proposed amendments must be submitted in writing to the Secretary at least fourteen (14) days before the meeting at which the vote will be held.",
      "Amendments affecting the banking arrangements or legal status of the Group shall also require notification of the relevant bank and/or legal authority.",
    ],
    numbered: true,
  },
  {
    num: 17,
    title: "Dissolution of the Group",
    icon: Scale,
    summary:
      "Unanimous agreement required. All debts settled, funds distributed proportionally to personal savings.",
    content: [
      "The Group may be dissolved only upon unanimous agreement of all members at a duly convened Special General Meeting.",
      "Upon dissolution, all outstanding loans shall first be collected, all debts settled, and the remaining collective fund distributed in proportion to each member's total personal savings.",
      "Any jointly owned assets (e.g., clinic shares) shall be disposed of and proceeds distributed as agreed by unanimous vote.",
    ],
    numbered: true,
  },
  {
    num: 18,
    title: "Adoption and Entry into Force",
    icon: CheckCircle2,
    summary:
      "Adopted January 10, 2026 at the Inaugural Meeting. Enters into force upon all member signatures and notarization.",
    content: [
      "This Constitution was adopted on January 10, 2026, at a duly convened Inaugural Meeting of TrustLink Group held in Nyamata Sector, Bugesera District, Republic of Rwanda.",
      "This Constitution enters into force immediately upon signing by all founding members and certification by a duly authorized Notary of the Republic of Rwanda.",
    ],
    numbered: true,
  },
]

const leadership = [
  {
    position: "President",
    name: "MANIRIHO JEAN PAUL",
    phone: "0785 251 067",
    responsibilities:
      "Chairs meetings, represents the Group externally, casts deciding vote in case of a tie.",
  },
  {
    position: "Secretary",
    name: "NZIZA OSCAR",
    phone: "0782 035 102",
    responsibilities:
      "Keeps records, prepares minutes, manages correspondence and communications.",
  },
  {
    position: "Treasurer",
    name: "HIRWA WICLIF",
    phone: "0787 575 201",
    responsibilities:
      "Manages funds, maintains accounts, prepares and presents financial reports.",
  },
  {
    position: "Advisor",
    name: "ISHIMWE JEAN BAPTISTE",
    phone: "0785 577 189",
    responsibilities:
      "Provides guidance and support to the leadership team, helps resolve disputes, and ensures adherence to the Constitution.",
  },
]

function roleVariant(role: string) {
  switch (role) {
    case "President":
      return "warning" as const
    case "Secretary":
      return "secondary" as const
    case "Treasurer":
      return "success" as const
    case "Advisor":
      return "info" as const
    default:
      return "outline" as const
  }
}

// ─── Article content renderer ────────────────────────────────────────────────

function ArticleBody({ article }: { article: (typeof articles)[number] }) {
  if ("sections" in article && article.sections) {
    return (
      <div className="space-y-4">
        {article.sections.map((section) => (
          <div key={section.title}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {section.title}
            </p>
            <ol className="space-y-1.5 pl-4">
              {section.items.map((item, i) => (
                <li
                  key={i}
                  className="flex gap-2 text-sm text-muted-foreground">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold">
                    {i + 1}
                  </span>
                  {item}
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    )
  }

  if ("content" in article && article.content) {
    return (
      <ol className="space-y-1.5 pl-4">
        {article.content.map((item, i) => (
          <li key={i} className="flex gap-2 text-sm text-muted-foreground">
            {article.numbered ? (
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold">
                {i + 1}
              </span>
            ) : (
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            )}
            {item}
          </li>
        ))}
      </ol>
    )
  }

  return null
}

// ─── Main component ──────────────────────────────────────────────────────────

export function ConstitutionView() {
  return (
    <div className="flex-1 space-y-6">
      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <ScrollText className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-semibold">Constitution & Policies</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            The supreme governing document of TrustLink Group Ikimina - Version
            1.0, adopted January 10, 2026.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            Print
          </Button>
          <Button size="sm" asChild>
            <a
              href="/doc/TrustLink%20Constitution.pdf"
              download="TrustLink-Constitution.pdf">
              <Download className="h-4 w-4" />
              Download PDF
            </a>
          </Button>
        </div>
      </div>

      {/* Document metadata */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
              <Scale className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">
                Document Information
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Official governing document details
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {docMeta.map(({ label, value, icon: Icon }) => (
              <div
                key={label}
                className="flex items-start gap-3 rounded-md border p-3">
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-sm font-medium">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="articles">Articles (18)</TabsTrigger>
          <TabsTrigger value="members">Founding Members</TabsTrigger>
          <TabsTrigger value="leadership">Leadership</TabsTrigger>
        </TabsList>

        {/* ── OVERVIEW ───────────────────────────────────────────────────── */}
        <TabsContent value="overview" className="space-y-6 pt-4">
          {/* Preamble */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary">
                Preamble
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground italic">
                &ldquo;We, the founding members of TrustLink Group, being Dental
                Therapy graduates of the University of Rwanda (Class of 2025),
                united by a shared vision of financial growth, professional
                collaboration, and collective investment, hereby establish this
                Constitution to govern our savings and investment group - the
                Ikimina. We commit ourselves to the principles of transparency,
                accountability, mutual trust, and financial discipline. This
                Constitution shall serve as the supreme governing instrument of
                TrustLink Group, binding upon all members from the date of
                adoption.&rdquo;
              </p>
            </CardContent>
          </Card>

          {/* Vision & Mission */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <Award className="h-4 w-4 text-amber-500" />
                  Vision
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                To become a strong, transparent, and legally recognized
                professional Ikimina that enables members to save, invest, and
                jointly establish a modern dental clinic serving the Rwandan
                community.
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Mission
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                To promote financial discipline, unity, professional
                collaboration, and sustainable investment among Dental Therapy
                graduates through regular saving, collective decision-making,
                and responsible fund management.
              </CardContent>
            </Card>
          </div>

          {/* Key terms */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Key Financial & Governance Terms
            </p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {keyTerms.map(({ label, value, icon: Icon }) => (
                <div
                  key={label}
                  className="flex items-center justify-between rounded-md border bg-muted/30 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {label}
                    </span>
                  </div>
                  <span className="ml-2 text-xs font-semibold tabular-nums">
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Objectives */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">
                Group Objectives
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-2">
                {[
                  "Encourage consistent and disciplined saving habits among all members.",
                  "Build a collective fund sufficient for the establishment and operation of a joint dental clinic.",
                  "Provide financial and moral support to members experiencing genuine hardship.",
                  "Strengthen professional unity, networking, and collaboration among Dental Therapy graduates.",
                  "Ensure transparency, accountability, and trust in all financial and governance matters.",
                  "Comply with all applicable laws and regulations of the Republic of Rwanda.",
                ].map((obj, i) => (
                  <li
                    key={i}
                    className="flex gap-3 text-sm text-muted-foreground">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                      {i + 1}
                    </span>
                    {obj}
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          {/* Adoption notice */}
          <Card className="border-dashed">
            <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium">
                    Adopted January 10, 2026
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Nyamata Sector, Bugesera District, Republic of Rwanda
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" asChild>
                <a
                  href="/doc/TrustLink%20Constitution.pdf"
                  download="TrustLink-Constitution.pdf">
                  <Download className="h-4 w-4" />
                  Download Full PDF
                </a>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── ARTICLES ───────────────────────────────────────────────────── */}
        <TabsContent value="articles" className="pt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">
                All 18 Articles
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Click any article to expand its full content.
              </p>
            </CardHeader>
            <CardContent>
              <Accordion type="multiple" className="w-full">
                {articles.map((article) => {
                  return (
                    <AccordionItem
                      key={article.num}
                      value={`article-${article.num}`}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-start gap-3 text-left">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                            {article.num}
                          </span>
                          <div>
                            <p className="text-sm font-medium">
                              Article {article.num} - {article.title}
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground font-normal">
                              {article.summary}
                            </p>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="ml-9 mt-1">
                          <ArticleBody article={article} />
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )
                })}
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── FOUNDING MEMBERS ───────────────────────────────────────────── */}
        <TabsContent value="members" className="pt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">
                Founding Members
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Eleven (11) founding members of TrustLink Group - authorized
                bank signatories (Article 7.2 & 15).
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {foundingMembers.map((m) => (
                  <div
                    key={m.no}
                    className="flex flex-wrap items-center gap-3 rounded-md border p-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold">
                      {m.no}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{m.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {m.phone} &middot; Email: {m.email}
                      </p>
                    </div>
                    <Badge variant={roleVariant(m.role)}>{m.role}</Badge>
                  </div>
                ))}
              </div>
              <Separator className="my-4" />
              <p className="text-xs text-muted-foreground">
                All eleven founding members hold equal rights and obligations
                within the Group&apos;s internal governance, and are authorized
                signatories on the Group&apos;s Equity Bank Rwanda account.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── LEADERSHIP ─────────────────────────────────────────────────── */}
        <TabsContent value="leadership" className="space-y-4 pt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">
                Leadership Committee
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Elected January 10, 2026. Mandate: January 10, 2026 - January
                10, 2027 (Article 10).
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {leadership.map((l) => (
                  <div key={l.position} className="rounded-md border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold">{l.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {l.phone}
                        </p>
                      </div>
                      <Badge variant={roleVariant(l.position)}>
                        {l.position}
                      </Badge>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {l.responsibilities}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">
                Leadership Rules at a Glance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 sm:grid-cols-2">
                {[
                  {
                    label: "Term Duration",
                    value: "1 year from election date",
                  },
                  { label: "Max Consecutive Terms", value: "2 terms" },
                  {
                    label: "Cooldown After 2 Terms",
                    value: "At least 1 full term",
                  },
                  {
                    label: "Removal Threshold",
                    value: "2/3 majority of all members",
                  },
                  {
                    label: "Election Method",
                    value: "Ballot or show of hands",
                  },
                  {
                    label: "Election Majority",
                    value: "Simple majority of present",
                  },
                ].map((r) => (
                  <div
                    key={r.label}
                    className="flex items-center justify-between rounded-md border bg-muted/30 px-4 py-2.5">
                    <span className="text-xs text-muted-foreground">
                      {r.label}
                    </span>
                    <span className="text-xs font-semibold">{r.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-dashed">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">
                <strong>Dual Authorization (Art. 15.4):</strong> All
                transactions require the co-signature of both the President and
                the Treasurer. No single person may have sole control over the
                Group&apos;s bank account.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
