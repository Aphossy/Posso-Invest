"use client"

import { useState } from "react"
import { AlertTriangle, Loader2, Receipt } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import {
  useDeleteReceiptMutation,
  type ReceiptEnriched,
} from "@/hooks/api/use-receipts"
import { useMediaQuery } from "@/hooks/use-media-query"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"

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

interface ReceiptDeleteDialogProps {
  receipt: ReceiptEnriched | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function ReceiptDeleteDialog({
  receipt,
  open,
  onOpenChange,
  onSuccess,
}: ReceiptDeleteDialogProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)")
  const deleteMutation = useDeleteReceiptMutation()
  const [confirm, setConfirm] = useState("")

  if (!receipt) return null

  const confirmText = receipt.receiptNumber ?? receipt.id.slice(0, 8)
  const canDelete = confirm.trim() === confirmText

  const handleDelete = async () => {
    if (!canDelete) return
    try {
      await deleteMutation.mutateAsync(receipt.id)
      toast.success("Receipt deleted")
      setConfirm("")
      onOpenChange(false)
      onSuccess?.()
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete receipt")
    }
  }

  const handleOpenChange = (v: boolean) => {
    if (!v) setConfirm("")
    onOpenChange(v)
  }

  const content = (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
          <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
        </div>
        <div>
          <p className="text-left font-semibold">Delete Receipt</p>
          <p className="mt-1 text-left text-sm text-muted-foreground">
            This permanently removes the receipt record. Consider setting status
            to <strong>Void</strong> instead of deleting.
          </p>
        </div>
      </div>

      <div className="rounded-lg border bg-muted/40 p-3">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-green-500/10">
            <Receipt className="h-4 w-4 text-green-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-mono text-sm font-semibold">
              {receipt.receiptNumber ?? "-"}
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {receipt.memberName ?? receipt.memberId.slice(0, 12)}
              {receipt.period && ` · ${receipt.period}`}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <Badge
                className={cn(
                  "text-xs",
                  RECEIPT_TYPE_COLORS[receipt.receiptType] ?? ""
                )}>
                {receipt.receiptType.replace(/_/g, " ")}
              </Badge>
              <span className="text-sm font-semibold">
                {receipt.currency} {Number(receipt.amount).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

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

  if (isDesktop) {
    return (
      <AlertDialog open={open} onOpenChange={handleOpenChange}>
        <AlertDialogContent className="max-w-md">
          <div>
            <AlertDialogTitle className="sr-only">
              Delete Receipt
            </AlertDialogTitle>
            <AlertDialogDescription className="sr-only">
              Confirm receipt deletion
            </AlertDialogDescription>
            {content}
          </div>

          <AlertDialogFooter className="mt-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={!canDelete || deleteMutation.isPending}
              onClick={handleDelete}>
              {deleteMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete Receipt
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )
  }

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent className="max-h-[92vh] p-0">
        <DrawerHeader className="border-b bg-muted/40 px-4 py-4 text-left">
          <DrawerTitle className="text-destructive">Delete Receipt</DrawerTitle>
          <DrawerDescription>
            Confirm this destructive action to continue.
          </DrawerDescription>
        </DrawerHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {content}
        </div>

        <DrawerFooter className="border-t bg-background pb-6">
          <Button
            variant="destructive"
            disabled={!canDelete || deleteMutation.isPending}
            onClick={handleDelete}>
            {deleteMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Delete Receipt
          </Button>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={deleteMutation.isPending}>
            Cancel
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
