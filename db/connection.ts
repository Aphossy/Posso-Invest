// db\connection.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { neon } from "@neondatabase/serverless"
import * as dotenv from "dotenv"
import { drizzle } from "drizzle-orm/neon-http"

import { schema } from "./schemas"

// Load environment variables
dotenv.config({ path: [".env.local"] })

// Database connection configuration
interface DatabaseConfig {
  url: string
  maxConnections?: number
  connectionTimeoutMs?: number
  idleTimeoutMs?: number
}

// Singleton pattern for database connection with enhanced error handling
class DatabaseConnection {
  private static instance: DatabaseConnection
  private client: any
  private db: any
  private config: DatabaseConfig
  private isConnected = false

  private constructor() {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is required")
    }

    this.config = {
      url: process.env.DATABASE_URL,
      maxConnections: Number.parseInt(process.env.DB_MAX_CONNECTIONS || "10"),
      connectionTimeoutMs: Number.parseInt(
        process.env.DB_CONNECTION_TIMEOUT || "30000"
      ),
      idleTimeoutMs: Number.parseInt(process.env.DB_IDLE_TIMEOUT || "600000"),
    }

    this.initializeConnection()
  }

  private initializeConnection(): void {
    try {
      // Configure neon client with connection options
      this.client = neon(this.config.url, {
        // Add any neon-specific configuration here
      })

      // Initialize Drizzle with unified schema
      this.db = drizzle(this.client, {
        schema,
        logger: process.env.NODE_ENV === "development",
      })

      this.isConnected = true
      console.log("🚀 Database connection initialized successfully", {
        maxConnections: this.config.maxConnections,
        environment: process.env.NODE_ENV,
      })
    } catch (error) {
      this.isConnected = false
      console.error("🔴 Failed to initialize database connection:", { error })
      throw error
    }
  }

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection()
    }
    return DatabaseConnection.instance
  }

  public getDb() {
    if (!this.isConnected) {
      throw new Error("Database connection is not initialized")
    }
    return this.db
  }

  public getClient() {
    if (!this.isConnected) {
      throw new Error("Database client is not initialized")
    }
    return this.client
  }

  public async testConnection(): Promise<boolean> {
    try {
      const startTime = Date.now()
      await this.client`SELECT 1 as test`
      const duration = Date.now() - startTime

      console.log("🚀 Database connection test successful", {
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
      })
      return true
    } catch (error) {
      console.error("🔴 Database connection test failed:", { error })
      return false
    }
  }

  public async closeConnection(): Promise<void> {
    try {
      if (this.client && typeof this.client.end === "function") {
        await this.client.end()
      }
      this.isConnected = false
      console.info("🚀 Database connection closed successfully")
    } catch (error) {
      console.error("Error closing database connection:", { error })
    }
  }

  // Enhanced health check with detailed metrics
  public async healthCheck(): Promise<{
    status: "healthy" | "unhealthy"
    latency?: number
    error?: string
    timestamp: string
    connectionInfo: {
      isConnected: boolean
      maxConnections: number
    }
  }> {
    const startTime = Date.now()
    const timestamp = new Date().toISOString()

    try {
      await this.client`SELECT 1 as health_check`
      const latency = Date.now() - startTime

      return {
        status: "healthy",
        latency,
        timestamp,
        connectionInfo: {
          isConnected: this.isConnected,
          maxConnections: this.config.maxConnections || 10,
        },
      }
    } catch (error) {
      return {
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp,
        connectionInfo: {
          isConnected: this.isConnected,
          maxConnections: this.config.maxConnections || 10,
        },
      }
    }
  }

  // Get connection configuration (without sensitive data)
  public getConnectionInfo(): Omit<DatabaseConfig, "url"> {
    return {
      maxConnections: this.config.maxConnections,
      connectionTimeoutMs: this.config.connectionTimeoutMs,
      idleTimeoutMs: this.config.idleTimeoutMs,
    }
  }

  // Reconnection method for handling connection drops
  public async reconnect(): Promise<boolean> {
    try {
      console.info("Attempting to reconnect to database...")
      await this.closeConnection()
      this.initializeConnection()
      return await this.testConnection()
    } catch (error) {
      console.error("🔴 Failed to reconnect to database:", { error })
      return false
    }
  }
}

// Export singleton instance
export const dbConnection = DatabaseConnection.getInstance()
export const db = dbConnection.getDb()
export const dbClient = dbConnection.getClient()

// Export utility functions with enhanced error handling
export const testDbConnection = async (): Promise<boolean> => {
  try {
    return await dbConnection.testConnection()
  } catch (error) {
    console.error("🔴 Database connection test failed:", { error })
    return false
  }
}

export const closeDbConnection = async (): Promise<void> => {
  try {
    await dbConnection.closeConnection()
  } catch (error) {
    console.error("🔴 Failed to close database connection:", { error })
  }
}

export const dbHealthCheck = async () => {
  try {
    return await dbConnection.healthCheck()
  } catch (error) {
    console.error("🔴 Database health check failed:", { error })
    return {
      status: "unhealthy" as const,
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
      connectionInfo: {
        isConnected: false,
        maxConnections: 0,
      },
    }
  }
}

export const reconnectDb = async (): Promise<boolean> => {
  try {
    return await dbConnection.reconnect()
  } catch (error) {
    console.error("🔴 Database reconnection failed:", { error })
    return false
  }
}

// Export all schemas and types
export * from "./schemas"

// Type-safe database instance
export type Database = typeof db
export type DatabaseClient = typeof dbClient
