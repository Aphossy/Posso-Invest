// hooks/use-navigation-badges.ts
import { useMemo } from "react"

import { useActionItems } from "./api/use-action-items"
import { useAdminDashboard } from "./api/use-admin-dashboard"
import { useContributions } from "./api/use-contributions"
import { useLoans, useTreasurerLoanRequests } from "./api/use-loans"
import { useMessages } from "./api/use-messages"
import { usePenalties } from "./api/use-penalties"

export type UserRole =
  | "member"
  | "treasurer"
  | "secretary"
  | "president"
  | "admin"

export interface NavigationBadges {
  [url: string]: string | undefined
}

/**
 * Hook to get admin navigation badges (uses aggregated dashboard data)
 */
function useAdminBadges(): NavigationBadges {
  const { data: adminData } = useAdminDashboard()

  return useMemo(() => {
    const badges: NavigationBadges = {}

    if (!adminData?.data) return badges

    const stats = adminData.data.stats

    const outstandingContributions =
      stats.contributions.pendingCount + stats.contributions.lateCount

    if (outstandingContributions > 0) {
      badges["/admin/financial/contributions"] =
        outstandingContributions.toString()
    }

    if (stats.loans.overdue > 0) {
      badges["/admin/financial/loans"] = stats.loans.overdue.toString()
    }

    if (stats.actionItems.open > 0) {
      badges["/admin/actions"] = stats.actionItems.open.toString()
    }

    if (stats.messages.unread > 0) {
      badges["/admin/messages"] = stats.messages.unread.toString()
    }

    if (stats.members.invitationsPending > 0) {
      badges["/admin/members"] = stats.members.invitationsPending.toString()
    }

    return badges
  }, [adminData])
}

/**
 * Hook to get member navigation badges
 * Shows: pending loan requests, active penalties, open action items
 */
function useMemberBadges(): NavigationBadges {
  const { data: loansData } = useLoans({ status: "requested", limit: 100 })
  const { data: penaltiesData } = usePenalties({ status: "active", limit: 100 })
  const { data: actionItemsData } = useActionItems({
    status: "open",
    limit: 100,
  })

  return useMemo(() => {
    const badges: NavigationBadges = {}

    const requestedLoans = loansData?.total ?? loansData?.data?.length ?? 0
    if (requestedLoans > 0) {
      badges["/member/loans"] = requestedLoans.toString()
    }

    const activePenalties =
      penaltiesData?.total ?? penaltiesData?.data?.length ?? 0
    if (activePenalties > 0) {
      badges["/member/penalties"] = activePenalties.toString()
    }

    const openActions =
      actionItemsData?.data?.filter((a) => a.status === "open").length ?? 0
    if (openActions > 0) {
      badges["/member/actions"] = openActions.toString()
    }

    return badges
  }, [loansData, penaltiesData, actionItemsData])
}

/**
 * Hook to get treasurer navigation badges
 * Shows: pending loan requests, pending disbursements, unverified contributions, active penalties
 */
function useTreasurerBadges(): NavigationBadges {
  const { requestedCount, approvedCount } = useTreasurerLoanRequests()
  const { data: contributionsData } = useContributions({
    status: "pending",
    limit: 200,
  })
  const { data: penaltiesData } = usePenalties({ status: "active", limit: 200 })

  return useMemo(() => {
    const badges: NavigationBadges = {}

    if (requestedCount > 0) {
      badges["/treasurer/loans/requests"] = requestedCount.toString()
    }

    if (approvedCount > 0) {
      badges["/treasurer/loans/disbursements"] = approvedCount.toString()
    }

    const pendingContributions =
      contributionsData?.total ?? contributionsData?.data?.length ?? 0
    if (pendingContributions > 0) {
      badges["/treasurer/contributions"] = pendingContributions.toString()
    }

    const activePenalties =
      penaltiesData?.total ?? penaltiesData?.data?.length ?? 0
    if (activePenalties > 0) {
      badges["/treasurer/contributions/penalties"] = activePenalties.toString()
    }

    return badges
  }, [requestedCount, approvedCount, contributionsData, penaltiesData])
}

/**
 * Hook to get secretary navigation badges
 * Shows: open action items
 */
function useSecretaryBadges(): NavigationBadges {
  const { data: actionItemsData } = useActionItems({
    status: "open",
    limit: 100,
  })

  return useMemo(() => {
    const badges: NavigationBadges = {}

    const openActions =
      actionItemsData?.data?.filter((a) => a.status === "open").length ?? 0
    if (openActions > 0) {
      badges["/secretary/actions"] = openActions.toString()
    }

    return badges
  }, [actionItemsData])
}

/**
 * Hook to get president navigation badges
 * Shows: pending loan approvals, open action items, unread messages
 */
function usePresidentBadges(): NavigationBadges {
  const { data: loansData } = useLoans({ status: "requested", limit: 100 })
  const { data: actionItemsData } = useActionItems({
    status: "open",
    limit: 100,
  })
  const { data: messagesData } = useMessages({ status: "new", limit: 100 })

  return useMemo(() => {
    const badges: NavigationBadges = {}

    const pendingApprovals = loansData?.total ?? loansData?.data?.length ?? 0
    if (pendingApprovals > 0) {
      badges["/president/financial/approvals"] = pendingApprovals.toString()
    }

    const openActions =
      actionItemsData?.data?.filter((a) => a.status === "open").length ?? 0
    if (openActions > 0) {
      badges["/president/actions"] = openActions.toString()
    }

    const unreadMessages =
      messagesData?.metadata?.pagination?.total ??
      messagesData?.data?.messages?.length ??
      0
    if (unreadMessages > 0) {
      badges["/president/messages"] = unreadMessages.toString()
    }

    return badges
  }, [loansData, actionItemsData, messagesData])
}

/**
 * Hook to get real-time badge counts for navigation items based on user role.
 * @param role - The user's role (member, treasurer, secretary, president, or admin)
 * @returns An object mapping navigation URLs to badge counts
 */
export function useNavigationBadges(role: UserRole): NavigationBadges {
  const adminBadges = useAdminBadges()
  const memberBadges = useMemberBadges()
  const treasurerBadges = useTreasurerBadges()
  const secretaryBadges = useSecretaryBadges()
  const presidentBadges = usePresidentBadges()

  return useMemo(() => {
    switch (role) {
      case "admin":
        return adminBadges
      case "member":
        return memberBadges
      case "treasurer":
        return treasurerBadges
      case "secretary":
        return secretaryBadges
      case "president":
        return presidentBadges
      default:
        return {}
    }
  }, [
    role,
    adminBadges,
    memberBadges,
    treasurerBadges,
    secretaryBadges,
    presidentBadges,
  ])
}
