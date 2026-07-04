import { authClient } from "@/lib/auth-client"

type OrganizationClient = {
  create: (input: Record<string, unknown>) => Promise<any>
  list: () => Promise<any>
  update: (input: {
    organizationId?: string | null
    data: Record<string, unknown>
  }) => Promise<any>
  delete: (input: { organizationId: string }) => Promise<any>
  setActive: (input: {
    organizationId?: string | null
    organizationSlug?: string | null
  }) => Promise<any>
  getActiveMemberRole: (input?: Record<string, unknown>) => Promise<any>
  acceptInvitation: (input: { invitationId: string }) => Promise<any>
  rejectInvitation: (input: { invitationId: string }) => Promise<any>
  inviteMember: (input: Record<string, unknown>) => Promise<any>
  cancelInvitation: (input: { invitationId: string }) => Promise<any>
  listInvitations: (input?: Record<string, unknown>) => Promise<any>
  listMembers: (input?: Record<string, unknown>) => Promise<any>
  addMember: (input: Record<string, unknown>) => Promise<any>
  removeMember: (input: Record<string, unknown>) => Promise<any>
  updateMemberRole: (input: Record<string, unknown>) => Promise<any>
}

export const organizationClient = (authClient as any)
  .organization as OrganizationClient
