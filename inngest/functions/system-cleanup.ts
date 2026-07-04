import { cleanupOperations } from "@/db/operations/cleanup-operations"
import { inngest } from "@/inngest/client"

export const systemDataCleanup = inngest.createFunction(
  {
    id: "system-data-cleanup",
    retries: 2,
    concurrency: 1,
    triggers: [
      // Every 3 days at 02:00 Kigali time (days 1, 4, 7, … of each month)
      { cron: "TZ=Africa/Kigali 0 2 */3 * *" },
    ],
  },
  async ({ step, logger }) => {
    const result = await step.run("cleanup-expired-data", () =>
      cleanupOperations.cleanupExpiredData()
    )

    logger.info("System data cleanup completed", {
      sessions: result.sessions,
      verificationTokens: result.verificationTokens,
      expiredInvitations: result.expiredInvitations,
    })

    return result
  }
)
