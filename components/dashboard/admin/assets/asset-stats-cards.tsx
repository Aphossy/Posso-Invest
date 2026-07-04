"use client"

import { formatFileSize } from "@/utils/asset-utils"
import {
  Archive,
  Eye,
  FileText,
  HardDrive,
  Image,
  TrendingUp,
  Video,
} from "lucide-react"

import { useAssetStats } from "@/hooks/api/use-assets"
import { useProfile } from "@/hooks/use-profile"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function AssetStatsCards() {
  const { profile, loading: profileLoading } = useProfile()
  const { data, isLoading } = useAssetStats({
    excludeUploadedBy: profile?.id,
  })

  const stats = data?.data

  const toNumber = (value: unknown) => {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }

  if (isLoading || profileLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-1" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!stats) return null

  const total = toNumber(stats.total)
  const totalSize = toNumber(stats.totalSize)
  const byType = stats.byType ?? {}
  const imageCount = toNumber(byType.image)
  const videoCount = toNumber(byType.video)
  const audioCount = toNumber(byType.audio)
  const documentCount = toNumber(byType.document)
  const archiveCount = toNumber(byType.archive)
  const recentUploads = toNumber(stats.recentUploads)
  const byVisibility = stats.byVisibility ?? {}
  const publicCount = toNumber(byVisibility.public)
  const committeeCount = toNumber(byVisibility.committee)
  const imagePercent =
    total > 0 ? ((imageCount / total) * 100).toFixed(1) : "0.0"
  const byCategory = stats.byCategory ?? {}
  const topCategoryEntries = Object.entries(byCategory).sort(
    (a, b) => toNumber(b[1]) - toNumber(a[1])
  )
  const topCategoryKey = topCategoryEntries[0]?.[0] ?? null
  const topCategoryCount = toNumber(topCategoryEntries[0]?.[1])

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Total Assets */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
          <HardDrive className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{total}</div>
          <p className="text-xs text-muted-foreground">
            {formatFileSize(totalSize)} total
          </p>
        </CardContent>
      </Card>

      {/* Images */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Images</CardTitle>
          <Image className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{imageCount}</div>
          <p className="text-xs text-muted-foreground">
            {audioCount > 0
              ? `${audioCount} audio file${audioCount !== 1 ? "s" : ""}`
              : `${imagePercent}% of total`}
          </p>
        </CardContent>
      </Card>

      {/* Videos */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Videos</CardTitle>
          <Video className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{videoCount}</div>
          <p className="text-xs text-muted-foreground">
            {audioCount} audio file{audioCount !== 1 ? "s" : ""}
          </p>
        </CardContent>
      </Card>

      {/* Documents */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Documents</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{documentCount}</div>
          <p className="text-xs text-muted-foreground">
            {archiveCount} archive{archiveCount !== 1 ? "s" : ""}
          </p>
        </CardContent>
      </Card>

      {/* Recent Uploads */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Recent Uploads</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{recentUploads}</div>
          <p className="text-xs text-muted-foreground">In the last 7 days</p>
        </CardContent>
      </Card>

      {/* By Visibility */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Public Assets</CardTitle>
          <Eye className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{publicCount}</div>
          <p className="text-xs text-muted-foreground">
            {committeeCount} committee-only
          </p>
        </CardContent>
      </Card>

      {/* By Category - Top Category */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Top Category</CardTitle>
          <Archive className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold capitalize">
            {topCategoryKey ?? "N/A"}
          </div>
          <p className="text-xs text-muted-foreground">
            {topCategoryCount} asset{topCategoryCount !== 1 ? "s" : ""}
          </p>
        </CardContent>
      </Card>

      {/* Storage Used */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
          <HardDrive className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatFileSize(totalSize)}</div>
          <p className="text-xs text-muted-foreground">Across all assets</p>
        </CardContent>
      </Card>
    </div>
  )
}
