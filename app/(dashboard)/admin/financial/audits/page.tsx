import { Metadata } from "next"
import Link from "next/link"
import { auditLogOperations } from "@/db/operations"
import { AlertTriangle, Fingerprint, History } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export const metadata: Metadata = {
  title: "Financial Audits",
  description:
    "Track security and financial audit activity across the platform.",
}

type FinancialAuditsPageProps = {
  searchParams: Promise<{
    severity?: string
    action?: string
    from?: string
    to?: string
  }>
}

function formatDate(value?: Date | null) {
  if (!value) return "-"
  return new Date(value).toLocaleString("en-RW", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function severityVariant(
  severity?: string | null
): "danger" | "warning" | "info" | "secondary" {
  const value = (severity || "info").toLowerCase()

  if (value === "critical" || value === "high") return "danger"
  if (value === "medium" || value === "warning") return "warning"
  if (value === "low" || value === "info") return "info"
  return "secondary"
}

function formatActionLabel(action?: string | null) {
  if (!action) return "Unknown"
  return action
    .toLowerCase()
    .split(/[_.\s-]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ")
}

function parseDateInput(value?: string, isEndOfDay = false) {
  if (!value) return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null

  const suffix = isEndOfDay ? "T23:59:59.999" : "T00:00:00.000"
  const date = new Date(`${value}${suffix}`)

  if (Number.isNaN(date.getTime())) return null
  return date
}

export default async function FinancialAuditsPage({
  searchParams,
}: FinancialAuditsPageProps) {
  const params = await searchParams
  const logs = await auditLogOperations.findRecent(300)

  const severityFilter = (params.severity || "all").toLowerCase()
  const actionFilter = params.action || "all"
  const fromDateInput = params.from || ""
  const toDateInput = params.to || ""

  const fromDate = parseDateInput(fromDateInput)
  const toDate = parseDateInput(toDateInput, true)

  const actionOptions = Array.from(
    new Set(
      logs
        .map((entry) => entry.action)
        .filter((value): value is string => Boolean(value))
    )
  ).sort((a, b) => a.localeCompare(b))

  const filteredLogs = logs.filter((entry) => {
    const createdAt = new Date(entry.createdAt)
    const severity = (entry.severity || "info").toLowerCase()

    if (severityFilter !== "all" && severity !== severityFilter) return false
    if (actionFilter !== "all" && entry.action !== actionFilter) return false
    if (fromDate && createdAt < fromDate) return false
    if (toDate && createdAt > toDate) return false

    return true
  })

  const now = Date.now()
  const oneDayAgo = now - 24 * 60 * 60 * 1000

  const last24HoursCount = filteredLogs.filter(
    (entry) => new Date(entry.createdAt).getTime() >= oneDayAgo
  ).length

  const riskCount = filteredLogs.filter((entry) => {
    const severity = (entry.severity || "info").toLowerCase()
    return severity === "high" || severity === "critical"
  }).length

  const activeActors = new Set(
    filteredLogs
      .map((entry) => entry.userEmail || entry.userId)
      .filter((value): value is string => Boolean(value))
  ).size

  const topActions = filteredLogs.reduce<Record<string, number>>(
    (acc, entry) => {
      const key = formatActionLabel(entry.action)
      acc[key] = (acc[key] || 0) + 1
      return acc
    },
    {}
  )

  const topAction =
    Object.entries(topActions).sort((a, b) => b[1] - a[1])[0]?.[0] || "-"

  return (
    <div className="flex-1 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Financial Audits</h1>
          <p className="text-sm text-muted-foreground">
            Monitor audit trails, detect anomalies, and review sensitive
            actions.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Last 24 Hours</CardTitle>
            <History className="h-4 w-4 text-cyan-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{last24HoursCount}</div>
            <p className="text-xs text-muted-foreground">Recent audit events</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">High Risk</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{riskCount}</div>
            <p className="text-xs text-muted-foreground">
              High or critical severity
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Active Actors</CardTitle>
            <Fingerprint className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{activeActors}</div>
            <p className="text-xs text-muted-foreground">
              Unique users in feed
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Audit Trail</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="grid gap-3 rounded-lg border p-3 md:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-1">
              <label
                htmlFor="severity"
                className="text-xs font-medium text-muted-foreground">
                Severity
              </label>
              <select
                id="severity"
                name="severity"
                defaultValue={severityFilter}
                className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-xs">
                <option value="all">All severities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="warning">Warning</option>
                <option value="low">Low</option>
                <option value="info">Info</option>
              </select>
            </div>

            <div className="space-y-1">
              <label
                htmlFor="action"
                className="text-xs font-medium text-muted-foreground">
                Action
              </label>
              <select
                id="action"
                name="action"
                defaultValue={actionFilter}
                className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-xs">
                <option value="all">All actions</option>
                {actionOptions.map((action) => (
                  <option key={action} value={action}>
                    {formatActionLabel(action)}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label
                htmlFor="from"
                className="text-xs font-medium text-muted-foreground">
                From date
              </label>
              <Input
                id="from"
                name="from"
                type="date"
                defaultValue={fromDateInput}
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="to"
                className="text-xs font-medium text-muted-foreground">
                To date
              </label>
              <Input id="to" name="to" type="date" defaultValue={toDateInput} />
            </div>

            <div className="flex items-end gap-2">
              <Button type="submit" size="sm" className="w-full">
                Apply
              </Button>
              <Button
                asChild
                type="button"
                variant="outline"
                size="sm"
                className="w-full">
                <Link href="/admin/financial/audits">Reset</Link>
              </Button>
            </div>
          </form>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <p>
              Showing {filteredLogs.length} of {logs.length} recent events. Top
              action: <b>{topAction}</b>
            </p>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-8 text-center text-muted-foreground">
                    No audit entries found for the current filters.
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(entry.createdAt)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatActionLabel(entry.action)}
                    </TableCell>
                    <TableCell>
                      <div className="max-w-72 truncate text-sm">
                        {entry.userEmail || entry.userId || "System"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={severityVariant(entry.severity)}>
                        {entry.severity || "info"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {[entry.resourceType, entry.resourceId]
                          .filter(Boolean)
                          .join(" · ") || "-"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="block max-w-104 truncate text-xs text-muted-foreground">
                        {entry.details || "-"}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
