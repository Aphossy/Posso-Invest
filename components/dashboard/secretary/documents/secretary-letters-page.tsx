"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Edit2,
  Eye,
  FileText,
  Mail,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { useLetters, type LetterEnriched } from "@/hooks/api/use-letters"
import { useDebounce } from "@/hooks/use-debounce"
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

import { LetterDeleteDialog } from "./letter-delete-dialog"
import { LetterDetailDialog } from "./letter-detail-dialog"
import { LetterFormDialog } from "./letter-form-dialog"

// ─── Constants ───────────────────────────────────────────────────────────────

const LETTER_TYPE_TABS = [
  { value: "all", label: "All Letters" },
  { value: "approval_request", label: "Approval Requests" },
  { value: "official_notice", label: "Official Notices" },
  { value: "legal_notice", label: "Legal Notices" },
  { value: "meeting_notice", label: "Meeting Notices" },
  { value: "member_communication", label: "Member Comm." },
  { value: "general_correspondence", label: "General" },
] as const

type LetterTypeTab = (typeof LETTER_TYPE_TABS)[number]["value"]

const LETTER_TYPE_LABELS: Record<string, string> = {
  approval_request: "Approval Request",
  official_notice: "Official Notice",
  legal_notice: "Legal Notice",
  meeting_notice: "Meeting Notice",
  member_communication: "Member Communication",
  general_correspondence: "General Correspondence",
}

const LETTER_STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  sent: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  acknowledged:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  approved:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  archived:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
}

const LETTER_TYPE_COLORS: Record<string, string> = {
  approval_request:
    "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  official_notice:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  legal_notice: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  meeting_notice:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  member_communication:
    "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  general_correspondence:
    "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SecretaryLettersPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const debouncedSearch = useDebounce(searchQuery, 350)
  const [typeTab, setTypeTab] = useState<LetterTypeTab>("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [sortBy, setSortBy] = useState("createdAt-desc")
  const [page, setPage] = useState(1)
  const [refreshing, setRefreshing] = useState(false)

  // Dialog states
  const [formOpen, setFormOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [activeLetter, setActiveLetter] = useState<LetterEnriched | null>(null)
  const [editLetter, setEditLetter] = useState<LetterEnriched | null>(null)
  const [deleteLetter, setDeleteLetter] = useState<LetterEnriched | null>(null)

  const limit = 20
  const offset = (page - 1) * limit
  const [sortField, sortDir] = sortBy.split("-")

  const { data, isLoading, error, refetch } = useLetters({
    search: debouncedSearch || undefined,
    letterType: typeTab !== "all" ? typeTab : undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    sortBy: sortField,
    sortOrder: sortDir as "asc" | "desc",
    limit,
    offset,
  })

  const letters = data?.data ?? []
  const total = data?.total ?? letters.length
  const totalPages = Math.max(1, Math.ceil(total / limit))

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, typeTab, statusFilter, sortBy])

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await refetch()
      toast.success("Letters refreshed")
    } catch {
      toast.error("Failed to refresh")
    } finally {
      setRefreshing(false)
    }
  }

  const openCreate = (defaultType?: string) => {
    setEditLetter(null)
    setFormOpen(true)
  }
  const openEdit = (letter: LetterEnriched) => {
    setEditLetter(letter)
    setDetailOpen(false)
    setFormOpen(true)
  }
  const openDetail = (letter: LetterEnriched) => {
    setActiveLetter(letter)
    setDetailOpen(true)
  }
  const openDelete = (letter: LetterEnriched) => {
    setDeleteLetter(letter)
    setDeleteOpen(true)
  }

  const handleDownload = async (letter: LetterEnriched) => {
    if (!letter.fileUrl) {
      toast.error("No file attached to this letter")
      return
    }

    try {
      const res = await fetch(`/api/letters/${letter.id}/download`)
      if (!res.ok) throw new Error()

      const result = await res.json()
      const downloadUrl =
        result.success && result.data?.downloadUrl
          ? result.data.downloadUrl
          : letter.fileUrl

      window.open(downloadUrl, "_blank")
      toast.success("Download started")
    } catch {
      toast.error("Failed to download attachment")
    }
  }

  // Counts per type from current page
  const typeCounts = LETTER_TYPE_TABS.filter((t) => t.value !== "all").reduce(
    (acc, tab) => {
      acc[tab.value] = letters.filter((l) => l.letterType === tab.value).length
      return acc
    },
    {} as Record<string, number>
  )

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="flex h-32 items-center justify-center">
            <div className="text-center">
              <p className="mb-4 text-muted-foreground">
                Failed to load letters
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
    <div className="container mx-auto space-y-8">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">
            Letters & Approvals
          </h1>
          <p className="text-muted-foreground">
            Manage TrustLink Group correspondence, approval letters, legal
            documents, and formal communications
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
          <Button onClick={() => openCreate()}>
            <Plus className="mr-2 h-4 w-4" />
            New Letter
          </Button>
        </div>
      </div>

      {/* ── Type stat cards ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {LETTER_TYPE_TABS.filter((t) => t.value !== "all").map((tab) => (
          <button
            key={tab.value}
            onClick={() =>
              setTypeTab(typeTab === tab.value ? "all" : tab.value)
            }
            className={cn(
              "rounded-lg border p-4 text-left transition-colors hover:bg-accent",
              typeTab === tab.value && "border-primary bg-primary/5"
            )}>
            <p className="text-2xl font-bold">
              {typeTab === "all"
                ? (typeCounts[tab.value] ?? 0)
                : tab.value === typeTab
                  ? total
                  : 0}
            </p>
            <p className="mt-1 text-xs leading-tight text-muted-foreground">
              {tab.label}
            </p>
          </button>
        ))}
      </div>

      {/* ── Filters ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Browse Letters</CardTitle>
          <CardDescription>Filter by letter type and status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs
            value={typeTab}
            onValueChange={(v) => setTypeTab(v as LetterTypeTab)}>
            <TabsList className="h-auto flex-wrap gap-1">
              {LETTER_TYPE_TABS.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="flex flex-wrap gap-3">
            <div className="relative min-w-48 flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by subject, reference, or recipient..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="sm:w-44">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="acknowledged">Acknowledged</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="sm:w-48">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAt-desc">Newest first</SelectItem>
                <SelectItem value="createdAt-asc">Oldest first</SelectItem>
                <SelectItem value="subject-asc">Subject A–Z</SelectItem>
                <SelectItem value="subject-desc">Subject Z–A</SelectItem>
                <SelectItem value="issuedAt-desc">
                  Issued date (newest)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(searchQuery || statusFilter !== "all") && (
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
              {statusFilter !== "all" && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setStatusFilter("all")}>
                  Status: {statusFilter}
                  <X className="ml-2 h-3 w-3" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery("")
                  setStatusFilter("all")
                }}>
                Clear all
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Letter list ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>
                {total} Letter{total !== 1 ? "s" : ""}
              </CardTitle>
              <CardDescription>
                {debouncedSearch
                  ? `Results for "${debouncedSearch}"`
                  : typeTab === "all"
                    ? "All TrustLink Group letters and correspondence"
                    : LETTER_TYPE_LABELS[typeTab]}{" "}
                · Page {page} of {totalPages}
              </CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={() => openCreate()}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              New Letter
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 rounded-lg border p-4">
                  <div className="h-12 w-12 animate-pulse rounded bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
                    <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          ) : letters.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="mb-4 rounded-full bg-muted p-6">
                <Mail className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">No letters found</h3>
              <p className="mb-6 max-w-sm text-muted-foreground">
                {typeTab === "approval_request"
                  ? "Create approval request letters for group decisions."
                  : typeTab === "legal_notice"
                    ? "Upload legal notices and binding correspondence."
                    : "Create a new letter to get started."}
              </p>
              <Button onClick={() => openCreate()}>
                <Plus className="mr-2 h-4 w-4" />
                Create Letter
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {letters.map((letter) => (
                <LetterRow
                  key={letter.id}
                  letter={letter}
                  typeColors={LETTER_TYPE_COLORS}
                  typeLabels={LETTER_TYPE_LABELS}
                  statusColors={LETTER_STATUS_COLORS}
                  onView={openDetail}
                  onEdit={openEdit}
                  onDelete={openDelete}
                  onDownload={handleDownload}
                />
              ))}
            </div>
          )}

          <div className="mt-6 flex items-center justify-between border-t pt-4">
            <p className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1 || isLoading}
                onClick={() => setPage((p) => Math.max(p - 1, 1))}>
                <ChevronLeft className="mr-1 h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages || isLoading}
                onClick={() => setPage((p) => p + 1)}>
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Dialogs ── */}
      <LetterFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editLetter={editLetter}
        onSuccess={() => refetch()}
      />

      <LetterDetailDialog
        letter={activeLetter}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onEdit={openEdit}
        onDownload={handleDownload}
      />

      <LetterDeleteDialog
        letter={deleteLetter}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onSuccess={() => refetch()}
      />
    </div>
  )
}

// ─── Letter row ───────────────────────────────────────────────────────────────

function LetterRow({
  letter,
  typeColors,
  typeLabels,
  statusColors,
  onView,
  onEdit,
  onDelete,
  onDownload,
}: {
  letter: LetterEnriched
  typeColors: Record<string, string>
  typeLabels: Record<string, string>
  statusColors: Record<string, string>
  onView: (l: LetterEnriched) => void
  onEdit: (l: LetterEnriched) => void
  onDelete: (l: LetterEnriched) => void
  onDownload: (l: LetterEnriched) => void
}) {
  const typeLabel = typeLabels[letter.letterType] ?? "Letter"
  const typeColor = typeColors[letter.letterType] ?? ""
  const statusColor = statusColors[letter.status] ?? ""

  return (
    <div
      className="group flex flex-wrap cursor-pointer items-start gap-4 rounded-lg border p-4 transition-colors hover:bg-accent/50"
      onClick={() => onView(letter)}>
      {/* Icon */}
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <FileText className="h-6 w-6 text-primary" />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="font-semibold leading-tight">{letter.subject}</p>
          <div className="flex shrink-0 flex-wrap gap-1.5">
            <Badge className={cn("text-xs", typeColor)}>{typeLabel}</Badge>
            <Badge className={cn("text-xs", statusColor)}>
              {letter.status}
            </Badge>
          </div>
        </div>

        {letter.description && (
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
            {letter.description}
          </p>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {letter.refNumber && (
            <span className="font-mono">{letter.refNumber}</span>
          )}
          {letter.recipient && <span>To: {letter.recipient}</span>}
          {letter.issuedByName && <span>By: {letter.issuedByName}</span>}
          <span>{format(new Date(letter.createdAt), "MMM d, yyyy")}</span>
          {letter.fileUrl && (
            <Badge variant="outline" className="text-xs">
              Has attachment
            </Badge>
          )}
        </div>
      </div>

      {/* Actions */}
      <div
        className="flex flex-wrap gap-2"
        onClick={(e) => e.stopPropagation()}>
        <Button size="sm" variant="outline" onClick={() => onView(letter)}>
          <Eye className="mr-1.5 h-3.5 w-3.5" />
          View
        </Button>
        {letter.fileUrl && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onDownload(letter)}>
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Download
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={() => onEdit(letter)}>
          <Edit2 className="mr-1.5 h-3.5 w-3.5" />
          Edit
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="text-destructive hover:bg-destructive/10"
          onClick={() => onDelete(letter)}>
          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
          Delete
        </Button>
      </div>
    </div>
  )
}
