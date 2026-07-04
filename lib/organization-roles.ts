import { createAccessControl } from "better-auth/plugins"

export const organizationAccess = createAccessControl({
  organization: ["update", "delete"],
  member: ["create", "read", "update", "delete"],
  invitation: ["create", "cancel"],
  team: ["create", "update", "delete"],
  financial: ["create", "read", "update", "delete"],
  meeting: ["create", "read", "update", "delete"],
  announcement: ["create", "read", "update", "delete"],
  report: ["create", "read", "update", "delete"],
  loan: ["create", "read", "update", "approve", "delete"],
  contribution: ["create", "read", "update", "delete"],
})

export const organizationRoles = {
  admin: organizationAccess.newRole({
    organization: ["update", "delete"],
    member: ["create", "read", "update", "delete"],
    invitation: ["create", "cancel"],
    team: ["create", "update", "delete"],
    financial: ["create", "read", "update", "delete"],
    meeting: ["create", "read", "update", "delete"],
    announcement: ["create", "read", "update", "delete"],
    report: ["create", "read", "update", "delete"],
    loan: ["create", "read", "update", "approve", "delete"],
    contribution: ["create", "read", "update", "delete"],
  }),
  president: organizationAccess.newRole({
    organization: ["update", "delete"],
    member: ["create", "read", "update", "delete"],
    invitation: ["create", "cancel"],
    team: ["create", "update", "delete"],
    financial: ["create", "read", "update", "delete"],
    meeting: ["create", "read", "update", "delete"],
    announcement: ["create", "read", "update", "delete"],
    report: ["create", "read", "update", "delete"],
    loan: ["create", "read", "update", "approve", "delete"],
    contribution: ["create", "read", "update", "delete"],
  }),
  treasurer: organizationAccess.newRole({
    member: ["read"],
    financial: ["create", "read", "update", "delete"],
    meeting: ["read"],
    announcement: ["read"],
    report: ["create", "read", "update", "delete"],
    loan: ["create", "read", "update", "approve", "delete"],
    contribution: ["create", "read", "update", "delete"],
  }),
  secretary: organizationAccess.newRole({
    member: ["create", "read", "update", "delete"],
    invitation: ["create", "cancel"],
    financial: ["read"],
    meeting: ["create", "read", "update", "delete"],
    announcement: ["create", "read", "update", "delete"],
    report: ["create", "read", "update"],
    loan: ["read"],
    contribution: ["read"],
  }),
  member: organizationAccess.newRole({
    member: ["read"],
    financial: ["read"],
    meeting: ["read"],
    announcement: ["read"],
    report: ["read"],
    loan: ["read"],
    contribution: ["read"],
  }),
}

export type OrganizationRoleKey = keyof typeof organizationRoles

export const organizationRoleKeys = Object.keys(
  organizationRoles
) as OrganizationRoleKey[]
