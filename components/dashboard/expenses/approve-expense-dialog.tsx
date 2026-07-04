"use client"

import { useState } from "react"
import { EXPENSE_CATEGORY_LABELS } from "@/db/schemas/operational-expense-schema"
import { format } from "date-fns"
import { CheckCircle2, XCircle } from "lucide-react"
import { toast } from "sonner"

import {
  useApproveExpenseMutation,
  type OperationalExpenseEnriched,
} from "@/hooks/api/use-operational-expenses"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { ResponsiveModal } from "@/components/ui/responsive-modal"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"

interface ApproveExpenseDialogProps {
  expense: OperationalExpenseEnriched
  onUpdated?: () => void
}

export function ApproveExpenseDialog({
  expense,
  onUpdated,
}: ApproveExpenseDialogProps) {
  const [open, setOpen] = useState(false)
  const [rejectionNote, setRejectionNote] = useState("")
  const [action, setAction] = useState<"approve" | "reject" | null>(null)

  const mutation = useApproveExpenseMutation()

  const formatRwf = (v: string | number | null | undefined) => {
    const n = Number.parseFloat(String(v ?? "0"))
    if (isNaN(n)) return "-"
    return `${new Intl.NumberFormat("en-RW").format(n)} RWF`
  }

  async function handleConfirm() {
    if (!action) return
    if (action === "reject" && !rejectionNote.trim()) {
      toast.error("Please provide a rejection reason.")
      return
    }

    await toast.promise(
      mutation.mutateAsync({
        id: expense.id,
        status: action === "approve" ? "approved" : "rejected",
        rejectionNote: action === "reject" ? rejectionNote.trim() : undefined,
      }),
      {
        loading: action === "approve" ? "Approving..." : "Rejecting...",
        success: () => {
          setOpen(false)
          setAction(null)
          setRejectionNote("")
          onUpdated?.()
          return action === "approve"
            ? "Expense approved."
            : "Expense rejected."
        },
        error: (err) => err?.message ?? "Failed to update expense.",
      }
    )
  }

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setOpen(true)}
        className="h-7 text-xs">
        Review
      </Button>

      <ResponsiveModal
        open={open}
        onOpenChange={setOpen}
        title="Review Expense"
        description="Approve or reject this operational expense submission.">
        <div className="space-y-4">
          {/* Expense details */}
          <div className="rounded-lg border bg-muted/40 p-4 space-y-2 text-sm">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{expense.description}</p>
                <p className="text-muted-foreground text-xs mt-0.5">
                  Submitted by {expense.submittedByName ?? "Unknown"} ·{" "}
                  {expense.expenseDate
                    ? format(new Date(expense.expenseDate), "dd MMM yyyy")
                    : "-"}
                </p>
              </div>
              <Badge variant="secondary">
                {EXPENSE_CATEGORY_LABELS[expense.category]}
              </Badge>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-bold text-base tabular-nums">
                {formatRwf(expense.amount)}
              </span>
            </div>
            {expense.notes && (
              <div>
                <span className="text-muted-foreground">Notes: </span>
                <span className="italic">{expense.notes}</span>
              </div>
            )}
          </div>

          {/* Action selection */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="default"
              // variant={action === "approve" ? "default" : "outline"}
              className="flex-1 gap-2"
              onClick={() => setAction("approve")}>
              {/* <CheckCircle2 className="h-4 w-4" /> */}
              Approve
            </Button>
            <Button
              type="button"
              variant="destructive"
              // variant={action === "reject" ? "destructive" : "outline"}
              className="flex-1 gap-2"
              onClick={() => setAction("reject")}>
              {/* <XCircle className="h-4 w-4" /> */}
              Reject
            </Button>
          </div>

          {action === "reject" && (
            <div className="space-y-1.5">
              <Label htmlFor="rejection-note">Rejection Reason</Label>
              <Textarea
                id="rejection-note"
                placeholder="Explain why this expense is being rejected..."
                rows={2}
                value={rejectionNote}
                onChange={(e) => setRejectionNote(e.target.value)}
              />
            </div>
          )}

          {action && (
            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setAction(null)
                  setRejectionNote("")
                }}>
                Cancel
              </Button>
              <Button
                type="button"
                variant={action === "reject" ? "destructive" : "default"}
                disabled={mutation.isPending}
                onClick={handleConfirm}>
                {mutation.isPending
                  ? "Saving..."
                  : action === "approve"
                    ? "Confirm Approval"
                    : "Confirm Rejection"}
              </Button>
            </div>
          )}
        </div>
      </ResponsiveModal>
    </>
  )
}
