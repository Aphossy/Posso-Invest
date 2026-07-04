// C:\Users\user\OneDrive\Desktop\trustlink-group\utils\database-health.ts
import { dbHealthCheck } from "@/db/connection"
import { cleanupOperations } from "@/db/operations"
import logger from "@/utils/logger"

export async function performDatabaseHealthCheck(): Promise<{
  status: "healthy" | "unhealthy"
  latency?: number
  error?: string
  timestamp: Date
}> {
  try {
    const healthResult = await dbHealthCheck()

    logger.info(`Database health check: ${healthResult.status}`, {
      latency: healthResult.latency,
      timestamp: new Date().toISOString(),
    })

    return {
      ...healthResult,
      timestamp: new Date(),
    }
  } catch (error) {
    logger.error("Database health check failed:", error)
    return {
      status: "unhealthy",
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date(),
    }
  }
}

export async function performDatabaseCleanup(): Promise<{
  success: boolean
  results?: {
    sessions: number
    verificationTokens: number
    expiredInvitations: number
  }
  error?: string
}> {
  try {
    logger.info("Starting database cleanup...")

    const results = await cleanupOperations.cleanupExpiredData()

    logger.info("Database cleanup completed:", results)

    return {
      success: true,
      results,
    }
  } catch (error) {
    logger.error("Database cleanup failed:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

// Scheduled cleanup function (can be called by cron job)
export async function scheduledDatabaseMaintenance(): Promise<void> {
  logger.info("Starting scheduled database maintenance...")

  try {
    // Perform health check
    const healthCheck = await performDatabaseHealthCheck()

    if (healthCheck.status === "unhealthy") {
      logger.error("Database is unhealthy, skipping cleanup", {
        error: healthCheck.error,
      })
      return
    }

    // Perform cleanup
    const cleanup = await performDatabaseCleanup()

    if (!cleanup.success) {
      logger.error("Database cleanup failed", {
        error: cleanup.error,
      })
      return
    }

    logger.info("Scheduled database maintenance completed successfully")
  } catch (error) {
    logger.error("Scheduled database maintenance failed:", error)
  }
}
