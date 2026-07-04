"use client"

import { useMemo, useState } from "react"
import {
  Archive,
  CheckCircle2,
  Edit3,
  Eye,
  FileText,
  Megaphone,
  Pin,
  PinOff,
  RefreshCcw,
  Search,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"

import {
  useAnnouncements,
  useUpdateAnnouncementMutation,
  type AnnouncementItem,
} from "@/hooks/api/use-announcements"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader } from "@/components/common/loader"

import { AnnouncementComposeDialog } from "./announcement-compose-dialog"
import { AnnouncementDeleteDialog } from "./announcement-delete-dialog"
import { AnnouncementDetailSheet } from "./announcement-detail-sheet"

interface Props {
  /** "admin" gets delete + full access; "secretary" gets create/edit but no delete */
  role: "admin" | "secretary" | "president"
}

function formatDate(val?: string | Date | null) {
  if (!val) return "-"
  const d = val instanceof Date ? val : new Date(val)
  if (isNaN(d.getTime())) return "-"
  return d.toLocaleDateString("en-RW", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

const statusBadge = (s: string) => {
  if (s === "published") return "success" as const
  if (s === "archived") return "secondary" as const
  return "warning" as const
}

const audienceColor: Record<string, string> = {
  members: "bg-blue-100 text-blue-700",
  committee: "bg-purple-100 text-purple-700",
  public: "bg-emerald-100 text-emerald-700",
}

export function ManageAnnouncementsView({ role }: Props) {
  const { data, isPending, error, refetch, isRefetching } = useAnnouncements({
    limit: 200,
  })
  const updateMutation = useUpdateAnnouncementMutation()

  const [search, setSearch] = useState("")
  const [statusTab, setStatusTab] = useState("all")
  const [selected, setSelected] = useState<AnnouncementItem | null>(null)

  const all = useMemo(() => data?.data ?? [], [data?.data])

  const counts = useMemo(
    () => ({
      total: all.length,
      drafts: all.filter((a) => a.status === "draft").length,
      published: all.filter((a) => a.status === "published").length,
      archived: all.filter((a) => a.status === "archived").length,
      pinned: all.filter((a) => a.pinned).length,
    }),
    [all]
  )

  const filtered = useMemo(() => {
    return all.filter((a) => {
      const matchSearch =
        !search ||
        a.title.toLowerCase().includes(search.toLowerCase()) ||
        (a.summary ?? "").toLowerCase().includes(search.toLowerCase())
      const matchStatus = statusTab === "all" || a.status === statusTab
      return matchSearch && matchStatus
    })
  }, [all, search, statusTab])

  async function quickUpdate(
    id: string,
    updates: Partial<AnnouncementItem>,
    successMsg: string
  ) {
    try {
      await updateMutation.mutateAsync({ id, ...updates } as any)
      toast.success(successMsg)
    } catch (err: any) {
      toast.error(err?.message || "Failed to update announcement.")
    }
  }

  return (
    <div className="flex-1 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Announcements</h1>
          <p className="text-sm text-muted-foreground">
            Compose, publish, and manage group announcements.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refetch()}
            disabled={isRefetching}>
            <RefreshCcw className="h-4 w-4" />
            {isRefetching ? "Refreshing…" : "Refresh"}
          </Button>
          <AnnouncementComposeDialog
            defaultStatus={role === "president" ? "published" : "draft"}
          />
        </div>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>
            {error.help || error.message || "Unable to load announcements."}
          </AlertDescription>
        </Alert>
      ) : null}

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Published</CardTitle>
            <Megaphone className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums">
              {isPending ? <Loader className="h-5 w-5" /> : counts.published}
            </div>
            <p className="text-xs text-muted-foreground">
              Live & visible to audience
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Drafts</CardTitle>
            <FileText className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums">
              {isPending ? <Loader className="h-5 w-5" /> : counts.drafts}
            </div>
            <p className="text-xs text-muted-foreground">
              Awaiting publication
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Archived</CardTitle>
            <Archive className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums">
              {isPending ? <Loader className="h-5 w-5" /> : counts.archived}
            </div>
            <p className="text-xs text-muted-foreground">Hidden from members</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pinned</CardTitle>
            <Pin className="h-4 w-4 text-cyan-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums">
              {isPending ? <Loader className="h-5 w-5" /> : counts.pinned}
            </div>
            <p className="text-xs text-muted-foreground">
              Highlighted at top of feed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search + status tabs */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by title or summary…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Tabs value={statusTab} onValueChange={setStatusTab}>
          <TabsList>
            <TabsTrigger value="all">
              All
              <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold">
                {counts.total}
              </span>
            </TabsTrigger>
            <TabsTrigger value="published">
              Published
              <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold">
                {counts.published}
              </span>
            </TabsTrigger>
            <TabsTrigger value="draft">
              Drafts
              {counts.drafts > 0 ? (
                <span className="ml-1.5 rounded-full bg-amber-100 text-amber-700 px-1.5 py-0.5 text-[10px] font-semibold">
                  {counts.drafts}
                </span>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="archived">Archived</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* List */}
      {isPending ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader className="h-4 w-4" />
          Loading announcements…
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          {all.length === 0
            ? "No announcements yet. Create your first one."
            : "No announcements match your search."}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((a) => (
            <div
              key={a.id}
              className="rounded-lg border bg-card p-4 transition hover:bg-muted/30">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {a.pinned ? (
                      <Pin className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                    ) : null}
                    <p className="text-sm font-semibold truncate">{a.title}</p>
                  </div>
                  {a.summary ? (
                    <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                      {a.summary}
                    </p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge variant={statusBadge(a.status)}>{a.status}</Badge>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${audienceColor[a.audience] ?? ""}`}>
                      {a.audience}
                    </span>
                    {a.metadata?.tags?.slice(0, 2).map((t) => (
                      <span
                        key={t}
                        className="rounded-full border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        {t}
                      </span>
                    ))}
                    <span className="text-xs text-muted-foreground">
                      {formatDate(a.publishedAt ?? a.createdAt)}
                      {a.createdByName ? ` · ${a.createdByName}` : ""}
                    </span>
                  </div>
                </div>

                {/* Quick actions */}
                <div className="flex items-center gap-1">
                  {/* View */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelected(a)}
                    title="View full content">
                    <Eye className="h-4 w-4" />
                  </Button>

                  {/* Publish / Archive toggle */}
                  {a.status === "draft" || a.status === "archived" ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={updateMutation.isPending}
                      onClick={() =>
                        void quickUpdate(
                          a.id,
                          {
                            status: "published",
                            publishedAt: new Date(),
                          },
                          "Announcement published."
                        )
                      }
                      title="Publish">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={updateMutation.isPending}
                      onClick={() =>
                        void quickUpdate(
                          a.id,
                          { status: "archived" },
                          "Announcement archived."
                        )
                      }
                      title="Archive">
                      <Archive className="h-4 w-4 text-slate-500" />
                    </Button>
                  )}

                  {/* Pin / Unpin */}
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={updateMutation.isPending}
                    onClick={() =>
                      void quickUpdate(
                        a.id,
                        { pinned: !a.pinned },
                        a.pinned ? "Unpinned." : "Pinned."
                      )
                    }
                    title={a.pinned ? "Unpin" : "Pin"}>
                    {a.pinned ? (
                      <PinOff className="h-4 w-4 text-amber-500" />
                    ) : (
                      <Pin className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>

                  {/* Edit */}
                  <AnnouncementComposeDialog
                    announcement={a}
                    trigger={
                      <Button variant="ghost" size="sm" title="Edit">
                        <Edit3 className="h-4 w-4" />
                      </Button>
                    }
                  />

                  {/* Delete - admin, president and secretary only */}
                  {role === "admin" ||
                  role === "president" ||
                  role === "secretary" ? (
                    <AnnouncementDeleteDialog
                      id={a.id}
                      title={a.title}
                      trigger={
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Delete"
                          className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      }
                    />
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <AnnouncementDetailSheet
        announcement={selected}
        onClose={() => setSelected(null)}
      />
    </div>
  )
}
