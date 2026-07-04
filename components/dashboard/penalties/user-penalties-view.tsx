"use client"

import { useMemo } from "react"
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  CircleDollarSign,
  RefreshCcw,
  ShieldAlert,
  TrendingDown,
} from "lucide-react"

import { usePenalties } from "@/hooks/api/use-penalties"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"

function formatRwf(amount?: string | number | null) {
  if (amount === null || amount === undefined || amount === "") return "-"
  const v =
    typeof amount === "number" ? amount : Number.parseFloat(String(amount))
  if (Number.isNaN(v)) return "-"
  return `${new Intl.NumberFormat("en-RW").format(v)}\u00A0RWF`
}

function formatDate(value?: string | Date | null) {
  if (!value) return "-"
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return "-"
  return d.toLocaleDateString("en-RW", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function UserPenaltiesView() {
  const { data, isPending, error, refetch, isRefetching } = usePenalties({
    limit: 200,
  })

  const all = useMemo(() => data?.data ?? [], [data?.data])
  const active = useMemo(() => all.filter((p) => p.status === "active"), [all])
  const waived = useMemo(() => all.filter((p) => p.status === "waived"), [all])

  const totalOwed = useMemo(
    () =>
      active.reduce(
        (s, p) => s + (Number.parseFloat(String(p.amount ?? "0")) || 0),
        0
      ),
    [active]
  )
  const totalWaived = useMemo(
    () =>
      waived.reduce(
        (s, p) => s + (Number.parseFloat(String(p.amount ?? "0")) || 0),
        0
      ),
    [waived]
  )

  return (
    <div className="flex-1 space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            My Penalties
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Your late payment history and penalty status. A 10% penalty applies
            to contributions paid outside the payment window.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void refetch()}
          disabled={isRefetching}>
          <RefreshCcw className="h-4 w-4" />
          {isRefetching ? "Refreshing…" : "Refresh"}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>
            {error.help || error.message || "Unable to load penalties."}
          </AlertDescription>
        </Alert>
      )}

      {/* ── Summary cards ── */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Owed */}
        <Card
          className={
            active.length > 0 ? "border-rose-200 dark:border-rose-800" : ""
          }>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Amount Owed</CardTitle>
            <AlertTriangle className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            {isPending ? (
              <>
                <Skeleton className="h-8 w-32" />
                <Skeleton className="mt-1.5 h-3 w-24" />
              </>
            ) : (
              <>
                <div
                  className={`text-2xl font-semibold tabular-nums ${active.length > 0 ? "text-rose-600" : "text-muted-foreground"}`}>
                  {totalOwed > 0 ? formatRwf(totalOwed) : "None"}
                </div>
                <p className="text-xs text-muted-foreground">
                  {active.length} active penalt
                  {active.length !== 1 ? "ies" : "y"}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Waived */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Penalties Waived
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            {isPending ? (
              <>
                <Skeleton className="h-8 w-32" />
                <Skeleton className="mt-1.5 h-3 w-20" />
              </>
            ) : (
              <>
                <div className="text-2xl font-semibold tabular-nums">
                  {formatRwf(totalWaived)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {waived.length} waived by treasurer
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Total */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total Instances
            </CardTitle>
            <CircleDollarSign className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            {isPending ? (
              <>
                <Skeleton className="h-8 w-12" />
                <Skeleton className="mt-1.5 h-3 w-28" />
              </>
            ) : (
              <>
                <div className="text-2xl font-semibold tabular-nums">
                  {all.length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Across all periods
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Discipline alert ── */}
      {active.length >= 3 && (
        <Alert className="border-rose-200 bg-rose-50 dark:border-rose-800 dark:bg-rose-950/20">
          <ShieldAlert className="h-4 w-4 text-rose-600" />
          <AlertDescription className="text-rose-700 dark:text-rose-400">
            <span className="font-semibold">
              Disciplinary threshold reached.
            </span>{" "}
            You have {active.length} active penalties. Per the Group
            Constitution (Article 8.3), three or more late payments may be
            grounds for disciplinary action. Please contact the treasurer.
          </AlertDescription>
        </Alert>
      )}

      {/* ── Penalty list ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">
            Penalty Records
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isPending ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-28 w-full rounded-lg" />
              ))}
            </div>
          ) : all.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-12 text-center">
              <TrendingDown className="h-8 w-8 text-muted-foreground/40" />
              <div>
                <p className="text-sm font-medium">
                  No penalties - great work!
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Keep contributing on time to stay penalty-free.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {all.map((item) => {
                const penaltyVal = Number.parseFloat(String(item.amount ?? "0"))
                const isWaived = item.status === "waived"
                return (
                  <div
                    key={item.id}
                    className={`rounded-lg border p-4 transition-colors ${
                      isWaived
                        ? "bg-muted/30 dark:bg-muted/10"
                        : "border-rose-200 bg-rose-50/40 dark:border-rose-800/50 dark:bg-rose-950/10"
                    }`}>
                    {/* Top row */}
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-semibold">
                            {item.period || "-"}
                          </span>
                          <Badge
                            variant={isWaived ? "secondary" : "danger"}
                            className="text-xs">
                            {isWaived ? "Waived" : "Active"}
                          </Badge>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Issued {formatDate(item.createdAt)}
                          {item.issuedByName ? ` by ${item.issuedByName}` : ""}
                        </p>
                      </div>
                      <div className="text-right">
                        <p
                          className={`text-lg font-bold tabular-nums ${isWaived ? "text-muted-foreground line-through" : "text-rose-600"}`}>
                          {penaltyVal > 0 ? formatRwf(penaltyVal) : "-"}
                        </p>
                        {isWaived && (
                          <p className="text-xs text-emerald-600 dark:text-emerald-400">
                            penalty waived
                          </p>
                        )}
                      </div>
                    </div>

                    <Separator className="my-3" />

                    {/* Contribution detail row */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Contribution
                        </p>
                        <p className="font-medium tabular-nums">
                          {item.contributionAmount ? (
                            formatRwf(item.contributionAmount)
                          ) : (
                            <span className="text-muted-foreground italic text-xs">
                              standalone
                            </span>
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Penalty</p>
                        <p
                          className={`font-semibold tabular-nums ${isWaived ? "text-muted-foreground line-through" : "text-rose-600"}`}>
                          {penaltyVal > 0 ? formatRwf(penaltyVal) : "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Due Date
                        </p>
                        <p className="font-medium">
                          {formatDate(item.contributionDueDate)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Paid Date
                        </p>
                        <p className="font-medium">
                          {formatDate(item.contributionPaidAt)}
                        </p>
                      </div>
                    </div>

                    {/* Reason */}
                    {item.reason && (
                      <p className="mt-3 text-xs text-muted-foreground">
                        {item.reason}
                      </p>
                    )}

                    {/* Waiver details */}
                    {isWaived && (
                      <div className="mt-3 rounded-md bg-emerald-50 px-3 py-2 dark:bg-emerald-950/20">
                        <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                          Waived {formatDate(item.waivedAt)}
                          {item.waivedByName ? ` by ${item.waivedByName}` : ""}
                        </p>
                        {item.waivedReason && (
                          <p className="mt-0.5 text-xs text-emerald-600/80 dark:text-emerald-500/80">
                            &ldquo;{item.waivedReason}&rdquo;
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Policy reference ── */}
      <Card className="border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            Penalty Policy - Constitution Art. 8.3
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
            <li>
              Late payment penalty:{" "}
              <span className="font-medium text-foreground">10%</span> of the
              monthly contribution amount
            </li>
            <li>
              Payment window:{" "}
              <span className="font-medium text-foreground">
                25th of the current month
              </span>{" "}
              to the{" "}
              <span className="font-medium text-foreground">
                6th of the following month
              </span>
            </li>
            <li>
              Three or more late payments may result in{" "}
              <span className="font-medium text-foreground">
                disciplinary action
              </span>
            </li>
            <li>
              All collected penalties are added to the{" "}
              <span className="font-medium text-foreground">
                Group&apos;s general fund
              </span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
