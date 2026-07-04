"use client"

import { useState } from "react"
import { AlertTriangle, BarChart3, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import {
  useDeleteFinancialDocumentMutation,
  type FinancialDocumentEnriched,
} from "@/hooks/api/use-financial-documents"
import { useMediaQuery } from "@/hooks/use-media-query"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"

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

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  published:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  archived:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
}

interface FinancialDocDeleteDialogProps {
  doc: FinancialDocumentEnriched | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function FinancialDocDeleteDialog({
  doc,
  open,
  onOpenChange,
  onSuccess,
}: FinancialDocDeleteDialogProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)")
  const deleteMutation = useDeleteFinancialDocumentMutation()
  const [confirm, setConfirm] = useState("")

  if (!doc) return null

  const confirmText = doc.title.length > 20 ? doc.title.slice(0, 20) : doc.title
  const canDelete = confirm.trim() === confirmText

  const handleDelete = async () => {
    if (!canDelete) return
    try {
      await deleteMutation.mutateAsync(doc.id)
      toast.success("Document deleted")
      setConfirm("")
      onOpenChange(false)
      onSuccess?.()
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete document")
    }
  }

  const handleOpenChange = (v: boolean) => {
    if (!v) setConfirm("")
    onOpenChange(v)
  }

  const content = (
    <div className="flex flex-col gap-4">
      {/* Warning header */}
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
          <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
        </div>
        <div>
          <h2 className="font-semibold text-left">Delete Financial Document</h2>
          <p className="mt-1 text-sm text-muted-foreground text-left">
            This action is permanent. The document record and its file reference
            will be removed.
          </p>
        </div>
      </div>

      {/* Document preview */}
      <div className="flex items-start gap-3 rounded-lg border bg-muted/40 p-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-green-500/10">
          <BarChart3 className="h-4 w-4 text-green-600" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm font-medium leading-snug">
            {doc.title}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <Badge className={cn("text-xs", STATUS_COLORS[doc.status] ?? "")}>
              {doc.status}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {DOC_TYPE_LABELS[doc.docType] ?? doc.docType}
            </Badge>
            {doc.period && (
              <span className="font-mono text-xs text-muted-foreground">
                {doc.period}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Confirm input */}
      <div className="space-y-1.5">
        <p className="text-sm">
          Type{" "}
          <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
            {confirmText}
          </span>{" "}
          to confirm deletion:
        </p>
        <Input
          placeholder={confirmText}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="off"
        />
      </div>
    </div>
  )

  const actions = (
    <>
      <Button
        variant="outline"
        onClick={() => handleOpenChange(false)}
        disabled={deleteMutation.isPending}>
        Cancel
      </Button>
      <Button
        variant="destructive"
        disabled={!canDelete || deleteMutation.isPending}
        onClick={handleDelete}>
        {deleteMutation.isPending && (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        )}
        Delete Document
      </Button>
    </>
  )

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-md">
          {content}
          <DialogFooter className="mt-2">{actions}</DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent className="flex flex-col max-h-[92vh] overflow-hidden p-0">
        <DrawerHeader className="border-b bg-muted/40 px-4 py-4 text-left">
          <DrawerTitle>Delete Financial Document</DrawerTitle>
        </DrawerHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <div className="space-y-4">{content}</div>
        </div>
        <DrawerFooter className="border-t bg-background pb-6">
          {actions}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
