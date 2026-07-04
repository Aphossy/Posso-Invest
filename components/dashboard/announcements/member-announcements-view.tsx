"use client"

import { useMemo, useState } from "react"
import { Bell, Megaphone, Pin, RefreshCcw, Search, Tag } from "lucide-react"

import {
  usePublishedAnnouncements,
  type AnnouncementItem,
} from "@/hooks/api/use-announcements"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader } from "@/components/common/loader"

import { AnnouncementDetailSheet } from "./announcement-detail-sheet"

function formatDate(val?: string | Date | null) {
  if (!val) return ""
  const d = val instanceof Date ? val : new Date(val)
  if (isNaN(d.getTime())) return ""
  return d.toLocaleDateString("en-RW", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

const audienceColor: Record<string, string> = {
  members: "bg-blue-100 text-blue-700",
  committee: "bg-purple-100 text-purple-700",
  public: "bg-emerald-100 text-emerald-700",
}

interface Props {
  /** "member" hides committee-only announcements in tabs; "treasurer" = same; defaults to member */
  role?: "member" | "treasurer"
}

export function MemberAnnouncementsView({ role = "member" }: Props) {
  const { data, isPending, error, refetch, isRefetching } =
    usePublishedAnnouncements(200)

  const [search, setSearch] = useState("")
  const [audienceTab, setAudienceTab] = useState("all")
  const [selected, setSelected] = useState<AnnouncementItem | null>(null)

  const all = useMemo(() => data?.data ?? [], [data?.data])
  const pinned = useMemo(() => all.filter((a) => a.pinned), [all])

  const allTags = useMemo(() => {
    const set = new Set<string>()
    all.forEach((a) => a.metadata?.tags?.forEach((t) => set.add(t)))
    return [...set]
  }, [all])

  const filtered = useMemo(() => {
    return all.filter((a) => {
      const matchSearch =
        !search ||
        a.title.toLowerCase().includes(search.toLowerCase()) ||
        (a.summary ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (a.metadata?.tags ?? []).some((t) =>
          t.toLowerCase().includes(search.toLowerCase())
        )
      const matchAudience = audienceTab === "all" || a.audience === audienceTab
      return matchSearch && matchAudience
    })
  }, [all, search, audienceTab])

  // Split pinned from non-pinned in the filtered list
  const pinnedFiltered = filtered.filter((a) => a.pinned)
  const regularFiltered = filtered.filter((a) => !a.pinned)

  return (
    <div className="flex-1 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Announcements</h1>
          <p className="text-sm text-muted-foreground">
            Stay informed on group news, deadlines, and committee updates.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void refetch()}
          disabled={isRefetching}>
          <RefreshCcw className="h-4 w-4" />
          {isRefetching ? "Refreshing…" : "Refresh"}
        </Button>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>
            {error.help || error.message || "Unable to load announcements."}
          </AlertDescription>
        </Alert>
      ) : null}

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Updates</CardTitle>
            <Bell className="h-4 w-4 text-cyan-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums">
              {isPending ? (
                <Loader className="h-5 w-5" />
              ) : (
                (data?.total ?? all.length)
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Published announcements
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pinned</CardTitle>
            <Pin className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums">
              {isPending ? <Loader className="h-5 w-5" /> : pinned.length}
            </div>
            <p className="text-xs text-muted-foreground">Highlighted notices</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Latest</CardTitle>
            <Megaphone className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="truncate text-sm font-medium">
              {isPending ? (
                <Loader className="h-5 w-5" />
              ) : all[0] ? (
                all[0].title
              ) : (
                "-"
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {all[0]
                ? formatDate(all[0].publishedAt ?? all[0].createdAt)
                : "No updates yet"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pinned banner */}
      {!isPending && pinned.length > 0 ? (
        <div className="space-y-2">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-amber-600">
            <Pin className="h-3.5 w-3.5" />
            Pinned
          </p>
          <div className="space-y-2">
            {pinned.map((a) => (
              <button
                key={a.id}
                onClick={() => setSelected(a)}
                className="w-full rounded-lg border border-amber-200 bg-amber-50 p-4 text-left transition hover:border-amber-300 hover:bg-amber-100 dark:border-amber-900/40 dark:bg-amber-950/20 dark:hover:bg-amber-950/30">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-sm font-semibold">{a.title}</p>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${audienceColor[a.audience] ?? ""}`}>
                    {a.audience}
                  </span>
                </div>
                {a.summary ? (
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                    {a.summary}
                  </p>
                ) : null}
                <p className="mt-2 text-xs text-muted-foreground">
                  {formatDate(a.publishedAt ?? a.createdAt)}
                  {a.createdByName ? ` · ${a.createdByName}` : ""}
                </p>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {/* Search + filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search announcements or tags…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Tabs value={audienceTab} onValueChange={setAudienceTab}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="committee">Committee</TabsTrigger>
            <TabsTrigger value="public">Public</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Announcement list */}
      {isPending ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader className="h-4 w-4" />
          Loading announcements…
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          {all.length === 0
            ? "No announcements published yet. Check back soon."
            : "No announcements match your search."}
        </div>
      ) : (
        <div className="space-y-3">
          {/* Non-pinned items (pinned already shown in banner) */}
          {regularFiltered.map((a) => (
            <button
              key={a.id}
              onClick={() => setSelected(a)}
              className="w-full rounded-lg border p-4 text-left transition hover:bg-muted/50">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="text-sm font-medium">{a.title}</p>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${audienceColor[a.audience] ?? ""}`}>
                    {a.audience}
                  </span>
                </div>
              </div>
              {a.summary ? (
                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                  {a.summary}
                </p>
              ) : null}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <p className="text-xs text-muted-foreground">
                  {formatDate(a.publishedAt ?? a.createdAt)}
                  {a.createdByName ? ` · ${a.createdByName}` : ""}
                </p>
                {a.metadata?.tags?.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="flex items-center gap-0.5 rounded-full border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    <Tag className="h-2.5 w-2.5" />
                    {tag}
                  </span>
                ))}
              </div>
            </button>
          ))}

          {/* Also show pinned items again in the list if user filtered or searched */}
          {pinnedFiltered.length > 0 && (search || audienceTab !== "all") ? (
            <>
              {pinnedFiltered.map((a) => (
                <button
                  key={`list-${a.id}`}
                  onClick={() => setSelected(a)}
                  className="w-full rounded-lg border border-amber-200 bg-amber-50/50 p-4 text-left transition hover:bg-amber-50 dark:border-amber-900/30 dark:bg-amber-950/10">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <Pin className="h-3 w-3 text-amber-600" />
                      <p className="text-sm font-medium">{a.title}</p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${audienceColor[a.audience] ?? ""}`}>
                      {a.audience}
                    </span>
                  </div>
                  {a.summary ? (
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                      {a.summary}
                    </p>
                  ) : null}
                  <p className="mt-2 text-xs text-muted-foreground">
                    {formatDate(a.publishedAt ?? a.createdAt)}
                  </p>
                </button>
              ))}
            </>
          ) : null}
        </div>
      )}

      {/* Tag cloud if any tags */}
      {!isPending && allTags.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 border-t pt-4">
          <span className="text-xs text-muted-foreground font-medium">
            Tags:
          </span>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSearch(tag)}
              className="rounded-full border bg-muted px-2.5 py-0.5 text-xs text-muted-foreground transition hover:bg-muted/70 hover:text-foreground">
              {tag}
            </button>
          ))}
        </div>
      ) : null}

      <AnnouncementDetailSheet
        announcement={selected}
        onClose={() => setSelected(null)}
      />
    </div>
  )
}
