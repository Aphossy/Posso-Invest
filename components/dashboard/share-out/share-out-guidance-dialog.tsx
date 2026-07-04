"use client"

import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  HelpCircle,
  ListChecks,
  PiggyBank,
  Shield,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

interface Props {
  role: "treasurer" | "president" | "admin"
}

function Step({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
        {n}
      </span>
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
    </div>
  )
}

function TreasurerNotes() {
  return (
    <div className="space-y-6 text-sm px-3">
      <div className="rounded-lg border bg-amber-50/60 p-4 dark:bg-amber-950/20">
        <div className="mb-1 flex items-center gap-2 font-medium text-amber-800 dark:text-amber-300">
          <AlertCircle className="h-4 w-4" />
          Important — dual-authorisation required
        </div>
        <p className="text-xs text-amber-700 dark:text-amber-400">
          You compute the share-out draft, but only the{" "}
          <strong>President</strong> or <strong>Admin</strong> can approve it.
          This separation prevents a single person from authorising their own
          payment.
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 font-medium">
          <PiggyBank className="h-4 w-4 text-primary" />
          What is a share-out?
        </div>
        <p className="text-muted-foreground">
          At cycle end the group distributes its cash pool to members in
          proportion to their confirmed monthly contributions, minus any
          outstanding loans and active penalties owed by each member.
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 font-medium">
          <BookOpen className="h-4 w-4 text-primary" />
          Calculation method
        </div>
        <ul className="space-y-1.5 text-xs text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground" />
            <span>
              <strong>Contribution base</strong> — sum of each member&apos;s
              confirmed + late contributions.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground" />
            <span>
              <strong>Share %</strong> — member base ÷ total base of all
              members.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground" />
            <span>
              <strong>Gross share</strong> — distributable amount × share %.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground" />
            <span>
              <strong>Net payout</strong> — gross share minus outstanding loan
              balance and active penalty amounts.
            </span>
          </li>
        </ul>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2 font-medium">
          <ListChecks className="h-4 w-4 text-primary" />
          Workflow steps
        </div>
        <div className="space-y-3">
          <Step
            n={1}
            title="Enter the distributable amount"
            desc="The total cash the group has available to share out — typically total savings + loan interest collected, minus approved expenses."
          />
          <Step
            n={2}
            title="Review the draft"
            desc="The system auto-computes every member's allocation. Check members with large deductions and confirm the net payout looks correct."
          />
          <Step
            n={3}
            title="Submit for president approval"
            desc="Once satisfied, leave the draft for the president to review and approve. You can delete the draft if a recomputation is needed."
          />
          <Step
            n={4}
            title="Mark as distributed"
            desc="After the president approves and all members have received their payouts (cash, mobile money, or bank transfer), click 'Mark distributed' to close the cycle."
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="font-medium">Status meanings</p>
        <div className="flex flex-wrap gap-2">
          <Badge className="bg-slate-100 text-slate-700">draft</Badge>
          <Badge className="bg-amber-100 text-amber-700">approved</Badge>
          <Badge className="bg-emerald-100 text-emerald-700">distributed</Badge>
          <Badge className="bg-rose-100 text-rose-700">cancelled</Badge>
        </div>
        <ul className="space-y-1 text-xs text-muted-foreground">
          <li>
            <strong>draft</strong> — computed, awaiting president approval
          </li>
          <li>
            <strong>approved</strong> — president authorised; payouts pending
          </li>
          <li>
            <strong>distributed</strong> — all members paid; cycle closed
          </li>
          <li>
            <strong>cancelled</strong> — aborted before distribution
          </li>
        </ul>
      </div>
    </div>
  )
}

function PresidentNotes() {
  return (
    <div className="space-y-6 text-sm px-3">
      <div className="rounded-lg border bg-purple-50/60 p-4 dark:bg-purple-950/20">
        <div className="mb-1 flex items-center gap-2 font-medium text-purple-800 dark:text-purple-300">
          <Shield className="h-4 w-4" />
          Constitutional authority
        </div>
        <p className="text-xs text-purple-700 dark:text-purple-400">
          Year-end distributions require <strong>dual authorisation</strong> —
          the Treasurer computes the share-out and you, as President, must
          approve it before any funds are released to members.
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 font-medium">
          <PiggyBank className="h-4 w-4 text-primary" />
          What you are approving
        </div>
        <p className="text-muted-foreground">
          You are verifying that the treasurer&apos;s computation is accurate —
          that the distributable amount is correct, that each member&apos;s
          contribution base is properly accounted for, and that loan and penalty
          deductions are legitimate before authorising payments.
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 font-medium">
          <BookOpen className="h-4 w-4 text-primary" />
          What to check before approving
        </div>
        <ul className="space-y-1.5 text-xs text-muted-foreground">
          <li className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
            <span>
              Distributable pool matches the group&apos;s confirmed cash balance
              (contributions in + loan interest − expenses).
            </span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
            <span>
              All active members appear in the allocation table with non-zero
              contribution bases.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
            <span>
              Deductions (loans + penalties) are accurate and members have been
              notified of any amounts withheld from their share.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
            <span>
              Net payouts sum is reasonable and within the distributable amount.
            </span>
          </li>
        </ul>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2 font-medium">
          <ListChecks className="h-4 w-4 text-primary" />
          Workflow steps
        </div>
        <div className="space-y-3">
          <Step
            n={1}
            title="Review the draft"
            desc="The treasurer creates a draft. Open it to see each member's gross share, deductions, and net payout in the allocation table."
          />
          <Step
            n={2}
            title="Approve to authorise payments"
            desc="Clicking 'Approve' records your digital signature and authorises the treasurer to disburse funds. This action is logged in the audit trail."
          />
          <Step
            n={3}
            title="Coordinate disbursement"
            desc="Work with the treasurer to ensure all members receive their net payout — via mobile money, cash, or bank transfer."
          />
          <Step
            n={4}
            title="Mark as distributed"
            desc="Once all members have been paid, mark the cycle as 'Distributed' to formally close the share-out. Member statements become visible in their dashboards."
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="font-medium">Status meanings</p>
        <div className="flex flex-wrap gap-2">
          <Badge className="bg-slate-100 text-slate-700">draft</Badge>
          <Badge className="bg-amber-100 text-amber-700">approved</Badge>
          <Badge className="bg-emerald-100 text-emerald-700">distributed</Badge>
          <Badge className="bg-rose-100 text-rose-700">cancelled</Badge>
        </div>
        <ul className="space-y-1 text-xs text-muted-foreground">
          <li>
            <strong>draft</strong> — computed by treasurer, awaiting your
            approval
          </li>
          <li>
            <strong>approved</strong> — you authorised it; treasurer is paying
            out
          </li>
          <li>
            <strong>distributed</strong> — all members paid; cycle closed
          </li>
          <li>
            <strong>cancelled</strong> — aborted; no funds disbursed
          </li>
        </ul>
      </div>
    </div>
  )
}

export function ShareOutGuidanceDialog({ role }: Props) {
  const isApprover = role === "president" || role === "admin"

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <HelpCircle className="h-4 w-4" />
          How this works
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader className="mb-6">
          <SheetTitle>Share-out guide</SheetTitle>
          <p className="text-sm text-muted-foreground">
            {isApprover
              ? "Your role as approver in the year-end distribution workflow."
              : "How to compute and submit the year-end distribution."}
          </p>
        </SheetHeader>
        {isApprover ? <PresidentNotes /> : <TreasurerNotes />}
      </SheetContent>
    </Sheet>
  )
}
