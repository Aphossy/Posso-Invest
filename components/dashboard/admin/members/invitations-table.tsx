"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { getRoleBadgeColor } from "@/utils/user-utils"
import type { ColumnDef } from "@tanstack/react-table"
import { formatDistanceToNow } from "date-fns"
import {
  Ban,
  Calendar,
  CheckCircle2,
  Clock,
  Mail,
  MoreHorizontal,
  RefreshCw,
  Send,
  Trash2,
  XCircle,
} from "lucide-react"
import { toast } from "sonner"

import { authClient } from "@/lib/auth-client"
import { deleteInvitationAction } from "@/lib/invitation-actions"
import { organizationClient } from "@/lib/organization-client"
import { cn } from "@/lib/utils"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DataTable } from "@/components/ui/table/data-table"
import { DataTableSkeleton } from "@/components/ui/table/data-table-skeleton"
import { Loader } from "@/components/common/loader"

type InvitationStatus = "pending" | "accepted" | "canceled" | "rejected"

type InvitationItem = {
  id: string
  email: string
  role: string | null
  status: InvitationStatus | string | null
  createdAt: string | Date
  expiresAt: string | Date
  organizationId?: string | null
}

// ─── helpers ─────────────────────────────────────────────────────────────────

const statusConfig: Record<
  string,
  { label: string; className: string; icon: React.ReactNode }
> = {
  pending: {
    label: "Pending",
    className: "bg-amber-100 text-amber-700 border-amber-200",
    icon: <Clock className="h-3 w-3" />,
  },
  accepted: {
    label: "Accepted",
    className: "bg-emerald-100 text-emerald-700 border-emerald-200",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  canceled: {
    label: "Canceled",
    className: "bg-red-100 text-red-700 border-red-200",
    icon: <XCircle className="h-3 w-3" />,
  },
  rejected: {
    label: "Rejected",
    className: "bg-rose-100 text-rose-700 border-rose-200",
    icon: <Ban className="h-3 w-3" />,
  },
}

const StatusBadge = ({ status }: { status: string | null }) => {
  const cfg = statusConfig[status ?? ""] ?? {
    label: status ?? "Unknown",
    className: "bg-muted text-muted-foreground border-border",
    icon: null,
  }
  return (
    <Badge
      className={cn(
        "flex items-center gap-1 border capitalize",
        cfg.className
      )}>
      {cfg.icon}
      {cfg.label}
    </Badge>
  )
}

const RoleBadge = ({ role }: { role: string | null }) => (
  <Badge className={cn("capitalize", getRoleBadgeColor(role ?? "member"))}>
    {role ?? "member"}
  </Badge>
)

const formatDate = (value?: string | Date | null) => {
  if (!value) return "-"
  const date = value instanceof Date ? value : new Date(value)
  return new Intl.DateTimeFormat("en-RW", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

const isExpired = (expiresAt: string | Date) => new Date(expiresAt) < new Date()

// ─── Row actions component ────────────────────────────────────────────────────

interface InvitationRowActionsProps {
  invite: InvitationItem
  onResend: (invite: InvitationItem) => Promise<void>
  onCancel: (invite: InvitationItem) => Promise<void>
  onDelete: (invite: InvitationItem) => void
  pendingAction: { id: string; type: string } | null
}

function InvitationRowActions({
  invite,
  onResend,
  onCancel,
  onDelete,
  pendingAction,
}: InvitationRowActionsProps) {
  const isBusy = pendingAction?.id === invite.id
  const isPending = invite.status === "pending"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          disabled={isBusy}>
          {isBusy ? (
            <Loader className="h-4 w-4" />
          ) : (
            <MoreHorizontal className="h-4 w-4" />
          )}
          <span className="sr-only">Invitation actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {isPending && (
          <>
            <DropdownMenuItem
              onClick={() => onResend(invite)}
              disabled={isBusy}>
              <Send className="mr-2 h-4 w-4" />
              Resend
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onCancel(invite)}
              disabled={isBusy}
              className="text-destructive focus:text-destructive">
              <XCircle className="mr-2 h-4 w-4" />
              Cancel
            </DropdownMenuItem>
          </>
        )}
        {isPending && <DropdownMenuSeparator />}
        <DropdownMenuItem
          onClick={() => onDelete(invite)}
          disabled={isBusy}
          className="text-destructive focus:text-destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function InvitationsTable() {
  const { data: activeOrganization } = authClient.useActiveOrganization()
  const [invitations, setInvitations] = useState<InvitationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pendingAction, setPendingAction] = useState<{
    id: string
    type: "resend" | "cancel" | "delete"
  } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<InvitationItem | null>(null)
  const [searchValue, setSearchValue] = useState("")

  // ── helpers ──────────────────────────────────────────────────────────────
  const getOrganizationId = useCallback(async () => {
    let organizationId = activeOrganization?.id
    if (!organizationId) {
      const orgResponse = await organizationClient.list()
      const organizations = orgResponse.data || []
      if (organizations.length > 0) {
        organizationId = organizations[0].id
        await organizationClient.setActive({ organizationId })
      }
    }
    return organizationId
  }, [activeOrganization?.id])

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const organizationId = await getOrganizationId()
      const response = await organizationClient.listInvitations({
        query: organizationId ? { organizationId } : undefined,
      })
      if (response.error) {
        throw new Error(response.error.message || "Failed to load invitations")
      }
      setInvitations(response.data || [])
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load invitations"
      )
    } finally {
      setLoading(false)
    }
  }, [getOrganizationId])

  useEffect(() => {
    refresh()
  }, [refresh])

  // ── actions ───────────────────────────────────────────────────────────────
  const handleResend = async (invite: InvitationItem) => {
    setPendingAction({ id: invite.id, type: "resend" })
    try {
      const organizationId = await getOrganizationId()
      if (!organizationId) throw new Error("No active organization found")

      const response = await organizationClient.inviteMember({
        email: invite.email,
        role: invite.role ?? "member",
        organizationId,
        resend: true,
      })
      if (response.error) {
        throw new Error(response.error.message || "Failed to resend invitation")
      }
      toast.success(`Invitation resent to ${invite.email}`)
      await refresh()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to resend invitation"
      )
    } finally {
      setPendingAction(null)
    }
  }

  const handleCancel = async (invite: InvitationItem) => {
    setPendingAction({ id: invite.id, type: "cancel" })
    try {
      const response = await organizationClient.cancelInvitation({
        invitationId: invite.id,
      })
      if (response.error) {
        throw new Error(response.error.message || "Failed to cancel invitation")
      }
      toast.success(`Invitation to ${invite.email} canceled`)
      await refresh()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to cancel invitation"
      )
    } finally {
      setPendingAction(null)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    setPendingAction({ id: deleteTarget.id, type: "delete" })
    setDeleteTarget(null)
    try {
      const result = await deleteInvitationAction(deleteTarget.id)
      if (!result.success) throw new Error(result.error)
      toast.success(`Invitation to ${deleteTarget.email} deleted`)
      await refresh()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete invitation"
      )
    } finally {
      setPendingAction(null)
    }
  }

  // ── derived stats ─────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const pending = invitations.filter((i) => i.status === "pending").length
    const accepted = invitations.filter((i) => i.status === "accepted").length
    const canceled = invitations.filter(
      (i) => i.status === "canceled" || i.status === "rejected"
    ).length
    const expired = invitations.filter(
      (i) => i.status === "pending" && isExpired(i.expiresAt)
    ).length
    return { pending, accepted, canceled, expired, total: invitations.length }
  }, [invitations])

  // ── columns ───────────────────────────────────────────────────────────────
  const columns: ColumnDef<InvitationItem>[] = useMemo(
    () => [
      {
        header: "Email",
        accessorKey: "email",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="font-medium">{row.original.email}</span>
          </div>
        ),
        size: 260,
        enableHiding: false,
      },
      {
        header: "Role",
        accessorKey: "role",
        cell: ({ row }) => <RoleBadge role={row.original.role} />,
        size: 110,
      },
      {
        header: "Status",
        accessorKey: "status",
        cell: ({ row }) => (
          <div className="flex flex-col gap-1">
            <StatusBadge status={row.original.status} />
            {row.original.status === "pending" &&
              isExpired(row.original.expiresAt) && (
                <span className="text-xs text-destructive">Expired</span>
              )}
          </div>
        ),
        size: 120,
      },
      {
        header: "Invited",
        accessorKey: "createdAt",
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            <span title={formatDate(row.original.createdAt)}>
              {formatDistanceToNow(new Date(row.original.createdAt), {
                addSuffix: true,
              })}
            </span>
          </div>
        ),
        size: 140,
      },
      {
        header: "Expires",
        accessorKey: "expiresAt",
        cell: ({ row }) => (
          <span
            className={cn(
              "text-xs",
              isExpired(row.original.expiresAt) &&
                row.original.status === "pending"
                ? "text-destructive"
                : "text-muted-foreground"
            )}>
            {formatDate(row.original.expiresAt)}
          </span>
        ),
        size: 170,
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <InvitationRowActions
            invite={row.original}
            onResend={handleResend}
            onCancel={handleCancel}
            onDelete={setDeleteTarget}
            pendingAction={pendingAction}
          />
        ),
        size: 60,
        enableHiding: false,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pendingAction]
  )

  // ── render ────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-sm text-muted-foreground">
        <XCircle className="h-6 w-6 text-destructive" />
        <p>{error}</p>
        <Button variant="outline" size="sm" onClick={refresh}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </div>
    )
  }

  return (
    <>
      {/* Summary row */}
      {!loading && invitations.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 py-3 text-sm text-muted-foreground border-b mb-1">
          <span className="font-medium text-foreground">
            {stats.total} invitation{stats.total !== 1 ? "s" : ""}
          </span>
          {stats.pending > 0 && (
            <Badge className={cn("border", statusConfig.pending.className)}>
              {stats.pending} pending
            </Badge>
          )}
          {stats.accepted > 0 && (
            <Badge className={cn("border", statusConfig.accepted.className)}>
              {stats.accepted} accepted
            </Badge>
          )}
          {stats.canceled > 0 && (
            <Badge className={cn("border", statusConfig.canceled.className)}>
              {stats.canceled} canceled
            </Badge>
          )}
          {stats.expired > 0 && (
            <Badge variant="destructive" className="border">
              {stats.expired} expired
            </Badge>
          )}
        </div>
      )}

      <DataTable
        data={invitations}
        columns={columns}
        loading={loading}
        searchPlaceholder="Search by email…"
        searchColumnId="email"
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        onRefresh={refresh}
        emptyMessage="No invitations found."
        defaultSorting={[{ id: "createdAt", desc: true }]}
        SkeletonComponent={() => <DataTableSkeleton columns={6} rows={6} />}
        filterConfigs={[
          {
            columnId: "status",
            label: "Status",
            options: [
              { value: "pending", label: "Pending" },
              { value: "accepted", label: "Accepted" },
              { value: "canceled", label: "Canceled" },
              { value: "rejected", label: "Rejected" },
            ],
          },
          {
            columnId: "role",
            label: "Role",
            options: [
              { value: "member", label: "Member" },
              { value: "admin", label: "Admin" },
              { value: "treasurer", label: "Treasurer" },
              { value: "secretary", label: "Secretary" },
              { value: "president", label: "President" },
            ],
          },
        ]}
      />

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invitation</AlertDialogTitle>
            <AlertDialogDescription>
              Permanently delete the invitation sent to{" "}
              <span className="font-medium">{deleteTarget?.email}</span>? This
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
