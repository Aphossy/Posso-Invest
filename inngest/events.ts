import { eventType, staticSchema } from "inngest"

export const memberJoinedEvent = eventType(
  "ikimina/organization.member.joined",
  {
    schema: staticSchema<{
      organizationId: string
      organizationName: string
      memberId: string
      memberName: string
      memberEmail: string
      role: string
      joinedAt: string
      invitationId?: string
    }>(),
  }
)

export const contributionRecordedEvent = eventType(
  "ikimina/contribution.recorded",
  {
    schema: staticSchema<{
      organizationId: string
      contributionId: string
      memberId: string
      memberName: string
      memberEmail?: string
      amount: string
      currency: string
      period: string
      status: string
      paidAt?: string
      dueDate?: string
      penaltyAmount?: string | null
      recordedByName: string
      recordedByRole?: string | null
    }>(),
  }
)

export const loanRequestedEvent = eventType("ikimina/loan.requested", {
  schema: staticSchema<{
    organizationId: string
    loanId: string
    requesterId: string
    requesterName: string
    requesterEmail?: string
    requestedAmount: string
    currency: string
    purpose: string
    termMonths: string
    createdAt: string
  }>(),
})

export const loanApprovedEvent = eventType("ikimina/loan.approved", {
  schema: staticSchema<{
    organizationId: string
    loanId: string
    requesterId: string
    requesterName: string
    requesterEmail?: string
    approvedAmount: string
    currency: string
    purpose: string
    termMonths: string
    approvedAt: string
    approvedByName: string
    dueDate?: string
  }>(),
})

export const loanNearDueEvent = eventType("ikimina/loan.near-due", {
  schema: staticSchema<{
    organizationId: string
    loanId: string
    requesterId: string
    requesterName: string
    requesterEmail?: string
    approvedAmount: string
    currency: string
    purpose: string
    dueDate: string
    daysUntilDue: number
  }>(),
})

export const penaltyRecordedEvent = eventType("ikimina/penalty.recorded", {
  schema: staticSchema<{
    organizationId: string
    penaltyId: string
    memberId: string
    memberName: string
    memberEmail?: string
    amount: string
    currency: string
    period: string
    reason: string
    status: string
    notes?: string | null
    contributionId?: string | null
    issuedByName: string
    issuedByRole?: string | null
  }>(),
})

export const announcementPublishedEvent = eventType(
  "ikimina/announcement.published",
  {
    schema: staticSchema<{
      organizationId: string
      announcementId: string
      title: string
      summary?: string | null
      content: string
      audience: "members" | "committee" | "public"
      publishedAt?: string
      expiresAt?: string
      pinned: boolean
      createdByName: string
    }>(),
  }
)

export const actionItemCreatedEvent = eventType("ikimina/action-item.created", {
  schema: staticSchema<{
    organizationId: string
    actionItemId: string
    title: string
    description?: string | null
    priority: string
    status: string
    dueDate?: string
    meetingTitle?: string | null
    notes?: string | null
    ownerId?: string | null
    ownerName?: string | null
    ownerEmail?: string | null
    createdByName: string
    createdByRole?: string | null
  }>(),
})

export const actionItemStatusChangedEvent = eventType(
  "ikimina/action-item.status.changed",
  {
    schema: staticSchema<{
      organizationId: string
      actionItemId: string
      title: string
      oldStatus: string
      newStatus: string
      priority: string
      dueDate?: string
      ownerId?: string | null
      ownerName?: string | null
      ownerEmail?: string | null
      notes?: string | null
      changedByName: string
      changedByRole?: string | null
    }>(),
  }
)

export const monthlyMemberSummaryEmailEvent = eventType(
  "ikimina/reports.monthly.member-summary.email",
  {
    schema: staticSchema<{
      periodKey: string
      recipientUserId: string
      recipientEmail: string
      recipientName: string
      pendingContribution: boolean
      activeLoanCount: number
      activePenaltyCount: number
    }>(),
  }
)

export const monthlyDispatchRequestedEvent = eventType(
  "ikimina/reports.monthly.dispatch.requested",
  {
    schema: staticSchema<{ testRunId?: string }>(),
  }
)

// Backward-compatible alias for existing manual trigger endpoint.
export const monthlyDispatchRequestedAliasEvent = eventType(
  "reports/monthly.dispatch.requested",
  {
    schema: staticSchema<{ testRunId?: string }>(),
  }
)

export const functionFailedEvent = eventType("inngest/function.failed", {
  schema: staticSchema<{
    function_id: string
    run_id: string
    error: {
      name?: string
      message?: string
      stack?: string
    }
    event: Record<string, unknown>
  }>(),
})
