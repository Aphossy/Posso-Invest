"use client"

import { useEffect, useMemo, useState } from "react"
import {
  AlertCircle,
  Archive,
  CheckCircle2,
  ChevronDown,
  Clock,
  Copy,
  Filter,
  Inbox,
  Loader2,
  Mail,
  MessageSquare,
  Phone,
  RefreshCcw,
  Send,
  Star,
  StarOff,
  Trash2,
  X,
} from "lucide-react"
import { toast } from "sonner"

import { useMessageOperations, useMessages } from "@/hooks/api/use-messages"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Loader } from "@/components/common/loader"

import { SERVICE_LABELS } from "./user-support-view"

// ─── Helpers ──────────────────────────────────────────────────────────────────
const STATUS_OPTIONS = [
  { value: "new", label: "New", className: "bg-blue-100 text-blue-700" },
  { value: "read", label: "Read", className: "bg-slate-100 text-slate-600" },
  {
    value: "in-progress",
    label: "In Progress",
    className: "bg-amber-100 text-amber-700",
  },
  {
    value: "resolved",
    label: "Resolved",
    className: "bg-emerald-100 text-emerald-700",
  },
  {
    value: "archived",
    label: "Archived",
    className: "bg-slate-100 text-slate-500",
  },
]

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low", className: "text-slate-500" },
  { value: "medium", label: "Medium", className: "text-blue-600" },
  { value: "high", label: "High", className: "text-orange-600" },
  { value: "urgent", label: "Urgent", className: "text-red-600" },
]

function StatusPill({ status }: { status: string }) {
  const cfg =
    STATUS_OPTIONS.find((s) => s.value === status) ?? STATUS_OPTIONS[0]
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.className}`}>
      {cfg.label}
    </span>
  )
}

function PriorityDot({ priority }: { priority?: string | null }) {
  const cfg =
    PRIORITY_OPTIONS.find((p) => p.value === priority) ?? PRIORITY_OPTIONS[1]
  return (
    <span className={`text-xs font-medium ${cfg.className}`}>{cfg.label}</span>
  )
}

function formatDate(val?: string | Date | null) {
  if (!val) return "-"
  const d = val instanceof Date ? val : new Date(val)
  return d.toLocaleDateString("en-RW", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface AdminResponse {
  id: string
  content: string
  isInternal?: boolean | null
  responderName?: string | null
  createdAt: string | Date
}

// ─── Ticket detail & response dialog ─────────────────────────────────────────
function TicketDialog({
  ticketId,
  onClose,
  onStatusChange,
}: {
  ticketId: string | null
  onClose: () => void
  onStatusChange: () => void
}) {
  const [ticket, setTicket] = useState<any>(null)
  const [responses, setResponses] = useState<AdminResponse[]>([])
  const [loading, setLoading] = useState(false)
  const [responding, setResponding] = useState(false)
  const [reply, setReply] = useState("")
  const [isInternal, setIsInternal] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  const { updateMessage } = useMessageOperations()

  const load = async () => {
    if (!ticketId) return
    setLoading(true)
    try {
      const [msgRes, respRes] = await Promise.all([
        fetch(`/api/message/${ticketId}`).then((r) => r.json()),
        fetch(`/api/message/${ticketId}/responses`).then((r) => r.json()),
      ])
      setTicket(msgRes?.data?.message ?? null)
      setResponses(respRes?.data?.responses ?? [])
    } catch {
      toast.error("Failed to load ticket details")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (ticketId) {
      setReply("")
      setIsInternal(false)
      load()
    }
  }, [ticketId])

  const sendReply = async () => {
    if (!reply.trim() || !ticketId) return
    setResponding(true)
    try {
      const res = await fetch(`/api/message/${ticketId}/responses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: reply.trim(), isInternal }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error?.message ?? "Failed to send response")
      }
      toast.success(isInternal ? "Internal note added." : "Reply sent.")
      setReply("")
      await load()
      onStatusChange()
    } catch (err: any) {
      toast.error(err.message ?? "Failed to send response")
    } finally {
      setResponding(false)
    }
  }

  const changeStatus = async (status: string) => {
    if (!ticketId) return
    setUpdatingStatus(true)
    try {
      await updateMessage.mutateAsync({
        messageId: ticketId,
        data: { status: status as any },
      })
      setTicket((t: any) => (t ? { ...t, status } : t))
      toast.success("Status updated.")
      onStatusChange()
    } catch {
      toast.error("Failed to update status")
    } finally {
      setUpdatingStatus(false)
    }
  }

  if (!ticketId) return null

  return (
    <Dialog open={Boolean(ticketId)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader className="h-4 w-4" />
              Loading…
            </div>
          ) : ticket ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill status={ticket.status} />
                <PriorityDot priority={ticket.priority} />
                {ticket.messageCode ? (
                  <span className="font-mono text-xs text-muted-foreground">
                    {ticket.messageCode}
                  </span>
                ) : null}
              </div>
              <DialogTitle className="text-lg leading-snug">
                {ticket.subject}
              </DialogTitle>
              <DialogDescription className="text-xs">
                From {ticket.name} ({ticket.email})
                {ticket.phone ? ` · ${ticket.phone}` : ""}
                {" · "}
                {SERVICE_LABELS[ticket.service] ?? ticket.service}
                {" · "}
                {formatDate(ticket.createdAt)}
              </DialogDescription>
            </>
          ) : (
            <DialogTitle>Ticket not found</DialogTitle>
          )}
        </DialogHeader>

        {ticket ? (
          <ScrollArea className="flex-1 px-6">
            <div className="space-y-4 py-4">
              {/* Status management */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground font-medium">
                  Status:
                </span>
                {STATUS_OPTIONS.filter((s) => s.value !== "archived").map(
                  (s) => (
                    <button
                      key={s.value}
                      disabled={updatingStatus || ticket.status === s.value}
                      onClick={() => changeStatus(s.value)}
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition ${
                        ticket.status === s.value
                          ? `${s.className} ring-2 ring-offset-1 ring-current`
                          : "bg-muted text-muted-foreground hover:bg-muted/70"
                      }`}>
                      {s.label}
                    </button>
                  )
                )}
                <button
                  disabled={updatingStatus || ticket.status === "archived"}
                  onClick={() => changeStatus("archived")}
                  className="ml-auto rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground hover:bg-muted/70 transition">
                  Archive
                </button>
              </div>

              <Separator />

              {/* Original message */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                  Original Message
                </p>
                <div className="rounded-md bg-muted/50 p-4 text-sm whitespace-pre-wrap">
                  {ticket.message}
                </div>
              </div>

              {/* Responses */}
              {responses.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Thread
                  </p>
                  {responses.map((r) => (
                    <div
                      key={r.id}
                      className={`rounded-md p-3 text-sm ${
                        r.isInternal
                          ? "border border-amber-200 bg-amber-50 dark:bg-amber-950/20"
                          : "border-l-2 border-primary bg-primary/5"
                      }`}>
                      {r.isInternal ? (
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-600 mb-1">
                          Internal Note
                        </p>
                      ) : null}
                      <p className="whitespace-pre-wrap">{r.content}</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {r.responderName ?? "Support"} ·{" "}
                        {formatDate(r.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}

              {/* Reply form */}
              <div className="space-y-2 pb-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    {isInternal ? "Internal Note" : "Reply to Member"}
                  </p>
                  <button
                    onClick={() => setIsInternal((v) => !v)}
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition ${
                      isInternal
                        ? "bg-amber-100 text-amber-700"
                        : "bg-muted text-muted-foreground hover:bg-muted/70"
                    }`}>
                    {isInternal ? "Switch to Reply" : "Make Internal"}
                  </button>
                </div>
                <Textarea
                  placeholder={
                    isInternal
                      ? "Add an internal note (not visible to member)…"
                      : "Write a reply visible to the member…"
                  }
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  rows={4}
                  className="resize-none"
                  disabled={responding}
                />
                <div className="flex justify-end gap-2">
                  {!isInternal && ticket.email ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        window.open(
                          `mailto:${ticket.email}?subject=Re: ${encodeURIComponent(ticket.subject)}`
                        )
                      }}>
                      <Mail className="mr-2 h-3.5 w-3.5" />
                      Email
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    onClick={sendReply}
                    disabled={!reply.trim() || responding}>
                    {responding ? (
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="mr-2 h-3.5 w-3.5" />
                    )}
                    {isInternal ? "Save Note" : "Send Reply"}
                  </Button>
                </div>
              </div>
            </div>
          </ScrollArea>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

// ─── Main view ────────────────────────────────────────────────────────────────
export function AdminSupportView() {
  const { data, isPending, error, refetch, isRefetching } = useMessages({
    limit: 200,
    isArchived: false,
  })
  const { updateMessage, deleteMessage } = useMessageOperations()

  const [search, setSearch] = useState("")
  const [statusTab, setStatusTab] = useState("all")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string
    subject: string
  } | null>(null)
  const [deleting, setDeleting] = useState(false)

  const all = useMemo(() => data?.data.messages ?? [], [data?.data.messages])

  const counts = useMemo(
    () => ({
      total: all.length,
      new: all.filter((m) => m.status === "new").length,
      inProgress: all.filter((m) => m.status === "in-progress").length,
      resolved: all.filter((m) => m.status === "resolved").length,
      starred: all.filter((m) => m.isStarred).length,
    }),
    [all]
  )

  const filtered = useMemo(() => {
    return all.filter((m) => {
      const matchSearch =
        !search ||
        m.subject.toLowerCase().includes(search.toLowerCase()) ||
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.email.toLowerCase().includes(search.toLowerCase()) ||
        (m.messageCode ?? "").toLowerCase().includes(search.toLowerCase())
      const matchStatus =
        statusTab === "all" ||
        (statusTab === "starred" ? m.isStarred : m.status === statusTab)
      return matchSearch && matchStatus
    })
  }, [all, search, statusTab])

  async function quickStatus(id: string, status: string) {
    try {
      await updateMessage.mutateAsync({
        messageId: id,
        data: { status: status as any },
      })
      toast.success(`Marked as ${status}.`)
    } catch {
      toast.error("Failed to update status")
    }
  }

  async function toggleStar(id: string, current: boolean) {
    try {
      await updateMessage.mutateAsync({
        messageId: id,
        data: { isStarred: !current },
      })
    } catch {
      toast.error("Failed to update")
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteMessage(deleteTarget.id)
      toast.success("Ticket deleted.")
      setDeleteTarget(null)
    } catch {
      toast.error("Failed to delete ticket")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="flex-1 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Support Messages</h1>
          <p className="text-sm text-muted-foreground">
            Manage member tickets, respond in-app or by email.
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
            {error.message || "Failed to load messages."}
          </AlertDescription>
        </Alert>
      ) : null}

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">New</CardTitle>
            <Inbox className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums">
              {isPending ? <Loader className="h-5 w-5" /> : counts.new}
            </div>
            <p className="text-xs text-muted-foreground">Awaiting review</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums">
              {isPending ? <Loader className="h-5 w-5" /> : counts.inProgress}
            </div>
            <p className="text-xs text-muted-foreground">Being handled</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums">
              {isPending ? <Loader className="h-5 w-5" /> : counts.resolved}
            </div>
            <p className="text-xs text-muted-foreground">Closed tickets</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums">
              {isPending ? <Loader className="h-5 w-5" /> : counts.total}
            </div>
            <p className="text-xs text-muted-foreground">All tickets</p>
          </CardContent>
        </Card>
      </div>

      {/* Search + filter tabs */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-52">
          <Filter className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, subject, or code…"
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
            <TabsTrigger value="new">
              New
              {counts.new > 0 ? (
                <span className="ml-1.5 rounded-full bg-blue-100 text-blue-700 px-1.5 py-0.5 text-[10px] font-semibold">
                  {counts.new}
                </span>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="in-progress">In Progress</TabsTrigger>
            <TabsTrigger value="resolved">Resolved</TabsTrigger>
            <TabsTrigger value="starred">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Ticket list */}
      {isPending ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader className="h-4 w-4" />
          Loading messages…
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-md border border-dashed p-10 text-center text-sm text-muted-foreground">
          {all.length === 0
            ? "No support tickets yet."
            : "No tickets match your search."}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((m) => (
            <div
              key={m.id}
              className={`rounded-lg border bg-card p-4 transition hover:bg-muted/20 ${
                m.status === "new"
                  ? "border-blue-200 dark:border-blue-900/40"
                  : ""
              }`}>
              <div className="flex flex-col sm:flex-row flex-wrap items-start justify-between gap-2">
                <button
                  className="flex-1 min-w-0 text-left"
                  onClick={() => setSelectedId(m.id)}>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium truncate">{m.subject}</p>
                    <StatusPill status={m.status} />
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {m.name} · {m.email}
                    {m.phone ? ` · ${m.phone}` : ""}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="rounded-full border bg-muted px-2 py-0.5">
                      {SERVICE_LABELS[m.service] ?? m.service}
                    </span>
                    <PriorityDot priority={m.priority} />
                    <span>{formatDate(m.createdAt)}</span>
                    {Number(m.responseCount ?? 0) > 0 ? (
                      <span className="text-emerald-600 flex items-center gap-0.5">
                        <CheckCircle2 className="h-3 w-3" />
                        {m.responseCount}{" "}
                        {Number(m.responseCount) === 1 ? "reply" : "replies"}
                      </span>
                    ) : null}
                    {m.messageCode ? (
                      <span className="font-mono">{m.messageCode}</span>
                    ) : null}
                  </div>
                </button>

                {/* Quick actions */}
                <div className="flex flex-wrap items-center gap-1">
                  {/* <button
                    onClick={() => setSelectedId(m.id)}
                    className="rounded block sm:hidden  border px-2 py-1 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    title="Reply to message">
                    Reply
                  </button> */}

                  <Button
                    className=""
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedId(m.id)}
                    title="Reply to message">
                    <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
                    Reply
                  </Button>

                  <button
                    onClick={() => void toggleStar(m.id, m.isStarred ?? false)}
                    className="rounded p-1.5 text-muted-foreground transition hover:text-amber-500"
                    title={m.isStarred ? "Unstar" : "Star"}>
                    {m.isStarred ? (
                      <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    ) : (
                      <StarOff className="h-4 w-4" />
                    )}
                  </button>

                  {m.status !== "resolved" ? (
                    <button
                      onClick={() => void quickStatus(m.id, "resolved")}
                      className="rounded p-1.5 text-muted-foreground transition hover:text-emerald-600"
                      title="Mark resolved">
                      <CheckCircle2 className="h-4 w-4" />
                    </button>
                  ) : null}

                  <button
                    onClick={() => void quickStatus(m.id, "archived")}
                    className="rounded p-1.5 text-muted-foreground transition hover:text-slate-600"
                    title="Archive">
                    <Archive className="h-4 w-4" />
                  </button>

                  <button
                    onClick={() =>
                      setDeleteTarget({ id: m.id, subject: m.subject })
                    }
                    className="rounded p-1.5 text-muted-foreground transition hover:text-destructive"
                    title="Delete">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Ticket detail dialog */}
      <TicketDialog
        ticketId={selectedId}
        onClose={() => setSelectedId(null)}
        onStatusChange={() => void refetch()}
      />

      {/* Delete confirmation */}
      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Ticket</DialogTitle>
            <DialogDescription>
              Permanently delete &ldquo;{deleteTarget?.subject}&rdquo;? This
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleting}>
              {deleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
