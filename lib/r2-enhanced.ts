// lib\r2-enhanced.ts
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

export interface FileObject {
  Key?: string
  LastModified?: Date
  ETag?: string
  Size?: number
  StorageClass?: string
}

export interface UploadOptions {
  folder?: string // e.g., 'projects/PROJECT_ID/documents'
  contentType?: string
  metadata?: Record<string, string>
  makePublic?: boolean
  expiresIn?: number // For signed URLs
}

export interface FileMetadata {
  key: string
  url: string
  signedUrl?: string
  size: number
  contentType: string
  uploadedAt: Date
  metadata?: Record<string, string>
}

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID!
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME!
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL // Optional: Your R2 public domain

const S3 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
})

/**
 * Generate a structured file path
 */
export function generateFilePath(
  fileName: string,
  folder?: string,
  preserveOriginalName = false
): string {
  const timestamp = Date.now()
  const randomStr = Math.random().toString(36).substring(2, 8)
  const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_")
  const ext = sanitizedName.split(".").pop()
  const nameWithoutExt = sanitizedName.substring(
    0,
    sanitizedName.lastIndexOf(".")
  )

  const finalName = preserveOriginalName
    ? sanitizedName
    : `${nameWithoutExt}_${timestamp}_${randomStr}.${ext}`

  return folder ? `${folder}/${finalName}` : finalName
}

/**
 * Upload a file to R2
 */
export async function uploadFileToR2(
  file: Buffer | Uint8Array,
  fileName: string,
  options: UploadOptions = {}
): Promise<FileMetadata> {
  const {
    folder,
    contentType = "application/octet-stream",
    metadata = {},
    makePublic = false,
  } = options

  const filePath = generateFilePath(fileName, folder)

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: filePath,
    Body: file,
    ContentType: contentType,
    Metadata: {
      ...metadata,
      uploadedAt: new Date().toISOString(),
    },
    ...(makePublic && { ACL: "public-read" }),
  })

  try {
    await S3.send(command)

    // Get file info
    const headCommand = new HeadObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: filePath,
    })
    const headResponse = await S3.send(headCommand)

    // Generate URLs
    const publicUrl = R2_PUBLIC_URL
      ? `${R2_PUBLIC_URL}/${filePath}`
      : `https://${R2_BUCKET_NAME}.${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${filePath}`

    const signedUrl = await getSignedUrlForDownload(filePath, 3600)

    return {
      key: filePath,
      url: publicUrl,
      signedUrl,
      size: headResponse.ContentLength || 0,
      contentType: headResponse.ContentType || contentType,
      uploadedAt: headResponse.LastModified || new Date(),
      metadata: headResponse.Metadata,
    }
  } catch (error) {
    console.error("Error uploading file to R2:", error)
    throw error
  }
}

/**
 * Generate signed URL for upload (for direct client uploads)
 */
export async function getSignedUrlForUpload(
  fileName: string,
  contentType: string,
  options: UploadOptions = {}
): Promise<{ signedUrl: string; key: string }> {
  const { folder, metadata = {}, expiresIn = 3600 } = options
  const filePath = generateFilePath(fileName, folder)

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: filePath,
    ContentType: contentType,
    Metadata: {
      ...metadata,
      uploadedAt: new Date().toISOString(),
    },
  })

  try {
    const signedUrl = await getSignedUrl(S3, command, { expiresIn })
    return { signedUrl, key: filePath }
  } catch (error) {
    console.error("Error generating signed URL for upload:", error)
    throw error
  }
}

/**
 * Generate signed URL for download
 */
export async function getSignedUrlForDownload(
  key: string,
  expiresIn = 3600
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  })

  try {
    const signedUrl = await getSignedUrl(S3, command, { expiresIn })
    return signedUrl
  } catch (error) {
    console.error("Error generating signed URL for download:", error)
    throw error
  }
}

/**
 * List files with optional prefix (folder)
 */
export async function listFiles(
  prefix: string = "",
  maxKeys = 1000
): Promise<FileObject[]> {
  const command = new ListObjectsV2Command({
    Bucket: R2_BUCKET_NAME,
    Prefix: prefix,
    MaxKeys: maxKeys,
  })

  try {
    const response = await S3.send(command)
    return response.Contents || []
  } catch (error) {
    console.error("Error listing files:", error)
    throw error
  }
}

/**
 * Get file metadata
 */
export async function getFileMetadata(key: string): Promise<FileMetadata> {
  const command = new HeadObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  })

  try {
    const response = await S3.send(command)

    const publicUrl = R2_PUBLIC_URL
      ? `${R2_PUBLIC_URL}/${key}`
      : `https://${R2_BUCKET_NAME}.${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${key}`

    const signedUrl = await getSignedUrlForDownload(key, 3600)

    return {
      key,
      url: publicUrl,
      signedUrl,
      size: response.ContentLength || 0,
      contentType: response.ContentType || "application/octet-stream",
      uploadedAt: response.LastModified || new Date(),
      metadata: response.Metadata,
    }
  } catch (error) {
    console.error("Error getting file metadata:", error)
    throw error
  }
}

/**
 * Delete a file
 */
export async function deleteFile(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  })

  try {
    await S3.send(command)
  } catch (error) {
    console.error("Error deleting file:", error)
    throw error
  }
}

/**
 * Delete multiple files
 */
export async function deleteFiles(keys: string[]): Promise<void> {
  const deletePromises = keys.map((key) => deleteFile(key))
  await Promise.all(deletePromises)
}

/**
 * Copy/Move a file
 */
export async function copyFile(
  sourceKey: string,
  destinationKey: string
): Promise<void> {
  const command = new CopyObjectCommand({
    Bucket: R2_BUCKET_NAME,
    CopySource: `${R2_BUCKET_NAME}/${sourceKey}`,
    Key: destinationKey,
  })

  try {
    await S3.send(command)
  } catch (error) {
    console.error("Error copying file:", error)
    throw error
  }
}

/**
 * Move a file (copy then delete)
 */
export async function moveFile(
  sourceKey: string,
  destinationKey: string
): Promise<void> {
  await copyFile(sourceKey, destinationKey)
  await deleteFile(sourceKey)
}

/**
 * Check if file exists
 */
export async function fileExists(key: string): Promise<boolean> {
  try {
    const command = new HeadObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    })
    await S3.send(command)
    return true
  } catch (error) {
    return false
  }
}

/**
 * Get file size
 */
export async function getFileSize(key: string): Promise<number> {
  const command = new HeadObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  })

  try {
    const response = await S3.send(command)
    return response.ContentLength || 0
  } catch (error) {
    console.error("Error getting file size:", error)
    throw error
  }
}
