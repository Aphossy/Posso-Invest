import logger from "@/utils/logger"
import { Middleware } from "inngest"

export class InngestLoggingMiddleware extends Middleware.BaseMiddleware {
  readonly id = "trustlink:logger"

  onRunStart({ ctx, fn }: Middleware.OnRunStartArgs) {
    logger.info("Inngest function started", {
      functionId: fn.id,
      eventName: ctx.event.name,
      runId: ctx.runId,
    })
  }

  onRunError({ ctx, fn, error }: Middleware.OnRunErrorArgs) {
    logger.error("Inngest function failed", {
      functionId: fn.id,
      runId: ctx.runId,
      error,
    })
  }
}
