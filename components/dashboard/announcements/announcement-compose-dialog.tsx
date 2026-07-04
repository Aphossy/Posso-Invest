"use client"

import { useEffect, useState } from "react"
import type { AnnouncementExportable } from "@/utils/announcement-export-utils"
import { Bell, Pin } from "lucide-react"
import { toast } from "sonner"

import {
  useCreateAnnouncementMutation,
  useUpdateAnnouncementMutation,
} from "@/hooks/api/use-announcements"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Loader } from "@/components/common/loader"

interface Props {
  /** Pass an announcement to edit it; omit to create a new one. */
  announcement?: AnnouncementExportable
  /** If provided, renders a custom trigger; otherwise a default "New Announcement" button. */
  trigger?: React.ReactNode
  /** Default status for brand-new announcements. */
  defaultStatus?: "draft" | "published" | "archived"
  onDone?: () => void
}

const TITLE_MAX = 160

function toDateInput(val?: string | Date | null) {
  if (!val) return ""
  const d = val instanceof Date ? val : new Date(val)
  if (isNaN(d.getTime())) return ""
  return d.toISOString().slice(0, 10)
}

function parseTags(raw: string) {
  return raw
    .split(/[,\n]/)
    .map((t) => t.trim())
    .filter(Boolean)
}

export function AnnouncementComposeDialog({
  announcement,
  trigger,
  defaultStatus = "draft",
  onDone,
}: Props) {
  const isEdit = Boolean(announcement)
  const [open, setOpen] = useState(false)

  const [title, setTitle] = useState(announcement?.title ?? "")
  const [summary, setSummary] = useState(announcement?.summary ?? "")
  const [content, setContent] = useState(announcement?.content ?? "")
  const [tags, setTags] = useState(
    announcement?.metadata?.tags?.join(", ") ?? ""
  )
  const [status, setStatus] = useState<"draft" | "published" | "archived">(
    (announcement?.status as "draft" | "published" | "archived") ??
      defaultStatus
  )
  const [audience, setAudience] = useState<"members" | "committee" | "public">(
    (announcement?.audience as "members" | "committee" | "public") ?? "members"
  )
  const [pinned, setPinned] = useState(Boolean(announcement?.pinned))
  const [publishedAt, setPublishedAt] = useState(
    toDateInput(announcement?.publishedAt)
  )
  const [expiresAt, setExpiresAt] = useState(
    toDateInput(announcement?.expiresAt)
  )
  const [errors, setErrors] = useState<Record<string, string>>({})

  const createMutation = useCreateAnnouncementMutation()
  const updateMutation = useUpdateAnnouncementMutation()
  const isPending = createMutation.isPending || updateMutation.isPending

  // Reset when reopening for a different announcement
  useEffect(() => {
    if (open) {
      setTitle(announcement?.title ?? "")
      setSummary(announcement?.summary ?? "")
      setContent(announcement?.content ?? "")
      setTags(announcement?.metadata?.tags?.join(", ") ?? "")
      setStatus((announcement?.status as any) ?? defaultStatus)
      setAudience((announcement?.audience as any) ?? "members")
      setPinned(Boolean(announcement?.pinned))
      setPublishedAt(toDateInput(announcement?.publishedAt))
      setExpiresAt(toDateInput(announcement?.expiresAt))
      setErrors({})
    }
  }, [open, announcement, defaultStatus])

  function validate() {
    const e: Record<string, string> = {}
    if (!title.trim()) e.title = "Title is required."
    if (!content.trim()) e.content = "Content is required."
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit() {
    if (!validate()) return

    const payload = {
      title: title.trim(),
      summary: summary.trim() || undefined,
      content: content.trim(),
      status,
      audience,
      pinned,
      publishedAt: publishedAt
        ? new Date(publishedAt).toISOString()
        : undefined,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
      metadata: { tags: parseTags(tags) },
    }

    try {
      if (isEdit && announcement) {
        await updateMutation.mutateAsync({ id: announcement.id, ...payload })
        toast.success("Announcement updated.")
      } else {
        await createMutation.mutateAsync(payload)
        toast.success("Announcement created.")
      }
      setOpen(false)
      onDone?.()
    } catch (err: any) {
      toast.error(err?.message || "Something went wrong.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <Bell className="h-4 w-4" />
            Post Announcement
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Announcement" : "New Announcement"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the content, audience, or publish settings."
              : "Compose and publish an announcement to members."}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="content" className="w-full">
          <TabsList className="mb-2">
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="publishing">
              Publishing
              {status !== "draft" ? (
                <Badge
                  className="ml-1.5 text-[10px]"
                  variant={status === "published" ? "success" : "secondary"}>
                  {status}
                </Badge>
              ) : null}
            </TabsTrigger>
          </TabsList>

          {/* ── Content tab ──────────────────────────────────────────────── */}
          <TabsContent value="content" className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="title">Title *</Label>
                <span
                  className={`text-xs ${title.length > TITLE_MAX ? "text-destructive" : "text-muted-foreground"}`}>
                  {title.length}/{TITLE_MAX}
                </span>
              </div>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={TITLE_MAX + 10}
                placeholder="e.g. April contribution window is now open"
              />
              {errors.title ? (
                <p className="text-xs text-destructive">{errors.title}</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="summary">Summary</Label>
              <Textarea
                id="summary"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                rows={2}
                placeholder="One-line summary shown in the announcement feed…"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="content">Full Content *</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={6}
                placeholder="Full announcement body…"
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                    e.preventDefault()
                    void handleSubmit()
                  }
                }}
              />
              {errors.content ? (
                <p className="text-xs text-destructive">{errors.content}</p>
              ) : null}
              <p className="text-xs text-muted-foreground">
                Tip: Ctrl+Enter to submit
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tags">Tags</Label>
              <Input
                id="tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="contribution, deadline, meeting… (comma-separated)"
              />
            </div>
          </TabsContent>

          {/* ── Publishing tab ────────────────────────────────────────────── */}
          <TabsContent value="publishing" className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select
                  value={status}
                  onValueChange={(v) => setStatus(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {status === "draft"
                    ? "Visible only to admins and secretaries."
                    : status === "published"
                      ? "Visible to the selected audience."
                      : "Hidden from all users."}
                </p>
              </div>

              <div className="space-y-1.5">
                <Label>Audience</Label>
                <Select
                  value={audience}
                  onValueChange={(v) => setAudience(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="members">Members</SelectItem>
                    <SelectItem value="committee">Committee</SelectItem>
                    <SelectItem value="public">Public</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="publishedAt">Publish Date</Label>
                <Input
                  id="publishedAt"
                  type="date"
                  value={publishedAt}
                  onChange={(e) => setPublishedAt(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="expiresAt">Expiry Date</Label>
                <Input
                  id="expiresAt"
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-md border p-3">
              <Checkbox
                id="pinned"
                checked={pinned}
                onCheckedChange={(v) => setPinned(Boolean(v))}
                className="mt-0.5"
              />
              <div>
                <Label
                  htmlFor="pinned"
                  className="flex cursor-pointer items-center gap-1.5 font-medium">
                  <Pin className="h-3.5 w-3.5" />
                  Pin this announcement
                </Label>
                <p className="text-xs text-muted-foreground">
                  Pinned announcements appear at the top of the feed for all
                  members.
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending || title.length > TITLE_MAX}>
            {isPending ? <Loader className="h-4 w-4" /> : null}
            {isPending
              ? isEdit
                ? "Saving…"
                : "Creating…"
              : isEdit
                ? "Save Changes"
                : "Create Announcement"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
