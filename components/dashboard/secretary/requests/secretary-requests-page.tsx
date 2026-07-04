"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { format } from "date-fns"
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Mail,
  MailPlus,
  RefreshCw,
  XCircle,
} from "lucide-react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { authClient } from "@/lib/auth-client"
import { organizationClient } from "@/lib/organization-client"
import { cn } from "@/lib/utils"
import { useMediaQuery } from "@/hooks/use-media-query"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Loader } from "@/components/common/loader"

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
type Invitation = {
  id: string
  email: string
  role: string | null
  status: string | null
  createdAt: string | Date
  expiresAt: string | Date
  organizationId?: string | null
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
const formatDate = (value?: string | Date | null) => {
  if (!value) return "-"
  const date = value instanceof Date ? value : new Date(value)
  return new Intl.DateTimeFormat("en-RW", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

const statusTone = (status?: string | null) => {
  switch (status) {
    case "accepted":
      return "bg-emerald-100 text-emerald-700 border-emerald-200"
    case "pending":
      return "bg-amber-100 text-amber-700 border-amber-200"
    case "canceled":
    case "rejected":
      return "bg-red-100 text-red-700 border-red-200"
    default:
      return "bg-muted text-muted-foreground border-border"
  }
}

// ─────────────────────────────────────────────
// Invite Member Dialog (member role only)
// ─────────────────────────────────────────────
const inviteSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  resend: z.boolean().optional(),
})
type InviteForm = z.infer<typeof inviteSchema>

function InviteMemberDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}) {
  const isDesktop = useMediaQuery("(min-width: 768px)")
  const { data: activeOrganization } = authClient.useActiveOrganization()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<InviteForm>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: "", resend: false },
  })

  const handleSubmit = async (data: InviteForm) => {
    setIsSubmitting(true)
    setError(null)
    try {
      let organizationId = activeOrganization?.id
      if (!organizationId) {
        const orgResponse = await organizationClient.list()
        const organizations = orgResponse.data || []
        if (organizations.length > 0) {
          organizationId = organizations[0].id
          await organizationClient.setActive({ organizationId })
        }
      }
      if (!organizationId) {
        throw new Error(
          "No active organization found. Please refresh and try again."
        )
      }

      const response = await organizationClient.inviteMember({
        email: data.email,
        role: "member", // Secretary can only invite as "member"
        resend: data.resend,
        organizationId,
      })

      if (response.error) {
        throw new Error(response.error.message || "Failed to send invitation")
      }

      toast.success("Invitation sent successfully")
      form.reset()
      onSuccess?.()
      onOpenChange(false)
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to send invitation"
      setError(msg)
      toast.error("Failed to send invitation")
    } finally {
      setIsSubmitting(false)
    }
  }

  const formContent = (
    <>
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email address</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="email"
                    placeholder="member@example.com"
                    disabled={isSubmitting}
                    autoComplete="email"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="rounded-md border border-muted bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Role:</span> Member
            <p className="mt-0.5 text-xs">
              As secretary, you can invite members with the Member role. Contact
              an admin to assign higher roles.
            </p>
          </div>
        </form>
      </Form>
    </>
  )

  const actions = (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => onOpenChange(false)}
        disabled={isSubmitting}>
        Cancel
      </Button>
      <Button
        type="submit"
        disabled={isSubmitting}
        onClick={(e) => {
          e.preventDefault()
          form.handleSubmit(handleSubmit)()
        }}>
        {isSubmitting && <Loader className="mr-2 h-4 w-4" />}
        Send Invitation
      </Button>
    </>
  )

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite New Member</DialogTitle>
            <DialogDescription>
              Send a join invitation. New members join with the{" "}
              <strong>Member</strong> role.
            </DialogDescription>
          </DialogHeader>

          {formContent}

          <DialogFooter>{actions}</DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="flex max-h-[92vh] flex-col overflow-hidden p-0">
        <DrawerHeader className="border-b bg-muted/40 px-4 py-4 text-left">
          <DrawerTitle>Invite New Member</DrawerTitle>
          <p className="text-sm text-muted-foreground">
            Send a join invitation. New members join with the Member role.
          </p>
        </DrawerHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <div className="space-y-4">{formContent}</div>
        </div>

        <DrawerFooter className="border-t bg-background pb-6">
          {actions}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

// ─────────────────────────────────────────────
// Stats cards
// ─────────────────────────────────────────────
function InvitationStatsCards({
  invitations,
  loading,
}: {
  invitations: Invitation[]
  loading: boolean
}) {
  const stats = useMemo(() => {
    const pending = invitations.filter((i) => i.status === "pending").length
    const accepted = invitations.filter((i) => i.status === "accepted").length
    const canceled = invitations.filter(
      (i) => i.status === "canceled" || i.status === "rejected"
    ).length
    return { pending, accepted, canceled, total: invitations.length }
  }, [invitations])

  const cards = [
    {
      label: "Total Invitations",
      value: stats.total,
      icon: <Mail className="h-5 w-5 text-muted-foreground" />,
    },
    {
      label: "Pending",
      value: stats.pending,
      icon: <Clock className="h-5 w-5 text-amber-500" />,
    },
    {
      label: "Accepted",
      value: stats.accepted,
      icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
    },
    {
      label: "Canceled / Rejected",
      value: stats.canceled,
      icon: <XCircle className="h-5 w-5 text-red-500" />,
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardContent className="flex items-center justify-between pt-6">
            <div>
              <p className="text-sm text-muted-foreground">{card.label}</p>
              {loading ? (
                <div className="mt-1 h-7 w-10 animate-pulse rounded bg-muted" />
              ) : (
                <p className="text-2xl font-bold">{card.value}</p>
              )}
            </div>
            {card.icon}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────
export default function SecretaryRequestsPage() {
  const { data: activeOrganization } = authClient.useActiveOrganization()
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState<{
    id: string
    type: "resend" | "cancel"
  } | null>(null)

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

  const fetchInvitations = useCallback(async () => {
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
    setLoading(true)
    fetchInvitations()
  }, [fetchInvitations])

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await fetchInvitations()
      toast.success("Invitations refreshed")
    } catch {
      toast.error("Failed to refresh")
    } finally {
      setRefreshing(false)
    }
  }

  const handleResend = async (invite: Invitation) => {
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

      toast.success("Invitation resent successfully")
      await fetchInvitations()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to resend invitation"
      )
    } finally {
      setPendingAction(null)
    }
  }

  const handleCancel = async (invite: Invitation) => {
    setPendingAction({ id: invite.id, type: "cancel" })
    try {
      const response = await organizationClient.cancelInvitation({
        invitationId: invite.id,
      })

      if (response.error) {
        throw new Error(response.error.message || "Failed to cancel invitation")
      }

      toast.success("Invitation canceled")
      await fetchInvitations()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to cancel invitation"
      )
    } finally {
      setPendingAction(null)
    }
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="flex h-32 items-center justify-center">
            <div className="text-center">
              <p className="mb-4 text-muted-foreground">{error}</p>
              <Button onClick={handleRefresh} variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto space-y-8 px-2 py-5">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Join Requests</h1>
          <p className="text-muted-foreground">
            Manage membership invitations for TrustLink Group
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing || loading}>
            <RefreshCw
              className={cn(
                "mr-2 h-4 w-4",
                (refreshing || loading) && "animate-spin"
              )}
            />
            Refresh
          </Button>
          <Button onClick={() => setInviteOpen(true)}>
            <MailPlus className="mr-2 h-4 w-4" />
            Invite Member
          </Button>
        </div>
      </div>

      {/* Stats */}
      <InvitationStatsCards invitations={invitations} loading={loading} />

      {/* Invitations table */}
      <Card>
        <CardHeader>
          <CardTitle>Invitations</CardTitle>
          <CardDescription>
            {invitations.length} invitation{invitations.length !== 1 ? "s" : ""}{" "}
            · Track pending and accepted join requests
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {loading ? (
            <div className="space-y-3 px-6 py-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="h-4 w-48 animate-pulse rounded bg-muted" />
                  <div className="h-5 w-16 animate-pulse rounded bg-muted" />
                  <div className="h-5 w-16 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                </div>
              ))}
            </div>
          ) : invitations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Mail className="mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="text-muted-foreground">No invitations yet.</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setInviteOpen(true)}>
                <MailPlus className="mr-2 h-4 w-4" />
                Send First Invitation
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Invited</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((invite) => (
                  <TableRow key={invite.id}>
                    <TableCell className="pl-6 font-medium">
                      {invite.email}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {invite.role ?? "member"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={cn(
                          "border capitalize",
                          statusTone(invite.status)
                        )}>
                        {invite.status ?? "pending"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDate(invite.createdAt)}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(invite.expiresAt)}
                    </TableCell>
                    <TableCell className="pr-6">
                      {invite.status === "pending" ? (
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleResend(invite)}
                            disabled={
                              pendingAction?.id === invite.id &&
                              pendingAction?.type === "resend"
                            }>
                            {pendingAction?.id === invite.id &&
                            pendingAction?.type === "resend" ? (
                              <Loader className="mr-1.5 h-3.5 w-3.5" />
                            ) : (
                              <Mail className="mr-1.5 h-3.5 w-3.5" />
                            )}
                            Resend
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleCancel(invite)}
                            disabled={
                              pendingAction?.id === invite.id &&
                              pendingAction?.type === "cancel"
                            }>
                            {pendingAction?.id === invite.id &&
                            pendingAction?.type === "cancel" ? (
                              <Loader className="mr-1.5 h-3.5 w-3.5" />
                            ) : null}
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <InviteMemberDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onSuccess={fetchInvitations}
      />
    </div>
  )
}
