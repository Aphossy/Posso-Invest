import { inngest } from "@/inngest/client"
import { memberJoinedEvent } from "@/inngest/events"
import { sendWelcomeEmail } from "@/utils/auth-notification-utils"

export const organizationMemberJoinedEmailNotifier = inngest.createFunction(
  {
    id: "ikimina-organization-member-joined-email-notifier",
    retries: 2,
    concurrency: 4,
    triggers: [memberJoinedEvent],
  },
  async ({ event, step, logger }) => {
    const { organizationName, memberEmail, memberName, role, memberId } =
      event.data

    await step.run("send-member-joined-welcome-email", async () => {
      await sendWelcomeEmail(memberEmail, memberName || "Member")
    })

    logger.info("Organization member welcome email sent", {
      organizationName,
      memberId,
      role,
      memberEmail,
    })
  }
)
