"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  Calendar,
  CircleDollarSign,
  Eye,
  HandCoins,
  Receipt,
  RefreshCcw,
  Wallet,
} from "lucide-react"

import { useMyContributions } from "@/hooks/api/use-contributions"
import { useMyLoans } from "@/hooks/api/use-loans"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader } from "@/components/common/loader"
import { RequestLoanTrigger } from "@/components/dashboard/loans/request-loan-trigger"

function formatRwf(amount?: string | null) {
  if (!amount) return "-"
  const value = Number.parseFloat(amount)
  if (Number.isNaN(value)) return amount
  return `${new Intl.NumberFormat("en-RW").format(value)}\u00A0RWF`
}

function formatDate(value?: string | Date | null) {
  if (!value) return "-"
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleDateString("en-RW", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function statusVariant(status?: string) {
  switch (status) {
    case "confirmed":
      return "success"
    case "pending":
      return "warning"
    case "late":
      return "danger"
    case "waived":
      return "secondary"
    default:
      return "outline"
  }
}

function loanStatusVariant(status?: string) {
  switch (status) {
    case "approved":
    case "repaid":
      return "success"
    case "requested":
    case "repaying":
    case "disbursed":
      return "warning"
    case "rejected":
    case "overdue":
      return "danger"
    default:
      return "outline"
  }
}

export function UserContributionsView() {
  const { data, isPending, error, refetch, isRefetching } =
    useMyContributions(50)
  const { data: loansData, isPending: isLoansPending } = useMyLoans(5)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const contributions = useMemo(() => data?.data ?? [], [data?.data])
  const recentLoans = useMemo(() => loansData?.data ?? [], [loansData?.data])
  const latest = contributions[0] ?? null
  const selectedContribution =
    contributions.find((item) => item.id === selectedId) ?? null

  const statusCounts = useMemo(() => {
    return contributions.reduce<Record<string, number>>((acc, item) => {
      const key = item.status || "pending"
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})
  }, [contributions])

  const totalSaved = contributions.reduce((sum, item) => {
    const value = Number.parseFloat(item.amount || "0")
    return Number.isNaN(value) ? sum : sum + value
  }, 0)

  const statusSummary = [
    {
      label: "Confirmed",
      value: statusCounts.confirmed || 0,
      variant: "success" as const,
    },
    {
      label: "Pending",
      value: statusCounts.pending || 0,
      variant: "warning" as const,
    },
    {
      label: "Late",
      value: statusCounts.late || 0,
      variant: "danger" as const,
    },
  ]

  return (
    <div className="flex-1 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">My Contributions</h1>
          <p className="text-sm text-muted-foreground">
            Keep your monthly savings up to date.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <RequestLoanTrigger />
          <Button
            variant="outline"
            onClick={() => void refetch()}
            disabled={isRefetching}>
            <RefreshCcw className="h-4 w-4" />
            {isRefetching ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>
            {error.help ||
              error.message ||
              "Unable to load your contributions."}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Current Cycle</CardTitle>
            <Calendar className="h-4 w-4 text-cyan-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums">
              {latest ? formatRwf(latest.amount) : "-"}
            </div>
            <p className="text-xs text-muted-foreground">
              {latest?.period ? `Period ${latest.period}` : "Due by the 6th"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Total Saved</CardTitle>
            <Wallet className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums">
              {contributions.length > 0 ? formatRwf(String(totalSaved)) : "-"}
            </div>
            <p className="text-xs text-muted-foreground">
              All recorded contributions
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">
              Latest Receipt
            </CardTitle>
            <Receipt className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {latest?.receiptNumber || "-"}
            </div>
            <p className="text-xs text-muted-foreground">
              {latest?.createdAt
                ? `Issued ${formatDate(latest.createdAt)}`
                : "No receipt yet"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {statusSummary.map((item) => (
          <Card key={item.label}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="text-xl font-semibold tabular-nums">
                  {item.value}
                </p>
              </div>
              <Badge variant={item.variant}>{item.label}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-semibold">
              Recent Loan Requests
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Track your latest requests and follow up quickly.
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/member/loans">View all</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {isLoansPending ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader className="h-4 w-4" />
              Loading loan requests...
            </div>
          ) : recentLoans.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              No loan requests yet. Use Request Loan to submit your first one.
            </div>
          ) : (
            <div className="space-y-2">
              {recentLoans.slice(0, 4).map((loan) => (
                <div
                  key={loan.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3">
                  <div className="flex items-center gap-2">
                    <HandCoins className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-sm font-medium tabular-nums">
                        {formatRwf(loan.requestedAmount)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Requested {formatDate(loan.requestedAt)}
                      </p>
                    </div>
                  </div>
                  <Badge variant={loanStatusVariant(loan.status)}>
                    {loan.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card> */}

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Contribution History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isPending ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader className="h-4 w-4" />
              Loading contributions...
            </div>
          ) : contributions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Contribution records will appear here once entries are available.
            </p>
          ) : (
            <Tabs defaultValue="timeline" className="w-full">
              <TabsList>
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
                <TabsTrigger value="cards">Cards</TabsTrigger>
              </TabsList>

              <TabsContent value="timeline" className="pt-2">
                <div className="space-y-4">
                  {contributions.map((item, index) => (
                    <div key={item.id} className="relative pl-8">
                      {index < contributions.length - 1 ? (
                        <div className="absolute top-6 left-2.75 h-[calc(100%+0.5rem)] w-px bg-border" />
                      ) : null}
                      <div className="absolute top-2 left-0 rounded-full border bg-background p-1">
                        <CircleDollarSign className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div className="rounded-md border p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium">{item.period}</p>
                            <p className="text-xs text-muted-foreground">
                              Recorded {formatDate(item.createdAt)}
                            </p>
                          </div>
                          <Badge variant={statusVariant(item.status)}>
                            {item.status}
                          </Badge>
                        </div>
                        <Separator className="my-3" />
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-semibold tabular-nums">
                            {formatRwf(item.amount)}
                          </p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedId(item.id)}>
                            <Eye className="h-4 w-4" />
                            View details
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="cards" className="pt-2">
                <div className="grid gap-3 md:grid-cols-2">
                  {contributions.map((item) => (
                    <div key={item.id} className="rounded-md border p-4">
                      <div className="mb-3 flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium">{item.period}</p>
                          <p className="text-xs text-muted-foreground">
                            Paid {formatDate(item.paidAt)}
                          </p>
                        </div>
                        <Badge variant={statusVariant(item.status)}>
                          {item.status}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold tabular-nums">
                          {formatRwf(item.amount)}
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedId(item.id)}>
                          View details
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      <Sheet
        open={Boolean(selectedContribution)}
        onOpenChange={(open) => !open && setSelectedId(null)}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Contribution Details</SheetTitle>
            <SheetDescription>
              Review the complete information for this contribution record.
            </SheetDescription>
          </SheetHeader>

          {selectedContribution ? (
            <div className="space-y-4 p-4 pt-0">
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Amount</p>
                <p className="text-base font-semibold tabular-nums">
                  {formatRwf(selectedContribution.amount)}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Period</p>
                  <p className="text-sm font-medium">
                    {selectedContribution.period || "-"}
                  </p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge variant={statusVariant(selectedContribution.status)}>
                    {selectedContribution.status || "-"}
                  </Badge>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Paid Date</p>
                  <p className="text-sm font-medium">
                    {formatDate(selectedContribution.paidAt)}
                  </p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Receipt</p>
                  <p className="text-sm font-medium">
                    {selectedContribution.receiptNumber || "-"}
                  </p>
                </div>
              </div>

              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Penalty</p>
                <p className="text-sm font-medium">
                  {formatRwf(selectedContribution.penaltyAmount)}
                </p>
              </div>

              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Notes</p>
                <p className="text-sm">
                  {selectedContribution.notes?.trim() || "No notes provided."}
                </p>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  )
}
