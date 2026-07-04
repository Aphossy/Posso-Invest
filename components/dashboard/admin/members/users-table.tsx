// C:\Users\user\OneDrive\Desktop\trustlink-group\components\dashboard\admin\users\users-table.tsx
"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  getRoleBadgeColor,
  getRoleIcon,
  getStatusBadgeColor,
  getStatusText,
} from "@/utils/user-utils"
import type { ColumnDef } from "@tanstack/react-table"
import { formatDistanceToNow } from "date-fns"
import {
  Activity,
  Calendar,
  CircleSmall,
  Download,
  FunnelX,
  Mail,
  Shield,
  ShieldCheck,
  SlidersHorizontal,
  Users,
} from "lucide-react"
import { toast } from "sonner"

import type { AdminUser } from "@/types/admin-users"
import { authClient } from "@/lib/auth-client"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Filters,
  type Filter,
  type FilterFieldConfig,
  type FilterFieldsConfig,
} from "@/components/ui/filters"
import { Skeleton } from "@/components/ui/skeleton"
import { DataTable, type ActionConfig } from "@/components/ui/table/data-table"
import { DataTableSkeleton } from "@/components/ui/table/data-table-skeleton"

import { ExportDialog } from "./export-user-dialog"
import { UserRowActions } from "./user-row-actions"
import { UsersTableSkeleton } from "./users-table-skeleton"

interface UsersTableProps {
  users: AdminUser[]
  loading: boolean
  error: string | null
  onUpdateUser: (
    userId: string,
    updates: Partial<AdminUser>
  ) => Promise<AdminUser>
  onDeleteUser: (userId: string) => Promise<boolean>
  onRefetch: () => Promise<void>
}

interface Session {
  id: string
  token: string
  createdAt: string | Date
  updatedAt: string | Date
  expiresAt: string | Date
  ipAddress?: string | null
  userAgent?: string | null
  userId: string
  impersonatedBy?: string | null
}

interface EnhancedUser extends AdminUser {
  activeSessions?: number
  lastSession?: Session | null
}

// Helper function to flatten filter fields (replacing flattenFields from filters.tsx)
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

export default function UsersTable({
  users,
  loading,
  error,
  onUpdateUser,
  onDeleteUser,
  onRefetch,
}: UsersTableProps) {
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [selectedUsers, setSelectedUsers] = useState<AdminUser[]>([])
  const [enhancedUsers, setEnhancedUsers] = useState<EnhancedUser[]>([])
  const [loadingSessions, setLoadingSessions] = useState(false)
  const [filters, setFilters] = useState<Filter[]>([])
  const [searchValue, setSearchValue] = useState("")
  const { data: session } = authClient.useSession()
  const currentUser = session?.user.id

  useEffect(() => {
    // This will trigger the table's internal filtering
    if (searchValue) {
      // The searchableContent column will be filtered by the DataTable component
    }
  }, [searchValue])

  useEffect(() => {
    const fetchSessions = async () => {
      setLoadingSessions(true)
      try {
        const sessionPromises = users.map((user) =>
          authClient.admin.listUserSessions({ userId: user.id })
        )
        const sessionResponses = await Promise.all(sessionPromises)

        const userSessionMap = new Map<string, Session[]>()
        sessionResponses.forEach((response, index) => {
          const userId = users[index].id
          userSessionMap.set(userId, response.data?.sessions || [])
        })

        const updatedUsers = users.map((user) => {
          const sessions = userSessionMap.get(user.id) || []
          const activeSessions = sessions.filter(
            (s) => new Date(s.expiresAt) > new Date()
          ).length
          const lastSession =
            sessions.length > 0
              ? sessions.reduce((latest, session) =>
                  new Date(session.createdAt) > new Date(latest.createdAt)
                    ? session
                    : latest
                )
              : null

          return { ...user, activeSessions, lastSession }
        })

        setEnhancedUsers(updatedUsers)
      } catch (error) {
        console.error("Error fetching session data:", error)
        toast.error("Failed to load session data")
        setEnhancedUsers(
          users.map((user) => ({
            ...user,
            activeSessions: 0,
            lastSession: null,
          }))
        )
      } finally {
        setLoadingSessions(false)
      }
    }

    if (users.length > 0 && !loading) {
      fetchSessions()
    }
  }, [users, loading])

  // Filter fields configuration
  const filterFields: FilterFieldsConfig<unknown> = useMemo(
    () => [
      {
        group: "User Info",
        fields: [
          {
            key: "name",
            label: "Name",
            type: "text",
            icon: <Users />,
            placeholder: "Search name...",
            operators: [
              { value: "contains", label: "contains" },
              { value: "starts_with", label: "starts with" },
              { value: "ends_with", label: "ends with" },
              { value: "is", label: "is exactly" },
              { value: "empty", label: "is empty" },
              { value: "not_empty", label: "is not empty" },
            ],
          },
          {
            key: "email",
            label: "Email",
            type: "email",
            icon: <Mail />,
            placeholder: "user@example.com",
            pattern: "^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$",
          },
        ],
      },
      {
        group: "Account",
        fields: [
          {
            key: "role",
            label: "Role",
            type: "select",
            icon: <SlidersHorizontal />,
            options: [
              { value: "admin", label: "Admin", icon: getRoleIcon("admin") },
              {
                value: "treasurer",
                label: "Treasurer",
                icon: getRoleIcon("treasurer"),
              },
              {
                value: "secretary",
                label: "Secretary",
                icon: getRoleIcon("secretary"),
              },
              {
                value: "member",
                label: "Member",
                icon: getRoleIcon("member"),
              },
              {
                value: "president",
                label: "President",
                icon: getRoleIcon("president"),
              },
            ],
            searchable: false,
            className: "w-[150px] truncate",
          },
          {
            key: "status",
            label: "Status",
            type: "select",
            icon: <CircleSmall />,
            options: [
              { value: "active", label: "Active" },
              { value: "banned", label: "Banned" },
            ],
            searchable: false,
            className: "w-[150px]",
          },
          {
            key: "isVerified",
            label: "Verified",
            type: "boolean",
            icon: <ShieldCheck />,
            onLabel: "Verified",
            offLabel: "Unverified",
          },
        ],
      },
      {
        group: "Activity",
        fields: [
          {
            key: "activeSessions",
            label: "Active Sessions",
            type: "number",
            icon: <Activity />,
            min: 0,
            step: 1,
            className: "w-[100px]",
          },
          {
            key: "createdAt",
            label: "Created At",
            type: "date",
            icon: <Calendar />,
            className: "w-[150px]",
          },
        ],
      },
    ],
    []
  )

  // Filter logic
  const filteredUsers = useMemo(() => {
    console.log("filterFields:", filterFields) // Debug log
    console.log("filters:", filters) // Debug log
    if (!Array.isArray(filterFields)) {
      console.error("filterFields is not an array:", filterFields)
      return enhancedUsers
    }

    return enhancedUsers.filter((user) => {
      return filters.every((filter) => {
        const fieldConfig = getFieldConfig(filterFields, filter.field)
        if (!fieldConfig) {
          console.warn(
            `Field config not found for filter field: ${filter.field}`
          )
          return true
        }

        const value = filter.values[0]
        const values = filter.values

        switch (filter.field) {
          case "name":
            if (!user.name) return filter.operator === "empty"
            if (filter.operator === "contains")
              return user.name
                .toLowerCase()
                .includes((value as string)?.toLowerCase() || "")
            if (filter.operator === "starts_with")
              return user.name
                .toLowerCase()
                .startsWith((value as string)?.toLowerCase() || "")
            if (filter.operator === "ends_with")
              return user.name
                .toLowerCase()
                .endsWith((value as string)?.toLowerCase() || "")
            if (filter.operator === "is")
              return (
                user.name.toLowerCase() === (value as string)?.toLowerCase()
              )
            if (filter.operator === "empty") return !user.name
            if (filter.operator === "not_empty") return !!user.name
            return true

          case "email":
            if (!user.email) return filter.operator === "empty"
            if (filter.operator === "contains")
              return user.email
                .toLowerCase()
                .includes((value as string)?.toLowerCase() || "")
            if (filter.operator === "starts_with")
              return user.email
                .toLowerCase()
                .startsWith((value as string)?.toLowerCase() || "")
            if (filter.operator === "ends_with")
              return user.email
                .toLowerCase()
                .endsWith((value as string)?.toLowerCase() || "")
            if (filter.operator === "is")
              return (
                user.email.toLowerCase() === (value as string)?.toLowerCase()
              )
            if (filter.operator === "empty") return !user.email
            if (filter.operator === "not_empty") return !!user.email
            return true

          case "role":
            if (!user.role) return filter.operator === "empty"
            if (filter.operator === "is") return user.role === value
            if (filter.operator === "is_not") return user.role !== value
            if (filter.operator === "empty") return !user.role
            if (filter.operator === "not_empty") return !!user.role
            return true

          case "status":
            const isActive = !user.banned
            if (filter.operator === "is")
              return (
                (value === "active" && isActive) ||
                (value === "banned" && !isActive)
              )
            if (filter.operator === "is_not")
              return (
                (value === "active" && !isActive) ||
                (value === "banned" && isActive)
              )
            if (filter.operator === "empty") return !user.banned
            if (filter.operator === "not_empty") return !!user.banned
            return true

          case "isVerified":
            if (filter.operator === "is") return user.emailVerified === value
            if (filter.operator === "is_not")
              return user.emailVerified !== value
            if (filter.operator === "empty") return !user.emailVerified
            if (filter.operator === "not_empty") return !!user.emailVerified
            return true

          case "activeSessions":
            const activeSessions = user.activeSessions || 0
            if (filter.operator === "equals")
              return activeSessions === Number(value)
            if (filter.operator === "greater_than")
              return activeSessions > Number(value)
            if (filter.operator === "less_than")
              return activeSessions < Number(value)
            if (filter.operator === "between")
              return (
                activeSessions >= Number(values[0]) &&
                activeSessions <= Number(values[1])
              )
            if (filter.operator === "empty") return activeSessions === 0
            if (filter.operator === "not_empty") return activeSessions > 0
            return true

          case "createdAt":
            if (!user.createdAt) return filter.operator === "empty"
            const createdAt = new Date(user.createdAt)
            if (filter.operator === "is")
              return (
                createdAt.toDateString() ===
                new Date(value as string).toDateString()
              )
            if (filter.operator === "before")
              return createdAt < new Date(value as string)
            if (filter.operator === "after")
              return createdAt > new Date(value as string)
            if (filter.operator === "between") {
              return (
                createdAt >= new Date(values[0] as string) &&
                createdAt <= new Date(values[1] as string)
              )
            }
            if (filter.operator === "empty") return !user.createdAt
            if (filter.operator === "not_empty") return !!user.createdAt
            return true

          default:
            return true
        }
      })
    })
  }, [enhancedUsers, filters, filterFields])

  // Column definitions
  const columns: ColumnDef<EnhancedUser>[] = [
    {
      header: "User",
      accessorKey: "searchableContent",
      accessorFn: (row) => {
        return [row.name, row.email].join(" ").toLowerCase()
      },
      cell: ({ row }) => (
        <div className="flex items-center truncate space-x-3">
          <Avatar className="h-8 w-8">
            <AvatarImage
              src={row.original.image || "/placeholder.svg"}
              alt={`${row.original.name} profile picture`}
            />
            <AvatarFallback>{row.original.name[0]}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">
              {row.original.name}
              {row.original.id === currentUser ? " (You)" : ""}
            </p>
            <p className="text-sm text-muted-foreground">
              {row.original.email}
            </p>
          </div>
        </div>
      ),
      size: 280,
      enableHiding: false,
    },
    {
      header: "Role",
      accessorKey: "role",
      cell: ({ row }) => (
        <Badge
          className={cn(
            "capitalize",
            getRoleBadgeColor(row.original.role ?? "member")
          )}>
          <span className="mr-1">
            {getRoleIcon(row.original.role ?? "member")}
          </span>
          {row.original.role ?? "member"}
        </Badge>
      ),
      size: 100,
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: ({ row }) => (
        <div className="flex items-center space-x-2">
          <Badge className={getStatusBadgeColor(row.original)}>
            {getStatusText(row.original)}
          </Badge>
        </div>
      ),
      size: 100,
    },
    {
      header: "Verification",
      accessorKey: "isVerified",
      cell: ({ row }) => (
        <Badge variant={row.original.emailVerified ? "default" : "outline"}>
          {row.original.emailVerified ? (
            <ShieldCheck className="h-4 w-4" />
          ) : (
            <Shield className="h-4 w-4" />
          )}
          {row.original.emailVerified ? "Verified" : "Unverified"}
        </Badge>
      ),
      size: 110,
    },
    {
      header: "Joined",
      accessorKey: "createdAt",
      cell: ({ row }) => (
        <div className="text-sm">
          {formatDistanceToNow(new Date(row.original.createdAt), {
            addSuffix: true,
          })}
        </div>
      ),
      size: 150,
    },
    {
      header: "Last Login",
      accessorKey: "lastSession",
      cell: ({ row }) => (
        <div className="text-sm flex">
          {loadingSessions ? (
            <Skeleton className="h-4 w-20" />
          ) : row.original.lastSession ? (
            <div className="flex flex-col">
              {formatDistanceToNow(
                new Date(row.original.lastSession.createdAt),
                {
                  addSuffix: true,
                }
              )}
              <div className="mt-1 text-xs text-muted-foreground">
                {row.original.lastLoginMethod
                  ? `By ${row.original.lastLoginMethod}`
                  : ""}
              </div>
            </div>
          ) : (
            "Never"
          )}
        </div>
      ),
      size: 130,
    },
    {
      header: "Active Sessions",
      accessorKey: "activeSessions",
      cell: ({ row }) => (
        <div className="text-sm text-center">
          {loadingSessions ? (
            <Skeleton className="h-4 w-10" />
          ) : (
            <Badge
              variant={
                (row.original.activeSessions ?? 0) > 1
                  ? "destructive"
                  : "outline"
              }>
              {row.original.activeSessions || 0}
            </Badge>
          )}
        </div>
      ),
      size: 140,
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => (
        <UserRowActions
          user={row.original}
          onUpdate={async (userId, data) => {
            await onUpdateUser(userId, data)
          }}
          onDelete={async (userId) => {
            await onDeleteUser(userId)
          }}
        />
      ),
      size: 60,
      enableHiding: false,
    },
  ]

  // Action configurations
  const actions: ActionConfig<EnhancedUser>[] = [
    {
      label: "Export",
      icon: Download,
      onClick: (selectedUsers) => {
        setSelectedUsers(selectedUsers)
        setExportDialogOpen(true)
      },
      variant: "outline",
    },
  ]

  const handleRefresh = async () => {
    const refreshPromise = onRefetch()
    toast.promise(refreshPromise, {
      loading: "Refreshing users...",
      success: "Users refreshed successfully",
      error: "Failed to refresh users",
    })
  }

  const handleBulkDelete = async (usersToDelete: EnhancedUser[]) => {
    const deletePromise = Promise.all(
      usersToDelete.map((user) => onDeleteUser(user.id))
    )

    toast.promise(deletePromise, {
      loading: `Deleting ${usersToDelete.length} users...`,
      success: `Successfully deleted ${usersToDelete.length} users`,
      error: "Failed to delete some users",
    })
  }

  const handleFiltersChange = useCallback((newFilters: Filter[]) => {
    console.log("Filters changed:", newFilters) // Debug log
    setFilters(newFilters)
  }, [])

  if (loading || loadingSessions) {
    return <UsersTableSkeleton />
  }

  if (error) {
    return (
      <div className="flex h-32 items-center justify-center">
        <p className="text-muted-foreground">Failed to load users: {error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2.5">
        <Filters
          filters={filters}
          fields={filterFields}
          onChange={handleFiltersChange}
          variant="outline"
          size="md"
          radius="md"
          className="flex-1"
        />
        {filters.length > 0 && (
          <Button variant="outline" size="sm" onClick={() => setFilters([])}>
            <FunnelX className="mr-1 h-4 w-4" />
            Clear
          </Button>
        )}
      </div>
      <DataTable
        data={filteredUsers}
        columns={columns}
        loading={loading || loadingSessions}
        searchPlaceholder="Search member..."
        searchColumnId="searchableContent"
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        actions={actions}
        onRefresh={handleRefresh}
        enableSelection={true}
        enableBulkDelete={true}
        onBulkDelete={handleBulkDelete}
        bulkDeleteConfirmText={(count) => `REMOVE ${count} MEMBERS`}
        emptyMessage="No members found."
        defaultSorting={[{ id: "createdAt", desc: true }]}
        SkeletonComponent={() => <DataTableSkeleton columns={7} rows={10} />}
      />
      <ExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        users={enhancedUsers}
        selectedUsers={selectedUsers}
      />
    </div>
  )
}
