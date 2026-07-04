// utils/env-loader.ts
import * as fs from "fs"
import * as path from "path"
import * as dotenv from "dotenv"

export interface EnvLoaderOptions {
  /** Override the NODE_ENV detection */
  environment?: string
  /** Custom root directory (defaults to process.cwd()) */
  rootDir?: string
  /** Additional environment files to try loading */
  additionalFiles?: string[]
  /** Whether to log which files are being loaded */
  verbose?: boolean
  /** Required environment variables */
  required?: string[]
  /** Whether to throw error if required variables are missing */
  throwOnMissing?: boolean
}

export interface EnvLoaderResult {
  /** The environment that was detected/used */
  environment: string
  /** Files that were successfully loaded */
  loadedFiles: string[]
  /** Missing required variables */
  missingRequired: string[]
  /** Whether all required variables are present */
  isValid: boolean
}

/**
 * Load environment variables based on NODE_ENV with fallback strategy
 */
export function loadEnvironmentConfig(
  options: EnvLoaderOptions = {}
): EnvLoaderResult {
  const {
    environment = process.env.NODE_ENV || "development",
    rootDir = process.cwd(),
    additionalFiles = [],
    verbose = false,
    required = [],
    throwOnMissing = true,
  } = options

  const result: EnvLoaderResult = {
    environment,
    loadedFiles: [],
    missingRequired: [],
    isValid: true,
  }

  // Define environment-specific file loading order
  const envFileMap: Record<string, string[]> = {
    production: [".env.production", ".env.production.local", ".env"],
    staging: [".env.staging", ".env.staging.local", ".env"],
    test: [".env.test", ".env.test.local", ".env"],
    development: [".env.local"],
  }

  // Get files to try for the current environment
  const defaultFiles = envFileMap[environment] || envFileMap.development
  const filesToTry = [...defaultFiles, ...additionalFiles]

  // Remove duplicates while preserving order
  const uniqueFiles = [...new Set(filesToTry)]

  // Load environment files
  for (const file of uniqueFiles) {
    const filePath = path.resolve(rootDir, file)

    if (fs.existsSync(filePath)) {
      try {
        dotenv.config({ path: filePath })
        result.loadedFiles.push(file)

        if (verbose) {
          console.log(`✅ Loaded environment from: ${file}`)
        }
      } catch (error) {
        if (verbose) {
          console.warn(`⚠️  Failed to load ${file}:`, error)
        }
      }
    } else if (verbose) {
      console.log(`ℹ️  Environment file not found: ${file}`)
    }
  }

  // Check required variables
  if (required.length > 0) {
    result.missingRequired = required.filter((varName) => !process.env[varName])
    result.isValid = result.missingRequired.length === 0

    if (!result.isValid) {
      const errorMessage = `Missing required environment variables: ${result.missingRequired.join(", ")}`

      if (verbose || !throwOnMissing) {
        console.error(`❌ ${errorMessage}`)
        if (result.loadedFiles.length > 0) {
          console.error(`📁 Loaded from: ${result.loadedFiles.join(", ")}`)
        }
      }

      if (throwOnMissing) {
        throw new Error(errorMessage)
      }
    } else if (verbose) {
      console.log(`✅ All required environment variables are present`)
    }
  }

  if (verbose) {
    console.log(`🌍 Environment: ${environment}`)
    console.log(
      `📁 Loaded files: ${result.loadedFiles.length > 0 ? result.loadedFiles.join(", ") : "none"}`
    )
  }

  return result
}

/**
 * Get a required environment variable with optional default value
 */
export function getEnvVar(
  name: string,
  defaultValue?: string,
  required: boolean = true
): string {
  const value = process.env[name] || defaultValue

  if (required && !value) {
    throw new Error(`Environment variable ${name} is required but not defined`)
  }

  return value || ""
}

/**
 * Get environment variable as boolean
 */
export function getEnvBool(
  name: string,
  defaultValue: boolean = false
): boolean {
  const value = process.env[name]

  if (!value) return defaultValue

  return value.toLowerCase() === "true" || value === "1"
}

/**
 * Get environment variable as number
 */
export function getEnvNumber(
  name: string,
  defaultValue?: number,
  required: boolean = false
): number {
  const value = process.env[name]

  if (!value) {
    if (required) {
      throw new Error(
        `Environment variable ${name} is required but not defined`
      )
    }
    return defaultValue || 0
  }

  const parsed = parseInt(value, 10)

  if (isNaN(parsed)) {
    throw new Error(
      `Environment variable ${name} must be a valid number, got: ${value}`
    )
  }

  return parsed
}

/**
 * Get environment variable as array (comma-separated)
 */
export function getEnvArray(
  name: string,
  defaultValue: string[] = [],
  separator: string = ","
): string[] {
  const value = process.env[name]

  if (!value) return defaultValue

  return value
    .split(separator)
    .map((item) => item.trim())
    .filter(Boolean)
}

/**
 * Validate that all required environment variables are present
 */
export function validateRequiredEnvVars(variables: string[]): void {
  const missing = variables.filter((varName) => !process.env[varName])

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    )
  }
}

/**
 * Create a typed environment configuration object
 */
export function createEnvConfig<T extends Record<string, any>>(config: {
  [K in keyof T]: {
    key: string
    required?: boolean
    defaultValue?: T[K]
    transform?: (value: string) => T[K]
  }
}): T {
  const result = {} as T

  for (const [configKey, configValue] of Object.entries(config)) {
    const { key, required = true, defaultValue, transform } = configValue
    const envValue = process.env[key]

    if (!envValue && required && defaultValue === undefined) {
      throw new Error(`Environment variable ${key} is required but not defined`)
    }

    let value = envValue || defaultValue

    if (transform && value !== undefined) {
      value = transform(String(value))
    }

    result[configKey as keyof T] = value
  }

  return result
}
