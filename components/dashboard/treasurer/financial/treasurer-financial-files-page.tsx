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
  Grid3x3,
  List,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import {
  useDeleteFinancialDocumentMutation,
  useFinancialDocuments,
  type FinancialDocumentEnriched,
} from "@/hooks/api/use-financial-documents"
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

import { FinancialDocDeleteDialog } from "./financial-doc-delete-dialog"
import { FinancialDocDetailDialog } from "./financial-doc-detail-dialog"
import { FinancialDocFormDialog } from "./financial-doc-form-dialog"

// ─── Constants ───────────────────────────────────────────────────────────────

const DOC_TYPE_TABS = [
  { value: "all", label: "All Files" },
  { value: "monthly_report", label: "Monthly Reports" },
  { value: "balance_sheet", label: "Balance Sheets" },
  { value: "income_statement", label: "Income Statements" },
  { value: "contribution_schedule", label: "Contribution Schedules" },
  { value: "loan_agreement", label: "Loan Agreements" },
  { value: "disbursement_record", label: "Disbursements" },
  { value: "repayment_schedule", label: "Repayment Schedules" },
  { value: "audit_report", label: "Audit Reports" },
  { value: "bank_statement", label: "Bank Statements" },
  { value: "budget", label: "Budgets" },
  { value: "other", label: "Other" },
] as const

type DocTypeTab = (typeof DOC_TYPE_TABS)[number]["value"]

const DOC_TYPE_LABELS: Record<string, string> = {
  monthly_report: "Monthly Report",
  balance_sheet: "Balance Sheet",
  income_statement: "Income Statement",
  contribution_schedule: "Contribution Schedule",
  loan_agreement: "Loan Agreement",
  disbursement_record: "Disbursement Record",
  repayment_schedule: "Repayment Schedule",
  audit_report: "Audit Report",
  bank_statement: "Bank Statement",
  budget: "Budget",
  other: "Other",
}

const DOC_TYPE_COLORS: Record<string, string> = {
  monthly_report:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  balance_sheet:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  income_statement:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  contribution_schedule:
    "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  loan_agreement:
    "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  disbursement_record:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  repayment_schedule:
    "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  audit_report: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  bank_statement:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  budget:
    "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  other: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  published:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  archived:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function TreasurerFinancialFilesPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const debouncedSearch = useDebounce(searchQuery, 350)
  const [docTypeTab, setDocTypeTab] = useState<DocTypeTab>("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [visibilityFilter, setVisibilityFilter] = useState("all")
  const [sortBy, setSortBy] = useState("createdAt-desc")
  const [viewMode, setViewMode] = useState<"grid" | "list">("list")
  const [page, setPage] = useState(1)

  // Dialog state
  const [formOpen, setFormOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [editDoc, setEditDoc] = useState<FinancialDocumentEnriched | null>(null)
  const [activeDoc, setActiveDoc] = useState<FinancialDocumentEnriched | null>(
    null
  )
  const [deleteDoc, setDeleteDoc] = useState<FinancialDocumentEnriched | null>(
    null
  )
  const [refreshing, setRefreshing] = useState(false)

  const limit = 20
  const offset = (page - 1) * limit
  const [sortField, sortDir] = sortBy.split("-")

  const { data, isLoading, error, refetch } = useFinancialDocuments({
    search: debouncedSearch || undefined,
    docType: docTypeTab !== "all" ? docTypeTab : undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    visibility: visibilityFilter !== "all" ? visibilityFilter : undefined,
    sortBy: sortField,
    sortOrder: sortDir as "asc" | "desc",
    limit,
    offset,
  })

  const deleteMutation = useDeleteFinancialDocumentMutation()

  const docs = data?.data ?? []
  const total = data?.total ?? docs.length
  const totalPages = Math.max(1, Math.ceil(total / limit))

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, docTypeTab, statusFilter, visibilityFilter, sortBy])

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await refetch()
      toast.success("Files refreshed")
    } catch {
      toast.error("Failed to refresh")
    } finally {
      setRefreshing(false)
    }
  }

  const openCreate = () => {
    setEditDoc(null)
    setFormOpen(true)
  }

  const openEdit = (doc: FinancialDocumentEnriched) => {
    setEditDoc(doc)
    setFormOpen(true)
  }

  const openDetail = (doc: FinancialDocumentEnriched) => {
    setActiveDoc(doc)
    setDetailOpen(true)
  }

  const openDelete = (doc: FinancialDocumentEnriched) => {
    setDeleteDoc(doc)
    setDeleteOpen(true)
  }

  const handleDownload = async (doc: FinancialDocumentEnriched) => {
    if (!doc.fileUrl) {
      toast.error("No file attached to this document")
      return
    }

    try {
      const res = await fetch(`/api/financial-documents/${doc.id}/download`)
      if (!res.ok) throw new Error()

      const result = await res.json()
      const downloadUrl =
        result.success && result.data?.downloadUrl
          ? result.data.downloadUrl
          : doc.fileUrl

      window.open(downloadUrl, "_blank")
      toast.success("Download started")
    } catch {
      toast.error("Failed to download file")
    }
  }

  // Quick stats from current page data
  const typeCounts = [
    "monthly_report",
    "balance_sheet",
    "loan_agreement",
    "audit_report",
    "budget",
  ].reduce(
    (acc, t) => {
      acc[t] = docs.filter((d) => d.docType === t).length
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
                Failed to load financial files
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
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Financial Files</h1>
          <p className="text-muted-foreground">
            Manage TrustLink Group financial reports, contribution records, loan
            documents, and statements
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
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Upload File
          </Button>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {[
          "monthly_report",
          "balance_sheet",
          "loan_agreement",
          "audit_report",
          "budget",
        ].map((t) => (
          <button
            key={t}
            onClick={() =>
              setDocTypeTab(docTypeTab === t ? "all" : (t as DocTypeTab))
            }
            className={cn(
              "rounded-lg border p-4 text-left transition-colors hover:bg-accent",
              docTypeTab === t && "border-primary bg-primary/5"
            )}>
            <p className="text-2xl font-bold">{typeCounts[t] ?? 0}</p>
            <p className="mt-1 text-xs leading-tight text-muted-foreground">
              {DOC_TYPE_LABELS[t]}
            </p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Browse Files</CardTitle>
          <CardDescription>Filter by document type</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs
            value={docTypeTab}
            onValueChange={(v) => setDocTypeTab(v as DocTypeTab)}>
            <TabsList className="h-auto flex-wrap gap-1">
              {DOC_TYPE_TABS.map((tab) => (
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
                placeholder="Search financial files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={visibilityFilter}
              onValueChange={setVisibilityFilter}>
              <SelectTrigger className="sm:w-44">
                <SelectValue placeholder="Visibility" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Visibility</SelectItem>
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="authenticated">All Members</SelectItem>
                <SelectItem value="committee">Committee Only</SelectItem>
                <SelectItem value="private">Private</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="sm:w-48">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAt-desc">Newest first</SelectItem>
                <SelectItem value="createdAt-asc">Oldest first</SelectItem>
                <SelectItem value="title-asc">Title A–Z</SelectItem>
                <SelectItem value="title-desc">Title Z–A</SelectItem>
                <SelectItem value="period-desc">Period (newest)</SelectItem>
                <SelectItem value="downloadCount-desc">
                  Most downloaded
                </SelectItem>
              </SelectContent>
            </Select>

            <div className="flex gap-1 rounded-md border">
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

          {(searchQuery ||
            statusFilter !== "all" ||
            visibilityFilter !== "all") && (
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
              {visibilityFilter !== "all" && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setVisibilityFilter("all")}>
                  Visibility: {visibilityFilter}
                  <X className="ml-2 h-3 w-3" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery("")
                  setStatusFilter("all")
                  setVisibilityFilter("all")
                }}>
                Clear all
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* File list */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>
                {total} File{total !== 1 ? "s" : ""}
              </CardTitle>
              <CardDescription>
                {debouncedSearch
                  ? `Results for "${debouncedSearch}"`
                  : docTypeTab === "all"
                    ? "All financial documents"
                    : DOC_TYPE_LABELS[docTypeTab]}{" "}
                · Page {page} of {totalPages}
              </CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={openCreate}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Upload
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
          ) : docs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="mb-4 rounded-full bg-muted p-6">
                <FileText className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">No files found</h3>
              <p className="mb-6 max-w-sm text-muted-foreground">
                {docTypeTab === "monthly_report"
                  ? "Upload monthly summaries, balance sheets, and financial statements."
                  : docTypeTab === "loan_agreement"
                    ? "Upload loan agreements, disbursement records, and repayment schedules."
                    : "Upload financial documents to get started."}
              </p>
              <Button onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Upload File
              </Button>
            </div>
          ) : viewMode === "list" ? (
            <div className="space-y-2">
              {docs.map((doc) => (
                <FinancialFileRow
                  key={doc.id}
                  doc={doc}
                  onView={openDetail}
                  onEdit={openEdit}
                  onDelete={openDelete}
                  onDownload={handleDownload}
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {docs.map((doc) => (
                <FinancialFileCard
                  key={doc.id}
                  doc={doc}
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

      {/* Dialogs */}
      <FinancialDocFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editDoc={editDoc}
        onSuccess={() => refetch()}
      />
      <FinancialDocDetailDialog
        doc={activeDoc}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onEdit={openEdit}
        onDownload={handleDownload}
      />
      <FinancialDocDeleteDialog
        doc={deleteDoc}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onSuccess={() => refetch()}
      />
    </div>
  )
}

// ─── Financial file row (list view) ──────────────────────────────────────────

function FinancialFileRow({
  doc,
  onView,
  onEdit,
  onDelete,
  onDownload,
}: {
  doc: FinancialDocumentEnriched
  onView: (d: FinancialDocumentEnriched) => void
  onEdit: (d: FinancialDocumentEnriched) => void
  onDelete: (d: FinancialDocumentEnriched) => void
  onDownload: (d: FinancialDocumentEnriched) => void
}) {
  const typeLabel = DOC_TYPE_LABELS[doc.docType] ?? "Document"
  const typeColor = DOC_TYPE_COLORS[doc.docType] ?? ""
  const statusColor = STATUS_COLORS[doc.status] ?? ""

  return (
    <div className="flex flex-wrap items-start gap-4 rounded-lg border p-4 transition-colors hover:bg-accent/50">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-green-500/10">
        <FileText className="h-6 w-6 text-green-600" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="font-semibold leading-tight">{doc.title}</p>
          <div className="flex shrink-0 flex-wrap gap-1.5">
            <Badge className={cn("text-xs", typeColor)}>{typeLabel}</Badge>
            <Badge className={cn("text-xs", statusColor)}>{doc.status}</Badge>
          </div>
        </div>

        {doc.description && (
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
            {doc.description}
          </p>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {doc.period && (
            <>
              <span>Period: {doc.period}</span>
              <span>·</span>
            </>
          )}
          {doc.fiscalYear && (
            <>
              <span>FY {doc.fiscalYear}</span>
              <span>·</span>
            </>
          )}
          {doc.uploaderName && (
            <>
              <span>By: {doc.uploaderName}</span>
              <span>·</span>
            </>
          )}
          <span>{format(new Date(doc.createdAt), "MMM d, yyyy")}</span>
          {doc.fileUrl && (
            <Badge variant="outline" className="text-xs">
              Has file
            </Badge>
          )}
          {(doc.downloadCount ?? 0) > 0 && (
            <span>{doc.downloadCount} downloads</span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => onView(doc)}>
          <Eye className="mr-1.5 h-3.5 w-3.5" />
          View
        </Button>
        {doc.fileUrl && (
          <Button size="sm" variant="outline" onClick={() => onDownload(doc)}>
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Download
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={() => onEdit(doc)}>
          <Edit2 className="mr-1.5 h-3.5 w-3.5" />
          Edit
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="text-destructive hover:bg-destructive/10"
          onClick={() => onDelete(doc)}>
          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
          Delete
        </Button>
      </div>
    </div>
  )
}

// ─── Financial file card (grid view) ─────────────────────────────────────────

function FinancialFileCard({
  doc,
  onView,
  onEdit,
  onDelete,
  onDownload,
}: {
  doc: FinancialDocumentEnriched
  onView: (d: FinancialDocumentEnriched) => void
  onEdit: (d: FinancialDocumentEnriched) => void
  onDelete: (d: FinancialDocumentEnriched) => void
  onDownload: (d: FinancialDocumentEnriched) => void
}) {
  const typeLabel = DOC_TYPE_LABELS[doc.docType] ?? "Document"
  const typeColor = DOC_TYPE_COLORS[doc.docType] ?? ""

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4 transition-colors hover:bg-accent/50">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
        <FileText className="h-5 w-5 text-green-600" />
      </div>
      <div className="flex-1">
        <p className="line-clamp-2 font-semibold leading-tight">{doc.title}</p>
        <Badge className={cn("mt-1.5 text-xs", typeColor)}>{typeLabel}</Badge>
        <p className="mt-1.5 text-xs text-muted-foreground">
          {doc.period
            ? `Period: ${doc.period}`
            : format(new Date(doc.createdAt), "MMM d, yyyy")}
        </p>
      </div>
      <div className="flex gap-1.5">
        <Button
          size="sm"
          variant="outline"
          className="flex-1"
          onClick={() => onView(doc)}>
          <Eye className="h-3.5 w-3.5" />
        </Button>
        {doc.fileUrl && (
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={() => onDownload(doc)}>
            <Download className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          className="flex-1"
          onClick={() => onEdit(doc)}>
          <Edit2 className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="flex-1 text-destructive hover:bg-destructive/10"
          onClick={() => onDelete(doc)}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}
