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
import { LoanDisburseDialog } from "./loan-disburse-dialog"
import { LoanReviewDialog } from "./loan-review-dialog"

interface LoanDisbursementsTableProps {
  initialData: LoanExportable[]
  refreshUrl?: string
}

const statusStyles: Record<string, string> = {
  approved: "bg-emerald-100 text-emerald-700",
  disbursed: "bg-blue-100 text-blue-700",
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

export function LoanDisbursementsTable({
  initialData,
  refreshUrl,
}: LoanDisbursementsTableProps) {
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
      const key = item.status || "approved"
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
          <span className="font-medium tabular-nums">
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
        size: 70,
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
        size: 140,
      },
      {
        header: "Disbursed At",
        accessorKey: "disbursedAt",
        cell: ({ row }) =>
          row.original.disbursedAt ? formatDate(row.original.disbursedAt) : "-",
        size: 120,
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
          if (loan.status === "approved") {
            return (
              <LoanDisburseDialog
                loan={loan}
                onUpdated={async () => {
                  if (refreshUrl) await refreshData()
                }}
              />
            )
          }
          return (
            <LoanReviewDialog
              loan={loan}
              onUpdated={async () => {
                if (refreshUrl) await refreshData()
              }}
            />
          )
        },
        size: 110,
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
      success: "Disbursements refreshed",
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
        emptyMessage="No disbursements found."
        defaultSorting={[{ id: "disbursedAt", desc: true }]}
        SkeletonComponent={() => <DataTableSkeleton columns={10} rows={8} />}
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
