"use client"

import { useMemo, useState } from "react"
import type { LoanExportable } from "@/utils/loan-export-utils"
import type { ColumnDef } from "@tanstack/react-table"
import {
  AlertTriangle,
  Banknote,
  CheckCircle,
  Clock,
  RefreshCcw,
  RefreshCw,
  TrendingUp,
} from "lucide-react"

import { useAdminLoans } from "@/hooks/api/use-loans"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DataTable } from "@/components/ui/table/data-table"
import { DataTableSkeleton } from "@/components/ui/table/data-table-skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader } from "@/components/common/loader"

import { LoanApproveDialog } from "./loan-approve-dialog"
import { LoanDetailsDialog } from "./loan-details-dialog"

type LoanRow = LoanExportable

const statusStyles: Record<string, string> = {
  requested: "bg-slate-100 text-slate-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-rose-100 text-rose-700",
  disbursed: "bg-blue-100 text-blue-700",
  repaying: "bg-amber-100 text-amber-700",
  repaid: "bg-emerald-100 text-emerald-700",
  overdue: "bg-rose-100 text-rose-700",
}

function formatRwf(amount?: string | number | null) {
  if (amount == null || amount === "") return "-"
  const value = typeof amount === "string" ? Number.parseFloat(amount) : amount
  if (Number.isNaN(value)) return "-"
  return `${new Intl.NumberFormat("en-RW").format(value)}\u00A0RWF`
}

function formatDate(value?: string | Date | null) {
  if (!value) return "-"
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleDateString("en-RW")
}

function DueDateCell({ dueDate }: { dueDate?: string | Date | null }) {
  if (!dueDate) return <span className="text-muted-foreground">-</span>
  const due = new Date(dueDate)
  if (Number.isNaN(due.getTime()))
    return <span className="text-muted-foreground">-</span>
  const diffDays = Math.ceil(
    (due.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  )
  if (diffDays < 0)
    return (
      <div>
        <div className="text-sm font-medium text-rose-600">
          {Math.abs(diffDays)}d overdue
        </div>
        <div className="text-xs text-muted-foreground">{formatDate(due)}</div>
      </div>
    )
  if (diffDays <= 7)
    return (
      <div>
        <div className="text-sm font-medium text-amber-600">
          {diffDays}d left
        </div>
        <div className="text-xs text-muted-foreground">{formatDate(due)}</div>
      </div>
    )
  return (
    <div>
      <div className="text-sm">{diffDays}d left</div>
      <div className="text-xs text-muted-foreground">{formatDate(due)}</div>
    </div>
  )
}

// ── Reusable table with per-tab search + row-click dialog ─────────────────────
function LoanTable({
  data,
  columns,
  emptyMessage,
  defaultSortId = "requestedAt",
  skeletonColumns = 7,
  onUpdated,
}: {
  data: LoanRow[]
  columns: ColumnDef<LoanRow>[]
  emptyMessage: string
  defaultSortId?: string
  skeletonColumns?: number
  onUpdated?: () => void
}) {
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<LoanRow | null>(null)
  const [open, setOpen] = useState(false)

  const statusCounts = useMemo(
    () =>
      data.reduce<Record<string, number>>((acc, item) => {
        acc[item.status] = (acc[item.status] ?? 0) + 1
        return acc
      }, {}),
    [data]
  )

  return (
    <>
      <DataTable
        data={data}
        columns={columns}
        searchPlaceholder="Search member..."
        searchColumnId="member"
        searchValue={search}
        onSearchChange={setSearch}
        filterConfigs={[
          {
            columnId: "status",
            label: "Status",
            options: Object.entries(statusCounts).map(([value, count]) => ({
              value,
              label: value,
              count,
            })),
          },
        ]}
        emptyMessage={emptyMessage}
        defaultSorting={[{ id: defaultSortId, desc: true }]}
        SkeletonComponent={() => (
          <DataTableSkeleton columns={skeletonColumns} rows={8} />
        )}
        onRowClick={(loan) => {
          setSelected(loan)
          setOpen(true)
        }}
      />
      <LoanDetailsDialog
        loan={selected}
        open={open}
        onOpenChange={(v) => {
          setOpen(v)
          if (!v) setSelected(null)
        }}
        trigger={null}
        onUpdated={onUpdated}
      />
    </>
  )
}

// ── Column definitions ────────────────────────────────────────────────────────
const memberCol: ColumnDef<LoanRow> = {
  header: "Member",
  accessorKey: "member",
  accessorFn: (row) =>
    [row.memberName, row.memberEmail, row.memberId]
      .filter(Boolean)
      .join(" ")
      .toLowerCase(),
  cell: ({ row }) => (
    <div>
      <div className="font-medium">{row.original.memberName ?? "Member"}</div>
      <div className="text-xs text-muted-foreground">
        {row.original.memberEmail ?? row.original.memberId}
      </div>
    </div>
  ),
  size: 210,
}

const statusFilterFn: ColumnDef<LoanRow>["filterFn"] = (row, _id, value) => {
  if (!Array.isArray(value) || value.length === 0) return true
  return value.includes(row.original.status)
}

const statusCol: ColumnDef<LoanRow> = {
  header: "Status",
  accessorKey: "status",
  filterFn: statusFilterFn,
  cell: ({ row }) => (
    <Badge className={statusStyles[row.original.status] ?? ""}>
      {row.original.status}
    </Badge>
  ),
  size: 110,
}

const detailsActionCol: ColumnDef<LoanRow> = {
  id: "actions",
  header: () => <span className="sr-only">Actions</span>,
  cell: ({ row }) => (
    <div data-row-click-ignore="true">
      <LoanDetailsDialog loan={row.original} />
    </div>
  ),
  size: 90,
  enableHiding: false,
}

function makeAllLoanColumns(onUpdated: () => void): ColumnDef<LoanRow>[] {
  return [
    memberCol,
    {
      header: "Requested",
      accessorKey: "requestedAmount",
      cell: ({ row }) => (
        <span className="tabular-nums font-medium">
          {formatRwf(row.original.requestedAmount)}
        </span>
      ),
      size: 140,
    },
    {
      header: "Approved",
      accessorKey: "approvedAmount",
      cell: ({ row }) => (
        <span className="tabular-nums">
          {formatRwf(row.original.approvedAmount)}
        </span>
      ),
      size: 140,
    },
    statusCol,
    {
      header: "Requested At",
      accessorKey: "requestedAt",
      cell: ({ row }) => formatDate(row.original.requestedAt),
      size: 120,
    },
    {
      header: "Due Date",
      accessorKey: "dueDate",
      cell: ({ row }) => formatDate(row.original.dueDate),
      size: 110,
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => (
        <div className="flex items-center gap-2" data-row-click-ignore="true">
          <LoanDetailsDialog loan={row.original} />
          <LoanApproveDialog loan={row.original} onUpdated={onUpdated} />
        </div>
      ),
      size: 170,
      enableHiding: false,
    },
  ]
}

function makeRequestColumns(onUpdated: () => void): ColumnDef<LoanRow>[] {
  return [
    memberCol,
    {
      header: "Requested",
      accessorKey: "requestedAmount",
      cell: ({ row }) => (
        <span className="tabular-nums font-medium">
          {formatRwf(row.original.requestedAmount)}
        </span>
      ),
      size: 140,
    },
    {
      header: "Approved",
      accessorKey: "approvedAmount",
      cell: ({ row }) => (
        <span className="tabular-nums">
          {formatRwf(row.original.approvedAmount)}
        </span>
      ),
      size: 140,
    },
    statusCol,
    {
      header: "Requested At",
      accessorKey: "requestedAt",
      cell: ({ row }) => formatDate(row.original.requestedAt),
      size: 120,
    },
    {
      header: "Notes",
      accessorKey: "notes",
      cell: ({ row }) => (
        <span className="line-clamp-1 text-sm text-muted-foreground">
          {row.original.notes ?? "-"}
        </span>
      ),
      size: 160,
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => (
        <div className="flex items-center gap-2" data-row-click-ignore="true">
          <LoanDetailsDialog loan={row.original} />
          <LoanApproveDialog loan={row.original} onUpdated={onUpdated} />
        </div>
      ),
      size: 170,
      enableHiding: false,
    },
  ]
}

const disbursementColumns: ColumnDef<LoanRow>[] = [
  memberCol,
  {
    header: "Requested",
    accessorKey: "requestedAmount",
    cell: ({ row }) => (
      <span className="tabular-nums">
        {formatRwf(row.original.requestedAmount)}
      </span>
    ),
    size: 130,
  },
  {
    header: "Approved",
    accessorKey: "approvedAmount",
    cell: ({ row }) => (
      <span className="tabular-nums font-medium">
        {formatRwf(row.original.approvedAmount)}
      </span>
    ),
    size: 130,
  },
  {
    header: "Rate",
    accessorKey: "interestRate",
    cell: ({ row }) =>
      row.original.interestRate
        ? `${(Number(row.original.interestRate) * 100).toFixed(1)}%`
        : "5%",
    size: 65,
  },
  {
    header: "Term",
    accessorKey: "termMonths",
    cell: ({ row }) =>
      row.original.termMonths ? `${row.original.termMonths}mo` : "-",
    size: 65,
  },
  {
    header: "Due Date",
    accessorKey: "dueDate",
    cell: ({ row }) => formatDate(row.original.dueDate),
    size: 110,
  },
  {
    header: "Approved By",
    accessorKey: "approvedByName",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {row.original.approvedByName ?? "-"}
      </span>
    ),
    size: 130,
  },
  {
    header: "Disbursed At",
    accessorKey: "disbursedAt",
    cell: ({ row }) => formatDate(row.original.disbursedAt),
    size: 120,
  },
  statusCol,
  detailsActionCol,
]

const repaymentColumns: ColumnDef<LoanRow>[] = [
  memberCol,
  {
    header: "Disbursed Amount",
    accessorKey: "approvedAmount",
    cell: ({ row }) => (
      <span className="tabular-nums font-medium">
        {formatRwf(row.original.approvedAmount ?? row.original.requestedAmount)}
      </span>
    ),
    size: 150,
  },
  {
    header: "Rate",
    accessorKey: "interestRate",
    cell: ({ row }) =>
      row.original.interestRate
        ? `${(Number(row.original.interestRate) * 100).toFixed(1)}%`
        : "5%",
    size: 65,
  },
  {
    header: "Term",
    accessorKey: "termMonths",
    cell: ({ row }) =>
      row.original.termMonths ? `${row.original.termMonths}mo` : "-",
    size: 65,
  },
  {
    header: "Disbursed",
    accessorKey: "disbursedAt",
    cell: ({ row }) => formatDate(row.original.disbursedAt),
    size: 110,
  },
  {
    header: "Due / Remaining",
    accessorKey: "dueDate",
    cell: ({ row }) => <DueDateCell dueDate={row.original.dueDate} />,
    size: 130,
  },
  {
    header: "Disbursed By",
    accessorKey: "disbursedByName",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {row.original.disbursedByName ?? "-"}
      </span>
    ),
    size: 130,
  },
  {
    header: "Repaid At",
    accessorKey: "repaidAt",
    cell: ({ row }) => formatDate(row.original.repaidAt),
    size: 110,
  },
  statusCol,
  detailsActionCol,
]

// ── Main view ─────────────────────────────────────────────────────────────────
export function PresidentLoanRequestsView() {
  const { loans, isPending, isRefetching, error, refetch } = useAdminLoans()

  const allLoanColumns = useMemo(
    () => makeAllLoanColumns(() => void refetch()),
    [refetch]
  )
  const requestColumns = useMemo(
    () => makeRequestColumns(() => void refetch()),
    [refetch]
  )

  const derived = useMemo(() => {
    const requested = loans.filter((l) => l.status === "requested")
    const approved = loans.filter((l) => l.status === "approved")
    const disbursed = loans.filter((l) => l.status === "disbursed")
    const repaying = loans.filter((l) => l.status === "repaying")
    const overdue = loans.filter((l) => l.status === "overdue")
    const repaid = loans.filter((l) => l.status === "repaid")

    const disbursements = [...approved, ...disbursed]
    const repayments = [...disbursed, ...repaying, ...overdue, ...repaid]

    const totalDisbursed = disbursed.reduce((sum, l) => {
      const v = Number.parseFloat(l.approvedAmount || l.requestedAmount || "0")
      return Number.isNaN(v) ? sum : sum + v
    }, 0)

    const outstanding = [...repaying, ...overdue].reduce((sum, l) => {
      const v = Number.parseFloat(l.approvedAmount || l.requestedAmount || "0")
      return Number.isNaN(v) ? sum : sum + v
    }, 0)

    return {
      requested,
      approved,
      disbursed,
      repaying,
      overdue,
      repaid,
      disbursements,
      repayments,
      totalDisbursed,
      outstanding,
    }
  }, [loans])

  return (
    <div className="flex-1 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Loan Overview</h1>
          <p className="text-sm text-muted-foreground">
            Full picture of all member loans - requests, disbursements, and
            repayments.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => void refetch()}
          disabled={isPending || isRefetching}>
          <RefreshCcw className="h-4 w-4" />
          {isRefetching ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>
            {error.help ?? error.message ?? "Unable to load loan data."}
          </AlertDescription>
        </Alert>
      ) : null}

      {/* Summary stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Requests
            </CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums">
              {isPending ? "-" : derived.requested.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Awaiting treasurer review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums">
              {isPending ? "-" : derived.approved.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Awaiting disbursement
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total Disbursed
            </CardTitle>
            <Banknote className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums">
              {isPending ? "-" : formatRwf(derived.totalDisbursed)}
            </div>
            <p className="text-xs text-muted-foreground">
              {isPending ? "" : `${derived.disbursed.length} loans disbursed`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <TrendingUp className="h-4 w-4 text-cyan-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums">
              {isPending ? "-" : formatRwf(derived.outstanding)}
            </div>
            <p className="text-xs text-muted-foreground">
              {isPending
                ? ""
                : `${derived.repaying.length} repaying · ${derived.overdue.length} overdue`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alert banners */}
      {!isPending && derived.overdue.length > 0 ? (
        <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            <strong>{derived.overdue.length}</strong> loan
            {derived.overdue.length !== 1 ? "s are" : " is"} overdue. The
            treasurer should follow up with the affected member
            {derived.overdue.length !== 1 ? "s" : ""} immediately.
          </span>
        </div>
      ) : null}

      {!isPending && derived.requested.length > 0 ? (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-400">
          <RefreshCw className="h-4 w-4 shrink-0" />
          <span>
            <strong>{derived.requested.length}</strong> loan request
            {derived.requested.length !== 1 ? "s are" : " is"} awaiting your
            review.
          </span>
        </div>
      ) : null}

      {/* Tabbed tables */}
      <Tabs defaultValue="all">
        <TabsList className="h-auto w-full flex-wrap sm:w-fit sm:flex-nowrap">
          <TabsTrigger value="all">
            All Loans
            {!isPending && (
              <Badge
                variant="secondary"
                className="ml-1.5 h-5 px-1.5 text-[10px]">
                {loans.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="requests">
            Requests
            {!isPending &&
              derived.requested.length + derived.approved.length > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-1.5 h-5 px-1.5 text-[10px]">
                  {derived.requested.length + derived.approved.length}
                </Badge>
              )}
          </TabsTrigger>
          <TabsTrigger value="disbursements">
            Disbursements
            {!isPending && derived.disbursements.length > 0 && (
              <Badge
                variant="secondary"
                className="ml-1.5 h-5 px-1.5 text-[10px]">
                {derived.disbursements.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="repayments">
            Repayments
            {!isPending && derived.repayments.length > 0 && (
              <Badge
                variant="secondary"
                className="ml-1.5 h-5 px-1.5 text-[10px]">
                {derived.repayments.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                All Loans
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isPending ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader className="h-4 w-4" />
                  Loading loans...
                </div>
              ) : (
                <LoanTable
                  data={loans}
                  columns={allLoanColumns}
                  emptyMessage="No loans found."
                  skeletonColumns={7}
                  onUpdated={() => void refetch()}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requests" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Loan Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isPending ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader className="h-4 w-4" />
                  Loading requests...
                </div>
              ) : (
                <LoanTable
                  data={[...derived.requested, ...derived.approved]}
                  columns={requestColumns}
                  emptyMessage="No loan requests found."
                  skeletonColumns={7}
                  onUpdated={() => void refetch()}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="disbursements" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Disbursements
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isPending ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader className="h-4 w-4" />
                  Loading disbursements...
                </div>
              ) : (
                <LoanTable
                  data={derived.disbursements}
                  columns={disbursementColumns}
                  emptyMessage="No disbursement records found."
                  defaultSortId="disbursedAt"
                  skeletonColumns={10}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="repayments" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Repayments
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isPending ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader className="h-4 w-4" />
                  Loading repayments...
                </div>
              ) : (
                <LoanTable
                  data={derived.repayments}
                  columns={repaymentColumns}
                  emptyMessage="No repayment records found."
                  defaultSortId="disbursedAt"
                  skeletonColumns={10}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
