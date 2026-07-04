"use client"

import { useEffect, useState } from "react"
import {
  formatAssetCategoryLabel,
  formatAssetTypeLabel,
} from "@/utils/asset-utils"
import {
  ChevronLeft,
  ChevronRight,
  Grid3x3,
  List,
  RefreshCw,
  Search,
  Upload,
  X,
} from "lucide-react"
import { toast } from "sonner"

import { useUserAssets } from "@/hooks/api/use-assets"
import { useDebounce } from "@/hooks/use-debounce"
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
import { AssetGrid } from "@/components/dashboard/member/assets/asset-grid"
import { UserAssetStatsCards } from "@/components/dashboard/member/assets/user-asset-stats-cards"
import { UserAssetUploadDialog } from "@/components/dashboard/member/assets/user-asset-upload-dialog"

export default function UserAssetsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const debouncedSearchQuery = useDebounce(searchQuery, 350)
  const [assetType, setAssetType] = useState<string>("all")
  const [category, setCategory] = useState<string>("all")
  const [sortBy, setSortBy] = useState<string>("createdAt-desc")
  const [page, setPage] = useState(1)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const [sortField, sortDirection] = sortBy.split("-")

  const { data, isLoading, error, refetch } = useUserAssets({
    search: debouncedSearchQuery || undefined,
    assetType: assetType !== "all" ? assetType : undefined,
    category: category !== "all" ? category : undefined,
    sortBy: sortField,
    sortOrder: sortDirection as "asc" | "desc",
    page,
    limit: 20,
  })

  const assets = data?.data?.assets || []
  const pagination = data?.metadata?.pagination as
    | {
        page?: number
        totalPages?: number
        totalItems?: number
        total?: number
        hasNextPage?: boolean
        hasPreviousPage?: boolean
      }
    | undefined

  const currentPage = pagination?.page ?? page
  const totalPages = pagination?.totalPages ?? 1
  const totalAssets =
    pagination?.totalItems ?? pagination?.total ?? assets.length
  const hasNextPage = pagination?.hasNextPage ?? currentPage < totalPages
  const hasPreviousPage = pagination?.hasPreviousPage ?? currentPage > 1

  useEffect(() => {
    setPage(1)
  }, [debouncedSearchQuery, assetType, category, sortBy])

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await refetch()
      toast.success("Assets refreshed successfully")
    } catch (error) {
      console.error("Failed to refresh assets:", error)
      toast.error("Failed to refresh assets")
    } finally {
      setRefreshing(false)
    }
  }

  const handleUploadSuccess = () => {
    refetch()
    setUploadDialogOpen(false)
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="flex h-32 items-center justify-center">
            <div className="text-center">
              <p className="mb-4 text-muted-foreground">
                Failed to load assets
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
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Documents & Files</h1>
          <p className="text-muted-foreground pt-1">
            Upload and manage your personal TrustLink Group documents and files
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}>
            <RefreshCw
              className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Button onClick={() => setUploadDialogOpen(true)}>
            <Upload className=" h-4 w-4" />
            Upload File
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <UserAssetStatsCards />

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>
            Filter and search through your assets
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search your assets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Filters Row */}
            <div className="flex flex-wrap gap-4">
              {/* Asset Type */}
              <Select value={assetType} onValueChange={setAssetType}>
                <SelectTrigger className="sm:w-45">
                  <SelectValue placeholder="Asset Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="image">Images</SelectItem>
                  <SelectItem value="video">Videos</SelectItem>
                  <SelectItem value="audio">Audio</SelectItem>
                  <SelectItem value="document">Documents</SelectItem>
                  <SelectItem value="archive">Archives</SelectItem>
                  <SelectItem value="code">Code</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>

              {/* Category */}
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="sm:w-45">
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
                <SelectTrigger className="sm:w-55">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="createdAt-desc">Newest first</SelectItem>
                  <SelectItem value="createdAt-asc">Oldest first</SelectItem>
                  <SelectItem value="name-asc">Name A-Z</SelectItem>
                  <SelectItem value="name-desc">Name Z-A</SelectItem>
                  <SelectItem value="fileSize-desc">Largest size</SelectItem>
                  <SelectItem value="fileSize-asc">Smallest size</SelectItem>
                  <SelectItem value="downloadCount-desc">
                    Most downloaded
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* View Mode Toggle */}
              <div className="ml-auto flex gap-1 border rounded-md">
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

            {/* Active Filters */}
            {(searchQuery || assetType !== "all" || category !== "all") && (
              <div className="flex items-center gap-2">
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
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("")
                    setAssetType("all")
                    setCategory("all")
                    setSortBy("createdAt-desc")
                  }}>
                  Clear all
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Assets Grid */}
      <Card>
        <CardHeader>
          <CardTitle>
            {totalAssets} File{totalAssets !== 1 ? "s" : ""}
          </CardTitle>
          <CardDescription>
            {debouncedSearchQuery
              ? `Showing results for "${debouncedSearchQuery}"`
              : "Your uploaded documents and files"}{" "}
            • Page {currentPage} of {totalPages}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AssetGrid
            assets={assets}
            loading={isLoading}
            showUpload={true}
            onUploadClick={() => setUploadDialogOpen(true)}
            viewMode={viewMode}
          />
          <div className="mt-6 flex items-center justify-between border-t pt-4">
            <p className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!hasPreviousPage || isLoading}
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}>
                <ChevronLeft className="mr-1 h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!hasNextPage || isLoading}
                onClick={() => setPage((prev) => prev + 1)}>
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <UserAssetUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        onSuccess={handleUploadSuccess}
      />
    </div>
  )
}
