import {
  contributionDeadlinePassedNotifier,
  contributionWindowLastDayNotifier,
  contributionWindowOpenedNotifier,
  contributionWindowReminderNotifier,
} from "@/inngest/functions/ikimina-contribution-window"
import {
  actionItemCreatedEmailNotifier,
  actionItemStatusChangedEmailNotifier,
  announcementPublishedEmailNotifier,
} from "@/inngest/functions/ikimina-governance-email-notifier"
import { loanLifecycleSweep } from "@/inngest/functions/ikimina-loan-lifecycle"
import {
  monthlyComplianceDispatcher,
  monthlyMemberSummaryEmailSender,
} from "@/inngest/functions/ikimina-monthly-compliance"
import { organizationMemberJoinedEmailNotifier } from "@/inngest/functions/ikimina-organization-member-email-notifier"
import {
  contributionRecordedEmailNotifier,
  loanApprovedEmailNotifier,
  loanNearDueEmailNotifier,
  loanRequestedEmailNotifier,
  penaltyRecordedEmailNotifier,
} from "@/inngest/functions/ikimina-transaction-email-notifier"
import { systemDataCleanup } from "@/inngest/functions/system-cleanup"
import { systemFunctionFailureAlert } from "@/inngest/functions/system-function-failure-alert"

export const inngestFunctions = [
  organizationMemberJoinedEmailNotifier,
  contributionRecordedEmailNotifier,
  loanRequestedEmailNotifier,
  loanApprovedEmailNotifier,
  loanNearDueEmailNotifier,
  loanLifecycleSweep,
  penaltyRecordedEmailNotifier,
  announcementPublishedEmailNotifier,
  actionItemCreatedEmailNotifier,
  actionItemStatusChangedEmailNotifier,
  monthlyComplianceDispatcher,
  monthlyMemberSummaryEmailSender,
  contributionWindowOpenedNotifier,
  contributionWindowReminderNotifier,
  contributionWindowLastDayNotifier,
  contributionDeadlinePassedNotifier,
  systemFunctionFailureAlert,
  systemDataCleanup,
]
