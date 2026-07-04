// db/index.ts - Main database entry point
import { neon } from "@neondatabase/serverless"
import * as dotenv from "dotenv"
import { drizzle } from "drizzle-orm/neon-http"

import { schema } from "./schemas"

// Load environment variables
dotenv.config({ path: [".env.local"] })

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  throw new Error("DATABASE_URL is not defined")
}

// Create database instance with unified schema
export const db = drizzle(neon(databaseUrl), {
  schema,
  logger: process.env.NODE_ENV === "development",
})

// Re-export everything from schema for convenience
export * from "./schemas"

// Export database types
export type Database = typeof db

// Export connection utilities
export {
  dbConnection,
  dbClient,
  testDbConnection,
  closeDbConnection,
  dbHealthCheck,
  reconnectDb,
} from "./connection"
