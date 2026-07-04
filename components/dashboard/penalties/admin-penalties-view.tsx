"use client"

import { useMemo, useState } from "react"
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronsUpDown,
  ChevronUp,
  CircleDollarSign,
  Link2,
  RefreshCcw,
  ShieldAlert,
  TrendingDown,
  Users,
  X,
} from "lucide-react"

import { usePenalties } from "@/hooks/api/use-penalties"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsList, TabsTab } from "@/components/ui/tabs"

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

type SortField = "memberName" | "period" | "amount" | "waivedAt" | "createdAt"
type SortDir = "asc" | "desc"

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active)
    return (
      <ChevronsUpDown className="ml-1 inline h-3.5 w-3.5 text-muted-foreground/50" />
    )
  return dir === "asc" ? (
    <ChevronUp className="ml-1 inline h-3.5 w-3.5 text-foreground" />
  ) : (
    <ChevronDown className="ml-1 inline h-3.5 w-3.5 text-foreground" />
  )
}

export function AdminPenaltiesView() {
  const { data, isPending, error, refetch, isRefetching } = usePenalties({
    limit: 500,
  })

  const [statusTab, setStatusTab] = useState<"all" | "active" | "waived">("all")
  const [filterMember, setFilterMember] = useState("")
  const [filterPeriod, setFilterPeriod] = useState("")
  const [sortField, setSortField] = useState<SortField>("createdAt")
  const [sortDir, setSortDir] = useState<SortDir>("desc")

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
  const uniqueMembers = useMemo(
    () => new Set(active.map((p) => p.memberId)).size,
    [active]
  )

  // Member breakdown
  const memberBreakdown = useMemo(() => {
    const map = new Map<
      string,
      { name: string; count: number; total: number }
    >()
    for (const p of active) {
      const v = Number.parseFloat(String(p.amount ?? "0")) || 0
      const existing = map.get(p.memberId)
      if (existing) {
        existing.count++
        existing.total += v
      } else
        map.set(p.memberId, {
          name: p.memberName ?? p.memberId,
          count: 1,
          total: v,
        })
    }
    return [...map.values()].sort((a, b) => b.total - a.total)
  }, [active])

  // Highest penalty for relative bar width
  const maxMemberTotal = memberBreakdown[0]?.total ?? 1

  function toggleSort(f: SortField) {
    if (sortField === f) setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    else {
      setSortField(f)
      setSortDir("asc")
    }
  }

  const filtered = useMemo(() => {
    const source =
      statusTab === "active" ? active : statusTab === "waived" ? waived : all
    return [...source]
      .filter((p) => {
        if (
          filterMember &&
          !(p.memberName ?? "")
            .toLowerCase()
            .includes(filterMember.toLowerCase())
        )
          return false
        if (filterPeriod && !(p.period ?? "").includes(filterPeriod))
          return false
        return true
      })
      .sort((a, b) => {
        let av: string | number = ""
        let bv: string | number = ""
        if (sortField === "memberName") {
          av = (a.memberName ?? "").toLowerCase()
          bv = (b.memberName ?? "").toLowerCase()
        } else if (sortField === "period") {
          av = a.period ?? ""
          bv = b.period ?? ""
        } else if (sortField === "amount") {
          av = Number.parseFloat(String(a.amount ?? "0")) || 0
          bv = Number.parseFloat(String(b.amount ?? "0")) || 0
        } else if (sortField === "waivedAt") {
          av = a.waivedAt ? new Date(a.waivedAt).getTime() : 0
          bv = b.waivedAt ? new Date(b.waivedAt).getTime() : 0
        } else {
          av = new Date(a.createdAt).getTime()
          bv = new Date(b.createdAt).getTime()
        }
        if (av < bv) return sortDir === "asc" ? -1 : 1
        if (av > bv) return sortDir === "asc" ? 1 : -1
        return 0
      })
  }, [
    all,
    active,
    waived,
    filterMember,
    filterPeriod,
    statusTab,
    sortField,
    sortDir,
  ])

  return (
    <div className="flex-1 space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Penalties Overview
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Group-wide view of all late payment penalties. 10% penalty applies
            per the Group Constitution.
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

      {/* ── Stat cards ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card
          className={
            active.length > 0 ? "border-rose-200 dark:border-rose-800" : ""
          }>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Outstanding Penalties
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            {isPending ? (
              <>
                <Skeleton className="h-8 w-32" />
                <Skeleton className="mt-1.5 h-3 w-20" />
              </>
            ) : (
              <>
                <div
                  className={`text-2xl font-semibold tabular-nums ${active.length > 0 ? "text-rose-600" : ""}`}>
                  {formatRwf(totalOwed)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {active.length} active record{active.length !== 1 ? "s" : ""}
                </p>
              </>
            )}
          </CardContent>
        </Card>

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
                <Skeleton className="mt-1.5 h-3 w-16" />
              </>
            ) : (
              <>
                <div className="text-2xl font-semibold tabular-nums">
                  {formatRwf(totalWaived)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {waived.length} waived
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Members Affected
            </CardTitle>
            <Users className="h-4 w-4 text-amber-500" />
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
                  {uniqueMembers}
                </div>
                <p className="text-xs text-muted-foreground">
                  With active penalties
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Records</CardTitle>
            <CircleDollarSign className="h-4 w-4 text-cyan-500" />
          </CardHeader>
          <CardContent>
            {isPending ? (
              <>
                <Skeleton className="h-8 w-12" />
                <Skeleton className="mt-1.5 h-3 w-16" />
              </>
            ) : (
              <>
                <div className="text-2xl font-semibold tabular-nums">
                  {all.length}
                </div>
                <p className="text-xs text-muted-foreground">All time</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Discipline alert ── */}
      {memberBreakdown.some((m) => m.count >= 3) && (
        <Alert className="border-rose-200 bg-rose-50 dark:border-rose-800 dark:bg-rose-950/20">
          <ShieldAlert className="h-4 w-4 text-rose-600" />
          <AlertDescription className="text-rose-700 dark:text-rose-400">
            <span className="font-semibold">
              Disciplinary action may be required.
            </span>{" "}
            {memberBreakdown.filter((m) => m.count >= 3).length} member
            {memberBreakdown.filter((m) => m.count >= 3).length !== 1
              ? "s have"
              : " has"}{" "}
            reached the 3-penalty threshold defined in the Group Constitution
            (Article 8.3).
          </AlertDescription>
        </Alert>
      )}

      {/* ── Member breakdown ── */}
      {memberBreakdown.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              Outstanding by Member
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {memberBreakdown.map((m) => (
                <div key={m.name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 font-medium">
                      {m.name}
                      {m.count >= 3 && (
                        <Badge variant="danger" className="text-xs">
                          Action needed
                        </Badge>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="font-semibold tabular-nums text-rose-600">
                        {formatRwf(m.total)}
                      </span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {m.count} penalt{m.count !== 1 ? "ies" : "y"}
                      </span>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full transition-all ${m.count >= 3 ? "bg-rose-500" : "bg-amber-400"}`}
                      style={{
                        width: `${Math.round((m.total / maxMemberTotal) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Records table ── */}
      <Card>
        <CardHeader className="space-y-3 pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base font-semibold">
              All Records
            </CardTitle>
            <Tabs
              value={statusTab}
              onValueChange={(v) => setStatusTab(v as typeof statusTab)}>
              <TabsList>
                <TabsTab value="all">
                  All
                  {!isPending && (
                    <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                      {all.length}
                    </span>
                  )}
                </TabsTab>
                <TabsTab value="active">
                  Active
                  {!isPending && (
                    <span className="ml-1.5 rounded-full bg-rose-100 px-1.5 py-0.5 text-xs font-medium text-rose-700 dark:bg-rose-900/30 dark:text-rose-400">
                      {active.length}
                    </span>
                  )}
                </TabsTab>
                <TabsTab value="waived">
                  Waived
                  {!isPending && (
                    <span className="ml-1.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                      {waived.length}
                    </span>
                  )}
                </TabsTab>
              </TabsList>
            </Tabs>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Input
                placeholder="Filter by member…"
                value={filterMember}
                onChange={(e) => setFilterMember(e.target.value)}
                className="h-8 max-w-[200px] pr-6 text-sm"
              />
              {filterMember && (
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setFilterMember("")}>
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div className="relative">
              <Input
                placeholder="Period (e.g. 2026-01)…"
                value={filterPeriod}
                onChange={(e) => setFilterPeriod(e.target.value)}
                className="h-8 max-w-[180px] pr-6 text-sm"
              />
              {filterPeriod && (
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setFilterPeriod("")}>
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            {(filterMember || filterPeriod) && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 px-2 text-xs text-muted-foreground"
                onClick={() => {
                  setFilterMember("")
                  setFilterPeriod("")
                }}>
                Clear
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isPending ? (
            <div className="space-y-2 p-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 border-t border-dashed p-12 text-center">
              <TrendingDown className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm font-medium text-muted-foreground">
                {all.length === 0
                  ? "No penalty records found."
                  : "No records match your filters."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead
                      className="cursor-pointer select-none whitespace-nowrap"
                      onClick={() => toggleSort("memberName")}>
                      Member{" "}
                      <SortIcon
                        active={sortField === "memberName"}
                        dir={sortDir}
                      />
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none whitespace-nowrap"
                      onClick={() => toggleSort("period")}>
                      Period{" "}
                      <SortIcon active={sortField === "period"} dir={sortDir} />
                    </TableHead>
                    <TableHead className="whitespace-nowrap">
                      Contribution
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none whitespace-nowrap"
                      onClick={() => toggleSort("amount")}>
                      Penalty{" "}
                      <SortIcon active={sortField === "amount"} dir={sortDir} />
                    </TableHead>
                    <TableHead className="whitespace-nowrap">
                      Issued By
                    </TableHead>
                    <TableHead className="whitespace-nowrap">Status</TableHead>
                    <TableHead
                      className="cursor-pointer select-none whitespace-nowrap"
                      onClick={() => toggleSort("waivedAt")}>
                      Waived{" "}
                      <SortIcon
                        active={sortField === "waivedAt"}
                        dir={sortDir}
                      />
                    </TableHead>
                    <TableHead className="whitespace-nowrap">
                      Waiver Reason
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((item) => {
                    const penaltyVal = Number.parseFloat(
                      String(item.amount ?? "0")
                    )
                    const isWaived = item.status === "waived"
                    return (
                      <TableRow
                        key={item.id}
                        className={isWaived ? "opacity-60" : ""}>
                        <TableCell>
                          <div className="font-medium leading-tight">
                            {item.memberName ?? item.memberId}
                          </div>
                          {item.memberEmail && (
                            <div className="text-xs text-muted-foreground">
                              {item.memberEmail}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-sm font-medium">
                            {item.period || "-"}
                          </span>
                        </TableCell>
                        <TableCell className="tabular-nums text-sm">
                          {item.contributionAmount ? (
                            <span className="inline-flex items-center gap-1">
                              <Link2 className="h-3 w-3 text-muted-foreground/60" />
                              {formatRwf(item.contributionAmount)}
                            </span>
                          ) : (
                            <span className="text-xs italic text-muted-foreground">
                              standalone
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`font-semibold tabular-nums ${isWaived ? "text-muted-foreground line-through" : "text-rose-600"}`}>
                            {penaltyVal > 0 ? formatRwf(penaltyVal) : "-"}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {item.issuedByName ?? "-"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={isWaived ? "secondary" : "danger"}
                            className="text-xs">
                            {isWaived ? "Waived" : "Active"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {isWaived ? (
                            <div className="space-y-0.5">
                              <div className="text-xs font-medium">
                                {formatDate(item.waivedAt)}
                              </div>
                              {item.waivedByName && (
                                <div className="text-xs text-muted-foreground">
                                  by {item.waivedByName}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              -
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[180px]">
                          <span
                            className="block truncate text-xs text-muted-foreground"
                            title={item.waivedReason || ""}>
                            {item.waivedReason || "-"}
                          </span>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {!isPending && filtered.length > 0 && (
            <div className="border-t px-4 py-2.5 text-xs text-muted-foreground">
              Showing{" "}
              <span className="font-medium text-foreground">
                {filtered.length}
              </span>{" "}
              of{" "}
              <span className="font-medium text-foreground">{all.length}</span>{" "}
              record{all.length !== 1 ? "s" : ""}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
