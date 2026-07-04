"use client"

import NumberFlow from "@number-flow/react"
import {
  AlarmClock,
  Award,
  CalendarClock,
  ClipboardList,
  Crown,
  Gavel,
  icons,
  ShieldAlert,
  Timer,
  UserCircle2,
  Wallet,
} from "lucide-react"

import { useCountdown } from "@/hooks/use-countdown"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"

const CURRENT_TERM = {
  startDate: "2026-01-10T00:00:00+02:00",
  endDate: "2027-01-10T00:00:00+02:00",
}

const NEXT_ELECTION = {
  electionDate: "2027-01-10T00:00:00+02:00",
}

const LEADERSHIP_TEAM = [
  {
    position: "President",
    name: "PRESIDENT Name",
    phone: "078 111 111",
    icon: Crown,
    responsibilities:
      "Chairs meetings, represents the Group externally, and has a casting vote in case of tie.",
  },
  {
    position: "Secretary",
    name: "SECRETARY Name",
    phone: "0780 XXX XXX",
    icon: ClipboardList,
    responsibilities:
      "Keeps records, prepares minutes, and manages official correspondence.",
  },
  {
    position: "Treasurer",
    name: "TREASURER Name",
    phone: "0787 XXX XXX",
    icon: Wallet,
    responsibilities:
      "Manages funds, maintains accounts, and presents financial reports to members.",
  },
  {
    position: "Advisor",
    name: "ADVISOR Name",
    phone: "0785 XXX XXX",
    icon: ShieldAlert,

    responsibilities:
      "Provides strategic guidance and support to the leadership team.",
  },
] as const

const TERM_RULES = [
  "Each elected leader serves a one-year term from the date of election.",
  "Leaders may serve at most two consecutive terms.",
  "After two consecutive terms, the leader must step down for one full term before contesting again.",
] as const

const ELECTION_RULES = [
  "Leadership elections are held annually at a duly constituted General Meeting.",
  "Any member in good standing can nominate themselves or another member.",
  "Election can be by secret ballot or show of hands, as agreed at the meeting.",
  "A simple majority of members present elects the leader.",
] as const

const REMOVAL_RULES = [
  "A leader may be removed by a two-thirds (2/3) majority vote of all members.",
  "Grounds include financial misconduct, persistent absenteeism, breach of constitution, or loss of trust.",
  "The accused leader must be allowed to present a defense before any vote.",
] as const

function toKigaliDateTime(input: string) {
  return new Intl.DateTimeFormat("en-RW", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Kigali",
  }).format(new Date(input))
}

function CountdownStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border bg-muted/30 p-3 text-center">
      <div className="text-2xl font-semibold tabular-nums">
        <NumberFlow
          value={value}
          format={{
            minimumIntegerDigits: 2,
            useGrouping: false,
          }}
        />
      </div>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

export function AdminLeadershipView() {
  const { timeRemaining: termCountdown } = useCountdown(CURRENT_TERM.endDate)
  const { timeRemaining: electionCountdown } = useCountdown(
    NEXT_ELECTION.electionDate
  )

  const start = new Date(CURRENT_TERM.startDate).getTime()
  const end = new Date(CURRENT_TERM.endDate).getTime()
  const now = Date.now()
  const termProgress =
    now <= start
      ? 0
      : now >= end
        ? 100
        : Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100))

  return (
    <div className="flex-1 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <h1 className="text-2xl font-semibold">Leadership Terms</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Administrative view based on Constitution Article 10 and Article 11
            (AGM timeline).
          </p>
        </div>

        <Badge variant={termCountdown.isExpired ? "danger" : "success"}>
          {termCountdown.isExpired
            ? "Current Term Ended"
            : "Current Term Active"}
        </Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Timer className="h-4 w-4 text-primary" />
              Current Term Countdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <CountdownStat label="Days" value={termCountdown.days} />
              <CountdownStat label="Hours" value={termCountdown.hours} />
              <CountdownStat label="Minutes" value={termCountdown.minutes} />
              <CountdownStat label="Seconds" value={termCountdown.seconds} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Term progress</span>
                <span>{Math.round(termProgress)}%</span>
              </div>
              <Progress value={termProgress} />
            </div>

            <Separator />

            <div className="space-y-1.5 text-sm">
              <p>
                <span className="text-muted-foreground">Start:</span>{" "}
                {toKigaliDateTime(CURRENT_TERM.startDate)}
              </p>
              <p>
                <span className="text-muted-foreground">End:</span>{" "}
                {toKigaliDateTime(CURRENT_TERM.endDate)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="hidden sm:block">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="h-4 w-4 text-primary" />
              Next Election Countdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <CountdownStat label="Days" value={electionCountdown.days} />
              <CountdownStat label="Hours" value={electionCountdown.hours} />
              <CountdownStat
                label="Minutes"
                value={electionCountdown.minutes}
              />
              <CountdownStat
                label="Seconds"
                value={electionCountdown.seconds}
              />
            </div>

            <Separator />

            <div className="space-y-1.5 text-sm">
              <p>
                <span className="text-muted-foreground">Election date:</span>{" "}
                {toKigaliDateTime(NEXT_ELECTION.electionDate)}
              </p>
              <p>
                <span className="text-muted-foreground">
                  Constitution rule:
                </span>{" "}
                Elections are annual and held during a duly constituted General
                Meeting.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Award className="h-4 w-4 text-primary" />
              Leadership Policy Snapshot
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="rounded-md border p-3">
              <p className="font-medium">Term Length</p>
              <p className="text-muted-foreground">1 year per elected term</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="font-medium">Consecutive Terms</p>
              <p className="text-muted-foreground">
                Maximum of 2 consecutive terms
              </p>
            </div>
            <div className="rounded-md border p-3">
              <p className="font-medium">Removal Threshold</p>
              <p className="text-muted-foreground">
                Two-thirds (2/3) majority vote
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserCircle2 className="h-4 w-4 text-primary" />
              Current Office Holders
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {LEADERSHIP_TEAM.map((leader) => (
              <div
                key={leader.position}
                className="group rounded-md border bg-gradient-to-r from-primary/5 to-transparent p-4 transition-all hover:border-primary/50 hover:shadow-md">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {leader.icon && (
                      <leader.icon className="h-4 w-4 text-primary opacity-100 group-hover:opacity-80 transition-opacity" />
                    )}
                    <p className="font-semibold text-base">{leader.position}</p>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {leader.phone}
                  </Badge>
                </div>
                <p className="text-sm font-medium text-foreground">
                  {leader.name}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {leader.responsibilities}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlarmClock className="h-4 w-4 text-primary" />
              Constitutional Term Rules
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <p className="mb-2 text-sm font-medium">
                Article 10.2 - Term of Office
              </p>
              <ul className="space-y-1.5 pl-5 text-sm text-muted-foreground">
                {TERM_RULES.map((rule) => (
                  <li key={rule} className="list-disc">
                    {rule}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">
                Article 10.3 - Elections
              </p>
              <ul className="space-y-1.5 pl-5 text-sm text-muted-foreground">
                {ELECTION_RULES.map((rule) => (
                  <li key={rule} className="list-disc">
                    {rule}  
                    
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="mb-2 flex items-center gap-2 text-sm font-medium">
                <ShieldAlert className="h-4 w-4 text-amber-500" />
                Article 10.4 - Removal of a Leader
              </p>
              <ul className="space-y-1.5 pl-5 text-sm text-muted-foreground">
                {REMOVAL_RULES.map((rule) => (
                  <li key={rule} className="list-disc">
                    {rule}
                  </li>
                ))}
              </ul>
            </div>

            <Separator />

            <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
              <p className="mb-1 flex items-center gap-2 font-medium text-amber-700 dark:text-amber-400">
                <Gavel className="h-4 w-4" />
                AGM Notice Reminder (Article 11.4)
              </p>
              <p className="text-muted-foreground">
                All members must be notified at least 30 days before the AGM at
                which annual leadership election is held.
              </p>
            </div>
          </CardContent> 
        </Card>
      </div>
    </div>
  )
}
