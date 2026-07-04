"use client"

import { useEffect, useMemo, useState } from "react"
import type { Attendance } from "@/db/schemas/attendance-schema"
import type { ColumnDef } from "@tanstack/react-table"
import { Download, Trash2 } from "lucide-react"
import type { DateRange } from "react-day-picker"
import { toast } from "sonner"

import { ApiErrorException } from "@/types/api"
import { useDeleteAttendanceMutation } from "@/hooks/api/use-attendance"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DataTable, type ActionConfig } from "@/components/ui/table/data-table"
import { DataTableSkeleton } from "@/components/ui/table/data-table-skeleton"

import { ExportAttendanceDialog } from "./export-attendance-dialog"
import { UpdateAttendanceDialog } from "./update-attendance-dialog"

type AttendanceRow = Attendance & {
  memberName?: string | null
  memberEmail?: string | null
  meetingTitle?: string | null
  recordedByName?: string | null
}

interface AttendanceTableProps {
  initialData: AttendanceRow[]
  onRefresh?: () => Promise<unknown> | void
  showActions?: boolean
}

const statusStyles: Record<string, string> = {
  present: "bg-emerald-100 text-emerald-700",
  absent: "bg-rose-100 text-rose-700",
  excused: "bg-amber-100 text-amber-700",
  late: "bg-blue-100 text-blue-700",
}

const formatDateTime = (value?: string | Date | null) => {
  if (!value) return "-"
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleString()
}

export function AttendanceTable({
  initialData,
  onRefresh,
  showActions = true,
}: AttendanceTableProps) {
  const [data, setData] = useState<AttendanceRow[]>(initialData)
  const [searchValue, setSearchValue] = useState("")
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [selectedItems, setSelectedItems] = useState<AttendanceRow[]>([])
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const deleteAttendance = useDeleteAttendanceMutation()

  useEffect(() => {
    setData(initialData)
  }, [initialData])

  const filteredData = useMemo(() => {
    if (!dateRange?.from && !dateRange?.to) return data
    return data.filter((item) => {
      const dateValue = item.checkedInAt || item.createdAt
      if (!dateValue) return false
      const date = new Date(dateValue)
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
      const key = item.status || "present"
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

  const columns = useMemo<ColumnDef<AttendanceRow>[]>(() => {
    const baseColumns: ColumnDef<AttendanceRow>[] = [
      {
        header: "Meeting",
        accessorKey: "meeting",
        accessorFn: (row) =>
          [row.meetingTitle, row.meetingId]
            .filter(Boolean)
            .join(" ")
            .toLowerCase(),
        filterFn: (row, id, value) => {
          if (!Array.isArray(value) || value.length === 0) return true
          const displayValue =
            row.original.meetingTitle || row.original.meetingId || ""
          return value.includes(displayValue)
        },
        cell: ({ row }) => (
          <div>
            <div className="font-medium">
              {row.original.meetingTitle || "Meeting"}
            </div>
            <div className="text-xs text-muted-foreground">
              {row.original.meetingId}
            </div>
          </div>
        ),
        size: 220,
      },
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
        header: "Checked In",
        accessorKey: "checkedInAt",
        cell: ({ row }) => formatDateTime(row.original.checkedInAt),
        size: 160,
      },
      {
        header: "Recorded By",
        accessorKey: "recordedByName",
        cell: ({ row }) => row.original.recordedByName || "-",
        size: 140,
      },
    ]

    if (showActions) {
      baseColumns.push({
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <div className="flex gap-2">
            <UpdateAttendanceDialog
              attendance={row.original as Attendance}
              onUpdated={async () => {
                await onRefresh?.()
              }}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                const confirmed = window.confirm(
                  `Delete attendance record for ${row.original.memberName || "this member"}? This cannot be undone.`
                )
                if (!confirmed) return

                setDeletingId(row.original.id)
                try {
                  await deleteAttendance.mutateAsync({ id: row.original.id })
                  toast.success("Attendance record deleted")
                  await onRefresh?.()
                } catch (error) {
                  const message =
                    error instanceof ApiErrorException
                      ? error.help || error.message
                      : "Failed to delete attendance record"
                  toast.error(message)
                } finally {
                  setDeletingId(null)
                }
              }}
              disabled={deletingId === row.original.id}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
        size: 120,
        enableHiding: false,
      })
    }

    return baseColumns
  }, [deletingId, deleteAttendance, onRefresh, showActions])

  const actions: ActionConfig<AttendanceRow>[] = [
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
    if (!onRefresh) return
    const refreshPromise = Promise.resolve(onRefresh())
    toast.promise(refreshPromise, {
      loading: "Refreshing attendance...",
      success: "Attendance refreshed",
      error: "Failed to refresh attendance",
    })
  }

  return (
    <>
      <DataTable
        data={filteredData}
        columns={columns}
        searchPlaceholder="Search member or meeting..."
        searchColumnId="member"
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        filterConfigs={[
          {
            columnId: "meeting",
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
              label: value,
              count,
            })),
          },
        ]}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        actions={actions}
        onRefresh={onRefresh ? handleRefresh : undefined}
        enableSelection={true}
        emptyMessage="No attendance records found."
        defaultSorting={[{ id: "checkedInAt", desc: true }]}
        SkeletonComponent={() => (
          <DataTableSkeleton columns={showActions ? 6 : 5} rows={8} />
        )}
      />
      <ExportAttendanceDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        attendance={data}
        selectedAttendance={selectedItems}
      />
    </>
  )
}
