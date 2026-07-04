import type { NextRequest } from "next/server"
import logger from "@/utils/logger"

import { withTiming } from "@/lib/api-middleware"
import {
  errorResponse,
  internalErrorResponse,
  successResponse,
  validationErrorResponse,
} from "@/lib/api-response"
import {
  getFileMetadata,
  getSignedUrlForDownload,
  listFiles,
} from "@/lib/r2-enhanced"

/**
 * GET /api/upload/r2/files
 * List files from R2 storage
 */
export async function GET(request: NextRequest) {
  const { startTime } = withTiming()

  try {
    const { searchParams } = new URL(request.url)
    const prefix = searchParams.get("prefix") || ""
    const maxKeys = parseInt(searchParams.get("maxKeys") || "100")

    // Otherwise, list files directly from R2
    const r2Files = await listFiles(prefix, maxKeys)

    // Enhance with metadata
    const filesWithMetadata = await Promise.all(
      r2Files.slice(0, 50).map(async (file) => {
        try {
          if (!file.Key) return null
          const metadata = await getFileMetadata(file.Key)
          return {
            key: file.Key,
            size: file.Size,
            lastModified: file.LastModified,
            url: metadata.url,
            signedUrl: metadata.signedUrl,
            contentType: metadata.contentType,
          }
        } catch (error) {
          return {
            key: file.Key,
            size: file.Size,
            lastModified: file.LastModified,
          }
        }
      })
    )

    const validFiles = filesWithMetadata.filter(Boolean)

    return successResponse(
      request,
      {
        files: validFiles,
        total: r2Files.length,
        prefix,
      },
      {
        statusCode: 200,
        startTime,
        message: "Files listed successfully",
      }
    )
  } catch (error: any) {
    logger.error("File listing error:", { error })
    return internalErrorResponse(request, "Failed to list files", {
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
 * POST /api/upload/r2/files
 * Get download URL for a specific file
 */
export async function POST(request: NextRequest) {
  const { startTime } = withTiming()

  try {
    const body = await request.json()
    const { key, fileId } = body

    if (!key && !fileId) {
      return validationErrorResponse(
        request,
        "Either 'key' or 'fileId' is required",
        {
          providedParams: { key, fileId },
        }
      )
    }

    const actualKey = key

    // If fileId provided, get key from database

    if (!actualKey) {
      return validationErrorResponse(
        request,
        "Could not determine file key",
        {}
      )
    }

    // Generate signed URL
    const signedUrl = await getSignedUrlForDownload(actualKey, 3600)
    const metadata = await getFileMetadata(actualKey)

    return successResponse(
      request,
      {
        key: actualKey,
        signedUrl,
        url: metadata.url,
        size: metadata.size,
        contentType: metadata.contentType,
        expiresIn: 3600,
      },
      {
        statusCode: 200,
        startTime,
        message: "Download URL generated successfully",
      }
    )
  } catch (error: any) {
    logger.error("Download URL generation error:", { error })
    return internalErrorResponse(request, "Failed to generate download URL", {
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
 * DELETE /api/upload/r2/files
 * Delete a file (same as DELETE on parent route but kept for compatibility)
 */
export async function DELETE(request: NextRequest) {
  const { startTime } = withTiming()

  try {
    const body = await request.json()
    const { key, fileId } = body

    if (!key && !fileId) {
      return validationErrorResponse(
        request,
        "Either 'key' or 'fileId' is required",
        {
          providedParams: { key, fileId },
        }
      )
    }

    // Redirect to parent route's DELETE handler
    const deleteUrl = new URL(request.url)
    deleteUrl.pathname = "/api/upload/r2"
    deleteUrl.searchParams.set("key", key || "")
    if (fileId) deleteUrl.searchParams.set("fileId", fileId)

    return fetch(new Request(deleteUrl, { method: "DELETE" }))
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
