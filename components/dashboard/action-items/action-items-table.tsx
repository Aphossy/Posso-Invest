"use client"

import { useEffect, useMemo, useState } from "react"
import type { ActionItem } from "@/db/schemas/action-item-schema"
import type { ActionItemExportable } from "@/utils/action-item-export-utils"
import type { ColumnDef } from "@tanstack/react-table"
import { Download, Trash2 } from "lucide-react"
import type { DateRange } from "react-day-picker"
import { toast } from "sonner"

import { ApiErrorException } from "@/types/api"
import { useDeleteActionItemMutation } from "@/hooks/api/use-action-items"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DataTable, type ActionConfig } from "@/components/ui/table/data-table"
import { DataTableSkeleton } from "@/components/ui/table/data-table-skeleton"

import { ExportActionItemsDialog } from "./export-action-items-dialog"
import { MemberActionItemDialog } from "./member-action-item-dialog"
import { UpdateActionItemDialog } from "./update-action-item-dialog"

type ActionItemRow = {
  id: string
  title: string
  description?: string | null
  status: "open" | "in_progress" | "blocked" | "done" | "cancelled"
  priority: "low" | "medium" | "high" | "urgent"
  dueDate?: string | Date | null
  completedAt?: string | Date | null
  meetingId?: string | null
  minutesId?: string | null
  ownerId?: string | null
  createdBy?: string | null
  notes?: string | null
  createdAt: string | Date
  updatedAt: string | Date
  ownerName?: string | null
  ownerEmail?: string | null
  createdByName?: string | null
  meetingTitle?: string | null
}

interface ActionItemsTableProps {
  initialData: ActionItemRow[]
  refreshUrl?: string
  onRefresh?: () => Promise<unknown> | void
  actionMode?: "full" | "member" | "none"
}

const statusStyles: Record<string, string> = {
  open: "bg-slate-100 text-slate-700",
  in_progress: "bg-amber-100 text-amber-700",
  blocked: "bg-rose-100 text-rose-700",
  done: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-neutral-100 text-neutral-700",
}

const priorityStyles: Record<string, string> = {
  low: "bg-blue-100 text-blue-700",
  medium: "bg-indigo-100 text-indigo-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-rose-100 text-rose-700",
}

const formatDate = (value?: string | Date | null) => {
  if (!value) return "-"
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleDateString("en-RW")
}

const toDateOrNull = (value?: string | Date | null) => {
  if (!value) return null
  return value instanceof Date ? value : new Date(value)
}

const toDate = (value: string | Date) => {
  return value instanceof Date ? value : new Date(value)
}

export function ActionItemsTable({
  initialData,
  refreshUrl,
  onRefresh,
  actionMode = "full",
}: ActionItemsTableProps) {
  const [data, setData] = useState<ActionItemRow[]>(initialData)
  const [searchValue, setSearchValue] = useState("")
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [selectedItems, setSelectedItems] = useState<ActionItemRow[]>([])
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const deleteActionItem = useDeleteActionItemMutation()

  useEffect(() => {
    setData(initialData)
  }, [initialData])

  const refreshData = async () => {
    if (onRefresh) {
      return onRefresh()
    }

    if (!refreshUrl) {
      return data
    }

    const response = await fetch(refreshUrl, { cache: "no-store" })
    if (!response.ok) {
      throw new Error("Failed to refresh action items")
    }

    const payload = (await response.json()) as { data: ActionItemRow[] }
    setData(payload.data)
    return payload.data
  }

  const filteredData = useMemo(() => {
    if (!dateRange?.from && !dateRange?.to) return data
    return data.filter((item) => {
      if (!item.dueDate) return false
      const date = new Date(item.dueDate)
      if (Number.isNaN(date.getTime())) return false
      if (dateRange.from && date < dateRange.from) return false
      if (dateRange.to) {
        const end = new Date(dateRange.to)
        end.setHours(23, 59, 59, 999)
        if (date > end) return false
      }
      return true
    })
  }, [data, dateRange])

  const statusCounts = useMemo(() => {
    return filteredData.reduce<Record<string, number>>((acc, item) => {
      const key = item.status || "open"
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})
  }, [filteredData])

  const priorityCounts = useMemo(() => {
    return filteredData.reduce<Record<string, number>>((acc, item) => {
      const key = item.priority || "medium"
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})
  }, [filteredData])

  const meetingCounts = useMemo(() => {
    return filteredData.reduce<Record<string, number>>((acc, item) => {
      const key = item.meetingTitle || item.meetingId
      if (!key) return acc
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})
  }, [filteredData])

  const exportableData = useMemo<ActionItemExportable[]>(() => {
    return data.map((item) => ({
      ...item,
      description: item.description ?? null,
      dueDate: toDateOrNull(item.dueDate),
      completedAt: toDateOrNull(item.completedAt),
      meetingId: item.meetingId ?? null,
      minutesId: item.minutesId ?? null,
      ownerId: item.ownerId ?? null,
      createdBy: item.createdBy ?? null,
      notes: item.notes ?? null,
      createdAt: toDate(item.createdAt),
      updatedAt: toDate(item.updatedAt),
      ownerName: item.ownerName ?? null,
      ownerEmail: item.ownerEmail ?? null,
      createdByName: item.createdByName ?? null,
      meetingTitle: item.meetingTitle ?? null,
    }))
  }, [data])

  const selectedExportableData = useMemo<ActionItemExportable[]>(() => {
    return selectedItems.map((item) => ({
      ...item,
      description: item.description ?? null,
      dueDate: toDateOrNull(item.dueDate),
      completedAt: toDateOrNull(item.completedAt),
      meetingId: item.meetingId ?? null,
      minutesId: item.minutesId ?? null,
      ownerId: item.ownerId ?? null,
      createdBy: item.createdBy ?? null,
      notes: item.notes ?? null,
      createdAt: toDate(item.createdAt),
      updatedAt: toDate(item.updatedAt),
      ownerName: item.ownerName ?? null,
      ownerEmail: item.ownerEmail ?? null,
      createdByName: item.createdByName ?? null,
      meetingTitle: item.meetingTitle ?? null,
    }))
  }, [selectedItems])

  const columns = useMemo<ColumnDef<ActionItemRow>[]>(() => {
    const baseColumns: ColumnDef<ActionItemRow>[] = [
      {
        header: "Task",
        accessorKey: "title",
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{row.original.title}</div>
            {row.original.meetingTitle && (
              <div className="text-xs text-muted-foreground">
                {row.original.meetingTitle}
              </div>
            )}
          </div>
        ),
        size: 240,
      },
      {
        header: "Meeting",
        accessorKey: "meetingTitle",
        filterFn: (row, id, value) => {
          if (!Array.isArray(value) || value.length === 0) return true
          const displayValue =
            row.original.meetingTitle || row.original.meetingId || ""
          return value.includes(displayValue)
        },
        cell: ({ row }) => row.original.meetingTitle || "-",
        size: 160,
      },
      {
        header: "Owner",
        accessorKey: "owner",
        accessorFn: (row) =>
          [row.ownerName, row.ownerEmail, row.ownerId]
            .filter(Boolean)
            .join(" ")
            .toLowerCase(),
        cell: ({ row }) => (
          <div>
            <div className="font-medium">
              {row.original.ownerName || "Unassigned"}
            </div>
            <div className="text-xs text-muted-foreground">
              {row.original.ownerEmail || row.original.ownerId || "-"}
            </div>
          </div>
        ),
        size: 200,
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
            {row.original.status.replace("_", " ")}
          </Badge>
        ),
        size: 120,
      },
      {
        header: "Priority",
        accessorKey: "priority",
        filterFn: (row, id, value) => {
          if (!Array.isArray(value) || value.length === 0) return true
          return value.includes(row.getValue(id))
        },
        cell: ({ row }) => (
          <Badge className={priorityStyles[row.original.priority] || ""}>
            {row.original.priority}
          </Badge>
        ),
        size: 120,
      },
      {
        header: "Due",
        accessorKey: "dueDate",
        cell: ({ row }) => formatDate(row.original.dueDate),
        size: 120,
      },
    ]

    if (actionMode !== "none") {
      baseColumns.push({
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <>
            {actionMode === "member" ? (
              <MemberActionItemDialog
                actionItem={row.original as ActionItem}
                onUpdated={async () => {
                  if (refreshUrl) {
                    await refreshData()
                  }
                }}
              />
            ) : (
              <div className="flex gap-2">
                <UpdateActionItemDialog
                  actionItem={row.original as ActionItem}
                  onUpdated={async () => {
                    await refreshData()
                  }}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    const confirmed = window.confirm(
                      `Delete action item \"${row.original.title}\"? This cannot be undone.`
                    )
                    if (!confirmed) return

                    setDeletingId(row.original.id)
                    try {
                      await deleteActionItem.mutateAsync({
                        id: row.original.id,
                      })
                      toast.success("Action item deleted")
                      await refreshData()
                    } catch (error) {
                      const message =
                        error instanceof ApiErrorException
                          ? error.help || error.message
                          : "Failed to delete action item"
                      toast.error(message)
                    } finally {
                      setDeletingId(null)
                    }
                  }}
                  disabled={deletingId === row.original.id}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        ),
        size: 120,
        enableHiding: false,
      })
    }

    return baseColumns
  }, [actionMode, deleteActionItem, deletingId, refreshUrl])

  const actions: ActionConfig<ActionItemRow>[] = [
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
    const refreshPromise = refreshData()
    toast.promise(refreshPromise, {
      loading: "Refreshing action items...",
      success: "Action items refreshed",
      error: "Failed to refresh action items",
    })
  }

  return (
    <>
      <DataTable
        data={filteredData}
        columns={columns}
        searchPlaceholder="Search tasks..."
        searchColumnId="title"
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        filterConfigs={[
          {
            columnId: "meetingTitle",
            label: "Meeting",
            options: Object.entries(meetingCounts).map(([value, count]) => ({
              value,
              label: value,
              count,
            })),
          },
          {
            columnId: "status",
            label: "Status",
            options: Object.entries(statusCounts).map(([value, count]) => ({
              value,
              label: value.replace("_", " "),
              count,
            })),
          },
          {
            columnId: "priority",
            label: "Priority",
            options: Object.entries(priorityCounts).map(([value, count]) => ({
              value,
              label: value,
              count,
            })),
          },
        ]}
        // dateRange={dateRange}
        // onDateRangeChange={setDateRange}
        actions={actions}
        onRefresh={refreshUrl || onRefresh ? handleRefresh : undefined}
        enableSelection={true}
        emptyMessage="No action items found."
        defaultSorting={[{ id: "dueDate", desc: false }]}
        SkeletonComponent={() => (
          <DataTableSkeleton columns={actionMode !== "none" ? 7 : 6} rows={8} />
        )}
      />
      <ExportActionItemsDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        actionItems={exportableData}
        selectedActionItems={selectedExportableData}
      />
    </>
  )
}
