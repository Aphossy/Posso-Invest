import type { Asset } from "@/db/schemas/asset-schema"

/**
 * Get icon for asset type
 */
export function getAssetTypeIcon(assetType: string) {
  const icons: Record<string, string> = {
    image: "Image",
    video: "Video",
    audio: "Headphones",
    document: "FileText",
    archive: "Archive",
    code: "Code",
    font: "Type",
    other: "File",
  }
  return icons[assetType] || "File"
}

/**
 * Get color for asset type
 */
export function getAssetTypeColor(assetType: string): string {
  const colors: Record<string, string> = {
    image: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    video:
      "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
    audio: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
    document:
      "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    archive:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    code: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
    font: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300",
    other: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
  }
  return colors[assetType] || colors.other
}

/**
 * Get color for visibility
 */
export function getVisibilityColor(visibility: string): string {
  const colors: Record<string, string> = {
    public: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    authenticated:
      "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    committee:
      "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
    admin: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    private: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
  }
  return colors[visibility] || colors.private
}

/**
 * Format visibility label for TrustLink Group
 */
export function formatVisibilityLabel(visibility: string): string {
  const labels: Record<string, string> = {
    public: "Public",
    authenticated: "All Members",
    committee: "Committee Only",
    admin: "Admin Only",
    private: "Private (Only Me)",
  }
  return labels[visibility] || visibility
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

/**
 * Determine asset type from MIME type
 */
export function determineAssetType(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "image"
  if (mimeType.startsWith("video/")) return "video"
  if (mimeType.startsWith("audio/")) return "audio"
  if (
    mimeType.includes("pdf") ||
    mimeType.includes("word") ||
    mimeType.includes("document") ||
    mimeType.includes("text") ||
    mimeType.includes("spreadsheet") ||
    mimeType.includes("presentation")
  ) {
    return "document"
  }
  if (
    mimeType.includes("zip") ||
    mimeType.includes("rar") ||
    mimeType.includes("archive") ||
    mimeType.includes("compressed")
  ) {
    return "archive"
  }
  if (
    mimeType.includes("javascript") ||
    mimeType.includes("json") ||
    mimeType.includes("html") ||
    mimeType.includes("css")
  ) {
    return "code"
  }
  if (mimeType.includes("font")) return "font"
  return "other"
}

/**
 * Check if asset is previewable
 */
export function isPreviewable(asset: Asset): boolean {
  const previewableTypes = ["image", "video", "audio", "document"]
  return previewableTypes.includes(asset.assetType)
}

/**
 * Get preview URL for asset
 */
export function getPreviewUrl(asset: Asset): string {
  if (asset.previewUrl) return asset.previewUrl
  if (asset.thumbnailUrl && asset.assetType !== "image")
    return asset.thumbnailUrl
  return asset.fileUrl
}

/**
 * Format visibility label
 */
export function formatVisibility(visibility: string): string {
  return formatVisibilityLabel(visibility)
}

/**
 * Format asset type label
 */
export function formatAssetTypeLabel(assetType: string): string {
  const labels: Record<string, string> = {
    image: "Image",
    video: "Video",
    audio: "Audio",
    document: "Document",
    archive: "Archive",
    code: "Code",
    font: "Font",
    other: "Other",
  }
  return labels[assetType] || formatSlugLabel(assetType)
}

/**
 * Format category label for TrustLink Group Ikimina categories
 */
export function formatAssetCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    minutes: "Meeting Minutes",
    constitution: "Constitution & Governance",
    financial: "Financial Reports",
    contribution: "Contribution Records",
    loan: "Loan Documents",
    correspondence: "Letters & Correspondence",
    legal: "Legal Documents",
    media: "Photos & Media",
    other: "General",
  }
  return labels[category] || formatSlugLabel(category)
}

function formatSlugLabel(value: string): string {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ")
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split(".")
  return parts.length > 1 ? parts.pop()!.toUpperCase() : ""
}

/**
 * Truncate filename
 */
export function truncateFilename(filename: string, maxLength = 30): string {
  if (filename.length <= maxLength) return filename

  const extension = getFileExtension(filename)
  const nameWithoutExt = filename.substring(0, filename.lastIndexOf("."))
  const truncated = nameWithoutExt.substring(
    0,
    maxLength - extension.length - 4
  )

  return `${truncated}...${extension.toLowerCase()}`
}

/**
 * Check if user can edit asset (TrustLink Group roles)
 */
export function canEditAsset(
  asset: Asset,
  userRole?: string,
  userId?: string
): boolean {
  if (!userRole || !userId) return false
  if (userRole === "admin") return true
  if (asset.uploadedBy === userId) return true
  if (
    (userRole === "treasurer" || userRole === "secretary") &&
    asset.visibility !== "private"
  )
    return true
  return false
}

/**
 * Check if user can delete asset (TrustLink Group roles)
 */
export function canDeleteAsset(
  asset: Asset,
  userRole?: string,
  userId?: string
): boolean {
  if (!userRole || !userId) return false
  if (userRole === "admin") return true
  if (asset.uploadedBy === userId) return true
  return false
}

/**
 * Get category color for TrustLink Group Ikimina categories
 */
export function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    minutes: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    constitution:
      "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300",
    financial:
      "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    contribution:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300",
    loan: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
    correspondence:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    legal: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    media:
      "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
    other: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
  }
  return (
    colors[category] ||
    "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
  )
}
