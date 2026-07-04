"use client"

import { useEffect, useState } from "react"
import type { Asset } from "@/db/schemas/asset-schema"
import {
  formatAssetCategoryLabel,
  formatAssetTypeLabel,
  formatFileSize,
  formatVisibility,
  getAssetTypeColor,
  getVisibilityColor,
  truncateFilename,
} from "@/utils/asset-utils"
import { format } from "date-fns"
import {
  Calendar,
  Download,
  Edit2,
  ExternalLink,
  Eye,
  FileText,
  ZoomIn,
  ZoomOut,
} from "lucide-react"

import { useMediaQuery } from "@/hooks/use-media-query"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"

interface AssetPreviewProps {
  asset: Asset | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit?: (asset: Asset) => void
}

export function AssetPreview({
  asset,
  open,
  onOpenChange,
  onEdit,
}: AssetPreviewProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)")
  const [zoom, setZoom] = useState(100)
  const [viewUrl, setViewUrl] = useState<string | null>(null)
  const [loadingUrl, setLoadingUrl] = useState(false)

  useEffect(() => {
    if (asset && open) {
      // Fetch view URL (which tracks the view and returns signed URL for R2)
      fetchViewUrl()
    }
    if (!open) {
      setZoom(100)
      setViewUrl(null)
    }
  }, [asset, open])

  const fetchViewUrl = async () => {
    if (!asset) return

    setLoadingUrl(true)
    try {
      const response = await fetch(`/api/assets/${asset.id}/view`, {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error("Failed to get view URL")
      }

      const result = await response.json()
      if (result.success && result.data) {
        setViewUrl(result.data.viewUrl)
      } else {
        // Fallback to stored URL
        setViewUrl(asset.fileUrl)
      }
    } catch (error) {
      console.error("Error fetching view URL:", error)
      // Fallback to stored URL
      setViewUrl(asset.fileUrl)
    } finally {
      setLoadingUrl(false)
    }
  }

  if (!asset) return null

  const displayName = truncateFilename(asset.name, 56)

  const handleDownload = async () => {
    try {
      // Get download URL with tracking
      const response = await fetch(`/api/assets/${asset.id}/download`)

      if (!response.ok) {
        throw new Error("Failed to get download URL")
      }

      const result = await response.json()
      if (result.success && result.data) {
        window.open(result.data.downloadUrl, "_blank")
      } else {
        window.open(asset.fileUrl, "_blank")
      }
    } catch (error) {
      console.error("Error downloading:", error)
      // Fallback
      window.open(asset.fileUrl, "_blank")
    }
  }

  const handleOpenInNewTab = () => {
    window.open(viewUrl || asset.fileUrl, "_blank")
  }

  const renderPreview = () => {
    switch (asset.assetType) {
      case "image":
        return (
          <div className="relative flex min-h-100 items-center justify-center overflow-hidden rounded-lg bg-gray-50 dark:bg-gray-900">
            {loadingUrl ? (
              <div className="text-muted-foreground">Loading preview...</div>
            ) : (
              <img
                src={viewUrl || asset.fileUrl}
                alt={asset.alt || asset.name}
                className="max-h-150 max-w-full object-contain"
                style={{ transform: `scale(${zoom / 100})` }}
              />
            )}
            <div className="absolute bottom-4 right-4 flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setZoom(Math.max(50, zoom - 25))}
                disabled={zoom <= 50}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setZoom(100)}>
                {zoom}%
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setZoom(Math.min(200, zoom + 25))}
                disabled={zoom >= 200}>
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )

      case "video":
        return (
          <div className="relative bg-black rounded-lg overflow-hidden">
            {loadingUrl ? (
              <div className="flex min-h-100 items-center justify-center text-white">
                Loading video...
              </div>
            ) : (
              <video
                src={viewUrl || asset.fileUrl}
                controls
                className="max-h-150 w-full"
                preload="metadata">
                Your browser does not support the video tag.
              </video>
            )}
          </div>
        )

      case "audio":
        return (
          <div className="flex min-h-50 items-center justify-center rounded-lg bg-gray-50 p-8 dark:bg-gray-900">
            {loadingUrl ? (
              <div className="text-muted-foreground">Loading audio...</div>
            ) : (
              <audio
                src={viewUrl || asset.fileUrl}
                controls
                className="w-full max-w-md">
                Your browser does not support the audio tag.
              </audio>
            )}
          </div>
        )

      case "document":
        if (asset.fileType?.includes("pdf")) {
          return (
            <div className="relative bg-gray-50 dark:bg-gray-900 rounded-lg overflow-hidden">
              {loadingUrl ? (
                <div className="flex h-150 items-center justify-center text-muted-foreground">
                  Loading PDF...
                </div>
              ) : (
                <iframe
                  src={viewUrl || asset.fileUrl}
                  className="h-150 w-full border-0"
                  title={asset.name}
                />
              )}
            </div>
          )
        }
        return (
          <div className="flex min-h-75 flex-col items-center justify-center gap-4 rounded-lg bg-gray-50 p-8 dark:bg-gray-900">
            <FileText className="h-20 w-20 text-muted-foreground" />
            <p className="text-center text-muted-foreground">
              Preview not available for this document type
            </p>
            <Button onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download to View
            </Button>
          </div>
        )

      default:
        return (
          <div className="flex min-h-75 flex-col items-center justify-center gap-4 rounded-lg bg-gray-50 p-8 dark:bg-gray-900">
            <FileText className="h-20 w-20 text-muted-foreground" />
            <p className="text-center text-muted-foreground">
              Preview not available for this file type
            </p>
            <Button onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download File
            </Button>
          </div>
        )
    }
  }

  const contentBody = (
    <>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
        {onEdit && (
          <Button size="sm" variant="outline" onClick={() => onEdit(asset)}>
            <Edit2 className="h-4 w-4 mr-2" />
            Edit
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={handleDownload}>
          <Download className="h-4 w-4 mr-2" />
          Download
        </Button>
        <Button size="sm" variant="outline" onClick={handleOpenInNewTab}>
          <ExternalLink className="h-4 w-4 mr-2" />
          Open in New Tab
        </Button>
      </div>

      <div className="mt-4">{renderPreview()}</div>

      <div className="mt-6 space-y-4">
        <div className="flex flex-wrap gap-2">
          <Badge className={getAssetTypeColor(asset.assetType)}>
            {formatAssetTypeLabel(asset.assetType)}
          </Badge>
          <Badge className={getVisibilityColor(asset.visibility)}>
            {formatVisibility(asset.visibility)}
          </Badge>
          {asset.category && (
            <Badge variant="outline">
              {formatAssetCategoryLabel(asset.category)}
            </Badge>
          )}
          {asset.isFeatured && <Badge variant="secondary">Featured</Badge>}
        </div>

        {asset.tags && asset.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {asset.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                #{tag}
              </Badge>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 border-t pt-4 sm:grid-cols-2">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">File Size</p>
            <p className="text-sm font-medium">
              {formatFileSize(asset.fileSize || 0)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">File Type</p>
            <p className="text-sm font-medium">{asset.fileType || "Unknown"}</p>
          </div>
          {asset.dimensions && (
            <>
              {asset.dimensions.width && asset.dimensions.height && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Dimensions</p>
                  <p className="text-sm font-medium">
                    {asset.dimensions.width} × {asset.dimensions.height}
                  </p>
                </div>
              )}
              {asset.dimensions.duration && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Duration</p>
                  <p className="text-sm font-medium">
                    {Math.floor(asset.dimensions.duration / 60)}:
                    {String(
                      Math.floor(asset.dimensions.duration % 60)
                    ).padStart(2, "0")}
                  </p>
                </div>
              )}
            </>
          )}
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Uploaded</p>
            <p className="text-sm font-medium flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {format(new Date(asset.createdAt), "MMM dd, yyyy")}
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Views</p>
            <p className="text-sm font-medium flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {asset.viewCount || 0}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Downloads</p>
            <p className="text-sm font-medium flex items-center gap-1">
              <Download className="h-3 w-3" />
              {asset.downloadCount || 0}
            </p>
          </div>
        </div>

        {asset.caption && (
          <div className="border-t pt-4">
            <p className="text-sm text-muted-foreground mb-1">Caption</p>
            <p className="text-sm">{asset.caption}</p>
          </div>
        )}
      </div>
    </>
  )

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] w-[95vw] overflow-y-auto p-0 sm:max-w-4xl">
          <div className="p-4 md:p-6">
            <DialogHeader>
              <DialogTitle
                className="max-w-full truncate text-xl"
                title={asset.name}>
                {displayName}
              </DialogTitle>
              {asset.description && (
                <DialogDescription>{asset.description}</DialogDescription>
              )}
            </DialogHeader>
            {contentBody}
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[92vh]">
        <DrawerHeader className="text-left">
          <DrawerTitle className="max-w-full truncate" title={asset.name}>
            {displayName}
          </DrawerTitle>
          <DrawerDescription>
            {asset.description || "Preview file details, metadata, and usage."}
          </DrawerDescription>
        </DrawerHeader>
        <div className="overflow-y-auto px-4 pb-4">{contentBody}</div>
      </DrawerContent>
    </Drawer>
  )
}
