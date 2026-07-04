"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import type { LoanExportable } from "@/utils/loan-export-utils"
import { computeLoanTotals, computeProgressPercent } from "@/utils/loan-finance"
import type { ColumnDef } from "@tanstack/react-table"
import { Download } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { DataTable, type ActionConfig } from "@/components/ui/table/data-table"
import { DataTableSkeleton } from "@/components/ui/table/data-table-skeleton"

import { ExportLoansDialog } from "./export-loans-dialog"
import { LoanRepaymentDialog } from "./loan-repayment-dialog"

interface LoanRepaymentsTableProps {
  initialData: LoanExportable[]
  refreshUrl?: string
}

const statusStyles: Record<string, string> = {
  disbursed: "bg-blue-100 text-blue-700",
  repaying: "bg-amber-100 text-amber-700",
  repaid: "bg-emerald-100 text-emerald-700",
  overdue: "bg-rose-100 text-rose-700",
}

const formatRwf = (amount?: string | null) => {
  if (!amount) return "-"
  const value = Number.parseFloat(amount)
  if (Number.isNaN(value)) return amount
  return `${new Intl.NumberFormat("en-RW").format(value)}\u00A0RWF`
}

const formatDate = (value?: string | Date | null) => {
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

  const now = new Date()
  const diffMs = due.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    return (
      <div>
        <div className="text-sm text-rose-600 font-medium">
          {Math.abs(diffDays)}d overdue
        </div>
        <div className="text-xs text-muted-foreground">{formatDate(due)}</div>
      </div>
    )
  }

  if (diffDays <= 7) {
    return (
      <div>
        <div className="text-sm text-amber-600 font-medium">
          {diffDays}d left
        </div>
        <div className="text-xs text-muted-foreground">{formatDate(due)}</div>
      </div>
    )
  }

  return (
    <div>
      <div className="text-sm">{diffDays}d left</div>
      <div className="text-xs text-muted-foreground">{formatDate(due)}</div>
    </div>
  )
}

export function LoanRepaymentsTable({
  initialData,
  refreshUrl,
}: LoanRepaymentsTableProps) {
  const [data, setData] = useState<LoanExportable[]>(initialData)
  const [searchValue, setSearchValue] = useState("")
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [selectedItems, setSelectedItems] = useState<LoanExportable[]>([])
  const [filteredItems, setFilteredItems] =
    useState<LoanExportable[]>(initialData)

  useEffect(() => {
    setData(initialData)
  }, [initialData])

  const statusCounts = useMemo(() => {
    return data.reduce<Record<string, number>>((acc, item) => {
      const key = item.status
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})
  }, [data])

  const refreshData = useCallback(async () => {
    if (!refreshUrl) return data
    const response = await fetch(refreshUrl, { cache: "no-store" })
    if (!response.ok) throw new Error("Failed to refresh")
    const payload = (await response.json()) as { data: LoanExportable[] }
    setData(payload.data)
    return payload.data
  }, [data, refreshUrl])

  const columns = useMemo<ColumnDef<LoanExportable>[]>(() => {
    return [
      {
        header: "Member",
        accessorKey: "member",
        accessorFn: (row) =>
          [row.memberName, row.memberEmail, row.memberId]
            .filter(Boolean)
            .join(" ")
            .toLowerCase(),
        cell: ({ row }) => (
          <div>
            <div className="font-medium">
              {row.original.memberName ?? "Member"}
            </div>
            <div className="text-xs text-muted-foreground">
              {row.original.memberEmail ?? row.original.memberId}
            </div>
          </div>
        ),
        size: 220,
      },
      {
        header: "Disbursed Amount",
        accessorKey: "approvedAmount",
        cell: ({ row }) => (
          <span className="font-medium tabular-nums">
            {formatRwf(
              row.original.approvedAmount ?? row.original.requestedAmount
            )}
          </span>
        ),
        size: 150,
      },
      {
        header: "Repaid",
        accessorKey: "totalRepaid",
        cell: ({ row }) => (
          <span className="font-medium tabular-nums text-emerald-700 dark:text-emerald-400">
            {row.original.totalRepaid != null
              ? formatRwf(String(row.original.totalRepaid))
              : "-"}
          </span>
        ),
        size: 130,
      },
      {
        header: "Outstanding",
        accessorKey: "outstandingBalance",
        cell: ({ row }) => (
          <span className="font-semibold tabular-nums">
            {row.original.outstandingBalance != null
              ? formatRwf(String(row.original.outstandingBalance))
              : "-"}
          </span>
        ),
        size: 130,
      },
      {
        header: "Progress",
        id: "progress",
        enableSorting: false,
        cell: ({ row }) => {
          const { totalRepayable } = computeLoanTotals(row.original)
          const repaid = row.original.totalRepaid ?? 0
          const percent = computeProgressPercent(totalRepayable, repaid)
          return (
            <div className="flex items-center gap-2">
              <Progress value={percent} className="h-2 w-20" />
              <span className="text-xs tabular-nums text-muted-foreground">
                {percent}%
              </span>
            </div>
          )
        },
        size: 140,
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
        cell: ({ row }) =>
          row.original.repaidAt ? formatDate(row.original.repaidAt) : "-",
        size: 110,
      },
      {
        header: "Status",
        accessorKey: "status",
        filterFn: (row, _id, value) => {
          if (!Array.isArray(value) || value.length === 0) return true
          return value.includes(row.original.status)
        },
        cell: ({ row }) => (
          <Badge className={statusStyles[row.original.status] ?? ""}>
            {row.original.status}
          </Badge>
        ),
        size: 110,
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => {
          const loan = row.original
          return (
            <LoanRepaymentDialog
              loan={loan}
              onUpdated={async () => {
                if (refreshUrl) await refreshData()
              }}
            />
          )
        },
        size: 100,
        enableHiding: false,
      },
    ]
  }, [refreshData, refreshUrl])

  const actions: ActionConfig<LoanExportable>[] = [
    {
      label: "Export",
      icon: Download,
      onClick: (selected, filtered) => {
        setSelectedItems(selected)
        setFilteredItems(filtered)
        setExportDialogOpen(true)
      },
      variant: "outline",
    },
  ]

  const handleRefresh = async () => {
    if (!refreshUrl) return
    toast.promise(refreshData(), {
      loading: "Refreshing...",
      success: "Repayments refreshed",
      error: "Failed to refresh",
    })
  }

  return (
    <>
      <DataTable
        data={data}
        columns={columns}
        searchPlaceholder="Search member..."
        searchColumnId="member"
        searchValue={searchValue}
        onSearchChange={setSearchValue}
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
        actions={actions}
        onRefresh={refreshUrl ? handleRefresh : undefined}
        enableSelection={true}
        emptyMessage="No repayment records found."
        defaultSorting={[{ id: "disbursedAt", desc: true }]}
        SkeletonComponent={() => <DataTableSkeleton columns={13} rows={8} />}
      />
      <ExportLoansDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        loans={filteredItems}
        selectedLoans={selectedItems}
      />
    </>
  )
}
