"use client"

import { format } from "date-fns"
import {
  Banknote,
  Calendar,
  Download,
  Edit2,
  FileText,
  Hash,
  Link2,
  Receipt,
  StickyNote,
  User,
} from "lucide-react"

import { cn } from "@/lib/utils"
import type { ReceiptEnriched } from "@/hooks/api/use-receipts"
import { useMediaQuery } from "@/hooks/use-media-query"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"

// ─── Colour maps ────────────────────────────────────────────────────────────

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
  contribution: "bg-green-500/10 text-green-600",
  loan_repayment: "bg-blue-500/10 text-blue-600",
  penalty_payment: "bg-red-500/10 text-red-600",
  registration_fee: "bg-purple-500/10 text-purple-600",
  other: "bg-muted text-muted-foreground",
}

const STATUS_COLORS: Record<string, string> = {
  issued:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  void: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  replaced:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  bank_transfer: "Bank Transfer",
  mobile_money: "Mobile Money",
  check: "Check",
  other: "Other",
}

// ─── MetaRow helper ─────────────────────────────────────────────────────────

function MetaRow({
  icon: Icon,
  label,
  value,
  mono = false,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: React.ReactNode
  mono?: boolean
}) {
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={cn("mt-0.5 text-sm font-medium", mono && "font-mono")}>
          {value ?? "-"}
        </p>
      </div>
    </div>
  )
}

// ─── Props ──────────────────────────────────────────────────────────────────

interface ReceiptDetailDialogProps {
  receipt: ReceiptEnriched | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit?: (receipt: ReceiptEnriched) => void
  onDownload?: (receipt: ReceiptEnriched) => void | Promise<void>
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ReceiptDetailDialog({
  receipt,
  open,
  onOpenChange,
  onEdit,
  onDownload,
}: ReceiptDetailDialogProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)")

  if (!receipt) return null

  const typeLabel = RECEIPT_TYPE_LABELS[receipt.receiptType] ?? "Receipt"
  const typeColor = RECEIPT_TYPE_COLORS[receipt.receiptType] ?? ""
  const iconStyle = RECEIPT_ICON_COLORS[receipt.receiptType] ?? ""
  const statusColor = STATUS_COLORS[receipt.status] ?? ""

  const handleDownload = () => {
    if (!receipt.fileUrl) return

    if (onDownload) {
      void onDownload(receipt)
      return
    }

    window.open(receipt.fileUrl, "_blank")
  }

  const detailsContent = (
    <div className="space-y-4">
      <div
        className={cn(
          "relative overflow-hidden rounded-xl border-2 p-5",
          receipt.receiptType === "contribution"
            ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30"
            : receipt.receiptType === "loan_repayment"
              ? "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30"
              : receipt.receiptType === "penalty_payment"
                ? "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30"
                : receipt.receiptType === "registration_fee"
                  ? "border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-950/30"
                  : "border-muted bg-muted/30"
        )}>
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs text-muted-foreground">
            {receipt.receiptNumber ?? "-"}
          </span>
          <div className="flex gap-1.5">
            <Badge className={cn("text-xs", typeColor)}>{typeLabel}</Badge>
            <Badge className={cn("text-xs", statusColor)}>
              {receipt.status}
            </Badge>
          </div>
        </div>

        <div className="mt-3 flex items-end gap-2">
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full",
              iconStyle
            )}>
            <Banknote className="h-5 w-5" />
          </div>
          <div>
            <p className="text-3xl font-bold tracking-tight">
              {Number(receipt.amount).toLocaleString()}{" "}
              <span className="text-lg font-semibold text-muted-foreground">
                {receipt.currency}
              </span>
            </p>
            <p className="text-sm text-muted-foreground capitalize">
              {PAYMENT_METHOD_LABELS[receipt.paymentMethod ?? "other"] ??
                receipt.paymentMethod}
            </p>
          </div>
        </div>

        {(receipt.memberName || receipt.memberEmail) && (
          <div className="mt-3 flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">
              {receipt.memberName ?? receipt.memberEmail}
            </span>
          </div>
        )}
      </div>

      <div className="divide-y rounded-lg border">
        {receipt.period && (
          <MetaRow icon={Calendar} label="Period" value={receipt.period} mono />
        )}
        <MetaRow
          icon={Calendar}
          label="Issued On"
          value={format(new Date(receipt.issuedAt), "PPP · p")}
        />
        {receipt.issuedByName && (
          <MetaRow icon={User} label="Issued By" value={receipt.issuedByName} />
        )}
        {receipt.memberEmail && (
          <MetaRow
            icon={User}
            label="Member Email"
            value={receipt.memberEmail}
          />
        )}
        {(receipt.downloadCount ?? 0) > 0 && (
          <MetaRow
            icon={Download}
            label="Downloads"
            value={String(receipt.downloadCount)}
          />
        )}
      </div>

      {(receipt.contributionId || receipt.loanId || receipt.penaltyId) && (
        <>
          <Separator />
          <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
            <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Link2 className="h-3.5 w-3.5" />
              Linked Records
            </p>
            {receipt.contributionId && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  Contribution:
                </span>
                <span className="font-mono text-xs">
                  {receipt.contributionId.slice(0, 12)}…
                </span>
              </div>
            )}
            {receipt.loanId && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Loan:</span>
                <span className="font-mono text-xs">
                  {receipt.loanId.slice(0, 12)}…
                </span>
              </div>
            )}
            {receipt.penaltyId && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Penalty:</span>
                <span className="font-mono text-xs">
                  {receipt.penaltyId.slice(0, 12)}…
                </span>
              </div>
            )}
          </div>
        </>
      )}

      {receipt.notes && (
        <>
          <Separator />
          <div className="space-y-1.5 rounded-lg border bg-amber-50/50 p-3 dark:bg-amber-900/10">
            <p className="flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400">
              <StickyNote className="h-3.5 w-3.5" />
              Notes
            </p>
            <p className="text-sm text-muted-foreground">{receipt.notes}</p>
          </div>
        </>
      )}

      {receipt.fileUrl ? (
        <>
          <Separator />
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-green-500/10">
              <FileText className="h-5 w-5 text-green-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Receipt Document</p>
              {receipt.fileSize && (
                <p className="text-xs text-muted-foreground">
                  {(receipt.fileSize / 1024).toFixed(1)} KB
                  {receipt.fileType && ` · ${receipt.fileType}`}
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
          No document attached to this receipt
        </div>
      )}

      {receipt.status === "void" && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
          This receipt has been voided and is no longer valid.
        </div>
      )}
    </div>
  )

  const footerActions = (
    <>
      {receipt.fileUrl && (
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
            onEdit(receipt)
          }}>
          <Edit2 className="mr-2 h-4 w-4" />
          Edit
        </Button>
      )}
      <Button onClick={() => onOpenChange(false)}>Close</Button>
    </>
  )

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-green-600" />
              Receipt Details
            </DialogTitle>
            <DialogDescription>
              Full record for receipt {receipt.receiptNumber ?? "-"}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[calc(90vh-180px)] pr-1">
            {detailsContent}
          </ScrollArea>

          <DialogFooter className="gap-2">{footerActions}</DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="flex max-h-[92vh] flex-col overflow-hidden p-0">
        <DrawerHeader className="border-b bg-muted/40 px-4 py-4 text-left">
          <DrawerTitle className="flex items-center gap-2 text-base">
            <Receipt className="h-5 w-5 text-green-600" />
            Receipt Details
          </DrawerTitle>
          <DrawerDescription>
            Full record for receipt {receipt.receiptNumber ?? "-"}
          </DrawerDescription>
        </DrawerHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <ScrollArea className="h-full pr-1">{detailsContent}</ScrollArea>
        </div>

        <DrawerFooter className="border-t bg-background pb-6">
          {footerActions}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
