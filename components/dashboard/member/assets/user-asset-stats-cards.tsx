"use client"

import { formatFileSize } from "@/utils/asset-utils"
import { FileText, HardDrive, Image, Video } from "lucide-react"

import { useUserAssetStats } from "@/hooks/api/use-client-assets"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function UserAssetStatsCards() {
  const { data, isLoading } = useUserAssetStats()

  const stats = data?.data
  const toNumber = (value: unknown) => {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }

  const total = toNumber(stats?.total)
  const totalSize = toNumber(stats?.totalSize)
  const byType = stats?.byType ?? {}
  const imageCount = toNumber(byType.image)
  const videoCount = toNumber(byType.video)
  const audioCount = toNumber(byType.audio)
  const archiveCount = toNumber(byType.archive)
  const documentCount = toNumber(byType.document)
  const imagePercent =
    total > 0 ? ((imageCount / total) * 100).toFixed(1) : "0.0"
  const videoPercent =
    total > 0 ? ((videoCount / total) * 100).toFixed(1) : "0.0"
  const documentPercent =
    total > 0 ? ((documentCount / total) * 100).toFixed(1) : "0.0"

  const countLabel = (count: number, singular: string, plural: string) =>
    `${count} ${count === 1 ? singular : plural}`

  const imagesSubtitle =
    audioCount > 0
      ? countLabel(audioCount, "audio file", "audio files")
      : `${imagePercent}% of total`

  const videosSubtitle =
    archiveCount > 0
      ? countLabel(archiveCount, "archive", "archives")
      : videoCount > 0
        ? `${videoPercent}% of total`
        : documentCount > 0
          ? countLabel(documentCount, "document", "documents")
          : "No video uploads yet"

  const documentsSubtitle =
    documentCount > 0
      ? `${documentPercent}% of total`
      : imageCount > 0
        ? `${imagePercent}% images`
        : "No documents uploaded yet"

  if (isLoading) {
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

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Total Files */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">My Files</CardTitle>
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
          <p className="text-xs text-muted-foreground">{imagesSubtitle}</p>
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
          <p className="text-xs text-muted-foreground">{videosSubtitle}</p>
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
          <p className="text-xs text-muted-foreground">{documentsSubtitle}</p>
        </CardContent>
      </Card>
    </div>
  )
}
