import { inngest } from "@/inngest/client"
import { functionFailedEvent } from "@/inngest/events"

export const systemFunctionFailureAlert = inngest.createFunction(
  {
    id: "system-function-failure-alert",
    retries: 1,
    concurrency: 1,
    triggers: [functionFailedEvent],
  },
  async ({ event, step, logger }) => {
    return step.run("log-function-failure", () => {
      logger.error("Inngest function failed after retries", {
        functionId: event.data.function_id,
        runId: event.data.run_id,
        error: event.data.error,
      })
    })
  }
)
