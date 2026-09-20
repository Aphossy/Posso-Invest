// db/index.ts - Main database entry point
export { db, dbClient, dbConnection } from "./connection"

export * from "./schemas"
export {
  testDbConnection,
  closeDbConnection,
  dbHealthCheck,
  reconnectDb,
} from "./connection"

export type Database = typeof import("./connection").db
