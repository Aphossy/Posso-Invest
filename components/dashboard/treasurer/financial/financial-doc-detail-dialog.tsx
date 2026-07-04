"use client"

import { format } from "date-fns"
import {
  BarChart3,
  Calendar,
  Download,
  Edit2,
  Eye,
  FileText,
  StickyNote,
  User,
} from "lucide-react"

import { cn } from "@/lib/utils"
import type { FinancialDocumentEnriched } from "@/hooks/api/use-financial-documents"
import { useMediaQuery } from "@/hooks/use-media-query"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"

// ─── Colour maps ────────────────────────────────────────────────────────────

export const FINANCIAL_DOC_TYPE_LABELS: Record<string, string> = {
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

const VISIBILITY_LABELS: Record<string, string> = {
  public: "Public",
  authenticated: "All Members",
  committee: "Committee Only",
  private: "Private",
}

// ─── MetaRow helper ─────────────────────────────────────────────────────────

function MetaRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-sm font-medium">{value ?? "-"}</p>
      </div>
    </div>
  )
}

// ─── Props ──────────────────────────────────────────────────────────────────

interface FinancialDocDetailDialogProps {
  doc: FinancialDocumentEnriched | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit?: (doc: FinancialDocumentEnriched) => void
  onDownload?: (doc: FinancialDocumentEnriched) => void | Promise<void>
}

// ─── Component ──────────────────────────────────────────────────────────────

export function FinancialDocDetailDialog({
  doc,
  open,
  onOpenChange,
  onEdit,
  onDownload,
}: FinancialDocDetailDialogProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)")

  if (!doc) return null

  const typeLabel = FINANCIAL_DOC_TYPE_LABELS[doc.docType] ?? "Document"
  const typeColor = DOC_TYPE_COLORS[doc.docType] ?? ""
  const statusColor = STATUS_COLORS[doc.status] ?? ""

  const handleDownload = () => {
    if (!doc.fileUrl) return

    if (onDownload) {
      void onDownload(doc)
      return
    }

    window.open(doc.fileUrl, "_blank")
  }

  const content = (
    <div className="space-y-4">
      {/* ── Header card ── */}
      <div className="rounded-lg border bg-muted/30 p-4">
        <div className="mb-3 flex flex-wrap gap-1.5">
          <Badge className={cn("text-xs", typeColor)}>{typeLabel}</Badge>
          <Badge className={cn("text-xs", statusColor)}>{doc.status}</Badge>
        </div>
        <h2 className="text-lg font-semibold leading-snug">{doc.title}</h2>
        {doc.description && (
          <p className="mt-2 text-sm text-muted-foreground">
            {doc.description}
          </p>
        )}
      </div>

      {/* ── Metadata ── */}
      <div className="divide-y rounded-lg border">
        {doc.period && (
          <MetaRow icon={Calendar} label="Period" value={doc.period} />
        )}
        {doc.fiscalYear && (
          <MetaRow
            icon={Calendar}
            label="Fiscal Year"
            value={String(doc.fiscalYear)}
          />
        )}
        <MetaRow
          icon={Eye}
          label="Visibility"
          value={
            VISIBILITY_LABELS[doc.visibility ?? "committee"] ?? doc.visibility
          }
        />
        <MetaRow
          icon={User}
          label="Uploaded By"
          value={doc.uploaderName ?? doc.uploaderEmail}
        />
        <MetaRow
          icon={Calendar}
          label="Uploaded On"
          value={format(new Date(doc.createdAt), "PPP · p")}
        />
        {(doc.downloadCount ?? 0) > 0 && (
          <MetaRow
            icon={Download}
            label="Downloads"
            value={String(doc.downloadCount)}
          />
        )}
      </div>

      {/* ── Notes ── */}
      {doc.notes && (
        <>
          <Separator />
          <div className="space-y-1.5 rounded-lg border bg-amber-50/50 p-3 dark:bg-amber-900/10">
            <p className="flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400">
              <StickyNote className="h-3.5 w-3.5" />
              Notes
            </p>
            <p className="text-sm text-muted-foreground">{doc.notes}</p>
          </div>
        </>
      )}

      {/* ── Attachment ── */}
      {doc.fileUrl ? (
        <>
          <Separator />
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-green-500/10">
              <FileText className="h-5 w-5 text-green-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Attached File</p>
              {doc.fileSize && (
                <p className="text-xs text-muted-foreground">
                  {(doc.fileSize / 1024).toFixed(1)} KB
                  {doc.fileType && ` · ${doc.fileType}`}
                </p>
              )}
            </div>
            <Button size="sm" variant="outline" onClick={handleDownload}>
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Download
            </Button>
          </div>
        </>
      ) : (
        <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          <FileText className="h-3.5 w-3.5 shrink-0" />
          No file attached to this document
        </div>
      )}
    </div>
  )

  const actions = (
    <div className="gap-2 flex flex-col-reverse sm:flex-row sm:justify-end">
      {doc.fileUrl && (
        <Button variant="outline" onClick={handleDownload}>
          <Download className="mr-2 h-4 w-4" />
          Download
        </Button>
      )}
      {onEdit && (
        <Button
          variant="outline"
          onClick={() => {
            onOpenChange(false)
            onEdit(doc)
          }}>
          <Edit2 className="mr-2 h-4 w-4" />
          Edit
        </Button>
      )}
      <Button onClick={() => onOpenChange(false)}>Close</Button>
    </div>
  )

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-green-600" />
              Financial Document
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[calc(90vh-180px)] pr-4">
            {content}
          </ScrollArea>

          <DialogFooter>{actions}</DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="flex max-h-[92vh] flex-col overflow-hidden p-0">
        <DrawerHeader className="border-b bg-muted/40 px-4 py-4 text-left">
          <DrawerTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-green-600" />
            Financial Document
          </DrawerTitle>
        </DrawerHeader>

        <ScrollArea className="min-h-0 flex-1 px-4 py-4">
          <div className="pr-4">{content}</div>
        </ScrollArea>

        <DrawerFooter className="border-t bg-background pb-6">
          {actions}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
