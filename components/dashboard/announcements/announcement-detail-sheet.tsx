"use client"

import { Pin } from "lucide-react"

import type { AnnouncementItem } from "@/hooks/api/use-announcements"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

interface Props {
  announcement: AnnouncementItem | null
  onClose: () => void
}

function formatDate(val?: string | Date | null) {
  if (!val) return "-"
  const d = val instanceof Date ? val : new Date(val)
  if (isNaN(d.getTime())) return "-"
  return d.toLocaleDateString("en-RW", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

const statusVariant = (s: string) => {
  if (s === "published") return "success" as const
  if (s === "archived") return "secondary" as const
  return "warning" as const
}

const audienceVariant = (a: string) => {
  if (a === "members") return "outline" as const
  if (a === "committee") return "secondary" as const
  return "outline" as const
}

export function AnnouncementDetailSheet({ announcement, onClose }: Props) {
  return (
    <Sheet open={Boolean(announcement)} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        {announcement ? (
          <>
            <SheetHeader className="pr-6">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={statusVariant(announcement.status)}>
                  {announcement.status}
                </Badge>
                <Badge variant={audienceVariant(announcement.audience)}>
                  {announcement.audience}
                </Badge>
                {announcement.pinned ? (
                  <Badge variant="warning" className="gap-1">
                    <Pin className="h-3 w-3" />
                    Pinned
                  </Badge>
                ) : null}
              </div>
              <SheetTitle className="text-xl leading-snug pt-1">
                {announcement.title}
              </SheetTitle>
              {announcement.summary ? (
                <SheetDescription className="text-sm">
                  {announcement.summary}
                </SheetDescription>
              ) : null}
            </SheetHeader>

            <div className="mt-6 space-y-5 px-1">
              {/* Tags */}
              {announcement.metadata?.tags &&
              announcement.metadata.tags.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {announcement.metadata.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}

              <Separator />

              {/* Content */}
              <div className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                {announcement.content}
              </div>

              <Separator />

              {/* Meta */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Published</p>
                  <p className="text-sm font-medium">
                    {formatDate(announcement.publishedAt)}
                  </p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Expires</p>
                  <p className="text-sm font-medium">
                    {formatDate(announcement.expiresAt)}
                  </p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Posted by</p>
                  <p className="text-sm font-medium">
                    {announcement.createdByName ?? "-"}
                  </p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Created</p>
                  <p className="text-sm font-medium">
                    {formatDate(announcement.createdAt)}
                  </p>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
