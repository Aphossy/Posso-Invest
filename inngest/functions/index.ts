import {
  contributionDeadlinePassedNotifier,
  contributionWindowLastDayNotifier,
  contributionWindowOpenedNotifier,
  contributionWindowReminderNotifier,
} from "@/inngest/functions/ventures-contribution-window"
import {
  actionItemCreatedEmailNotifier,
  actionItemStatusChangedEmailNotifier,
  announcementPublishedEmailNotifier,
} from "@/inngest/functions/ventures-governance-email-notifier"
import { loanLifecycleSweep } from "@/inngest/functions/ventures-loan-lifecycle"
import {
  monthlyComplianceDispatcher,
  monthlyMemberSummaryEmailSender,
} from "@/inngest/functions/ventures-monthly-compliance"
import { organizationMemberJoinedEmailNotifier } from "@/inngest/functions/ventures-organization-member-email-notifier"
import {
  contributionRecordedEmailNotifier,
  loanApprovedEmailNotifier,
  loanNearDueEmailNotifier,
  loanRequestedEmailNotifier,
  penaltyRecordedEmailNotifier,
} from "@/inngest/functions/ventures-transaction-email-notifier"
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
