import { notificationOperations } from "@/db/operations/notification-operations"
import { userOperations } from "@/db/operations/user-operations"
import { InngestLoggingMiddleware } from "@/inngest/middleware"
import logger from "@/utils/logger"
import { dependencyInjectionMiddleware, Inngest } from "inngest"

export const inngest = new Inngest({
  id: "trustlink-group-ikimina",
  logger,
  middleware: [
    InngestLoggingMiddleware,
    dependencyInjectionMiddleware({
      notificationOperations,
      userOperations,
    }),
  ],
})
