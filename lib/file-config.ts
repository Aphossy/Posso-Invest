// C:\Users\user\OneDrive\Desktop\trustlink-group\lib\file-config.ts
/**
 * File Management Configuration
 * Fully type-safe with literal unions and type guards
 */

/* ====================== CONFIG OBJECTS (as const) ====================== */

export const FILE_SIZE_LIMITS = {
  IMAGE: 10 * 1024 * 1024, // 10MB
  DOCUMENT: 50 * 1024 * 1024, // 50MB
  VIDEO: 500 * 1024 * 1024, // 500MB
  AUDIO: 50 * 1024 * 1024, // 50MB
  ARCHIVE: 100 * 1024 * 1024, // 100MB
  DEFAULT: 25 * 1024 * 1024, // 25MB
} as const

export const ALLOWED_FILE_TYPES = {
  IMAGE: [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/svg+xml",
  ] as const,

  DOCUMENT: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain",
    "text/csv",
  ] as const,

  VIDEO: [
    "video/mp4",
    "video/mpeg",
    "video/quicktime",
    "video/x-msvideo",
    "video/webm",
  ] as const,

  AUDIO: [
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/webm",
    "audio/ogg",
  ] as const,

  ARCHIVE: [
    "application/zip",
    "application/x-zip-compressed",
    "application/x-rar-compressed",
    "application/x-tar",
    "application/gzip",
    "application/x-7z-compressed",
  ] as const,

  CODE: [
    "text/html",
    "text/css",
    "text/javascript",
    "application/json",
    "application/xml",
    "text/xml",
  ] as const,
} as const

export const STORAGE_PROVIDER = {
  IMAGE: "cloudinary",
  DOCUMENT: "r2",
  VIDEO: "r2",
  AUDIO: "r2",
  ARCHIVE: "r2",
  DEFAULT: "r2",
} as const

export const R2_FOLDERS = {
  PROJECT_DOCUMENTS: "projects/{projectId}/documents",
  PROJECT_ASSETS: "projects/{projectId}/assets",
  PROJECT_MEDIA: "projects/{projectId}/media",
  PROJECT_CONTRACTS: "projects/{projectId}/contracts",
  PROJECT_DESIGNS: "projects/{projectId}/designs",
  PROJECT_CODE: "projects/{projectId}/code",
  PROJECT_ARCHIVES: "projects/{projectId}/archives",
  CLIENT_DOCUMENTS: "clients/{clientId}/documents",
  COMMITTEE_DOCUMENTS: "committees/{committeeId}/documents",
  GENERAL_UPLOADS: "uploads/general",
  TEMP_UPLOADS: "uploads/temp",
} as const

export const FILE_CATEGORIES = {
  CONTRACT: "contract",
  PROPOSAL: "proposal",
  REPORT: "report",
  DESIGN: "design",
  MOCKUP: "mockup",
  WIREFRAME: "wireframe",
  DOCUMENTATION: "documentation",
  CODE: "code",
  ASSET: "asset",
  MEDIA: "media",
  SCREENSHOT: "screenshot",
  VIDEO: "video",
  AUDIO: "audio",
  ARCHIVE: "archive",
  OTHER: "other",
} as const

/* ====================== MIME TYPE UNIONS ====================== */

// Extract literal types from arrays
export type ImageMimeType = (typeof ALLOWED_FILE_TYPES.IMAGE)[number]
export type DocumentMimeType = (typeof ALLOWED_FILE_TYPES.DOCUMENT)[number]
export type VideoMimeType = (typeof ALLOWED_FILE_TYPES.VIDEO)[number]
export type AudioMimeType = (typeof ALLOWED_FILE_TYPES.AUDIO)[number]
export type ArchiveMimeType = (typeof ALLOWED_FILE_TYPES.ARCHIVE)[number]
export type CodeMimeType = (typeof ALLOWED_FILE_TYPES.CODE)[number]

export type AnyAllowedMimeType =
  | ImageMimeType
  | DocumentMimeType
  | VideoMimeType
  | AudioMimeType
  | ArchiveMimeType
  | CodeMimeType

/* ====================== TYPE GUARDS ====================== */

export function isImageMimeType(mimeType: string): mimeType is ImageMimeType {
  return ALLOWED_FILE_TYPES.IMAGE.includes(mimeType as any)
}

export function isDocumentMimeType(
  mimeType: string
): mimeType is DocumentMimeType {
  return ALLOWED_FILE_TYPES.DOCUMENT.includes(mimeType as any)
}

export function isVideoMimeType(mimeType: string): mimeType is VideoMimeType {
  return ALLOWED_FILE_TYPES.VIDEO.includes(mimeType as any)
}

export function isAudioMimeType(mimeType: string): mimeType is AudioMimeType {
  return ALLOWED_FILE_TYPES.AUDIO.includes(mimeType as any)
}

export function isArchiveMimeType(
  mimeType: string
): mimeType is ArchiveMimeType {
  return ALLOWED_FILE_TYPES.ARCHIVE.includes(mimeType as any)
}

export function isCodeMimeType(mimeType: string): mimeType is CodeMimeType {
  return ALLOWED_FILE_TYPES.CODE.includes(mimeType as any)
}

export function isAllowedMimeType(
  mimeType: string
): mimeType is AnyAllowedMimeType {
  return (
    isImageMimeType(mimeType) ||
    isDocumentMimeType(mimeType) ||
    isVideoMimeType(mimeType) ||
    isAudioMimeType(mimeType) ||
    isArchiveMimeType(mimeType) ||
    isCodeMimeType(mimeType)
  )
}

/* ====================== HELPER FUNCTIONS (Type-Safe) ====================== */

/**
 * Get file category from MIME type
 */
export function getFileCategoryFromMimeType(
  mimeType: string
): keyof typeof FILE_CATEGORIES {
  if (isImageMimeType(mimeType)) return "ASSET"
  if (isDocumentMimeType(mimeType)) {
    if (mimeType.includes("pdf")) return "DOCUMENTATION"
    if (mimeType.includes("word")) return "DOCUMENTATION"
    if (mimeType.includes("excel") || mimeType.includes("csv")) return "REPORT"
    return "OTHER"
  }
  if (isVideoMimeType(mimeType)) return "VIDEO"
  if (isAudioMimeType(mimeType)) return "AUDIO"
  if (isArchiveMimeType(mimeType)) return "ARCHIVE"
  return "OTHER"
}

/**
 * Get storage provider for file type
 */
export function getStorageProvider(
  mimeType: string
): (typeof STORAGE_PROVIDER)[keyof typeof STORAGE_PROVIDER] {
  if (isImageMimeType(mimeType)) return STORAGE_PROVIDER.IMAGE
  if (isDocumentMimeType(mimeType)) return STORAGE_PROVIDER.DOCUMENT
  if (isVideoMimeType(mimeType)) return STORAGE_PROVIDER.VIDEO
  if (isAudioMimeType(mimeType)) return STORAGE_PROVIDER.AUDIO
  if (isArchiveMimeType(mimeType)) return STORAGE_PROVIDER.ARCHIVE
  return STORAGE_PROVIDER.DEFAULT
}

/**
 * Get max file size for type
 */
export function getMaxFileSize(mimeType: string): number {
  if (isImageMimeType(mimeType)) return FILE_SIZE_LIMITS.IMAGE
  if (isDocumentMimeType(mimeType)) return FILE_SIZE_LIMITS.DOCUMENT
  if (isVideoMimeType(mimeType)) return FILE_SIZE_LIMITS.VIDEO
  if (isAudioMimeType(mimeType)) return FILE_SIZE_LIMITS.AUDIO
  if (isArchiveMimeType(mimeType)) return FILE_SIZE_LIMITS.ARCHIVE
  return FILE_SIZE_LIMITS.DEFAULT
}

/**
 * Validate file
 */
export function validateFile(file: {
  name: string
  size: number
  type: string
}): { valid: boolean; error?: string } {
  const maxSize = getMaxFileSize(file.type)
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size exceeds maximum allowed size of ${formatBytes(maxSize)}`,
    }
  }

  if (!isAllowedMimeType(file.type)) {
    return {
      valid: false,
      error: `File type ${file.type} is not allowed`,
    }
  }

  return { valid: true }
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return "0 Bytes"

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

/**
 * Get folder path for project files
 */
export function getProjectFolder(
  projectId: string,
  category: keyof typeof FILE_CATEGORIES
): string {
  const folderMap: Record<keyof typeof FILE_CATEGORIES, string> = {
    CONTRACT: R2_FOLDERS.PROJECT_CONTRACTS,
    PROPOSAL: R2_FOLDERS.PROJECT_DOCUMENTS,
    REPORT: R2_FOLDERS.PROJECT_DOCUMENTS,
    DESIGN: R2_FOLDERS.PROJECT_DESIGNS,
    MOCKUP: R2_FOLDERS.PROJECT_DESIGNS,
    WIREFRAME: R2_FOLDERS.PROJECT_DESIGNS,
    DOCUMENTATION: R2_FOLDERS.PROJECT_DOCUMENTS,
    CODE: R2_FOLDERS.PROJECT_CODE,
    ASSET: R2_FOLDERS.PROJECT_ASSETS,
    MEDIA: R2_FOLDERS.PROJECT_MEDIA,
    SCREENSHOT: R2_FOLDERS.PROJECT_MEDIA,
    VIDEO: R2_FOLDERS.PROJECT_MEDIA,
    AUDIO: R2_FOLDERS.PROJECT_MEDIA,
    ARCHIVE: R2_FOLDERS.PROJECT_ARCHIVES,
    OTHER: R2_FOLDERS.PROJECT_DOCUMENTS,
  }

  return folderMap[category].replace("{projectId}", projectId)
}
