/* eslint-disable @typescript-eslint/no-unused-vars */
// scripts/validate-env.ts
import {
  loadEnvironmentConfig,
  validateRequiredEnvVars,
} from "@/utils/env-loader"

async function validateEnvironment() {
  console.log("🔍 Validating environment configuration...\n")

  try {
    // Load environment with verbose output
    const result = loadEnvironmentConfig({
      verbose: true,
      required: ["DATABASE_URL", "AUTH_SECRET"],
      throwOnMissing: false,
    })

    console.log("\n📊 Environment Validation Report:")
    console.log("=====================================")
    console.log(`Environment: ${result.environment}`)
    console.log(`Loaded files: ${result.loadedFiles.join(", ") || "none"}`)
    console.log(`Valid: ${result.isValid ? "✅" : "❌"}`)

    if (result.missingRequired.length > 0) {
      console.log(`Missing variables: ${result.missingRequired.join(", ")}`)
    }

    // Additional validations
    console.log("\n🔧 Configuration Details:")
    console.log("=====================================")

    // Database URL validation
    const dbUrl = process.env.DATABASE_URL
    if (dbUrl) {
      const isValidPostgres =
        dbUrl.startsWith("postgresql://") || dbUrl.startsWith("postgres://")
      console.log(
        `DATABASE_URL: ${isValidPostgres ? "✅" : "❌"} ${isValidPostgres ? "Valid PostgreSQL URL" : "Invalid format"}`
      )
    }

    // Port validation
    const port = process.env.PORT
    if (port) {
      const portNum = parseInt(port, 10)
      const isValidPort = !isNaN(portNum) && portNum > 0 && portNum <= 65535
      console.log(
        `PORT: ${isValidPort ? "✅" : "❌"} ${port} ${isValidPort ? "(valid)" : "(invalid range)"}`
      )
    }

    // JWT Secret validation
    const jwtSecret = process.env.JWT_SECRET
    if (jwtSecret) {
      const isSecure = jwtSecret.length >= 32
      console.log(
        `JWT_SECRET: ${isSecure ? "✅" : "⚠️"} ${isSecure ? "Secure length" : "Consider using longer secret"}`
      )
    }

    // Environment-specific warnings
    if (result.environment === "production") {
      console.log("\n🚨 Production Environment Checks:")
      console.log("=====================================")

      const productionChecks = [
        {
          key: "NODE_ENV",
          expected: "production",
          actual: process.env.NODE_ENV,
        },
        {
          key: "ENABLE_LOGGING",
          expected: "false",
          actual: process.env.ENABLE_LOGGING,
        },
      ]

      productionChecks.forEach(({ key, expected, actual }) => {
        const matches = actual === expected
        console.log(
          `${key}: ${matches ? "✅" : "⚠️"} ${actual} ${matches ? "(recommended)" : `(consider: ${expected})`}`
        )
      })
    }

    console.log("\n" + "=".repeat(40))

    if (result.isValid) {
      console.log("🎉 Environment validation passed!")
      process.exit(0)
    } else {
      console.log("❌ Environment validation failed!")
      process.exit(1)
    }
  } catch (error) {
    console.error("💥 Environment validation error:", error)
    process.exit(1)
  }
}

// Run validation if script is called directly
if (require.main === module) {
  validateEnvironment()
}

export { validateEnvironment }
