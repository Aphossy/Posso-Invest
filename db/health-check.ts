import { userOperations } from "@/db/operations/user-operations"
import logger from "@/utils/logger"
import * as dotenv from "dotenv"

import { dbHealthCheck, testDbConnection } from "./connection"

dotenv.config({ path: [".env.local"] })

async function performHealthCheck() {
  try {
    logger.info("🏥 Starting database health check...")

    // Basic connection test
    const connectionTest = await testDbConnection()
    logger.info(`Connection test: ${connectionTest ? "✅ PASS" : "❌ FAIL"}`)

    // Detailed health check
    const healthStatus = await dbHealthCheck()
    logger.info("Health status:", healthStatus)

    // Test basic operations
    logger.info("Testing basic database operations...")

    // Test user operations
    try {
      const userStats = await userOperations.getUserStats()
      logger.info("✅ User operations working", { userStats })
    } catch (error) {
      logger.error("❌ User operations failed:", { error })
    }

    // Overall health assessment
    const overallHealth = connectionTest && healthStatus.status === "healthy"
    logger.info(
      `\n🏥 Overall Database Health: ${overallHealth ? "✅ HEALTHY" : "❌ UNHEALTHY"}`
    )

    return {
      healthy: overallHealth,
      connectionTest,
      healthStatus,
      timestamp: new Date().toISOString(),
    }
  } catch (error) {
    logger.error("❌ Health check failed:", { error })
    return {
      healthy: false,
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    }
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  performHealthCheck()
    .then((result) => {
      logger.info("Health check completed:", result)
      process.exit(result.healthy ? 0 : 1)
    })
    .catch((error) => {
      logger.error("Health check process failed:", error)
      process.exit(1)
    })
}

export { performHealthCheck }
