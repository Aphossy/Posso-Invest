"use client"

import { useState } from "react"
import type { Asset } from "@/db/schemas/asset-schema"
import { formatAssetTypeLabel, formatFileSize } from "@/utils/asset-utils"
import { Edit2, Upload } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { useAssetOperations } from "@/hooks/api/use-client-assets"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"

import { AssetCard } from "./asset-card"
import { AssetPreview } from "./asset-preview"
import { EditAssetDialog } from "./edit-asset-dialog"

interface AssetGridProps {
  assets: Asset[]
  loading?: boolean
  onAssetSelect?: (asset: Asset) => void
  selectedAssets?: Asset[]
  showUpload?: boolean
  onUploadClick?: () => void
  viewMode?: "grid" | "list"
  onViewModeChange?: (mode: "grid" | "list") => void
}

export function AssetGrid({
  assets,
  loading = false,
  onAssetSelect,
  selectedAssets = [],
  showUpload = false,
  onUploadClick,
  viewMode = "grid",
  onViewModeChange,
}: AssetGridProps) {
  const [previewAsset, setPreviewAsset] = useState<Asset | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [editAsset, setEditAsset] = useState<Asset | null>(null)
  const [deleteCandidate, setDeleteCandidate] = useState<Asset | null>(null)
  const [deleteConfirmText, setDeleteConfirmText] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)
  const { deleteAsset } = useAssetOperations()
  const requiredDeleteText = "DELETE"

  const handlePreview = (asset: Asset) => {
    setPreviewAsset(asset)
    setPreviewOpen(true)
  }

  const handleDownload = async (asset: Asset) => {
    try {
      // Get download URL with tracking
      const response = await fetch(`/api/assets/${asset.id}/download`)

      if (!response.ok) {
        throw new Error("Failed to get download URL")
      }

      const result = await response.json()
      if (result.success && result.data) {
        window.open(result.data.downloadUrl, "_blank")
        toast.success("Download started")
      } else {
        window.open(asset.fileUrl, "_blank")
        toast.success("Download started")
      }
    } catch (error) {
      console.error("Download error:", error)
      toast.error("Failed to download asset")
    }
  }

  const handleDelete = (asset: Asset) => {
    setDeleteCandidate(asset)
    setDeleteConfirmText("")
  }

  const handleEdit = (asset: Asset) => {
    setEditAsset(asset)
    setPreviewOpen(false)
  }

  const confirmDelete = async () => {
    if (!deleteCandidate || deleteConfirmText !== requiredDeleteText) return

    setIsDeleting(true)
    try {
      await deleteAsset(deleteCandidate.id)
      toast.success("Asset deleted successfully")
      setDeleteCandidate(null)
      setDeleteConfirmText("")
    } catch (error) {
      console.error("Delete error:", error)
      toast.error("Failed to delete asset")
    } finally {
      setIsDeleting(false)
    }
  }

  const isSelected = (asset: Asset) => {
    return selectedAssets.some((a) => a.id === asset.id)
  }

  const handleRowClick = (asset: Asset) => {
    if (onAssetSelect) {
      onAssetSelect(asset)
      return
    }

    handlePreview(asset)
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="aspect-square rounded-lg" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    )
  }

  if (assets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="rounded-full bg-muted p-6 mb-4">
          <Upload className="h-10 w-10 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No files found</h3>
        <p className="text-muted-foreground mb-6 max-w-sm">
          Upload your personal documents, loan records, or contribution receipts
        </p>
        {showUpload && onUploadClick && (
          <Button onClick={onUploadClick}>
            <Upload className="h-4 w-4 mr-2" />
            Upload File
          </Button>
        )}
      </div>
    )
  }

  if (viewMode === "list") {
    return (
      <>
        <div className="space-y-2">
          {assets.map((asset) => (
            <div
              key={asset.id}
              className={cn(
                "group flex flex-wrap cursor-pointer items-center gap-4 rounded-lg border p-4 transition-colors hover:bg-accent/60",
                isSelected(asset) && "bg-accent"
              )}
              onClick={() => handleRowClick(asset)}>
              <div className="h-16 w-16 rounded overflow-hidden bg-muted shrink-0">
                {asset.assetType === "image" ? (
                  <img
                    src={asset.thumbnailUrl || asset.fileUrl}
                    alt={asset.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-2xl">📄</span>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium truncate">{asset.name}</h4>
                <p className="text-sm text-muted-foreground">
                  {formatAssetTypeLabel(asset.assetType)} •{" "}
                  {formatFileSize(asset.fileSize || 0)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Click to preview
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation()
                    handlePreview(asset)
                  }}>
                  Preview
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDownload(asset)
                  }}>
                  Download
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleEdit(asset)
                  }}>
                  <Edit2 className="mr-2 h-3.5 w-3.5" />
                  Edit
                </Button>
              </div>
            </div>
          ))}
        </div>

        <AssetPreview
          asset={previewAsset}
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          onEdit={handleEdit}
        />

        <EditAssetDialog
          asset={editAsset}
          open={!!editAsset}
          onOpenChange={(open) => {
            if (!open) {
              setEditAsset(null)
            }
          }}
        />
      </>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {assets.map((asset) => (
          <AssetCard
            key={asset.id}
            asset={asset}
            onPreview={handlePreview}
            onEdit={handleEdit}
            onDownload={handleDownload}
            onDelete={handleDelete}
            selected={isSelected(asset)}
            onSelect={onAssetSelect}
            showActions={true}
          />
        ))}
      </div>

      <AssetPreview
        asset={previewAsset}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        onEdit={handleEdit}
      />

      <EditAssetDialog
        asset={editAsset}
        open={!!editAsset}
        onOpenChange={(open) => {
          if (!open) {
            setEditAsset(null)
          }
        }}
      />

      <AlertDialog
        open={!!deleteCandidate}
        onOpenChange={(open) => {
          if (!open && !isDeleting) {
            setDeleteCandidate(null)
            setDeleteConfirmText("")
          }
        }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete File</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Type{" "}
              <span className="font-mono font-semibold">
                {requiredDeleteText}
              </span>{" "}
              to permanently delete{" "}
              <span className="font-medium truncate">
                {deleteCandidate?.name}
              </span>
              .
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            placeholder={requiredDeleteText}
            autoComplete="off"
            disabled={isDeleting}
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-400 text-white"
              onClick={confirmDelete}
              disabled={isDeleting || deleteConfirmText !== requiredDeleteText}>
              {isDeleting ? "Deleting..." : "Delete File"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
