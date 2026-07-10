import type { UserRole } from "@/db/schemas"

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  member: 1,
  secretary: 2,
  treasurer: 2,
  president: 3,
  admin: 4,
}

export const ROLE_PERMISSIONS = {
  member: ["read_own_profile", "update_own_profile", "view_contributions"],
  secretary: [
    "read_own_profile",
    "update_own_profile",
    "manage_minutes",
    "manage_members",
  ],
  treasurer: [
    "read_own_profile",
    "update_own_profile",
    "manage_contributions",
    "manage_loans",
    "view_reports",
  ],
  president: [
    "read_own_profile",
    "update_own_profile",
    "view_contributions",
    "view_loans",
    "view_reports",
    "approve_transactions",
    "manage_members",
    "chair_meetings",
    "view_analytics",
  ],
  admin: [
    "read_own_profile",
    "update_own_profile",
    "manage_users",
    "manage_finance",
    "view_analytics",
  ],
}

export function hasPermission(userRole: UserRole, permission: string): boolean {
  return ROLE_PERMISSIONS[userRole]?.includes(permission) || false
}

export function isMemberOrLeadershipRole(role?: string | null): boolean {
  if (!role) return false

  const normalizedRoles = role
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean)

  if (normalizedRoles.length === 0) return false

  return normalizedRoles.some((candidate) =>
    ["member", "secretary", "treasurer", "president"].includes(candidate)
  )
}

export function hasRoleAccess(
  userRole: UserRole,
  requiredRole: UserRole
): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole]
}

export function canManageUser(
  managerRole: UserRole,
  targetRole: UserRole
): boolean {
  if (managerRole === "admin") {
    return ["admin", "president", "treasurer", "secretary", "member"].includes(
      targetRole
    )
  }

  if (managerRole === "president") {
    return ["treasurer", "secretary", "member"].includes(targetRole)
  }

  return false
}

export function getRoleDisplayName(role: UserRole): string {
  const roleNames = {
    member: "Member",
    treasurer: "Treasurer",
    secretary: "Secretary",
    president: "President",
    admin: "Admin",
  }
  return roleNames[role] || role
}

export function getRoleBadgeColor(role: UserRole): string {
  const colors = {
    member: "bg-blue-100 text-blue-800 border border-blue-300",
    secretary: "bg-emerald-100 text-emerald-800 border border-emerald-300",
    treasurer: "bg-amber-100 text-amber-800 border border-amber-300",
    president: "bg-purple-100 text-purple-800 border border-purple-300",
    admin: "bg-red-100 text-red-800 border border-red-300",
  }
  return colors[role] || "bg-gray-100 text-gray-800"
}

// Helper function to get default redirect based on role
export function getDefaultRedirect(role: string): string {
  switch (role) {
    case "admin":
      return "/admin/dashboard"
    case "president":
      return "/president/dashboard"
    case "treasurer":
      return "/treasurer/dashboard"
    case "secretary":
      return "/secretary/dashboard"
    case "member":
      return "/member/dashboard"
    default:
      return "/"
  }
}

export function getRoleDashboard(role: string): string {
  switch (role) {
    case "admin":
      return "/admin/dashboard"
    case "president":
      return "/president/dashboard"
    case "treasurer":
      return "/treasurer/dashboard"
    case "secretary":
      return "/secretary/dashboard"
    case "member":
      return "/member/dashboard"
    default:
      return "/"
  }
}

export const roleRoutes: Record<string, string[]> = {
  admin: ["/admin", "/president", "/treasurer", "/secretary", "/user"],
  president: ["/president", "/user"],
  treasurer: ["/treasurer", "/user"],
  secretary: ["/secretary", "/user"],
  member: ["/member", "/user"],
}

const rolePriority: Record<string, number> = {
  member: 1,
  secretary: 2,
  treasurer: 2,
  president: 3,
  admin: 4,
}

function pickHighestPriorityRole(roles: string[]): string | null {
  let highestRole: string | null = null
  let highestPriority = -1

  for (const rawRole of roles) {
    const normalized = rawRole.trim()
    if (!normalized) continue

    const canonicalRole = normalized === "user" ? "member" : normalized
    const priority = rolePriority[canonicalRole]
    if (!priority) continue

    if (priority > highestPriority) {
      highestPriority = priority
      highestRole = canonicalRole
    }
  }

  return highestRole
}

export function normalizeRoleValue(role?: string | null): string | null {
  if (!role) return null
  const roleCandidates = role.split(",")
  return pickHighestPriorityRole(roleCandidates)
}

export function extractRoleValue(input: unknown): string | null {
  if (!input) return null
  if (typeof input === "string") {
    return normalizeRoleValue(input)
  }
  if (typeof input === "object") {
    const candidate = input as {
      role?: unknown
      data?: { role?: unknown }
      roles?: unknown
      member?: { role?: unknown }
      membership?: { role?: unknown }
    }
    const rawRole = candidate.role ?? candidate.data?.role

    if (typeof rawRole === "string") {
      return normalizeRoleValue(rawRole)
    }

    if (Array.isArray(rawRole)) {
      return pickHighestPriorityRole(
        rawRole.filter((entry): entry is string => typeof entry === "string")
      )
    }

    const fallbackRole =
      candidate.member?.role ?? candidate.membership?.role ?? candidate.roles

    if (typeof fallbackRole === "string") {
      return normalizeRoleValue(fallbackRole)
    }

    if (Array.isArray(fallbackRole)) {
      return pickHighestPriorityRole(
        fallbackRole.filter(
          (entry): entry is string => typeof entry === "string"
        )
      )
    }

    return null
  }
  return null
}
