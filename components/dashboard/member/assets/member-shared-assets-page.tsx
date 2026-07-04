"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import type { Asset } from "@/db/schemas/asset-schema"
import {
  formatAssetCategoryLabel,
  formatAssetTypeLabel,
  formatFileSize,
} from "@/utils/asset-utils"
import { format } from "date-fns"
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FolderOpen,
  Grid3x3,
  List,
  RefreshCw,
  Search,
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
import { AssetCard } from "@/components/dashboard/member/assets/asset-card"
import { AssetPreview } from "@/components/dashboard/member/assets/asset-preview"

// Members see only public + authenticated (All Members)
// Committee Only and Admin Only are not visible to regular members
const VISIBILITY_TABS = [
  { value: "all", label: "All Shared" },
  { value: "public", label: "Public" },
  { value: "authenticated", label: "All Members" },
] as const

type VisibilityTab = (typeof VISIBILITY_TABS)[number]["value"]

type SharedAsset = Asset & {
  uploaderName?: string | null
  uploaderEmail?: string | null
}

function formatUploaderLabel(asset: SharedAsset): string {
  if (asset.uploaderName && asset.uploaderName.trim().length > 0) {
    return asset.uploaderName
  }
  if (asset.uploaderEmail && asset.uploaderEmail.trim().length > 0) {
    return asset.uploaderEmail
  }
  if (asset.uploadedBy && asset.uploadedBy.length <= 8) {
    return asset.uploadedBy
  }
  if (asset.uploadedBy) {
    return `Member ${asset.uploadedBy.slice(0, 8)}`
  }
  return "Unknown Member"
}

export default function MemberSharedAssetsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const debouncedSearch = useDebounce(searchQuery, 350)
  const [visibilityTab, setVisibilityTab] = useState<VisibilityTab>("all")
  const [assetType, setAssetType] = useState("all")
  const [category, setCategory] = useState("all")
  const [sortBy, setSortBy] = useState("createdAt-desc")
  const [page, setPage] = useState(1)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [refreshing, setRefreshing] = useState(false)

  const [previewAsset, setPreviewAsset] = useState<Asset | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)

  const [sortField, sortDirection] = sortBy.split("-")
  const { profile, loading: profileLoading } = useProfile()

  // Member visibility scope - public and all-members only
  const visibilityParam =
    visibilityTab === "all" ? ["public", "authenticated"] : [visibilityTab]

  const { data, isLoading, error, refetch } = useAssets({
    search: debouncedSearch || undefined,
    assetType: assetType !== "all" ? assetType : undefined,
    category: category !== "all" ? category : undefined,
    visibility: visibilityParam,
    excludeUploadedBy: profile?.id,
    sortBy: sortField,
    sortOrder: sortDirection as "asc" | "desc",
    page,
    limit: 24,
  })

  const assets = (data?.data?.assets || []) as SharedAsset[]
  const visibleAssets = profile?.id
    ? assets.filter((asset) => asset.uploadedBy !== profile.id)
    : assets
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

  const clearFilters = () => {
    setSearchQuery("")
    setAssetType("all")
    setCategory("all")
    setSortBy("createdAt-desc")
  }

  const hasActiveFilters =
    !!searchQuery || assetType !== "all" || category !== "all"

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
            Files shared by other members with Public or All Members visibility
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild>
            <Link href="/member/documents/files">My Documents & Files</Link>
          </Button>
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing || profileLoading}>
            <RefreshCw
              className={cn("mr-2 h-4 w-4", refreshing && "animate-spin")}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Browse</CardTitle>
          <CardDescription>
            Discover files uploaded by other members only
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

      {/* Asset Grid */}
      <Card>
        <CardHeader>
          <CardTitle>
            {totalAssets} Asset{totalAssets !== 1 ? "s" : ""}
          </CardTitle>
          <CardDescription>
            {debouncedSearch
              ? `Results for "${debouncedSearch}"`
              : visibilityTab === "authenticated"
                ? "Files shared with all TrustLink members"
                : visibilityTab === "public"
                  ? "Publicly accessible files"
                  : "All files shared with TrustLink members"}{" "}
            · Page {currentPage} of {totalPages}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading || profileLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="space-y-3">
                  <div className="aspect-square animate-pulse rounded-lg bg-muted" />
                  <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
                </div>
              ))}
            </div>
          ) : visibleAssets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="mb-4 rounded-full bg-muted p-6">
                <FolderOpen className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">
                No member-shared assets yet
              </h3>
              <p className="max-w-sm text-muted-foreground">
                Public and All Members files uploaded by other users will appear
                here. Your own uploads are available in My Documents & Files.
              </p>
            </div>
          ) : viewMode === "list" ? (
            <div className="space-y-2">
              {visibleAssets.map((asset) => (
                <MemberAssetRow
                  key={asset.id}
                  asset={asset}
                  onPreview={(a) => {
                    setPreviewAsset(a)
                    setPreviewOpen(true)
                  }}
                  onDownload={handleDownload}
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {visibleAssets.map((asset) => (
                <AssetCard
                  key={asset.id}
                  asset={asset}
                  footerContent={
                    <Badge variant="secondary" className="w-fit text-xs">
                      Shared by {formatUploaderLabel(asset)}
                    </Badge>
                  }
                  onPreview={(a) => {
                    setPreviewAsset(a)
                    setPreviewOpen(true)
                  }}
                  onDownload={handleDownload}
                  showActions
                />
              ))}
            </div>
          )}

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

      {/* Preview dialog */}
      <AssetPreview
        asset={previewAsset}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
      />
    </div>
  )
}

// ─────────────────────────────────────────────
// List row - read-only for members
// ─────────────────────────────────────────────
function MemberAssetRow({
  asset,
  onPreview,
  onDownload,
}: {
  asset: SharedAsset
  onPreview: (a: SharedAsset) => void
  onDownload: (a: SharedAsset) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-accent/60 sm:gap-4">
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-4 text-left"
        onClick={() => onPreview(asset)}>
        {/* Thumbnail */}
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

        {/* Info */}
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{asset.name}</p>
          <p className="text-sm text-muted-foreground">
            {formatAssetTypeLabel(asset.assetType)} ·{" "}
            {formatFileSize(asset.fileSize || 0)} ·{" "}
            {format(new Date(asset.createdAt), "MMM d, yyyy")}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {asset.category && (
              <Badge variant="outline" className="px-1.5 py-0 text-xs">
                {formatAssetCategoryLabel(asset.category)}
              </Badge>
            )}
            <Badge variant="secondary" className="px-1.5 py-0 text-xs">
              Shared by {formatUploaderLabel(asset)}
            </Badge>
          </div>
        </div>
      </button>

      {/* Actions */}
      <div className="ml-auto flex shrink-0 gap-2">
        <Button size="sm" variant="outline" onClick={() => onPreview(asset)}>
          <Eye className="mr-1.5 h-3.5 w-3.5" />
          View
        </Button>
        <Button size="sm" variant="outline" onClick={() => onDownload(asset)}>
          <Download className="mr-1.5 h-3.5 w-3.5" />
          Download
        </Button>
      </div>
    </div>
  )
}
