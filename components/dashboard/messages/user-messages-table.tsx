"use client"

import { useMemo, useState } from "react"
import { IKIMINA_MESSAGE_SERVICE_LABELS } from "@/constants/message-services"
import type { Message } from "@/db/schemas/message-schema"
import type { ColumnDef } from "@tanstack/react-table"
import { formatDistanceToNow } from "date-fns"
import { Eye } from "lucide-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/table/data-table"
import { DataTableSkeleton } from "@/components/ui/table/data-table-skeleton"

import { UserMessageDetailsDialog } from "./user-message-details-dialog"

interface UserMessagesTableProps {
  messages: Message[]
  loading: boolean
  error: string | null
  onRefetch: () => Promise<unknown>
}

const getStatusBadgeColor = (status: string) => {
  const colors: Record<string, string> = {
    new: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    read: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
    "in-progress":
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    resolved:
      "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    archived: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
  }
  return colors[status] || colors.new
}

const getPriorityBadgeColor = (priority: string) => {
  const colors: Record<string, string> = {
    low: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
    medium: "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300",
    high: "bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-300",
    urgent: "bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300",
  }
  return colors[priority] || colors.medium
}

const serviceLabels: Record<string, string> = IKIMINA_MESSAGE_SERVICE_LABELS

export function UserMessagesTable({
  messages,
  loading,
  error,
  onRefetch,
}: UserMessagesTableProps) {
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)
  const [searchValue, setSearchValue] = useState("")

  const columns: ColumnDef<Message>[] = useMemo(
    () => [
      {
        header: "Message",
        accessorKey: "searchableContent",
        accessorFn: (row) => {
          return [row.subject, row.messageCode, row.message]
            .join(" ")
            .toLowerCase()
        },
        cell: ({ row }) => (
          <div
            className="flex flex-col space-y-1 min-w-[250px] cursor-pointer hover:opacity-75 transition-opacity"
            onClick={() => {
              setSelectedMessage(row.original)
              setDetailsDialogOpen(true)
            }}>
            <div className="flex items-center gap-2">
              <p className="font-medium line-clamp-1">{row.original.subject}</p>
              {!row.original.isRead && (
                <Badge variant="destructive" className="text-xs px-1.5 py-0">
                  New
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground font-mono">
              {row.original.messageCode}
            </p>
          </div>
        ),
        size: 320,
        enableHiding: false,
      },
      {
        header: "Service",
        accessorKey: "service",
        cell: ({ row }) => (
          <Badge variant="outline">
            {serviceLabels[row.original.service] || row.original.service}
          </Badge>
        ),
        size: 200,
      },
      {
        header: "Status",
        accessorKey: "status",
        cell: ({ row }) => (
          <Badge
            className={cn(
              "capitalize",
              getStatusBadgeColor(row.original.status)
            )}>
            {row.original.status}
          </Badge>
        ),
        size: 110,
      },
      {
        header: "Priority",
        accessorKey: "priority",
        cell: ({ row }) => (
          <Badge
            className={cn(
              "capitalize",
              getPriorityBadgeColor(row.original.priority || "medium")
            )}>
            {row.original.priority || "medium"}
          </Badge>
        ),
        size: 100,
      },
      {
        header: "Sent",
        accessorKey: "createdAt",
        cell: ({ row }) => (
          <div className="text-sm">
            {formatDistanceToNow(new Date(row.original.createdAt), {
              addSuffix: true,
            })}
          </div>
        ),
        size: 120,
      },
      {
        id: "actions",
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedMessage(row.original)
              setDetailsDialogOpen(true)
            }}
            className="h-8 w-8 p-0">
            <Eye className="h-4 w-4" />
            <span className="sr-only">View details</span>
          </Button>
        ),
        size: 50,
      },
    ],
    []
  )

  if (loading) {
    return <DataTableSkeleton columns={5} rows={10} />
  }

  if (error) {
    return (
      <div className="flex h-32 items-center justify-center">
        <p className="text-muted-foreground">
          Failed to load messages: {error}
        </p>
      </div>
    )
  }

  return (
    <>
      <DataTable
        data={messages}
        columns={columns}
        loading={loading}
        searchPlaceholder="Search your messages..."
        searchColumnId="searchableContent"
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        enableSelection={false}
        enableBulkDelete={false}
        emptyMessage="You haven't sent any messages yet."
        defaultSorting={[{ id: "createdAt", desc: true }]}
        SkeletonComponent={() => <DataTableSkeleton columns={5} rows={10} />}
      />

      <UserMessageDetailsDialog
        message={selectedMessage}
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
      />
    </>
  )
}
