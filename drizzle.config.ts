// drizzle.config.ts
import { defineConfig } from "drizzle-kit"

import { getEnvVar, loadEnvironmentConfig } from "./utils/env-loader"

// Load environment variables
loadEnvironmentConfig({
  verbose: true,
  required: ["DATABASE_URL"],
})

export default defineConfig({
  schema: ["./db/schemas/index.ts", "./db/schemas/customer-schema.ts"],
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: getEnvVar("DATABASE_URL"),
  },
  verbose: true,
  strict: true,
  // Enable migrations folder structure
  migrations: {
    prefix: "timestamp",
    table: "__drizzle_migrations__",
    schema: "public",
  },
  // Enable introspection for existing database
  introspect: {
    casing: "camel",
  },
  // Additional configuration for better performance
  breakpoints: true,
  tablesFilter: ["*"],
  schemaFilter: ["public"],
})
