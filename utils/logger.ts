// utils/logger.ts
import fs from "fs"
import path from "path"
import winston from "winston"

// utils/logger.ts
let logger: any

if (typeof window === "undefined") {
  // Server-side logger
  if (process.env.NODE_ENV === "development") {
    // Development - use winston with file logging

    const { combine, timestamp, printf } = winston.format

    const logFormat = printf(({ level, message, timestamp }: any) => {
      return `${timestamp} [${level}]: ${message}`
    })

    // Ensure logs directory exists in development
    const logsDir = path.join(process.cwd(), "logs")
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true })
    }

    logger = winston.createLogger({
      level: "info",
      format: combine(timestamp(), logFormat),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({
          filename: path.join(logsDir, "application.log"),
        }),
      ],
    })
  } else {
    // Production - console only logger
    type LogLevel = "info" | "warn" | "error" | "debug"
    interface LogData {
      [key: string]: any
    }

    class ServerLogger {
      private formatMessage(
        level: LogLevel,
        message: string,
        data?: LogData
      ): string {
        const timestamp = new Date().toISOString()
        const logData = data ? ` ${JSON.stringify(data)}` : ""
        return `${timestamp} [${level}]: ${message}${logData}`
      }

      info(message: string, data?: LogData) {
        console.log(this.formatMessage("info", message, data))
      }

      warn(message: string, data?: LogData) {
        console.warn(this.formatMessage("warn", message, data))
      }

      error(message: string, data?: LogData) {
        console.error(this.formatMessage("error", message, data))
      }

      debug(message: string, data?: LogData) {
        // Debug logs only in development
        if (process.env.NODE_ENV === "development") {
          console.debug(this.formatMessage("debug", message, data))
        }
      }
    }

    logger = new ServerLogger()
  }
} else {
  // Client-side - use console logger
  type LogLevel = "info" | "warn" | "error" | "debug"
  interface LogData {
    [key: string]: any
  }

  class ClientLogger {
    private formatMessage(
      level: LogLevel,
      message: string,
      data?: LogData
    ): string {
      const timestamp = new Date().toISOString()
      const logData = data ? ` ${JSON.stringify(data)}` : ""
      return `${timestamp} [${level}]: ${message}${logData}`
    }

    info(message: string, data?: LogData) {
      console.log(this.formatMessage("info", message, data))
    }

    warn(message: string, data?: LogData) {
      console.warn(this.formatMessage("warn", message, data))
    }

    error(message: string, data?: LogData) {
      console.error(this.formatMessage("error", message, data))
    }

    debug(message: string, data?: LogData) {
      if (process.env.NODE_ENV === "development") {
        console.debug(this.formatMessage("debug", message, data))
      }
    }
  }

  logger = new ClientLogger()
}

export default logger

// /* eslint-disable @typescript-eslint/no-explicit-any */
// type LogLevel = "info" | "warn" | "error" | "debug"

// interface LogData {
//   [key: string]: any
// }

// class Logger {
//   private formatMessage(level: LogLevel, message: string, data?: LogData): string {
//     const timestamp = new Date().toISOString()
//     const logData = data ? ` ${JSON.stringify(data)}` : ""
//     return `${timestamp} [${level}]: ${message}${logData}`
//   }

//   info(message: string, data?: LogData) {
//     console.log(this.formatMessage("info", message, data))
//   }

//   warn(message: string, data?: LogData) {
//     console.warn(this.formatMessage("warn", message, data))
//   }

//   error(message: string, data?: LogData) {
//     console.error(this.formatMessage("error", message, data))
//   }

//   debug(message: string, data?: LogData) {
//     if (process.env.NODE_ENV === "development") {
//       console.debug(this.formatMessage("debug", message, data))
//     }
//   }
// }

// const logger = new Logger()
// export default logger

// // utils\logger.ts
// import winston from 'winston';

// const { combine, timestamp, printf } = winston.format;

// const logFormat = printf(({ level, message, timestamp }) => {
//   return `${timestamp} [${level}]: ${message}`;
// });

// const logger = winston.createLogger({
//   level: 'info',
//   format: combine(timestamp(), logFormat),
//   transports: [
//     new winston.transports.Console(),
//     new winston.transports.File({ filename: 'application.log' })
//   ]
// });

// export default logger;
