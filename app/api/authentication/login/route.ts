import { headers } from "next/headers"
import type { NextRequest } from "next/server"
import { User } from "@/db"
import { auditLogOperations, userOperations } from "@/db/operations"
import {
  // sendAccountInactiveEmail,
  sendLoginNotificationEmail,
  sendUnverifiedAccountEmail,
  // sendTwoFactorTokenEmail,
} from "@/utils/auth-notification-utils"
import logger from "@/utils/logger"
import { APIError } from "better-auth"
import httpStatus from "http-status"
import { z } from "zod"

import {
  generateETag,
  generateLinks,
  withRequestId,
  withRequestLogging,
  withTiming,
} from "@/lib/api-middleware"
import {
  errorResponse,
  rateLimitedResponse,
  successResponse,
  unauthorizedResponse,
  validationErrorResponse,
  withApiResponse,
} from "@/lib/api-response"
import { auth } from "@/lib/auth"
import { rateLimit } from "@/lib/rate-limiter"

// ============================================
// POST /api/authentication/login - User Login with Better Auth
// ============================================

// Input validation schema
const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  code: z.string().optional(),
  rememberMe: z.boolean().optional().default(false),
})

const { startTime } = withTiming()
const { requestId } = withRequestId()

export const POST = withRequestLogging(
  withApiResponse(
    async (
      request: NextRequest,
      context: { params: Promise<any> },
      validatedData?: any
    ) => {
      try {
        // Apply rate limiting
        const rateLimitResult = await rateLimit("login", 60, 60 * 5, {
          algorithm: "sliding-window",
          analytics: true,
        })
        if (!rateLimitResult.success) {
          return rateLimitedResponse(request, rateLimitResult, {
            message: "Too many requests. Please try again later.",
            help: "You can make up to 60 requests per 5 minutes.",
            startTime,
          })
        }

        // Use validated data from middleware
        const { email, password, rememberMe } = validatedData

        // Get location info from headers
        const headersList = await headers()
        const locationInfo = {
          ip: request.headers.get("x-forwarded-for") || "Unknown",
          city: headersList.get("x-vercel-ip-city") || undefined,
          country: headersList.get("x-vercel-ip-country") || undefined,
          userAgent: headersList.get("user-agent") || "Unknown",
        }

        // Find user for additional checks
        const user = (await userOperations.findByEmail(email)) as User | null
        if (!user) {
          logger.warn(`Sign-in attempt with non-existent email: ${email}`)
          await auditLogOperations.create({
            action: "LOGIN_ATTEMPT_INVALID_EMAIL",
            userEmail: email,
            details: `Login attempt with non-existent email: ${email}`,
            ipAddress: locationInfo.ip,
            userAgent: locationInfo.userAgent,
          })
          return unauthorizedResponse(request, "Invalid credentials", {
            startTime,
            help: "Please check your email and password.",
          })
        }

        // Check email verification
        if (!user.emailVerified) {
          logger.warn(`Login attempt with unverified email: ${email}`)
          await auditLogOperations.create({
            action: "LOGIN_ATTEMPT_UNVERIFIED_EMAIL",
            userId: user.id,
            userEmail: email,
            details: "Login attempt with unverified email address",
            ipAddress: locationInfo.ip,
            userAgent: locationInfo.userAgent,
          })
          await sendUnverifiedAccountEmail(
            {
              ...user,
              phone: user.phone ?? null,
              dateOfBirth: user.dateOfBirth ?? null,
              bio: user.bio ?? null,
              address: user.address ?? null,
            },
            locationInfo
          )
          return errorResponse(
            request,
            {
              code: "EMAIL_NOT_VERIFIED",
              message: "Please verify your email address before logging in.",
              details: {
                email: user.email,
                verificationUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/request-verification?email=${encodeURIComponent(user.email)}`,
              },
            },
            { statusCode: httpStatus.FORBIDDEN, startTime }
          )
        }

        // Attempt sign-in with better-auth
        let loginResponse
        try {
          loginResponse = await auth.api.signInEmail({
            body: {
              email,
              password,
              rememberMe,
            },
            headers: await headers(),
          })
        } catch (error) {
          if (error instanceof APIError) {
            logger.warn(
              `Sign-in failed: ${error.message} (Status: ${error.status})`
            )
            await auditLogOperations.create({
              action: "LOGIN_ATTEMPT_FAILED",
              userId: user.id,
              userEmail: email,
              details: `Sign-in failed: ${error.message}`,
              ipAddress: locationInfo.ip,
              userAgent: locationInfo.userAgent,
            })

            // Normalize status to a numeric value for safe usage in responses
            const statusCode =
              typeof error.status === "number"
                ? error.status
                : Number(error.status) || httpStatus.INTERNAL_SERVER_ERROR

            if (statusCode === httpStatus.UNAUTHORIZED) {
              return unauthorizedResponse(request, "Invalid credentials", {
                startTime,
                help: "Please check your email and password.",
              })
            }

            return errorResponse(
              request,
              {
                code: "AUTH_ERROR",
                message: error.message || "Authentication failed",
              },
              { statusCode, startTime }
            )
          }
          throw error // Rethrow unexpected errors
        }

        // Update last login
        await userOperations.updateLastLogin(user.id)

        // Extract session data from better-auth response

        logger.info(`User signed in successfully: ${email}`)
        await auditLogOperations.create({
          action: "LOGIN_SUCCESS",
          userId: user.id,
          userEmail: email,
          details: `User signed in successfully`,
          ipAddress: locationInfo.ip,
          userAgent: locationInfo.userAgent,
        })

        // Send login notification email (async)
        sendLoginNotificationEmail(
          { name: user.name, email: user.email },
          locationInfo
        ).catch((error) => {
          logger.error(`Failed to send login notification: ${error}`)
        })

        // Prepare response data
        const userData = {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          image: user.image || null,
          isVerified: user.emailVerified,
          isTwoFactorEnabled: user.twoFactorEnabled || false,
        }

        // Generate HATEOAS links
        const baseLinks = {
          self: "/api/authentication/login",
          logout: "/api/authentication/logout",
          profile: "/api/users/profile",
          sessions: "/api/authentication/sessions",
          documentation: "/docs/api/login",
        }
        const links = generateLinks(request, undefined, baseLinks)

        // Generate ETag for caching
        const etag = generateETag({ user: userData })

        // Build success response
        const response = successResponse(
          request,
          {
            user: userData,
            token: loginResponse.token,
            meta: {
              type: "authentication",
              userRole: user.role,
            },
          },
          {
            message: "Login successful, you will be redirected soon!",
            statusCode: httpStatus.OK,
            startTime,
            links,
            cacheControl: "no-store",
            metadata: { etag, requestId },
          }
        )

        return response
      } catch (error) {
        logger.error(`Sign-in error: ${error}`)
        await auditLogOperations.create({
          action: "LOGIN_ERROR",
          details: `Sign-in error: ${error}`,
          ipAddress: request.headers.get("x-forwarded-for") || "Unknown",
          userAgent: request.headers.get("user-agent") || "Unknown",
        })
        return errorResponse(
          request,
          {
            code: "INTERNAL_ERROR",
            message: "An unexpected error occurred",
            help: "Please try again later or contact support.",
          },
          {
            statusCode: httpStatus.INTERNAL_SERVER_ERROR,
            startTime,
          }
        )
      }
    },
    signInSchema
  )
)

// // app\api\authentication\login\route.ts
// import { headers } from "next/headers"
// import type { NextRequest } from "next/server"
// import { User } from "@/db"
// import { auditLogOperations, userOperations } from "@/db/operations"
// import {
//   // sendAccountInactiveEmail,
//   sendLoginNotificationEmail,
//   sendUnverifiedAccountEmail,
//   // sendTwoFactorTokenEmail,
// } from "@/utils/auth-notification-utils"
// import logger from "@/utils/logger"
// import { isPasswordExpired } from "@/utils/password-utils"
// import { APIError } from "better-auth"
// import httpStatus from "http-status"
// import { z } from "zod"

// import {
//   generateETag,
//   generateLinks,
//   withRequestId,
//   withRequestLogging,
//   withTiming,
// } from "@/lib/api-middleware"
// import {
//   errorResponse,
//   rateLimitedResponse,
//   successResponse,
//   unauthorizedResponse,
//   validationErrorResponse,
//   withApiResponse,
// } from "@/lib/api-response"
// import { auth } from "@/lib/auth"
// import { rateLimit } from "@/lib/rate-limiter"

// // import { sendAccountBannedEmail } from "@/utils/notification-util"

// // ============================================
// // POST /api/authentication/login - User Login with Better Auth
// // ============================================

// // Input validation schema
// const signInSchema = z.object({
//   email: z.email(),
//   password: z.string().min(6),
//   code: z.string().optional(),
//   rememberMe: z.boolean().optional().default(false),
// })

// const { startTime } = withTiming()
// const { requestId } = withRequestId()

// export const POST = withRequestLogging(
//   withApiResponse(async (request: NextRequest) => {
//     try {
//       // Apply rate limiting
//       const rateLimitResult = await rateLimit("login", 60, 60 * 5, {
//         algorithm: "sliding-window",
//         analytics: true,
//       })
//       if (!rateLimitResult.success) {
//         return rateLimitedResponse(request, rateLimitResult, {
//           message: "Too many requests. Please try again later.",
//           help: "You can make up to 60 requests per 5 minutes.",
//           startTime,
//         })
//       }

//       // Parse and validate request body
//       const body = await request.json()
//       const validatedData = signInSchema.safeParse(body)

//       if (!validatedData.success) {
//         logger.warn(
//           `Invalid sign-in attempt: ${JSON.stringify(validatedData.error.issues)}`
//         )
//         return validationErrorResponse(
//           request,
//           "Invalid credentials",
//           {
//             validationErrors: validatedData.error.issues.map((issue) => ({
//               path: issue.path.join("."),
//               message: issue.message,
//             })),
//           },
//           {
//             help: "Please check the API documentation for valid request body: /docs/api/login",
//             startTime,
//           }
//         )
//       }

//       const { email, password, rememberMe } = validatedData.data

//       // Get location info from headers
//       const headersList = await headers()
//       const locationInfo = {
//         ip: request.headers.get("x-forwarded-for") || "Unknown",
//         city: headersList.get("x-vercel-ip-city") || undefined,
//         country: headersList.get("x-vercel-ip-country") || undefined,
//         userAgent: headersList.get("user-agent") || "Unknown",
//       }

//       // Find user for additional checks
//       const user = (await userOperations.findByEmail(email)) as User | null
//       if (!user) {
//         logger.warn(`Sign-in attempt with non-existent email: ${email}`)
//         await auditLogOperations.create({
//           action: "LOGIN_ATTEMPT_INVALID_EMAIL",
//           userEmail: email,
//           details: `Login attempt with non-existent email: ${email}`,
//           ipAddress: locationInfo.ip,
//           userAgent: locationInfo.userAgent,
//         })
//         return unauthorizedResponse(request, "Invalid credentials", {
//           startTime,
//           help: "Please check your email and password.",
//         })
//       }

//       // Check email verification
//       if (!user.emailVerified) {
//         logger.warn(`Login attempt with unverified email: ${email}`)
//         await auditLogOperations.create({
//           action: "LOGIN_ATTEMPT_UNVERIFIED_EMAIL",
//           userId: user.id,
//           userEmail: email,
//           details: "Login attempt with unverified email address",
//           ipAddress: locationInfo.ip,
//           userAgent: locationInfo.userAgent,
//         })
//         await sendUnverifiedAccountEmail(
//           {
//             ...user,
//             phone: user.phone ?? null,
//             dateOfBirth: user.dateOfBirth ?? null,
//             bio: user.bio ?? null,
//             address: user.address ?? null,
//           },
//           locationInfo
//         )
//         return errorResponse(
//           request,
//           {
//             code: "EMAIL_NOT_VERIFIED",
//             message: "Please verify your email address before logging in.",
//             details: {
//               email: user.email,
//               verificationUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/request-verification?email=${encodeURIComponent(user.email)}`,
//             },
//           },
//           { statusCode: httpStatus.FORBIDDEN, startTime }
//         )
//       }

//       // Check account status
//       // if (user.banned) {
//       //   logger.warn(`Login attempt on banned account: ${email}`)
//       //   await auditLogOperations.create({
//       //     action: "LOGIN_ATTEMPT_BANNED_ACCOUNT",
//       //     userId: user.id,
//       //     userEmail: email,
//       //     details: `Login attempt on banned account. Reason: ${user.banReason}`,
//       //     ipAddress: locationInfo.ip,
//       //     userAgent: locationInfo.userAgent,
//       //   })
//       //   await sendAccountBannedEmail(
//       //     {
//       //       ...user,
//       //       phone: user.phone ?? null,
//       //       dateOfBirth: user.dateOfBirth ?? null,
//       //       bio: user.bio ?? null,
//       //       address: user.address ?? null,
//       //     },
//       //     locationInfo
//       //   )
//       //   return errorResponse(
//       //     request,
//       //     {
//       //       code: "ACCOUNT_BANNED",
//       //       message:
//       //         "Your account has been banned. Please contact support for assistance.",
//       //       details: {
//       //         reason: user.banReason,
//       //         contactEmail: process.env.ADMIN_EMAIL || "support@example.com",
//       //       },
//       //     },
//       //     { statusCode: httpStatus.FORBIDDEN, startTime }
//       //   )
//       // }

//       // Check password expiration
//       if (
//         user.passwordLastChanged &&
//         isPasswordExpired(new Date(user.passwordLastChanged))
//       ) {
//         logger.info(`Password expired for user: ${email}`)
//         await auditLogOperations.create({
//           action: "LOGIN_ATTEMPT_PASSWORD_EXPIRED",
//           userId: user.id,
//           userEmail: email,
//           details: "Password expired",
//           ipAddress: locationInfo.ip,
//           userAgent: locationInfo.userAgent,
//         })
//         return errorResponse(
//           request,
//           {
//             code: "PASSWORD_EXPIRED",
//             message: "Password expired. Please reset your password.",
//             details: {
//               resetUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/forgot-password`,
//             },
//           },
//           { statusCode: httpStatus.UNAUTHORIZED, startTime }
//         )
//       }

//       // Attempt sign-in with better-auth
//       let loginResponse
//       try {
//         loginResponse = await auth.api.signInEmail({
//           body: {
//             email,
//             password,
//             rememberMe,
//           },
//           headers: await headers(),
//         })
//       } catch (error) {
//         if (error instanceof APIError) {
//           logger.warn(
//             `Sign-in failed: ${error.message} (Status: ${error.status})`
//           )
//           await auditLogOperations.create({
//             action: "LOGIN_ATTEMPT_FAILED",
//             userId: user.id,
//             userEmail: email,
//             details: `Sign-in failed: ${error.message}`,
//             ipAddress: locationInfo.ip,
//             userAgent: locationInfo.userAgent,
//           })

//           // Normalize status to a numeric value for safe usage in responses
//           const statusCode =
//             typeof error.status === "number"
//               ? error.status
//               : Number(error.status) || httpStatus.INTERNAL_SERVER_ERROR

//           if (statusCode === httpStatus.UNAUTHORIZED) {
//             return unauthorizedResponse(request, "Invalid credentials", {
//               startTime,
//               help: "Please check your email and password.",
//             })
//           }

//           return errorResponse(
//             request,
//             {
//               code: "AUTH_ERROR",
//               message: error.message || "Authentication failed",
//             },
//             { statusCode, startTime }
//           )
//         }
//         throw error // Rethrow unexpected errors
//       }

//       // Handle 2FA redirect
//       // if ("twoFactorRedirect" in loginResponse) {
//       //   const twoFactorToken = await generateTwoFactorToken(user.email);
//       //   await sendTwoFactorTokenEmail(
//       //     user.email,
//       //     twoFactorToken.token,
//       //     user.name,
//       //     locationInfo
//       //   );
//       //   logger.info(`2FA required for user: ${email}`);
//       //   await auditLogOperations.create({
//       //     action: "TWO_FACTOR_REQUIRED",
//       //     userId: user.id,
//       //     userEmail: email,
//       //     details: "Two-factor authentication required",
//       //     ipAddress: locationInfo.ip,
//       //     userAgent: locationInfo.userAgent,
//       //   });
//       //   return successResponse(request, {
//       //     twoFactorRequired: true,
//       //     email: user.email,
//       //     meta: {
//       //       type: "authentication",
//       //       userRole: user.role,
//       //     },
//       //   }, {
//       //     message: "Two-factor authentication required. Check your email for the verification code.",
//       //     statusCode: httpStatus.OK,
//       //     startTime,
//       //     links: {
//       //       self: "/api/authentication/login",
//       //       resendCode: "/api/authentication/two-factor/resend",
//       //       documentation: "/docs/api/login",
//       //     },
//       //   });
//       // }

//       // Update last login
//       await userOperations.updateLastLogin(user.id)

//       // Extract session data from better-auth response

//       logger.info(`User signed in successfully: ${email}`)
//       await auditLogOperations.create({
//         action: "LOGIN_SUCCESS",
//         userId: user.id,
//         userEmail: email,
//         details: `User signed in successfully`,
//         ipAddress: locationInfo.ip,
//         userAgent: locationInfo.userAgent,
//       })

//       // Send login notification email (async)
//       sendLoginNotificationEmail(
//         { name: user.name, email: user.email },
//         locationInfo
//       ).catch((error) => {
//         logger.error(`Failed to send login notification: ${error}`)
//       })

//       // Prepare response data
//       const userData = {
//         id: user.id,
//         name: user.name,
//         email: user.email,
//         role: user.role,
//         image: user.image || null,
//         isVerified: user.emailVerified,
//         isTwoFactorEnabled: user.twoFactorEnabled || false,
//       }

//       // Generate HATEOAS links
//       const baseLinks = {
//         self: "/api/authentication/login",
//         logout: "/api/authentication/logout",
//         profile: "/api/users/profile",
//         sessions: "/api/authentication/sessions",
//         documentation: "/docs/api/login",
//       }
//       const links = generateLinks(request, undefined, baseLinks)

//       // Generate ETag for caching
//       const etag = generateETag({ user: userData })

//       // Build success response
//       const response = successResponse(
//         request,
//         {
//           user: userData,
//           token: loginResponse.token,
//           meta: {
//             type: "authentication",
//             userRole: user.role,
//           },
//         },
//         {
//           message: "Login successful, you will be redirected soon!",
//           statusCode: httpStatus.OK,
//           startTime,
//           links,
//           cacheControl: "no-store",
//           metadata: { etag, requestId },
//         }
//       )

//       return response
//     } catch (error) {
//       logger.error(`Sign-in error: ${error}`)
//       await auditLogOperations.create({
//         action: "LOGIN_ERROR",
//         details: `Sign-in error: ${error}`,
//         ipAddress: request.headers.get("x-forwarded-for") || "Unknown",
//         userAgent: request.headers.get("user-agent") || "Unknown",
//       })
//       return errorResponse(
//         request,
//         {
//           code: "INTERNAL_ERROR",
//           message: "An unexpected error occurred",
//           help: "Please try again later or contact support.",
//         },
//         {
//           statusCode: httpStatus.INTERNAL_SERVER_ERROR,
//           startTime,
//         }
//       )
//     }
//   }, signInSchema)
// )
