"use client"

import { useCallback, useEffect, useState } from "react"
import { normalizeRoleValue } from "@/utils/role-utils"
import {
  Crown,
  RefreshCcw,
  Search,
  Sparkles,
  UserCheck,
  Users,
} from "lucide-react"

import { organizationClient } from "@/lib/organization-client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { MemberAvatar } from "@/components/common/member-avatar"

type MemberEntry = {
  id: string
  userId: string
  name: string
  email: string
  image: string | null
  role: string
  joinedAt: Date | null
}

function getRoleBadge(role: string) {
  switch (role) {
    case "president":
      return (
        <Badge className="bg-violet-100 text-violet-800 border border-violet-300 capitalize">
          President
        </Badge>
      )
    case "admin":
      return (
        <Badge className="bg-red-100 text-red-800 border border-red-300 capitalize">
          Admin
        </Badge>
      )
    case "treasurer":
      return (
        <Badge className="bg-amber-100 text-amber-800 border border-amber-300 capitalize">
          Treasurer
        </Badge>
      )
    case "secretary":
      return (
        <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-300 capitalize">
          Secretary
        </Badge>
      )
    default:
      return (
        <Badge className="bg-sky-100 text-sky-800 border border-sky-300 capitalize">
          Member
        </Badge>
      )
  }
}
function formatDate(date: Date | null) {
  if (!date) return "-"
  return date.toLocaleDateString("en-RW", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export function PresidentMembersView() {
  const [members, setMembers] = useState<MemberEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("all")

  const fetchMembers = useCallback(async () => {
    try {
      const { data, error: fetchError } = await organizationClient.listMembers({
        query: { limit: 500, offset: 0 },
      })

      if (fetchError) {
        throw new Error(fetchError.message || "Failed to fetch members")
      }

      const raw = (data?.members ?? []).filter((m: any) => {
        const role = normalizeRoleValue(m?.role)
        return role !== null && role !== "admin"
      })
      const mapped: MemberEntry[] = raw.map((m: any) => ({
        id: m.id ?? m.userId ?? "",
        userId: m.userId ?? "",
        name: m.user?.name ?? m.name ?? "",
        email: m.user?.email ?? m.email ?? "",
        image: m.user?.image ?? null,
        role: normalizeRoleValue(m?.role) ?? "member",
        joinedAt: m.createdAt ? new Date(m.createdAt) : null,
      }))

      setMembers(mapped)
      setError(null)
    } catch (err: any) {
      setError(err.message || "Failed to load members")
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    fetchMembers().finally(() => setLoading(false))
  }, [fetchMembers])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchMembers()
    setRefreshing(false)
  }

  const filtered = members.filter((m) => {
    const q = search.trim().toLowerCase()
    const matchesRole = roleFilter === "all" || m.role === roleFilter
    const matchesSearch =
      q.length === 0 ||
      m.name.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q)
    return matchesRole && matchesSearch
  })

  const committeeRoles = ["president", "treasurer", "secretary"]
  const committeeCount = members.filter((m) =>
    committeeRoles.includes(m.role)
  ).length
  const regularCount = members.filter((m) => m.role === "member").length

  const roleGroups = [
    { label: "All", value: "all" },
    { label: "President", value: "president" },
    { label: "Treasurer", value: "treasurer" },
    { label: "Secretary", value: "secretary" },
    { label: "Members", value: "member" },
  ]

  const filteredByGroup = filtered

  return (
    <div className="flex-1 space-y-6 pb-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Member Directory
          </h1>
          <p className="text-sm text-muted-foreground">
            Roster, roles, and membership overview for TrustLink Group.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={loading || refreshing}>
          <RefreshCcw className="h-4 w-4" />
          {refreshing ? "Refreshing…" : "Refresh"}
        </Button>
      </div>

      {/* Insight banner */}
      <Card className="overflow-hidden border-0 bg-linear-to-r from-violet-500/15 via-indigo-500/10 to-transparent shadow-none">
        <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-violet-500" />
              Executive member overview
            </div>
            <p className="max-w-xl text-sm text-foreground/90">
              View all registered members, their roles, and when they joined the
              organization.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="rounded-xl border bg-background/90 px-3 py-2">
              <p className="text-xs text-muted-foreground">Total members</p>
              {loading ? (
                <Skeleton className="mt-1 h-7 w-10" />
              ) : (
                <p className="text-xl font-semibold">{members.length}</p>
              )}
            </div>
            <div className="rounded-xl border bg-background/90 px-3 py-2">
              <p className="text-xs text-muted-foreground">Committee</p>
              {loading ? (
                <Skeleton className="mt-1 h-7 w-10" />
              ) : (
                <p className="text-xl font-semibold">{committeeCount}</p>
              )}
            </div>
            <div className="rounded-xl border bg-background/90 px-3 py-2">
              <p className="text-xs text-muted-foreground">Regular</p>
              {loading ? (
                <Skeleton className="mt-1 h-7 w-10" />
              ) : (
                <p className="text-xl font-semibold">{regularCount}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stat cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-semibold">{members.length}</div>
                <p className="text-xs text-muted-foreground">
                  All registered members
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Committee Roles
            </CardTitle>
            <Crown className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-semibold">{committeeCount}</div>
                <p className="text-xs text-muted-foreground">
                  President, treasurer, secretary
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Regular Members
            </CardTitle>
            <UserCheck className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-semibold">{regularCount}</div>
                <p className="text-xs text-muted-foreground">
                  Standard member role
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Members list */}
      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-semibold">
              All Members
            </CardTitle>
            {loading ? (
              <Skeleton className="mt-2 h-4 w-40" />
            ) : (
              <p className="text-sm text-muted-foreground">
                {filteredByGroup.length} of {members.length} members shown
              </p>
            )}
          </div>
          <Badge variant="outline" className="gap-1">
            <Users className="h-3.5 w-3.5" />
            {members.length} Total
          </Badge>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Search + filters */}
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative w-full md:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or email…"
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {roleGroups.map(({ label, value }) => (
                <Button
                  key={value}
                  size="sm"
                  variant={roleFilter === value ? "default" : "outline"}
                  onClick={() => setRoleFilter(value)}>
                  {label}
                </Button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && !loading && (
            <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Loading skeletons */}
          {loading && (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-md border px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-9 w-9 rounded-full" />
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                  </div>
                  <Skeleton className="h-5 w-20" />
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!loading && filteredByGroup.length === 0 && (
            <div className="rounded-xl border border-dashed p-8 text-center">
              <p className="font-medium">No members found</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Try adjusting your search or filter.
              </p>
            </div>
          )}

          {/* Member rows */}
          {!loading && filteredByGroup.length > 0 && (
            <div className="space-y-2">
              {filteredByGroup.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between rounded-md border px-4 py-3 gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <MemberAvatar
                      name={member.name}
                      email={member.email}
                      image={member.image}
                      size="md"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {member.name || "-"}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {member.email} · Joined {formatDate(member.joinedAt)}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0">{getRoleBadge(member.role)}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Constitution note */}
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">
            Constitution - Membership Rules
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 text-sm text-muted-foreground">
          <p>
            New members require{" "}
            <strong className="text-foreground">2/3 approval</strong> at a
            general meeting after submitting a written application to the
            Secretary.
          </p>
          <p>
            Withdrawal requires{" "}
            <strong className="text-foreground">2 months written notice</strong>{" "}
            to the Secretary. Personal savings are refunded in full unless loans
            or penalties are outstanding.
          </p>
          <p>
            A member with{" "}
            <strong className="text-foreground">
              3 missed loan repayment months
            </strong>{" "}
            shall be dismissed per the constitution.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
