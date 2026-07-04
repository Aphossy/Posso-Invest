"use client"

import { useEffect, useMemo, useState } from "react"
import type { UserRole } from "@/db/schemas"
import {
  getRoleBadgeColor,
  getRoleDisplayName,
  ROLE_PERMISSIONS,
} from "@/utils/role-utils"
import { RefreshCw, ShieldCheck, Users } from "lucide-react"

import { authClient } from "@/lib/auth-client"
import { organizationClient } from "@/lib/organization-client"
import {
  organizationAccess,
  organizationRoleKeys,
  organizationRoles,
} from "@/lib/organization-roles"
import { useActiveRole } from "@/hooks/use-active-role"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Loader } from "@/components/common/loader"

const roleDescriptions: Record<UserRole, string> = {
  admin: "Full access to organization settings and member management.",
  treasurer: "Manages contributions, loans, and financial reporting.",
  secretary: "Manages meeting records, attendance, and member updates.",
  member: "Standard access for personal contributions and profile updates.",
  president: "Oversees organization operations and leads meetings.",
}

const permissionLabels: Record<string, string> = {
  read_own_profile: "Read own profile",
  update_own_profile: "Update own profile",
  view_contributions: "View contributions",
  manage_minutes: "Manage meeting minutes",
  manage_members: "Manage members",
  manage_contributions: "Manage contributions",
  manage_loans: "Manage loans",
  view_reports: "View reports",
  manage_users: "Manage users",
  manage_finance: "Manage finance",
  view_analytics: "View analytics",
}

const resourceLabels: Record<string, string> = {
  organization: "Organization settings",
  member: "Members",
  invitation: "Invitations",
  team: "Teams",
  financial: "Financial records",
  meeting: "Meetings",
  announcement: "Announcements",
  report: "Reports",
  loan: "Loans",
  contribution: "Contributions",
}

type OrgStatements = typeof organizationAccess.statements
type OrgStatementKey = keyof OrgStatements

const toTitleCase = (value: string) =>
  value
    .split(" ")
    .map((word) =>
      word.length ? `${word[0].toUpperCase()}${word.slice(1)}` : word
    )
    .join(" ")

export default function RolesPage() {
  const { data: activeOrganization } = authClient.useActiveOrganization()
  const { role: activeRole, isRoleReady, isRolePending } = useActiveRole()
  const [roleCounts, setRoleCounts] = useState<Record<UserRole, number>>({
    admin: 0,
    treasurer: 0,
    secretary: 0,
    member: 0,
    president: 0,
  })
  const [totalMembers, setTotalMembers] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const resourceKeys = useMemo(() => {
    return Object.keys(organizationAccess.statements) as OrgStatementKey[]
  }, [])

  const refresh = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await organizationClient.listMembers({
        query: { limit: 500, offset: 0 },
      })

      if (response.error) {
        throw new Error(response.error.message || "Failed to load members")
      }

      const members = response.data?.members || []
      const updatedCounts: Record<UserRole, number> = {
        admin: 0,
        treasurer: 0,
        secretary: 0,
        member: 0,
        president: 0,
      }

      members.forEach((member: any) => {
        const role = (member.role || "member") as UserRole
        if (updatedCounts[role] === undefined) {
          updatedCounts.member += 1
          return
        }
        updatedCounts[role] += 1
      })

      setRoleCounts(updatedCounts)
      setTotalMembers(members.length)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load roles")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOrganization?.id])

  return (
    <div className="container mx-auto space-y-8 px-2 py-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">
            Roles and Permissions
          </h1>
          <p className="text-muted-foreground">
            Manage organization roles with Better Auth access control.
          </p>
        </div>
        <Button variant="outline" onClick={refresh} disabled={loading}>
          <RefreshCw
            className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Active organization</CardDescription>
            <CardTitle className="text-base font-semibold">
              {activeOrganization?.name ?? "Posso Ventures"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {activeOrganization?.slug
              ? `Slug: ${activeOrganization.slug}`
              : "Active organization resolved from your session."}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Your active role</CardDescription>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <ShieldCheck className="h-4 w-4 text-primary" />
              {activeRole
                ? getRoleDisplayName(activeRole as UserRole)
                : "Not set"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {isRolePending
              ? "Resolving organization role."
              : isRoleReady
                ? "Based on your active organization membership."
                : "Role information is not available yet."}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Total members</CardDescription>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Users className="h-4 w-4 text-primary" />
              <span className="tabular-nums">{totalMembers}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Members listed in the active organization.
          </CardContent>
        </Card>
        <Card className="sm:col-span-2 lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Role policy
            </CardTitle>
            <CardDescription>Posso Ventures access rules</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <ul className="list-disc space-y-1 pl-5">
              <li>Invitations are required for new members.</li>
              <li>Default role for new members is member.</li>
              <li>Role changes are managed through organization membership.</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
          <Loader className="mr-2 h-4 w-4" />
          Loading roles
        </div>
      ) : error ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-8 text-sm text-muted-foreground">
            <div>{error}</div>
            <Button variant="outline" size="sm" onClick={refresh}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {organizationRoleKeys.map((roleKey) => {
            const role = roleKey as UserRole
            const appPermissions = ROLE_PERMISSIONS[role] || []
            const orgStatements = organizationRoles[roleKey]
              .statements as unknown as Partial<
              Record<OrgStatementKey, readonly string[]>
            >
            const orgActionCount = resourceKeys.reduce((total, resource) => {
              const actions = orgStatements[resource] || []
              return total + actions.length
            }, 0)
            return (
              <Card
                key={roleKey}
                className={
                  activeRole === roleKey
                    ? "border-primary/50 shadow-sm"
                    : undefined
                }>
                <CardHeader className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-base font-semibold">
                        {getRoleDisplayName(role)}
                      </CardTitle>
                      <CardDescription>
                        {roleDescriptions[role]}
                      </CardDescription>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {activeRole === roleKey ? (
                        <Badge variant="secondary">Active</Badge>
                      ) : null}
                      <Badge className={getRoleBadgeColor(role)}>
                        {roleKey}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className="tabular-nums">
                      Members: {roleCounts[role]}
                    </Badge>
                    <Badge variant="outline" className="tabular-nums">
                      Org actions: {orgActionCount}
                    </Badge>
                    <Badge variant="outline" className="tabular-nums">
                      App permissions: {appPermissions.length}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <h4 className="text-sm font-semibold">
                      Organization access
                    </h4>
                    <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                      {resourceKeys.map((resource) => {
                        const actions = orgStatements[resource] || []
                        const actionLabel =
                          actions.length > 0
                            ? actions.map(toTitleCase).join(", ")
                            : "No access"
                        return (
                          <li key={resource}>
                            <span className="font-medium text-foreground">
                              {resourceLabels[resource] ?? resource}:
                            </span>{" "}
                            {actionLabel}
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold">
                      Platform permissions
                    </h4>
                    <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                      {appPermissions.length > 0 ? (
                        appPermissions.map((permission) => (
                          <li key={permission}>
                            {permissionLabels[permission] ??
                              toTitleCase(permission.replace(/_/g, " "))}
                          </li>
                        ))
                      ) : (
                        <li>No permissions assigned.</li>
                      )}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
