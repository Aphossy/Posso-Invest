// C:\Users\user\OneDrive\Desktop\trustlink-group\app\api\upload\cloudinary\route.ts
import type { NextRequest } from "next/server"
import logger from "@/utils/logger"
import cloudinary from "cloudinary"

import { withTiming } from "@/lib/api-middleware"
import {
  errorResponse,
  internalErrorResponse,
  successResponse,
  validationErrorResponse,
} from "@/lib/api-response"
import { rateLimit } from "@/lib/rate-limiter"

// Configure Cloudinary
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
})

// File validation constants
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]
const MAX_FILES_PER_REQUEST = 5

export async function POST(request: NextRequest) {
  const { startTime } = withTiming()

  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimit("file-upload", 20, 60) // 20 uploads per minute
    if (!rateLimitResult.success) {
      return errorResponse(
        request,
        {
          code: "RATE_LIMITED",
          message: "Too many upload requests. Please try again later.",
          help: "You can upload up to 20 files per minute.",
        },
        { statusCode: 429, startTime }
      )
    }

    // Parse form data
    let formData: FormData
    try {
      formData = await request.formData()
    } catch (error) {
      console.error("error parsing form data", error)
      return validationErrorResponse(request, "Invalid form data", {
        errors: [{ error: "Failed to parse form data" }],
        validFormats: ["multipart/form-data"],
        requiredFields: ["file"],
      })
    }

    // Get uploaded files
    const files = formData.getAll("file") as File[]
    const singleFile = formData.get("file") as File

    // Handle both single file and multiple files
    const filesToProcess =
      files.length > 0 ? files : singleFile ? [singleFile] : []

    if (filesToProcess.length === 0) {
      return validationErrorResponse(request, "No files provided", {
        example: "Include at least one file in the 'file' field",
        acceptedTypes: ALLOWED_TYPES,
        maxSize: `${MAX_FILE_SIZE / (1024 * 1024)}MB`,
      })
    }

    if (filesToProcess.length > MAX_FILES_PER_REQUEST) {
      return validationErrorResponse(
        request,
        `Too many files. Maximum ${MAX_FILES_PER_REQUEST} files allowed per request.`,
        {
          maxFiles: MAX_FILES_PER_REQUEST,
          receivedFiles: filesToProcess.length,
        }
      )
    }

    // Validate each file
    const validationErrors: string[] = []
    for (const file of filesToProcess) {
      if (!file || !(file instanceof File)) {
        validationErrors.push("Invalid file object")
        continue
      }

      if (file.size > MAX_FILE_SIZE) {
        validationErrors.push(
          `File "${file.name}" exceeds maximum size of ${MAX_FILE_SIZE / (1024 * 1024)}MB`
        )
      }

      if (!ALLOWED_TYPES.includes(file.type)) {
        validationErrors.push(
          `File "${file.name}" has unsupported type. Allowed: ${ALLOWED_TYPES.join(", ")}`
        )
      }

      if (file.size === 0) {
        validationErrors.push(`File "${file.name}" is empty`)
      }
    }

    if (validationErrors.length > 0) {
      return validationErrorResponse(
        request,
        "File validation failed",

        {
          errors: validationErrors,
          allowedTypes: ALLOWED_TYPES,
          maxSize: `${MAX_FILE_SIZE / (1024 * 1024)}MB`,
          maxFiles: MAX_FILES_PER_REQUEST,
        }
      )
    }

    // Upload files to Cloudinary
    const uploadResults: any[] = []
    const uploadErrors: string[] = []

    for (const file of filesToProcess) {
      try {
        const fileBuffer = await file.arrayBuffer()
        const base64Data = Buffer.from(fileBuffer).toString("base64")
        const fileUri = `data:${file.type};base64,${base64Data}`

        const uploadResult = await new Promise((resolve, reject) => {
          cloudinary.v2.uploader.upload(
            fileUri,
            {
              invalidate: true,
              resource_type: "image",
              folder: "trustlink-group", // Organize uploads in folders
              transformation: [
                { quality: "auto:best", fetch_format: "auto" }, // Optimize images
                { width: 1000, crop: "scale" }, // Limit max dimensions
              ],
              // Generate multiple sizes for responsive images
              eager: [
                { width: 300, height: 300, crop: "fill", quality: "auto" }, // Thumbnail
                { width: 600, height: 600, crop: "limit", quality: "auto" }, // Medium
              ],
            },
            (error, result) => {
              if (error) {
                logger.error("Cloudinary upload error:", {
                  error,
                  fileName: file.name,
                  result,
                })
                reject(error)
              } else {
                resolve(result)
              }
            }
          )
        })

        uploadResults.push({
          originalName: file.name,
          url: (uploadResult as any).secure_url,
          publicId: (uploadResult as any).public_id,
          width: (uploadResult as any).width,
          height: (uploadResult as any).height,
          format: (uploadResult as any).format,
          size: (uploadResult as any).bytes,
          thumbnailUrl: (uploadResult as any).eager?.[0]?.secure_url,
          mediumUrl: (uploadResult as any).eager?.[1]?.secure_url,
          uploadedAt: new Date().toISOString(),
        })
      } catch (error: any) {
        logger.error("File upload error:", { error, fileName: file.name })
        uploadErrors.push(
          `Failed to upload "${file.name}": ${error.message || "Unknown error"}`
        )
      }
    }

    // Check if any uploads succeeded
    if (uploadResults.length === 0) {
      return internalErrorResponse(request, "All file uploads failed", {
        help: "Please try again with different files or contact support if the issue persists.",
        startTime,
        debug:
          process.env.NODE_ENV === "development" ? { uploadErrors } : undefined,
      })
    }

    // Prepare response data
    const responseData =
      filesToProcess.length === 1
        ? uploadResults[0] // Single file - return object directly
        : {
            // Multiple files - return array with metadata
            files: uploadResults,
            totalUploaded: uploadResults.length,
            totalFailed: uploadErrors.length,
          }

    // Include warnings if some uploads failed
    const warnings = uploadErrors.length > 0 ? uploadErrors : undefined

    return successResponse(request, responseData, {
      statusCode: 201,
      startTime,
      message:
        filesToProcess.length === 1
          ? "File uploaded successfully"
          : `${uploadResults.length} of ${filesToProcess.length} files uploaded successfully`,
      warnings,
      links: {
        documentation: process.env.API_DOCS_URL
          ? `${process.env.API_DOCS_URL}/upload`
          : undefined,
      },
    })
  } catch (error: any) {
    logger.error("Upload route error:", { error })
    return internalErrorResponse(request, "File upload failed", {
      help: "Please try again or contact support if the issue persists.",
      startTime,
      debug:
        process.env.NODE_ENV === "development"
          ? { error: error.message }
          : undefined,
    })
  }
}

// Handle unsupported methods
export async function GET(request: NextRequest) {
  const { startTime } = withTiming()
  return errorResponse(
    request,
    {
      code: "METHOD_NOT_ALLOWED",
      message: "GET method not supported for file uploads",
      help: "Use POST method to upload files",
    },
    { statusCode: 405, startTime }
  )
}

export async function PUT(request: NextRequest) {
  const { startTime } = withTiming()
  return errorResponse(
    request,
    {
      code: "METHOD_NOT_ALLOWED",
      message: "PUT method not supported for file uploads",
      help: "Use POST method to upload files",
    },
    { statusCode: 405, startTime }
  )
}

export async function DELETE(request: NextRequest) {
  const { startTime } = withTiming()
  return errorResponse(
    request,
    {
      code: "METHOD_NOT_ALLOWED",
      message: "DELETE method not supported for file uploads",
      help: "Use POST method to upload files",
    },
    { statusCode: 405, startTime }
  )
}
