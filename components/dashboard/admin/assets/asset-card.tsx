"use client"

import { useState } from "react"
import type { ReactNode } from "react"
import type { Asset } from "@/db/schemas/asset-schema"
import {
  formatFileSize,
  getAssetTypeColor,
  truncateFilename,
} from "@/utils/asset-utils"
import { format } from "date-fns"
import {
  Archive,
  Code,
  Download,
  Edit,
  ExternalLink,
  Eye,
  File,
  FileText,
  Headphones,
  Image,
  MoreVertical,
  Trash2,
  Type,
  Video,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface AssetCardProps {
  asset: Asset
  onPreview?: (asset: Asset) => void
  onEdit?: (asset: Asset) => void
  onDelete?: (asset: Asset) => void
  onDownload?: (asset: Asset) => void
  selected?: boolean
  onSelect?: (asset: Asset) => void
  showActions?: boolean
  footerContent?: ReactNode
}

const typeIcons: Record<string, any> = {
  image: Image,
  video: Video,
  audio: Headphones,
  document: FileText,
  archive: Archive,
  code: Code,
  font: Type,
  other: File,
}

export function AssetCard({
  asset,
  onPreview,
  onEdit,
  onDelete,
  onDownload,
  selected = false,
  onSelect,
  showActions = true,
  footerContent,
}: AssetCardProps) {
  const [imageError, setImageError] = useState(false)
  const TypeIcon = typeIcons[asset.assetType] || File

  const handleClick = () => {
    if (onSelect) {
      onSelect(asset)
    } else if (onPreview) {
      onPreview(asset)
    }
  }

  const renderThumbnail = () => {
    if (asset.assetType === "image" && !imageError) {
      return (
        <img
          src={asset.thumbnailUrl || asset.fileUrl}
          alt={asset.alt || asset.name}
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
        />
      )
    }

    if (asset.thumbnailUrl && !imageError) {
      return (
        <img
          src={asset.thumbnailUrl}
          alt={asset.name}
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
        />
      )
    }

    return (
      <div className="flex items-center justify-center w-full h-full bg-muted">
        <TypeIcon className="h-12 w-12 text-muted-foreground" />
      </div>
    )
  }

  return (
    <Card
      className={cn(
        "group relative overflow-hidden transition-all py-0 hover:shadow-md cursor-pointer",
        selected && "ring-2 ring-primary"
      )}
      onClick={handleClick}>
      {/* Thumbnail */}
      <div className="relative aspect-square overflow-hidden bg-muted">
        {renderThumbnail()}

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          {onPreview && (
            <Button
              size="sm"
              variant="secondary"
              onClick={(e) => {
                e.stopPropagation()
                onPreview(asset)
              }}>
              <Eye className="h-4 w-4" />
            </Button>
          )}
          {onDownload && (
            <Button
              size="sm"
              variant="secondary"
              onClick={(e) => {
                e.stopPropagation()
                onDownload(asset)
              }}>
              <Download className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Type Badge */}
        <div className="absolute top-2 left-2">
          <Badge className={cn("text-xs", getAssetTypeColor(asset.assetType))}>
            {asset.assetType}
          </Badge>
        </div>

        {/* Actions Menu */}
        {showActions && (
          <div className="absolute top-2 right-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-8 w-8 p-0 transition-opacity opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onPreview && (
                  <DropdownMenuItem onClick={() => onPreview(asset)}>
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </DropdownMenuItem>
                )}
                {onDownload && (
                  <DropdownMenuItem onClick={() => onDownload(asset)}>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => window.open(asset.fileUrl, "_blank")}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in New Tab
                </DropdownMenuItem>
                {onEdit && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onEdit(asset)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                  </>
                )}
                {onDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onDelete(asset)}
                      className="text-destructive focus:text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* Featured Badge */}
        {asset.isFeatured && (
          <div className="absolute bottom-2 left-2">
            <Badge variant="secondary" className="text-xs">
              Featured
            </Badge>
          </div>
        )}
      </div>

      {/* Content */}
      <CardContent className="p-3">
        <div className="space-y-2">
          <h3 className="font-medium text-sm truncate" title={asset.name}>
            {asset.name}
          </h3>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{formatFileSize(asset.fileSize || 0)}</span>
            <span>{format(new Date(asset.createdAt), "MMM dd")}</span>
          </div>

          {asset.category && (
            <Badge variant="outline" className="text-xs">
              {asset.category}
            </Badge>
          )}

          {asset.tags && asset.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {asset.tags.slice(0, 2).map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  #{tag}
                </Badge>
              ))}
              {asset.tags.length > 2 && (
                <Badge variant="outline" className="text-xs">
                  +{asset.tags.length - 2}
                </Badge>
              )}
            </div>
          )}

          {footerContent}
        </div>
      </CardContent>
    </Card>
  )
}
