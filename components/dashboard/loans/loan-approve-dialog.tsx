"use client"

import { useState } from "react"
import type { LoanExportable } from "@/utils/loan-export-utils"
import { CheckCircle, XCircle } from "lucide-react"
import { toast } from "sonner"

import { useMediaQuery } from "@/hooks/use-media-query"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader } from "@/components/common/loader"

interface LoanApproveDialogProps {
  loan: LoanExportable
  onUpdated?: () => void
}

const formatRwf = (amount?: string | number | null) => {
  if (amount == null || amount === "") return "-"
  const value = typeof amount === "string" ? Number.parseFloat(amount) : amount
  if (Number.isNaN(value)) return "-"
  return `${new Intl.NumberFormat("en-RW").format(value)} RWF`
}

function defaultDueDateFromTerm(termMonths?: number | null): string {
  if (!termMonths) return ""
  const d = new Date()
  d.setMonth(d.getMonth() + termMonths)
  return d.toISOString().slice(0, 10)
}

export function LoanApproveDialog({ loan, onUpdated }: LoanApproveDialogProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)")
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState<"approve" | "reject" | null>(
    null
  )
  const [approvedAmount, setApprovedAmount] = useState(
    loan.requestedAmount
      ? String(Math.floor(Number.parseFloat(loan.requestedAmount)))
      : ""
  )
  const [dueDate, setDueDate] = useState(
    loan.dueDate
      ? new Date(loan.dueDate).toISOString().slice(0, 10)
      : defaultDueDateFromTerm(loan.termMonths)
  )
  const [approvalNotes, setApprovalNotes] = useState("")
  const [rejectionReason, setRejectionReason] = useState("")

  const isBusy = submitting !== null

  const submit = async (
    status: "approved" | "rejected",
    body: Record<string, unknown>
  ) => {
    setSubmitting(status === "approved" ? "approve" : "reject")
    try {
      const res = await fetch(`/api/loans/${loan.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error("Request failed")
      toast.success(
        status === "approved" ? "Loan approved" : "Loan request rejected"
      )
      setOpen(false)
      onUpdated?.()
    } catch {
      toast.error(
        status === "approved"
          ? "Failed to approve loan"
          : "Failed to reject loan"
      )
    } finally {
      setSubmitting(null)
    }
  }

  const handleApprove = () =>
    void submit("approved", {
      status: "approved",
      approvedAmount: approvedAmount.trim() || loan.requestedAmount,
      approvedAt: new Date(),
      dueDate: dueDate ? new Date(dueDate) : undefined,
      notes: approvalNotes.trim() || undefined,
    })

  const handleReject = () =>
    void submit("rejected", {
      status: "rejected",
      notes: rejectionReason.trim() || undefined,
    })

  if (loan.status !== "requested") return null

  const triggerButton = (
    <Button
      variant="default"
      size="sm"
      data-row-click-ignore="true"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}>
      Review
    </Button>
  )

  const summarySection = (
    <div className="rounded-lg border bg-muted/30 p-3 text-sm space-y-1.5">
      <div className="flex justify-between gap-2">
        <span className="text-muted-foreground">Member</span>
        <span className="font-medium text-right">
          {loan.memberName ?? loan.memberEmail ?? "-"}
        </span>
      </div>
      <div className="flex justify-between gap-2">
        <span className="text-muted-foreground">Requested</span>
        <span className="font-semibold tabular-nums">
          {formatRwf(loan.requestedAmount)}
        </span>
      </div>
      {loan.termMonths ? (
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground">Term</span>
          <span>
            {loan.termMonths} month{loan.termMonths !== 1 ? "s" : ""}
          </span>
        </div>
      ) : null}
      {loan.metadata?.reason ? (
        <div className="flex justify-between gap-4">
          <span className="shrink-0 text-muted-foreground">Purpose</span>
          <span className="text-right">{loan.metadata.reason}</span>
        </div>
      ) : null}
      {loan.notes?.trim() ? (
        <div className="flex justify-between gap-4">
          <span className="shrink-0 text-muted-foreground">Member notes</span>
          <span className="text-right text-xs">{loan.notes}</span>
        </div>
      ) : null}
    </div>
  )

  const formContent = (
    <div className="space-y-5">
      {summarySection}

      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          If Approving
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="approvedAmount">Approved Amount</Label>
            <Input
              id="approvedAmount"
              inputMode="decimal"
              value={approvedAmount}
              onChange={(e) => setApprovedAmount(e.target.value)}
              placeholder={loan.requestedAmount ?? ""}
              disabled={isBusy}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dueDate">Due Date</Label>
            <Input
              id="dueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              disabled={isBusy}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="approvalNotes">Approval Notes (optional)</Label>
          <Textarea
            id="approvalNotes"
            rows={2}
            value={approvalNotes}
            onChange={(e) => setApprovalNotes(e.target.value)}
            placeholder="Any conditions or remarks..."
            disabled={isBusy}
          />
        </div>
      </div>

      <div className="space-y-3 border-t pt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          If Rejecting
        </p>
        <div className="space-y-1.5">
          <Label htmlFor="rejectionReason">Rejection Reason (optional)</Label>
          <Textarea
            id="rejectionReason"
            rows={2}
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Explain why this request is being rejected..."
            disabled={isBusy}
          />
        </div>
      </div>
    </div>
  )

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{triggerButton}</DialogTrigger>
        <DialogContent
          className="flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden p-0 sm:max-w-lg"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}>
          <DialogHeader className="shrink-0 border-b px-6 py-4 pr-14">
            <DialogTitle>Review Loan Request</DialogTitle>
            <DialogDescription>
              Approve or reject this request. Set the approved amount and due
              date before approving.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            {formContent}
          </div>

          <div className="flex shrink-0 items-center justify-between gap-2 border-t px-6 py-4">
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isBusy}>
              {submitting === "reject" ? (
                <>
                  <Loader className="mr-2 h-4 w-4" />
                  Rejecting...
                </>
              ) : (
                <>
                  <XCircle className="mr-2 h-4 w-4" />
                  Reject
                </>
              )}
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isBusy}>
                Cancel
              </Button>
              <Button
                className="bg-emerald-600 text-white hover:bg-emerald-700"
                onClick={handleApprove}
                disabled={isBusy}>
                {submitting === "approve" ? (
                  <>
                    <Loader className="mr-2 h-4 w-4" />
                    Approving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Approve
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>{triggerButton}</DrawerTrigger>
      <DrawerContent
        className="flex max-h-[92vh] flex-col overflow-hidden p-0"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}>
        <DrawerHeader className="border-b bg-muted/40 px-4 py-4 text-left">
          <DrawerTitle>Review Loan Request</DrawerTitle>
          <DrawerDescription>
            Approve or reject this loan request.
          </DrawerDescription>
        </DrawerHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {formContent}
        </div>

        <DrawerFooter className="flex flex-col gap-2 border-t bg-background pb-6">
          <Button
            className="bg-emerald-600 text-white hover:bg-emerald-700"
            onClick={handleApprove}
            disabled={isBusy}>
            {submitting === "approve" ? (
              <>
                <Loader className="mr-2 h-4 w-4" />
                Approving...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Approve Loan
              </>
            )}
          </Button>
          <Button
            variant="destructive"
            onClick={handleReject}
            disabled={isBusy}>
            {submitting === "reject" ? (
              <>
                <Loader className="mr-2 h-4 w-4" />
                Rejecting...
              </>
            ) : (
              <>
                <XCircle className="mr-2 h-4 w-4" />
                Reject
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isBusy}>
            Cancel
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
