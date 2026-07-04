"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import type { ContributionExportable } from "@/utils/contribution-export-utils"
import type { ColumnDef } from "@tanstack/react-table"
import {
  Calendar,
  CheckCircle2,
  CircleOff,
  Download,
  FunnelX,
  Mail,
  SlidersHorizontal,
  Trash2,
  User,
} from "lucide-react"
import { toast } from "sonner"

import { getActivePeriod, getWindowForPeriod } from "@/lib/contribution-window"
import { useActiveRole } from "@/hooks/use-active-role"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Filters,
  type Filter,
  type FilterFieldConfig,
  type FilterFieldsConfig,
} from "@/components/ui/filters"
import { DataTable, type ActionConfig } from "@/components/ui/table/data-table"
import { DataTableSkeleton } from "@/components/ui/table/data-table-skeleton"

import { ContributionDetailsDialog } from "./contribution-details-dialog"
import { ContributionRowActions } from "./contribution-row-actions"
import { ExportContributionsDialog } from "./export-contributions-dialog"

type ContributionRow = ContributionExportable

interface ContributionsTableProps {
  initialData: ContributionRow[]
  showRecorder?: boolean
  refreshUrl?: string
  onRefresh?: () => Promise<unknown> | void
  loading?: boolean
  isRefreshing?: boolean
}

const statusStyles: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  confirmed: "bg-emerald-100 text-emerald-700",
  late: "bg-rose-100 text-rose-700",
  waived: "bg-slate-100 text-slate-700",
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

const getFieldConfig = <T = unknown,>(
  fields: FilterFieldsConfig<T>,
  fieldKey: string
): FilterFieldConfig<T> | undefined => {
  for (const item of fields) {
    if ("fields" in item && Array.isArray(item.fields)) {
      const field = item.fields.find((f) => f.key === fieldKey)
      if (field) return field
    } else if ((item as FilterFieldConfig<T>).key === fieldKey) {
      return item as FilterFieldConfig<T>
    }
  }
  return undefined
}

const createPresetFilter = (
  field: string,
  operator: string,
  values: unknown[]
): Filter => ({
  id: `${field}-${operator}-${Math.random().toString(36).slice(2, 8)}`,
  field,
  operator,
  values,
})

export function ContributionsTable({
  initialData,
  showRecorder = true,
  refreshUrl,
  onRefresh,
  loading = false,
  isRefreshing = false,
}: ContributionsTableProps) {
  const { role: userRole } = useActiveRole()
  const [data, setData] = useState<ContributionRow[]>(initialData)
  const [searchValue, setSearchValue] = useState("")
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)
  const [activeContribution, setActiveContribution] =
    useState<ContributionRow | null>(null)
  const [selectedItems, setSelectedItems] = useState<ContributionRow[]>([])
  const [filters, setFilters] = useState<Filter[]>([])
  const [activePreset, setActivePreset] = useState<string | null>(null)
  const canManageContribution = userRole === "admin" || userRole === "treasurer"

  // Determine if user should see recorder column
  const showRecorderColumn =
    showRecorder && (userRole === "admin" || userRole === "treasurer")

  const statusCounts = useMemo(() => {
    return data.reduce<Record<string, number>>((acc, item) => {
      const key = item.status || "pending"
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})
  }, [data])

  useEffect(() => {
    setData(initialData)
  }, [initialData])

  const filterFields: FilterFieldsConfig<unknown> = useMemo(
    () => [
      {
        group: "Member",
        fields: [
          {
            key: "memberName",
            label: "Member Name",
            type: "text",
            icon: <User />,
            placeholder: "Search member name...",
          },
          {
            key: "memberEmail",
            label: "Member Email",
            type: "email",
            icon: <Mail />,
            placeholder: "member@example.com",
          },
        ],
      },
      {
        group: "Contribution",
        fields: [
          {
            key: "status",
            label: "Status",
            type: "select",
            icon: <SlidersHorizontal />,
            options: [
              { value: "pending", label: "Pending" },
              { value: "confirmed", label: "Confirmed" },
              { value: "late", label: "Late" },
              { value: "waived", label: "Waived" },
            ],
            searchable: false,
            className: "w-40",
          },
          {
            key: "period",
            label: "Period",
            type: "text",
            icon: <Calendar />,
            placeholder: "e.g. 2026-04",
          },
          {
            key: "amount",
            label: "Amount",
            type: "number",
            min: 0,
            step: 1,
          },
          {
            key: "penaltyAmount",
            label: "Penalty Amount",
            type: "number",
            min: 0,
            step: 1,
          },
        ],
      },
      {
        group: "Dates",
        fields: [
          {
            key: "paidAt",
            label: "Paid At",
            type: "date",
            icon: <Calendar />,
            className: "w-40",
          },
        ],
      },
    ],
    []
  )

  const activePeriod = useMemo(() => getActivePeriod(), [])

  const presetOptions = useMemo(
    () => [
      {
        id: "pending-only",
        label: "Pending only",
        build: () => [
          createPresetFilter("status", "is", ["pending"] as string[]),
        ],
      },
      {
        id: "late-with-penalty",
        label: "Late with penalty",
        build: () => [
          createPresetFilter("status", "is", ["late"] as string[]),
          createPresetFilter("penaltyAmount", "greater_than", [0] as number[]),
        ],
      },
      {
        id: "current-period-confirmed",
        label: "Current period confirmed",
        build: () => {
          const period = activePeriod
          return [
            createPresetFilter("period", "is", [period] as string[]),
            createPresetFilter("status", "is", ["confirmed"] as string[]),
          ]
        },
      },
    ],
    [activePeriod]
  )

  const applyPreset = useCallback(
    (presetId: string) => {
      const preset = presetOptions.find((item) => item.id === presetId)
      if (!preset) return
      setFilters(preset.build())
      setActivePreset(presetId)
    },
    [presetOptions]
  )

  const clearAllFilters = useCallback(() => {
    setFilters([])
    setActivePreset(null)
  }, [])

  const filteredData = useMemo(() => {
    return data.filter((row) => {
      return filters.every((filter) => {
        const fieldConfig = getFieldConfig(filterFields, filter.field)
        if (!fieldConfig) return true

        const value = filter.values[0]
        const values = filter.values

        switch (filter.field) {
          case "memberName": {
            const name = (row.memberName || "").toLowerCase()
            const needle = String(value || "").toLowerCase()
            if (filter.operator === "contains") return name.includes(needle)
            if (filter.operator === "starts_with")
              return name.startsWith(needle)
            if (filter.operator === "ends_with") return name.endsWith(needle)
            if (filter.operator === "is") return name === needle
            if (filter.operator === "empty") return !row.memberName
            if (filter.operator === "not_empty") return !!row.memberName
            return true
          }
          case "memberEmail": {
            const email = (row.memberEmail || "").toLowerCase()
            const needle = String(value || "").toLowerCase()
            if (filter.operator === "contains") return email.includes(needle)
            if (filter.operator === "starts_with")
              return email.startsWith(needle)
            if (filter.operator === "ends_with") return email.endsWith(needle)
            if (filter.operator === "is") return email === needle
            if (filter.operator === "empty") return !row.memberEmail
            if (filter.operator === "not_empty") return !!row.memberEmail
            return true
          }
          case "status": {
            const status = row.status || ""
            if (filter.operator === "is") return status === value
            if (filter.operator === "is_not") return status !== value
            if (filter.operator === "empty") return !status
            if (filter.operator === "not_empty") return !!status
            return true
          }
          case "period": {
            const period = (row.period || "").toLowerCase()
            const needle = String(value || "").toLowerCase()
            if (filter.operator === "contains") return period.includes(needle)
            if (filter.operator === "starts_with")
              return period.startsWith(needle)
            if (filter.operator === "ends_with") return period.endsWith(needle)
            if (filter.operator === "is") return period === needle
            if (filter.operator === "empty") return !row.period
            if (filter.operator === "not_empty") return !!row.period
            return true
          }
          case "amount": {
            const amount = Number.parseFloat(row.amount || "0") || 0
            if (filter.operator === "equals") return amount === Number(value)
            if (filter.operator === "greater_than")
              return amount > Number(value)
            if (filter.operator === "less_than") return amount < Number(value)
            if (filter.operator === "between") {
              return amount >= Number(values[0]) && amount <= Number(values[1])
            }
            if (filter.operator === "empty") return !row.amount
            if (filter.operator === "not_empty") return !!row.amount
            return true
          }
          case "penaltyAmount": {
            const penalty = Number.parseFloat(row.penaltyAmount || "0") || 0
            if (filter.operator === "equals") return penalty === Number(value)
            if (filter.operator === "greater_than")
              return penalty > Number(value)
            if (filter.operator === "less_than") return penalty < Number(value)
            if (filter.operator === "between") {
              return (
                penalty >= Number(values[0]) && penalty <= Number(values[1])
              )
            }
            if (filter.operator === "empty") return !row.penaltyAmount
            if (filter.operator === "not_empty") return !!row.penaltyAmount
            return true
          }
          case "paidAt": {
            if (!row.paidAt) return filter.operator === "empty"
            const paidAt = new Date(row.paidAt)
            if (filter.operator === "is") {
              return (
                paidAt.toDateString() === new Date(String(value)).toDateString()
              )
            }
            if (filter.operator === "before")
              return paidAt < new Date(String(value))
            if (filter.operator === "after")
              return paidAt > new Date(String(value))
            if (filter.operator === "between") {
              return (
                paidAt >= new Date(String(values[0])) &&
                paidAt <= new Date(String(values[1]))
              )
            }
            if (filter.operator === "not_empty") return !!row.paidAt
            return true
          }
          default:
            return true
        }
      })
    })
  }, [data, filterFields, filters])

  const refreshData = useCallback(async () => {
    if (!refreshUrl) return data
    const response = await fetch(refreshUrl, { cache: "no-store" })
    if (!response.ok) {
      throw new Error("Failed to refresh contributions")
    }
    const payload = (await response.json()) as { data: ContributionRow[] }
    setData(payload.data)
    return payload.data
  }, [data, refreshUrl])

  const runBulkStatusUpdate = useCallback(
    async (rows: ContributionRow[], status: "confirmed" | "waived") => {
      if (rows.length === 0) {
        toast.error("Select at least one contribution.")
        return
      }

      const requests = rows.map((row) =>
        fetch(`/api/contributions/${row.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": crypto.randomUUID(),
          },
          body: JSON.stringify({ status }),
        })
      )

      const responses = await Promise.allSettled(requests)
      const successCount = responses.filter(
        (result) => result.status === "fulfilled" && result.value.ok
      ).length
      const failedCount = rows.length - successCount

      if (successCount > 0) {
        toast.success(
          `${successCount} contribution${successCount > 1 ? "s" : ""} updated.`
        )
      }
      if (failedCount > 0) {
        toast.error(
          `${failedCount} contribution${failedCount > 1 ? "s" : ""} failed to update.`
        )
      }

      if (successCount > 0) {
        if (refreshUrl) {
          await refreshData()
        } else {
          await onRefresh?.()
        }
      }
    },
    [onRefresh, refreshData, refreshUrl]
  )

  const runBulkDelete = useCallback(
    async (rows: ContributionRow[]) => {
      if (rows.length === 0) {
        toast.error("Select at least one contribution.")
        return
      }

      const shouldDelete = window.confirm(
        `Delete ${rows.length} selected contribution${rows.length > 1 ? "s" : ""}? This cannot be undone.`
      )
      if (!shouldDelete) {
        return
      }

      const requests = rows.map((row) =>
        fetch(`/api/contributions/${row.id}`, { method: "DELETE" })
      )
      const responses = await Promise.allSettled(requests)
      const successCount = responses.filter(
        (result) => result.status === "fulfilled" && result.value.ok
      ).length
      const failedCount = rows.length - successCount

      if (successCount > 0) {
        toast.success(
          `${successCount} contribution${successCount > 1 ? "s" : ""} deleted.`
        )
      }
      if (failedCount > 0) {
        toast.error(
          `${failedCount} contribution${failedCount > 1 ? "s" : ""} failed to delete.`
        )
      }

      if (successCount > 0) {
        if (refreshUrl) {
          await refreshData()
        } else {
          await onRefresh?.()
        }
      }
    },
    [onRefresh, refreshData, refreshUrl]
  )

  const columns = useMemo<ColumnDef<ContributionRow>[]>(() => {
    const baseColumns: ColumnDef<ContributionRow>[] = [
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
        header: "Period",
        accessorKey: "period",
        cell: ({ row }) => (
          <span className="font-medium">{row.original.period}</span>
        ),
        size: 110,
      },
      {
        header: "Amount",
        accessorKey: "amount",
        cell: ({ row }) => (
          <span className="font-medium tabular-nums">
            {formatRwf(row.original.amount)}
          </span>
        ),
        size: 120,
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
        header: "Paid",
        accessorKey: "paidAt",
        cell: ({ row }) => formatDate(row.original.paidAt),
        size: 110,
      },
      {
        header: "Penalty",
        accessorKey: "penaltyAmount",
        cell: ({ row }) => formatRwf(row.original.penaltyAmount),
        size: 120,
      },
      // {
      //   header: "Receipt",
      //   accessorKey: "receiptNumber",
      //   cell: ({ row }) => row.original.receiptNumber || "-",
      //   size: 120,
      // },
    ]

    // if (showRecorderColumn) {
    //   baseColumns.push({
    //     header: "Recorded By",
    //     accessorKey: "recordedByName",
    //     cell: ({ row }) => row.original.recordedByName || "-",
    //     size: 140,
    //   })
    // }

    baseColumns.push({
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => (
        <div
          data-row-click-ignore="true"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}>
          <ContributionRowActions
            contribution={row.original}
            userRole={userRole || "member"}
            onUpdated={async () => {
              if (refreshUrl) {
                await refreshData()
                return
              }
              if (onRefresh) {
                await onRefresh()
              }
            }}
            onDeleted={async () => {
              if (refreshUrl) {
                await refreshData()
                return
              }
              if (onRefresh) {
                await onRefresh()
              }
            }}
          />
        </div>
      ),
      size: 90,
      enableHiding: false,
    })

    return baseColumns
  }, [onRefresh, refreshData, refreshUrl, showRecorderColumn, userRole])

  const actions: ActionConfig<ContributionRow>[] = [
    ...(canManageContribution
      ? [
          {
            label: "Confirm",
            icon: CheckCircle2,
            onClick: (selected: ContributionRow[]) => {
              void runBulkStatusUpdate(selected, "confirmed")
            },
            requiresSelection: true,
            variant: "outline" as const,
          },
          {
            label: "Waive",
            icon: CircleOff,
            onClick: (selected: ContributionRow[]) => {
              void runBulkStatusUpdate(selected, "waived")
            },
            requiresSelection: true,
            variant: "outline" as const,
          },
          {
            label: "Delete",
            icon: Trash2,
            onClick: (selected: ContributionRow[]) => {
              void runBulkDelete(selected)
            },
            requiresSelection: true,
            variant: "destructive" as const,
          },
        ]
      : []),
    {
      label: "Export",
      icon: Download,
      onClick: (selected) => {
        setSelectedItems(selected)
        setExportDialogOpen(true)
      },
      variant: "outline",
    },
  ]

  const handleRefresh = async () => {
    if (!refreshUrl && !onRefresh) return
    const refreshPromise = refreshUrl
      ? refreshData()
      : Promise.resolve(onRefresh?.())
    toast.promise(refreshPromise, {
      loading: "Refreshing contributions...",
      success: "Contributions refreshed",
      error: "Failed to refresh contributions",
    })
  }

  const handleRowClick = useCallback((row: ContributionRow) => {
    setActiveContribution(row)
    setDetailsDialogOpen(true)
  }, [])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-60 rounded-md bg-muted animate-pulse" />
            <div className="h-10 w-28 rounded-md bg-muted animate-pulse" />
          </div>
          <div className="h-10 w-24 rounded-md bg-muted animate-pulse" />
        </div>
        <DataTableSkeleton columns={8} rows={8} />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          {presetOptions.map((preset) => (
            <Button
              key={preset.id}
              type="button"
              size="sm"
              variant={activePreset === preset.id ? "default" : "outline"}
              onClick={() => applyPreset(preset.id)}>
              {preset.label}
            </Button>
          ))}
          {filters.length > 0 ? (
            <Button variant="ghost" size="sm" onClick={clearAllFilters}>
              <FunnelX className="mr-1 h-4 w-4" />
              Clear all
            </Button>
          ) : null}
        </div>

        <div className="flex items-start gap-2.5">
          <Filters
            filters={filters}
            fields={filterFields}
            onChange={(next) => {
              setFilters(next)
              setActivePreset(null)
            }}
            variant="outline"
            size="md"
            radius="md"
            className="flex-1"
          />
          {filters.length > 0 ? (
            <Button variant="outline" size="sm" onClick={clearAllFilters}>
              <FunnelX className="mr-1 h-4 w-4" />
              Clear
            </Button>
          ) : null}
        </div>
      </div>

      <div className={isRefreshing ? "animate-pulse" : undefined}>
        <DataTable
          data={filteredData}
          columns={columns}
          loading={loading}
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
          onRefresh={refreshUrl || onRefresh ? handleRefresh : undefined}
          onRowClick={handleRowClick}
          enableSelection={true}
          emptyMessage="No contributions found."
          defaultSorting={[{ id: "period", desc: true }]}
          SkeletonComponent={() => <DataTableSkeleton columns={8} rows={8} />}
        />
      </div>
      {activeContribution ? (
        <ContributionDetailsDialog
          contribution={activeContribution}
          open={detailsDialogOpen}
          onOpenChange={(open) => {
            setDetailsDialogOpen(open)
            if (!open) {
              setActiveContribution(null)
            }
          }}
        />
      ) : null}
      <ExportContributionsDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        contributions={filteredData}
        selectedContributions={selectedItems}
      />
    </div>
  )
}
