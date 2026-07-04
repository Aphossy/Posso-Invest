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
      if (!response.ok) throw new Error("Failed to get view URL")
      const result = await response.json()
      setViewUrl(
        result.success && result.data ? result.data.viewUrl : asset.fileUrl
      )
    } catch {
      setViewUrl(asset.fileUrl)
    } finally {
      setLoadingUrl(false)
    }
  }

  if (!asset) return null

  const displayName = truncateFilename(asset.name, 56)

  const handleDownload = async () => {
    try {
      const response = await fetch(`/api/assets/${asset.id}/download`)
      if (!response.ok) throw new Error()
      const result = await response.json()
      window.open(
        result.success && result.data ? result.data.downloadUrl : asset.fileUrl,
        "_blank"
      )
    } catch {
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
          <div className="relative flex min-h-[250px] items-center justify-center overflow-hidden rounded-lg bg-gray-50 dark:bg-gray-900 sm:min-h-[400px]">
            {loadingUrl ? (
              <div className="text-muted-foreground">Loading preview...</div>
            ) : (
              <img
                src={viewUrl || asset.fileUrl}
                alt={asset.alt || asset.name}
                className="max-h-[500px] max-w-full object-contain"
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
          <div className="relative overflow-hidden rounded-lg bg-black">
            {loadingUrl ? (
              <div className="flex min-h-[250px] items-center justify-center text-white">
                Loading video...
              </div>
            ) : (
              <video
                src={viewUrl || asset.fileUrl}
                controls
                className="max-h-[500px] w-full"
                preload="metadata">
                Your browser does not support the video tag.
              </video>
            )}
          </div>
        )

      case "audio":
        return (
          <div className="flex min-h-[150px] items-center justify-center rounded-lg bg-gray-50 p-8 dark:bg-gray-900">
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
            <div className="relative overflow-hidden rounded-lg bg-gray-50 dark:bg-gray-900">
              {loadingUrl ? (
                <div className="flex h-[400px] items-center justify-center text-muted-foreground">
                  Loading PDF...
                </div>
              ) : (
                <iframe
                  src={viewUrl || asset.fileUrl}
                  className="h-[400px] w-full border-0 sm:h-[560px]"
                  title={asset.name}
                />
              )}
            </div>
          )
        }
        return (
          <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 rounded-lg bg-gray-50 p-8 dark:bg-gray-900">
            <FileText className="h-16 w-16 text-muted-foreground" />
            <p className="text-center text-muted-foreground">
              Preview not available for this document type
            </p>
            <Button onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" />
              Download to View
            </Button>
          </div>
        )

      default:
        return (
          <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 rounded-lg bg-gray-50 p-8 dark:bg-gray-900">
            <FileText className="h-16 w-16 text-muted-foreground" />
            <p className="text-center text-muted-foreground">
              Preview not available for this file type
            </p>
            <Button onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" />
              Download File
            </Button>
          </div>
        )
    }
  }

  const contentBody = (
    <>
      {/* Action buttons */}
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
        {onEdit && (
          <Button size="sm" variant="outline" onClick={() => onEdit(asset)}>
            <Edit2 className="mr-2 h-4 w-4" />
            Edit
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={handleDownload}>
          <Download className="mr-2 h-4 w-4" />
          Download
        </Button>
        <Button size="sm" variant="outline" onClick={handleOpenInNewTab}>
          <ExternalLink className="mr-2 h-4 w-4" />
          Open in New Tab
        </Button>
      </div>

      {/* Preview */}
      <div className="mt-4">{renderPreview()}</div>

      {/* Metadata */}
      <div className="mt-6 space-y-4">
        {/* Badges */}
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

        {/* Tags */}
        {asset.tags && asset.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {asset.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                #{tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Details Grid */}
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
            <p className="flex items-center gap-1 text-sm font-medium">
              <Calendar className="h-3 w-3" />
              {format(new Date(asset.createdAt), "MMM dd, yyyy")}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Storage</p>
            <p className="text-sm font-medium capitalize">
              {asset.storageProvider || "Unknown"}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Views</p>
            <p className="flex items-center gap-1 text-sm font-medium">
              <Eye className="h-3 w-3" />
              {asset.viewCount || 0}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Downloads</p>
            <p className="flex items-center gap-1 text-sm font-medium">
              <Download className="h-3 w-3" />
              {asset.downloadCount || 0}
            </p>
          </div>
        </div>

        {asset.caption && (
          <div className="border-t pt-4">
            <p className="mb-1 text-sm text-muted-foreground">Caption</p>
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
