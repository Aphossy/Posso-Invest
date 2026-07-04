"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { copyToClipboard } from "@/utils/user-export-utils"
import { getRoleBadgeColor, getRoleIcon } from "@/utils/user-utils"
import { format, formatDistanceToNow } from "date-fns"
import {
  Calendar,
  ClipboardList,
  Copy,
  Eye,
  Mail,
  RefreshCw,
  Search,
  Shield,
  ShieldCheck,
  UserIcon,
  Users,
  Wallet,
} from "lucide-react"
import { toast } from "sonner"

import { authClient } from "@/lib/auth-client"
import { organizationClient } from "@/lib/organization-client"
import { cn } from "@/lib/utils"
import { useMediaQuery } from "@/hooks/use-media-query"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Loader } from "@/components/common/loader"

type SecretaryMember = {
  id: string
  memberId: string | null
  name: string
  email: string
  image: string | null
  role: string
  createdAt: Date
}

// ─────────────────────────────────────────────
// Member Details Dialog (read-only)
// ─────────────────────────────────────────────
function MemberDetailsDialog({
  member,
  open,
  onOpenChange,
}: {
  member: SecretaryMember | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const isDesktop = useMediaQuery("(min-width: 768px)")

  if (!member) return null

  const content = (
    <div className="space-y-5 pr-2">
      {/* Profile header */}
      <div className="flex items-center gap-4 rounded-lg bg-muted/50 p-4">
        <Avatar className="h-14 w-14">
          <AvatarImage
            src={member.image || "/placeholder.svg"}
            alt={member.name}
          />
          <AvatarFallback className="text-lg">
            {member.name?.[0] ?? "?"}
          </AvatarFallback>
        </Avatar>
        <div className="space-y-1">
          <p className="text-lg font-semibold">{member.name}</p>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Mail className="h-3.5 w-3.5" />
            {member.email}
          </div>
          <Badge className={cn("capitalize", getRoleBadgeColor(member.role))}>
            <span className="mr-1">{getRoleIcon(member.role)}</span>
            {member.role}
          </Badge>
        </div>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <UserIcon className="h-4 w-4" />
              Membership
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Member ID</p>
              <p className="font-mono text-xs">
                {member.memberId ? `${member.memberId.substring(0, 8)}…` : "-"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">User ID</p>
              <p className="font-mono text-xs">{member.id.substring(0, 8)}…</p>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <span>
                Joined {format(new Date(member.createdAt), "MMM dd, yyyy")}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Shield className="h-4 w-4" />
              Role
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Organization Role</span>
              <Badge
                className={cn("capitalize", getRoleBadgeColor(member.role))}>
                {member.role}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Role changes are managed by the admin.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Member Details</DialogTitle>
            <DialogDescription>
              Membership overview for {member.name}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh]">{content}</ScrollArea>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="flex max-h-[92vh] flex-col overflow-hidden p-0">
        <DrawerHeader className="border-b bg-muted/40 px-4 py-4 text-left">
          <DrawerTitle>Member Details</DrawerTitle>
          <p className="text-sm text-muted-foreground">
            Membership overview for {member.name}
          </p>
        </DrawerHeader>

        <ScrollArea className="min-h-0 flex-1 px-4 py-4">{content}</ScrollArea>

        <DrawerFooter className="border-t bg-background pb-6">
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

// ─────────────────────────────────────────────
// Stats cards
// ─────────────────────────────────────────────
function MemberStatsCards({
  members,
  loading,
}: {
  members: SecretaryMember[]
  loading: boolean
}) {
  const stats = useMemo(() => {
    const total = members.length
    const byRole = members.reduce(
      (acc, m) => {
        const r = m.role ?? "member"
        acc[r] = (acc[r] ?? 0) + 1
        return acc
      },
      {} as Record<string, number>
    )
    return { total, byRole }
  }, [members])

  const cards = [
    {
      label: "Total Members",
      value: stats.total,
      icon: <Users className="h-5 w-5 text-muted-foreground" />,
    },
    {
      label: "Regular Members",
      value: stats.byRole["member"] ?? 0,
      icon: <UserIcon className="h-5 w-5 text-muted-foreground" />,
    },
    {
      label: "Committee",
      value:
        (stats.byRole["admin"] ?? 0) +
        (stats.byRole["treasurer"] ?? 0) +
        (stats.byRole["secretary"] ?? 0),
      icon: <Shield className="h-5 w-5 text-muted-foreground" />,
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardContent className="flex items-center justify-between pt-6">
            <div>
              <p className="text-sm text-muted-foreground">{card.label}</p>
              {loading ? (
                <div className="mt-1 h-7 w-12 animate-pulse rounded bg-muted" />
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
export default function SecretaryMembersPage() {
  const { data: activeOrganization } = authClient.useActiveOrganization()
  const [members, setMembers] = useState<SecretaryMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [selectedMember, setSelectedMember] = useState<SecretaryMember | null>(
    null
  )
  const [detailsOpen, setDetailsOpen] = useState(false)

  const fetchMembers = useCallback(async () => {
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

      const { data, error: fetchError } = await organizationClient.listMembers({
        query: { limit: 500, offset: 0 },
      })

      if (fetchError) {
        throw new Error(fetchError.message || "Failed to load members")
      }

      const mapped: SecretaryMember[] = (data?.members || []).map(
        (member: any) => ({
          id: member.userId ?? member.user?.id ?? "",
          memberId: member.id ?? null,
          name: member.user?.name ?? "",
          email: member.user?.email ?? "",
          image: member.user?.image ?? null,
          role: member.role ?? "member",
          createdAt: member.createdAt ? new Date(member.createdAt) : new Date(),
        })
      )

      setMembers(mapped)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load members")
    } finally {
      setLoading(false)
    }
  }, [activeOrganization?.id])

  useEffect(() => {
    setLoading(true)
    fetchMembers()
  }, [fetchMembers])

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await fetchMembers()
      toast.success("Members refreshed")
    } catch {
      toast.error("Failed to refresh members")
    } finally {
      setRefreshing(false)
    }
  }

  const handleCopy = async (text: string, label: string) => {
    const ok = await copyToClipboard(text)
    ok
      ? toast.success(`${label} copied`)
      : toast.error(`Failed to copy ${label}`)
  }

  const filteredMembers = useMemo(() => {
    const q = search.toLowerCase().trim()
    return members.filter((m) => {
      const matchesSearch =
        !q ||
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q)
      const matchesRole = roleFilter === "all" || m.role === roleFilter
      return matchesSearch && matchesRole
    })
  }, [members, search, roleFilter])

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
          <h1 className="text-2xl font-bold sm:text-3xl">Member Directory</h1>
          <p className="text-muted-foreground">
            Browse and view TrustLink Group organization members
          </p>
        </div>
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
      </div>

      {/* Stats */}
      <MemberStatsCards members={members} loading={loading} />

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="treasurer">Treasurer</SelectItem>
            <SelectItem value="secretary">Secretary</SelectItem>
            <SelectItem value="member">Member</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Members</CardTitle>
          <CardDescription>
            {filteredMembers.length} member
            {filteredMembers.length !== 1 ? "s" : ""}
            {search || roleFilter !== "all" ? " (filtered)" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {loading ? (
            <div className="space-y-3 px-6 py-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="h-9 w-9 animate-pulse rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-40 animate-pulse rounded bg-muted" />
                    <div className="h-3 w-56 animate-pulse rounded bg-muted" />
                  </div>
                  <div className="h-5 w-16 animate-pulse rounded bg-muted" />
                  <div className="h-5 w-20 animate-pulse rounded bg-muted" />
                </div>
              ))}
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="text-muted-foreground">No members found.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="pr-6 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage
                            src={member.image || "/placeholder.svg"}
                            alt={member.name}
                          />
                          <AvatarFallback>
                            {member.name?.[0] ?? "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{member.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {member.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={cn(
                          "capitalize",
                          getRoleBadgeColor(member.role)
                        )}>
                        <span className="mr-1">{getRoleIcon(member.role)}</span>
                        {member.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(member.createdAt), {
                        addSuffix: true,
                      })}
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            Actions
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedMember(member)
                              setDetailsOpen(true)
                            }}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleCopy(member.email, "Email")}>
                            <Copy className="mr-2 h-4 w-4" />
                            Copy Email
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleCopy(member.name, "Name")}>
                            <Copy className="mr-2 h-4 w-4" />
                            Copy Name
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <MemberDetailsDialog
        member={selectedMember}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />
    </div>
  )
}
