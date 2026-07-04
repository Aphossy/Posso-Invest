import { headers } from "next/headers"
import type { NextRequest } from "next/server"
import { userOperations } from "@/db/operations"
import logger from "@/utils/logger"

import { withTiming } from "@/lib/api-middleware"
import {
  errorResponse,
  internalErrorResponse,
  successResponse,
  unauthorizedResponse,
  validationErrorResponse,
} from "@/lib/api-response"
import { auth } from "@/lib/auth"
import {
  FILE_CATEGORIES,
  getFileCategoryFromMimeType,
  getProjectFolder,
  getStorageProvider,
  validateFile,
} from "@/lib/file-config"
import {
  deleteFile as deleteFromR2,
  getFileMetadata,
  getSignedUrlForUpload,
  listFiles,
  uploadFileToR2,
} from "@/lib/r2-enhanced"
import { rateLimit } from "@/lib/rate-limiter"

// Maximum files per request
const MAX_FILES_PER_REQUEST = 10

/**
 * POST /api/upload/r2
 * Upload files to R2 storage and save metadata to database
 */
export async function POST(request: NextRequest) {
  const { startTime } = withTiming()

  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimit("file-upload-r2", 20, 60)
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
      return validationErrorResponse(request, "Invalid form data", {
        errors: [{ error: "Failed to parse form data" }],
        validFormats: ["multipart/form-data"],
      })
    }

    const files = formData.getAll("file") as File[]
    const projectId = formData.get("projectId") as string | null
    // Normalize category to the upper-case keys expected by getProjectFolder
    const category = (
      (formData.get("category") as string) || "OTHER"
    ).toUpperCase() as keyof typeof FILE_CATEGORIES
    const description = formData.get("description") as string | null

    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session) {
      return unauthorizedResponse(request, "Authentication required", {
        startTime,
      })
    }

    const user = await userOperations.getProfileByUserId(
      session.user.id as string
    )

    if (files.length === 0) {
      return validationErrorResponse(request, "No files provided", {
        example: "Include at least one file in the 'file' field",
      })
    }

    if (files.length > MAX_FILES_PER_REQUEST) {
      return validationErrorResponse(
        request,
        `Too many files. Maximum ${MAX_FILES_PER_REQUEST} files allowed per request.`,
        {
          maxFiles: MAX_FILES_PER_REQUEST,
          receivedFiles: files.length,
        }
      )
    }

    // Validate project ID if provided
    if (projectId && !projectId.match(/^[0-9a-f-]{36}$/i)) {
      return validationErrorResponse(request, "Invalid project ID format", {
        providedId: projectId,
        expectedFormat: "UUID v4",
      })
    }

    // Validate each file
    const validationErrors: string[] = []
    for (const file of files) {
      if (!file || !(file instanceof File)) {
        validationErrors.push("Invalid file object")
        continue
      }

      const validation = validateFile({
        name: file.name,
        size: file.size,
        type: file.type,
      })

      if (!validation.valid) {
        validationErrors.push(`${file.name}: ${validation.error}`)
      }
    }

    if (validationErrors.length > 0) {
      return validationErrorResponse(request, "File validation failed", {
        errors: validationErrors,
      })
    }

    // Upload files to R2
    const uploadResults: any[] = []
    const uploadErrors: string[] = []

    for (const file of files) {
      try {
        // Only use R2 for non-image files or if explicitly requested
        const storageProvider = getStorageProvider(file.type)

        if (storageProvider !== "r2") {
          uploadErrors.push(
            `File "${file.name}" should be uploaded via the appropriate endpoint (${storageProvider})`
          )
          continue
        }

        // Determine folder path
        const folder = projectId
          ? getProjectFolder(projectId, category)
          : "uploads/general"

        // Read file buffer
        const fileBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(fileBuffer)

        // Upload to R2
        const fileMetadata = await uploadFileToR2(buffer, file.name, {
          folder,
          contentType: file.type,
          metadata: {
            originalName: file.name,
            projectId: projectId || "",
            category,
            uploadedBy: user?.id || "unknown",
          },
        })

        // Save to database if project is specified

        uploadResults.push({
          originalName: file.name,
          key: fileMetadata.key,
          url: fileMetadata.url,
          signedUrl: fileMetadata.signedUrl,
          size: fileMetadata.size,
          contentType: fileMetadata.contentType,
          category,
          uploadedAt: fileMetadata.uploadedAt,
          dbId: null, // To be filled if saved to DB
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
      files.length === 1
        ? uploadResults[0]
        : {
            files: uploadResults,
            totalUploaded: uploadResults.length,
            totalFailed: uploadErrors.length,
          }

    const warnings = uploadErrors.length > 0 ? uploadErrors : undefined

    return successResponse(request, responseData, {
      statusCode: 201,
      startTime,
      message:
        files.length === 1
          ? "File uploaded successfully"
          : `${uploadResults.length} of ${files.length} files uploaded successfully`,
      warnings,
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

/**
 * GET /api/upload/r2
 * Generate signed URL for direct client-side upload
 */
export async function GET(request: NextRequest) {
  const { startTime } = withTiming()

  try {
    const { searchParams } = new URL(request.url)
    const fileName = searchParams.get("fileName")
    const fileType = searchParams.get("fileType")
    const projectId = searchParams.get("projectId")
    const category = (
      searchParams.get("category") || "OTHER"
    ).toUpperCase() as keyof typeof FILE_CATEGORIES

    if (!fileName || !fileType) {
      return validationErrorResponse(request, "Missing required parameters", {
        requiredParams: ["fileName", "fileType"],
        providedParams: { fileName, fileType },
      })
    }

    // Validate file type
    const validation = validateFile({
      name: fileName,
      size: 0, // Size validation happens on actual upload
      type: fileType,
    })

    if (!validation.valid) {
      return validationErrorResponse(
        request,
        validation.error || "Invalid file",
        {}
      )
    }

    // Determine folder path
    const folder = projectId
      ? getProjectFolder(projectId, category)
      : "uploads/temp"

    // Generate signed URL
    const { signedUrl, key } = await getSignedUrlForUpload(fileName, fileType, {
      folder,
      metadata: {
        projectId: projectId || "",
        category,
      },
      expiresIn: 3600, // 1 hour
    })

    return successResponse(
      request,
      {
        signedUrl,
        key,
        expiresIn: 3600,
      },
      {
        statusCode: 200,
        startTime,
        message: "Signed URL generated successfully",
      }
    )
  } catch (error: any) {
    logger.error("Signed URL generation error:", { error })
    return internalErrorResponse(request, "Failed to generate signed URL", {
      help: "Please try again or contact support if the issue persists.",
      startTime,
      debug:
        process.env.NODE_ENV === "development"
          ? { error: error.message }
          : undefined,
    })
  }
}

/**
 * DELETE /api/upload/r2
 * Delete a file from R2 and database
 */
export async function DELETE(request: NextRequest) {
  const { startTime } = withTiming()

  try {
    const { searchParams } = new URL(request.url)
    const key = searchParams.get("key")
    const fileId = searchParams.get("fileId") // Database ID

    if (!key && !fileId) {
      return validationErrorResponse(
        request,
        "Either 'key' or 'fileId' parameter is required",
        {
          providedParams: { key, fileId },
        }
      )
    }

    const actualKey = key

    // Delete from R2
    if (actualKey) {
      await deleteFromR2(actualKey)
    }

    return successResponse(
      request,
      {
        deletedKey: actualKey,
        deletedFileId: fileId,
      },
      {
        statusCode: 200,
        startTime,
        message: "File deleted successfully",
      }
    )
  } catch (error: any) {
    logger.error("File deletion error:", { error })
    return internalErrorResponse(request, "File deletion failed", {
      help: "Please try again or contact support if the issue persists.",
      startTime,
      debug:
        process.env.NODE_ENV === "development"
          ? { error: error.message }
          : undefined,
    })
  }
}
