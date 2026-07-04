import { Metadata } from "next"
import { CheckCircle2, Gavel, XCircle } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata: Metadata = {
  title: "Resolutions & Decisions | President",
  description: "Track binding decisions and governance outcomes.",
}

const resolutions = [
  {
    id: "RES-004",
    date: "April 5, 2026",
    title: "Approve loan for J. Mukamana",
    outcome: "Passed",
    votes: "9–0–2",
  },
  {
    id: "RES-003",
    date: "March 4, 2026",
    title: "Extend contribution window by 2 days due to public holiday",
    outcome: "Passed",
    votes: "11–0–0",
  },
  {
    id: "RES-002",
    date: "February 6, 2026",
    title: "Waive penalty for first-time late contributor",
    outcome: "Passed",
    votes: "8–1–2",
  },
  {
    id: "RES-001",
    date: "January 10, 2026",
    title: "Adopt TrustLink Group Constitution v1.0",
    outcome: "Passed",
    votes: "8–0–0",
  },
]

export default function PresidentGovernancePage() {
  return (
    <div className="flex-1 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Resolutions & Decisions</h1>
          <p className="text-sm text-muted-foreground">
            All binding decisions passed at TrustLink Group meetings.
          </p>
        </div>
        <Button variant="outline">
          <Gavel className="mr-2 h-4 w-4" />
          Record Resolution
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold">
            Resolution Register
          </CardTitle>
          <Badge variant="outline">{resolutions.length} Total</Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          {resolutions.map((r) => (
            <div
              key={r.id}
              className="flex items-start justify-between rounded-md border px-4 py-3 gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-muted-foreground">
                    {r.id}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {r.date}
                  </span>
                </div>
                <p className="text-sm font-medium">{r.title}</p>
                <p className="text-xs text-muted-foreground">
                  Vote: {r.votes} (For–Against–Abstain)
                </p>
              </div>
              <div className="shrink-0">
                {r.outcome === "Passed" ? (
                  <Badge className="gap-1 bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <CheckCircle2 className="h-3 w-3" />
                    Passed
                  </Badge>
                ) : (
                  <Badge className="gap-1 bg-red-100 text-red-800 border border-red-300">
                    <XCircle className="h-3 w-3" />
                    Failed
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Amendment Rules
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p>
            Any amendment to the Constitution requires a{" "}
            <strong>two-thirds (2/3) majority</strong> vote of all registered
            members at a duly constituted meeting.
          </p>
          <p>
            The President must call a special meeting with at least{" "}
            <strong>10 days' notice</strong> before any amendment vote.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
