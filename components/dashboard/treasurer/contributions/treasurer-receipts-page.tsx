"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Edit2,
  Eye,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { useReceipts, type ReceiptEnriched } from "@/hooks/api/use-receipts"
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

import { ReceiptDeleteDialog } from "./receipt-delete-dialog"
import { ReceiptDetailDialog } from "./receipt-detail-dialog"
import { ReceiptFormDialog } from "./receipt-form-dialog"

// ─── Constants ───────────────────────────────────────────────────────────────

const RECEIPT_TYPE_TABS = [
  { value: "all", label: "All Receipts" },
  { value: "contribution", label: "Contributions" },
  { value: "loan_repayment", label: "Loan Repayments" },
  { value: "penalty_payment", label: "Penalty Payments" },
  { value: "registration_fee", label: "Registration Fees" },
  { value: "other", label: "Other" },
] as const

type ReceiptTypeTab = (typeof RECEIPT_TYPE_TABS)[number]["value"]

const RECEIPT_TYPE_LABELS: Record<string, string> = {
  contribution: "Contribution",
  loan_repayment: "Loan Repayment",
  penalty_payment: "Penalty Payment",
  registration_fee: "Registration Fee",
  other: "Other",
}

const RECEIPT_TYPE_COLORS: Record<string, string> = {
  contribution:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  loan_repayment:
    "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  penalty_payment:
    "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  registration_fee:
    "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  other: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
}

const RECEIPT_ICON_COLORS: Record<string, string> = {
  contribution: "bg-green-500/10",
  loan_repayment: "bg-blue-500/10",
  penalty_payment: "bg-red-500/10",
  registration_fee: "bg-purple-500/10",
  other: "bg-muted",
}

const RECEIPT_ICON_TEXT_COLORS: Record<string, string> = {
  contribution: "text-green-600",
  loan_repayment: "text-blue-600",
  penalty_payment: "text-red-600",
  registration_fee: "text-purple-600",
  other: "text-muted-foreground",
}

const STATUS_COLORS: Record<string, string> = {
  issued:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  void: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  replaced:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function TreasurerReceiptsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const debouncedSearch = useDebounce(searchQuery, 350)
  const [receiptTypeTab, setReceiptTypeTab] = useState<ReceiptTypeTab>("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [sortBy, setSortBy] = useState("issuedAt-desc")
  const [page, setPage] = useState(1)

  // Dialog state
  const [formOpen, setFormOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [editReceipt, setEditReceipt] = useState<ReceiptEnriched | null>(null)
  const [activeReceipt, setActiveReceipt] = useState<ReceiptEnriched | null>(
    null
  )
  const [deleteReceipt, setDeleteReceipt] = useState<ReceiptEnriched | null>(
    null
  )
  const [refreshing, setRefreshing] = useState(false)

  const limit = 25
  const offset = (page - 1) * limit
  const [sortField, sortDir] = sortBy.split("-")

  const { data, isLoading, error, refetch } = useReceipts({
    search: debouncedSearch || undefined,
    receiptType: receiptTypeTab !== "all" ? receiptTypeTab : undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    sortBy: sortField,
    sortOrder: sortDir as "asc" | "desc",
    limit,
    offset,
  })

  const receipts = data?.data ?? []
  const total = data?.total ?? receipts.length
  const totalPages = Math.max(1, Math.ceil(total / limit))

  // Summary counts by type (current page data)
  const countContribution = receipts.filter(
    (r) => r.receiptType === "contribution"
  ).length
  const countLoan = receipts.filter(
    (r) => r.receiptType === "loan_repayment"
  ).length
  const countPenalty = receipts.filter(
    (r) => r.receiptType === "penalty_payment"
  ).length
  const countReg = receipts.filter(
    (r) => r.receiptType === "registration_fee"
  ).length

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, receiptTypeTab, statusFilter, sortBy])

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await refetch()
      toast.success("Receipts refreshed")
    } catch {
      toast.error("Failed to refresh")
    } finally {
      setRefreshing(false)
    }
  }

  const openCreate = () => {
    setEditReceipt(null)
    setFormOpen(true)
  }

  const openEdit = (r: ReceiptEnriched) => {
    setEditReceipt(r)
    setFormOpen(true)
  }

  const openDetail = (r: ReceiptEnriched) => {
    setActiveReceipt(r)
    setDetailOpen(true)
  }

  const openDelete = (r: ReceiptEnriched) => {
    setDeleteReceipt(r)
    setDeleteOpen(true)
  }

  const handleDownload = async (r: ReceiptEnriched) => {
    if (!r.fileUrl) {
      toast.error("No file attached to this receipt")
      return
    }

    try {
      const res = await fetch(`/api/receipts/${r.id}/download`)
      if (!res.ok) throw new Error()

      const result = await res.json()
      const downloadUrl =
        result.success && result.data?.downloadUrl
          ? result.data.downloadUrl
          : r.fileUrl

      window.open(downloadUrl, "_blank")
      toast.success("Download started")
    } catch {
      toast.error("Failed to download receipt")
    }
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="flex h-32 items-center justify-center">
            <div className="text-center">
              <p className="mb-4 text-muted-foreground">
                Failed to load receipts
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
          <h1 className="text-2xl font-bold sm:text-3xl">Receipts</h1>
          <p className="text-muted-foreground">
            Issue and archive contribution receipts, loan repayment proofs, and
            payment confirmations
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
            Issue Receipt
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          {
            type: "contribution",
            label: "Contribution Receipts",
            sub: "Monthly savings proofs",
            count: countContribution,
          },
          {
            type: "loan_repayment",
            label: "Loan Repayment Receipts",
            sub: "Repayment confirmations",
            count: countLoan,
          },
          {
            type: "penalty_payment",
            label: "Penalty Payments",
            sub: "Penalty confirmations",
            count: countPenalty,
          },
          {
            type: "registration_fee",
            label: "Registration Fees",
            sub: "Member registrations",
            count: countReg,
          },
        ].map(({ type, label, sub, count }) => (
          <Card
            key={type}
            className={cn(
              "cursor-pointer transition-colors hover:bg-accent",
              receiptTypeTab === type && "border-primary bg-primary/5"
            )}
            onClick={() =>
              setReceiptTypeTab(
                receiptTypeTab === type ? "all" : (type as ReceiptTypeTab)
              )
            }>
            <CardHeader className="pb-2">
              <CardDescription>{label}</CardDescription>
              <CardTitle className="text-3xl">{count}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Receipt Archive</CardTitle>
          <CardDescription>
            Browse and manage all issued receipts by type
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs
            value={receiptTypeTab}
            onValueChange={(v) => setReceiptTypeTab(v as ReceiptTypeTab)}>
            <TabsList className="h-auto flex-wrap gap-1">
              {RECEIPT_TYPE_TABS.map((tab) => (
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
                placeholder="Search receipts by number, period, or notes..."
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
                <SelectItem value="issued">Issued</SelectItem>
                <SelectItem value="void">Void</SelectItem>
                <SelectItem value="replaced">Replaced</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="sm:w-48">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="issuedAt-desc">Newest first</SelectItem>
                <SelectItem value="issuedAt-asc">Oldest first</SelectItem>
                <SelectItem value="amount-desc">Highest amount</SelectItem>
                <SelectItem value="amount-asc">Lowest amount</SelectItem>
                <SelectItem value="receiptNumber-asc">Receipt No.</SelectItem>
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

      {/* Receipt list */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>
                {total} Receipt{total !== 1 ? "s" : ""}
              </CardTitle>
              <CardDescription>
                {debouncedSearch
                  ? `Results for "${debouncedSearch}"`
                  : RECEIPT_TYPE_TABS.find((t) => t.value === receiptTypeTab)
                      ?.label}{" "}
                · Page {page} of {totalPages}
              </CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={openCreate}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Issue Receipt
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
          ) : receipts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="mb-4 rounded-full bg-muted p-6">
                <Receipt className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">No receipts found</h3>
              <p className="mb-6 max-w-sm text-muted-foreground">
                {receiptTypeTab === "contribution"
                  ? "Issue contribution receipts to members after each monthly savings collection."
                  : receiptTypeTab === "loan_repayment"
                    ? "Upload loan repayment confirmations and proof-of-payment documents."
                    : "Issue receipts to get started."}
              </p>
              <Button onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Issue Receipt
              </Button>
            </div>
          ) : (
            <div className="space-y-2 ">
              {receipts.map((r) => (
                <ReceiptRow
                  key={r.id}
                  receipt={r}
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
      <ReceiptFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editReceipt={editReceipt}
        onSuccess={() => refetch()}
      />
      <ReceiptDetailDialog
        receipt={activeReceipt}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onEdit={openEdit}
        onDownload={handleDownload}
      />
      <ReceiptDeleteDialog
        receipt={deleteReceipt}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onSuccess={() => refetch()}
      />
    </div>
  )
}

// ─── Receipt row ──────────────────────────────────────────────────────────────

function ReceiptRow({
  receipt,
  onView,
  onEdit,
  onDelete,
  onDownload,
}: {
  receipt: ReceiptEnriched
  onView: (r: ReceiptEnriched) => void
  onEdit: (r: ReceiptEnriched) => void
  onDelete: (r: ReceiptEnriched) => void
  onDownload: (r: ReceiptEnriched) => void
}) {
  const typeLabel = RECEIPT_TYPE_LABELS[receipt.receiptType] ?? "Receipt"
  const typeColor = RECEIPT_TYPE_COLORS[receipt.receiptType] ?? ""
  const iconBg = RECEIPT_ICON_COLORS[receipt.receiptType] ?? "bg-muted"
  const iconText =
    RECEIPT_ICON_TEXT_COLORS[receipt.receiptType] ?? "text-muted-foreground"
  const statusColor = STATUS_COLORS[receipt.status] ?? ""

  return (
    <div className="flex  flex-wrap items-start gap-4 rounded-lg border p-4 transition-colors hover:bg-accent/50">
      {/* Icon */}
      <div
        className={cn(
          "flex h-12 w-12 shrink-0 items-center justify-center rounded-lg",
          iconBg
        )}>
        <Receipt className={cn("h-6 w-6", iconText)} />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="font-semibold leading-tight">
              {receipt.receiptNumber ?? "-"}
            </p>
            {receipt.memberName && (
              <p className="text-sm text-muted-foreground">
                {receipt.memberName}
              </p>
            )}
          </div>
          <div className="flex shrink-0 flex-wrap gap-1.5">
            <Badge className={cn("text-xs", typeColor)}>{typeLabel}</Badge>
            <Badge className={cn("text-xs", statusColor)}>
              {receipt.status}
            </Badge>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">
            {receipt.currency} {Number(receipt.amount).toLocaleString()}
          </span>
          <span>·</span>
          <span className="capitalize">
            {receipt.paymentMethod?.replace("_", " ")}
          </span>
          {receipt.period && (
            <>
              <span>·</span>
              <span>Period: {receipt.period}</span>
            </>
          )}
          <span>·</span>
          <span>
            Issued {format(new Date(receipt.issuedAt), "MMM d, yyyy")}
          </span>
          {receipt.issuedByName && (
            <>
              <span>·</span>
              <span>By: {receipt.issuedByName}</span>
            </>
          )}
          {receipt.fileUrl && (
            <Badge variant="outline" className="text-xs">
              Has document
            </Badge>
          )}
        </div>

        {receipt.notes && (
          <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
            {receipt.notes}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => onView(receipt)}>
          <Eye className="mr-1.5 h-3.5 w-3.5" />
          View
        </Button>
        {receipt.fileUrl && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onDownload(receipt)}>
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Download
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={() => onEdit(receipt)}>
          <Edit2 className="mr-1.5 h-3.5 w-3.5" />
          Edit
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="text-destructive hover:bg-destructive/10"
          onClick={() => onDelete(receipt)}>
          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
          Delete
        </Button>
      </div>
    </div>
  )
}
