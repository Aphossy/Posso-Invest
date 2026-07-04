"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import type { LoanExportable } from "@/utils/loan-export-utils"
import type { ColumnDef } from "@tanstack/react-table"
import { Download } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { DataTable, type ActionConfig } from "@/components/ui/table/data-table"
import { DataTableSkeleton } from "@/components/ui/table/data-table-skeleton"

import { ExportLoansDialog } from "./export-loans-dialog"
import { LoanDetailsDialog } from "./loan-details-dialog"
import { LoanReviewDialog } from "./loan-review-dialog"

type LoanRow = LoanExportable

interface LoanRequestsTableProps {
  initialData: LoanRow[]
  refreshUrl?: string
}

const statusStyles: Record<string, string> = {
  requested: "bg-slate-100 text-slate-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-rose-100 text-rose-700",
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

export function LoanRequestsTable({
  initialData,
  refreshUrl,
}: LoanRequestsTableProps) {
  const [data, setData] = useState<LoanRow[]>(initialData)
  const [searchValue, setSearchValue] = useState("")
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [selectedItems, setSelectedItems] = useState<LoanRow[]>([])
  const [filteredItems, setFilteredItems] = useState<LoanRow[]>(initialData)
  const [selectedLoan, setSelectedLoan] = useState<LoanRow | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)

  useEffect(() => {
    setData(initialData)
  }, [initialData])

  const statusCounts = useMemo(() => {
    return data.reduce<Record<string, number>>((acc, item) => {
      const key = item.status || "requested"
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})
  }, [data])

  const refreshData = useCallback(async () => {
    if (!refreshUrl) return data
    const response = await fetch(refreshUrl, { cache: "no-store" })
    if (!response.ok) {
      throw new Error("Failed to refresh loans")
    }
    const payload = (await response.json()) as { data: LoanRow[] }
    setData(payload.data)
    return payload.data
  }, [data, refreshUrl])

  const handleOpenLoanDetails = useCallback((loan: LoanRow) => {
    setSelectedLoan(loan)
    setDetailsOpen(true)
  }, [])

  const columns = useMemo<ColumnDef<LoanRow>[]>(() => {
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
              {row.original.memberName || "Member"}
            </div>
            <div className="text-xs text-muted-foreground">
              {row.original.memberEmail || row.original.memberId}
            </div>
          </div>
        ),
        size: 220,
      },
      {
        header: "Requested",
        accessorKey: "requestedAmount",
        cell: ({ row }) => (
          <span className="font-medium tabular-nums">
            {formatRwf(row.original.requestedAmount)}
          </span>
        ),
        size: 130,
      },
      {
        header: "Approved",
        accessorKey: "approvedAmount",
        cell: ({ row }) => formatRwf(row.original.approvedAmount),
        size: 130,
      },
      {
        header: "Status",
        accessorKey: "status",
        filterFn: (row, id, value) => {
          if (!Array.isArray(value) || value.length === 0) return true
          return value.includes(row.getValue(id))
        },
        cell: ({ row }) => (
          <Badge className={statusStyles[row.original.status] || ""}>
            {row.original.status}
          </Badge>
        ),
        size: 120,
      },
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
        size: 120,
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <div className="flex items-center gap-2" data-row-click-ignore="true">
            <LoanDetailsDialog loan={row.original} />
            <LoanReviewDialog
              loan={row.original}
              onUpdated={async () => {
                if (refreshUrl) {
                  await refreshData()
                }
              }}
            />
          </div>
        ),
        size: 170,
        enableHiding: false,
      },
    ]
  }, [refreshData, refreshUrl])

  const actions: ActionConfig<LoanRow>[] = [
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
    const refreshPromise = refreshData()
    toast.promise(refreshPromise, {
      loading: "Refreshing loans...",
      success: "Loans refreshed",
      error: "Failed to refresh loans",
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
        emptyMessage="No loans found."
        defaultSorting={[{ id: "requestedAt", desc: true }]}
        SkeletonComponent={() => <DataTableSkeleton columns={7} rows={8} />}
        onRowClick={handleOpenLoanDetails}
      />
      <LoanDetailsDialog
        loan={selectedLoan}
        open={detailsOpen}
        onOpenChange={(open) => {
          setDetailsOpen(open)
          if (!open) setSelectedLoan(null)
        }}
        trigger={null}
        canReview
        onUpdated={() => {
          void refreshData()
        }}
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
