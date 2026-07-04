"use client"

import { useEffect, useState } from "react"
import type { Asset } from "@/db/schemas/asset-schema"
import {
  formatAssetCategoryLabel,
  formatAssetTypeLabel,
  formatFileSize,
  formatVisibilityLabel,
  getVisibilityColor,
} from "@/utils/asset-utils"
import { format } from "date-fns"
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Edit2,
  Eye,
  FolderOpen,
  Grid3x3,
  List,
  RefreshCw,
  Search,
  Upload,
  X,
} from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { useAssets } from "@/hooks/api/use-assets"
import { useDebounce } from "@/hooks/use-debounce"
import { useProfile } from "@/hooks/use-profile"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AssetCard } from "@/components/dashboard/admin/assets/asset-card"
import { AssetPreview } from "@/components/dashboard/admin/assets/asset-preview"
import { AssetStatsCards } from "@/components/dashboard/admin/assets/asset-stats-cards"
import { AssetUploadDialog } from "@/components/dashboard/admin/assets/asset-upload-dialog"
import { EditAssetDialog } from "@/components/dashboard/assets/edit-asset-dialog"

// Secretary can see: public, authenticated (All Members), committee (Committee Only)
// Admin Only assets are excluded from secretary view
const VISIBILITY_TABS = [
  { value: "all", label: "All Shared" },
  { value: "public", label: "Public" },
  { value: "authenticated", label: "All Members" },
  { value: "committee", label: "Committee Only" },
] as const

type VisibilityTab = (typeof VISIBILITY_TABS)[number]["value"]
type AssetVisibility = Asset["visibility"]

type SharedAsset = Asset & {
  uploaderName?: string | null
  uploaderEmail?: string | null
}

function formatUploaderLabel(asset: SharedAsset): string {
  if (asset.uploaderName?.trim()) return asset.uploaderName
  if (asset.uploaderEmail?.trim()) return asset.uploaderEmail
  if (asset.uploadedBy && asset.uploadedBy.length <= 8) return asset.uploadedBy
  if (asset.uploadedBy) return `Member ${asset.uploadedBy.slice(0, 8)}`
  return "Unknown Member"
}

export default function SecretarySharedAssetsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const debouncedSearch = useDebounce(searchQuery, 350)
  const [visibilityTab, setVisibilityTab] = useState<VisibilityTab>("all")
  const [assetType, setAssetType] = useState("all")
  const [category, setCategory] = useState("all")
  const [sortBy, setSortBy] = useState("createdAt-desc")
  const [page, setPage] = useState(1)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [uploadOpen, setUploadOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const [previewAsset, setPreviewAsset] = useState<Asset | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [editAsset, setEditAsset] = useState<Asset | null>(null)
  const { profile, loading: profileLoading } = useProfile()

  const [sortField, sortDirection] = sortBy.split("-")

  // Secretary visibility scope - admin-only assets never included
  const visibilityParam =
    visibilityTab === "all"
      ? ["public", "authenticated", "committee"]
      : [visibilityTab]

  const { data, isLoading, error, refetch } = useAssets({
    search: debouncedSearch || undefined,
    assetType: assetType !== "all" ? assetType : undefined,
    category: category !== "all" ? category : undefined,
    visibility: visibilityParam,
    excludeUploadedBy: profile?.id,
    sortBy: sortField,
    sortOrder: sortDirection as "asc" | "desc",
    page,
    limit: 20,
  })

  const assets = (data?.data?.assets || []) as SharedAsset[]
  const visibleAssets = profile?.id
    ? assets.filter((asset) => asset.uploadedBy !== profile.id)
    : assets
  const visibilityCounts = visibleAssets.reduce(
    (acc, asset) => {
      acc[asset.visibility] = (acc[asset.visibility] || 0) + 1
      return acc
    },
    {
      public: 0,
      authenticated: 0,
      committee: 0,
      admin: 0,
      private: 0,
    } as Record<AssetVisibility, number>
  )
  const pagination = data?.metadata?.pagination as
    | {
        page?: number
        totalPages?: number
        totalItems?: number
        hasNextPage?: boolean
        hasPreviousPage?: boolean
      }
    | undefined

  const currentPage = pagination?.page ?? page
  const totalPages = pagination?.totalPages ?? 1
  const totalAssets = pagination?.totalItems ?? visibleAssets.length
  const hasNextPage = pagination?.hasNextPage ?? currentPage < totalPages
  const hasPreviousPage = pagination?.hasPreviousPage ?? currentPage > 1

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, visibilityTab, assetType, category, sortBy])

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await refetch()
      toast.success("Refreshed successfully")
    } catch {
      toast.error("Failed to refresh")
    } finally {
      setRefreshing(false)
    }
  }

  const handlePreview = (asset: Asset) => {
    setPreviewAsset(asset)
    setPreviewOpen(true)
  }

  const handleEdit = (asset: Asset) => {
    setEditAsset(asset)
    setPreviewOpen(false)
  }

  const handleDownload = async (asset: Asset) => {
    try {
      const res = await fetch(`/api/assets/${asset.id}/download`)
      if (!res.ok) throw new Error()
      const result = await res.json()
      window.open(
        result.success && result.data?.downloadUrl
          ? result.data.downloadUrl
          : asset.fileUrl,
        "_blank"
      )
      toast.success("Download started")
    } catch {
      toast.error("Failed to download file")
    }
  }

  const handleDelete = async (asset: Asset) => {
    if (
      !confirm(`Delete "${asset.name}"? This will permanently remove the file.`)
    )
      return
    try {
      const res = await fetch(`/api/assets/user/${asset.id}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error()
      toast.success("File deleted")
      refetch()
    } catch {
      toast.error("Failed to delete file")
    }
  }

  const clearFilters = () => {
    setSearchQuery("")
    setVisibilityTab("all")
    setAssetType("all")
    setCategory("all")
    setSortBy("createdAt-desc")
  }

  const hasActiveFilters =
    !!searchQuery ||
    visibilityTab !== "all" ||
    assetType !== "all" ||
    category !== "all"

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="flex h-32 items-center justify-center">
            <div className="text-center">
              <p className="mb-4 text-muted-foreground">
                Failed to load shared assets
              </p>
              <Button onClick={handleRefresh} variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto space-y-8 py-0 sm:py-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Shared Assets</h1>
          <p className="text-muted-foreground">
            Group photos, media, and files accessible to committee members and
            all members
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}>
            <RefreshCw
              className={cn("mr-2 h-4 w-4", refreshing && "animate-spin")}
            />
            Refresh
          </Button>
          <Button onClick={() => setUploadOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Upload Asset
          </Button>
        </div>
      </div>

      {/* Stats */}
      <AssetStatsCards />

      {/* Visibility Tabs + Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Browse Shared Assets</CardTitle>
          <CardDescription>
            Filter by visibility level. Private files and admin-only assets are
            not shown.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Visibility Tabs */}
          <Tabs
            value={visibilityTab}
            onValueChange={(v) => setVisibilityTab(v as VisibilityTab)}>
            <TabsList className="h-auto flex-wrap gap-1">
              {VISIBILITY_TABS.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}
                  <Badge
                    variant="secondary"
                    className={cn(
                      "ml-1.5 px-1.5 text-xs",
                      visibilityTab === tab.value && "bg-primary/20"
                    )}>
                    {tab.value === "all"
                      ? totalAssets
                      : visibilityCounts[
                          tab.value as Exclude<
                            AssetVisibility,
                            "private" | "admin"
                          >
                        ]}
                  </Badge>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search shared assets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Filter Row */}
          <div className="flex flex-wrap items-center gap-3">
            <Select value={assetType} onValueChange={setAssetType}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="File Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="image">Images</SelectItem>
                <SelectItem value="video">Videos</SelectItem>
                <SelectItem value="audio">Audio</SelectItem>
                <SelectItem value="document">Documents</SelectItem>
                <SelectItem value="archive">Archives</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>

            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full sm:w-52">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="minutes">Meeting Minutes</SelectItem>
                <SelectItem value="constitution">
                  Constitution & Governance
                </SelectItem>
                <SelectItem value="financial">Financial Reports</SelectItem>
                <SelectItem value="contribution">
                  Contribution Records
                </SelectItem>
                <SelectItem value="loan">Loan Documents</SelectItem>
                <SelectItem value="correspondence">
                  Letters & Correspondence
                </SelectItem>
                <SelectItem value="legal">Legal Documents</SelectItem>
                <SelectItem value="media">Photos & Media</SelectItem>
                <SelectItem value="other">General</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAt-desc">Newest first</SelectItem>
                <SelectItem value="createdAt-asc">Oldest first</SelectItem>
                <SelectItem value="name-asc">Name A–Z</SelectItem>
                <SelectItem value="name-desc">Name Z–A</SelectItem>
                <SelectItem value="fileSize-desc">Largest</SelectItem>
                <SelectItem value="fileSize-asc">Smallest</SelectItem>
                <SelectItem value="downloadCount-desc">
                  Most downloaded
                </SelectItem>
              </SelectContent>
            </Select>

            <div className="ml-auto flex gap-1 rounded-md border">
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className="rounded-r-none">
                <Grid3x3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                className="rounded-l-none">
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Active filter chips */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Active filters:
              </span>
              {searchQuery && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSearchQuery("")}>
                  Search: {searchQuery}
                  <X className="ml-2 h-3 w-3" />
                </Button>
              )}
              {visibilityTab !== "all" && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setVisibilityTab("all")}>
                  Visibility:{" "}
                  {
                    VISIBILITY_TABS.find((t) => t.value === visibilityTab)
                      ?.label
                  }
                  <X className="ml-2 h-3 w-3" />
                </Button>
              )}
              {assetType !== "all" && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setAssetType("all")}>
                  Type: {formatAssetTypeLabel(assetType)}
                  <X className="ml-2 h-3 w-3" />
                </Button>
              )}
              {category !== "all" && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setCategory("all")}>
                  Category: {formatAssetCategoryLabel(category)}
                  <X className="ml-2 h-3 w-3" />
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear all
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Asset List */}
      <Card>
        <CardHeader>
          <CardTitle>
            {totalAssets} Asset{totalAssets !== 1 ? "s" : ""}
          </CardTitle>
          <CardDescription>
            {debouncedSearch
              ? `Results for "${debouncedSearch}"`
              : visibilityTab === "all"
                ? "All shared assets accessible to committee members"
                : `${VISIBILITY_TABS.find((t) => t.value === visibilityTab)?.label} assets`}{" "}
            · Page {currentPage} of {totalPages}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AssetContent
            assets={visibleAssets}
            loading={isLoading || profileLoading}
            viewMode={viewMode}
            onPreview={handlePreview}
            onEdit={handleEdit}
            onDownload={handleDownload}
            onDelete={handleDelete}
            onUploadClick={() => setUploadOpen(true)}
          />

          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between border-t pt-4">
              <p className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!hasPreviousPage || isLoading}
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}>
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!hasNextPage || isLoading}
                  onClick={() => setPage((p) => p + 1)}>
                  Next
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <AssetUploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onSuccess={() => {
          refetch()
          setUploadOpen(false)
        }}
      />

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
          if (!open) setEditAsset(null)
        }}
        onSuccess={() => {
          refetch()
          setEditAsset(null)
        }}
      />
    </div>
  )
}

// ─────────────────────────────────────────────
// Sub-component: grid / list renderer
// ─────────────────────────────────────────────
interface AssetContentProps {
  assets: SharedAsset[]
  loading: boolean
  viewMode: "grid" | "list"
  onPreview: (a: SharedAsset) => void
  onEdit: (a: SharedAsset) => void
  onDownload: (a: SharedAsset) => void
  onDelete: (a: SharedAsset) => void
  onUploadClick: () => void
}

function AssetContent({
  assets,
  loading,
  viewMode,
  onPreview,
  onEdit,
  onDownload,
  onDelete,
  onUploadClick,
}: AssetContentProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <div className="aspect-square animate-pulse rounded-lg bg-muted" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    )
  }

  if (assets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="mb-4 rounded-full bg-muted p-6">
          <FolderOpen className="h-10 w-10 text-muted-foreground" />
        </div>
        <h3 className="mb-2 text-lg font-semibold">No shared assets found</h3>
        <p className="mb-6 max-w-sm text-muted-foreground">
          Upload a file with Public, All Members, or Committee Only visibility
          to have it appear here.
        </p>
        <Button onClick={onUploadClick}>
          <Upload className="mr-2 h-4 w-4" />
          Upload Asset
        </Button>
      </div>
    )
  }

  if (viewMode === "list") {
    return (
      <div className="space-y-2">
        {assets.map((asset) => (
          <AssetListRow
            key={asset.id}
            asset={asset}
            onPreview={onPreview}
            onEdit={onEdit}
            onDownload={onDownload}
            onDelete={onDelete}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {assets.map((asset) => (
        <AssetCard
          key={asset.id}
          asset={asset}
          footerContent={
            <Badge variant="secondary" className="w-fit text-xs">
              Shared by {formatUploaderLabel(asset)}
            </Badge>
          }
          onPreview={onPreview}
          onEdit={onEdit}
          onDownload={onDownload}
          onDelete={onDelete}
          showActions
        />
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────
// List row
// ─────────────────────────────────────────────
function AssetListRow({
  asset,
  onPreview,
  onEdit,
  onDownload,
  onDelete,
}: {
  asset: SharedAsset
  onPreview: (a: SharedAsset) => void
  onEdit: (a: SharedAsset) => void
  onDownload: (a: SharedAsset) => void
  onDelete: (a: SharedAsset) => void
}) {
  return (
    <div
      className="group flex flex-wrap cursor-pointer items-center gap-4 rounded-lg border p-4 transition-colors hover:bg-accent/60"
      onClick={() => onPreview(asset)}>
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-muted">
        {asset.assetType === "image" ? (
          <img
            src={asset.thumbnailUrl || asset.fileUrl}
            alt={asset.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xl">
            📄
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{asset.name}</p>
        <p className="text-sm text-muted-foreground">
          {formatAssetTypeLabel(asset.assetType)} ·{" "}
          {formatFileSize(asset.fileSize || 0)} ·{" "}
          {format(new Date(asset.createdAt), "MMM d, yyyy")}
        </p>
        <div className="mt-1 flex flex-wrap gap-1">
          <Badge
            className={cn(
              "px-1.5 py-0 text-xs",
              getVisibilityColor(asset.visibility)
            )}>
            {formatVisibilityLabel(asset.visibility)}
          </Badge>
          <Badge variant="secondary" className="px-1.5 py-0 text-xs">
            Shared by {formatUploaderLabel(asset)}
          </Badge>
          {asset.category && (
            <Badge variant="outline" className="px-1.5 py-0 text-xs">
              {formatAssetCategoryLabel(asset.category)}
            </Badge>
          )}
        </div>
      </div>
      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
        <Button size="sm" variant="outline" onClick={() => onPreview(asset)}>
          <Eye className="mr-1.5 h-3.5 w-3.5" />
          Preview
        </Button>
        <Button size="sm" variant="outline" onClick={() => onDownload(asset)}>
          <Download className="mr-1.5 h-3.5 w-3.5" />
          Download
        </Button>
        <Button size="sm" variant="outline" onClick={() => onEdit(asset)}>
          <Edit2 className="mr-1.5 h-3.5 w-3.5" />
          Edit
        </Button>
      </div>
    </div>
  )
}
