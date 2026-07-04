"use client"

import { useState } from "react"
import { EXPENSE_CATEGORY_LABELS } from "@/db/schemas/operational-expense-schema"
import type { ExpenseCategory } from "@/db/schemas/operational-expense-schema"
import { format } from "date-fns"
import { PlusCircle } from "lucide-react"
import { toast } from "sonner"

import { useCreateExpenseMutation } from "@/hooks/api/use-operational-expenses"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ResponsiveModal } from "@/components/ui/responsive-modal"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

const CATEGORIES = Object.entries(EXPENSE_CATEGORY_LABELS) as [
  ExpenseCategory,
  string,
][]

interface SubmitExpenseDialogProps {
  onSubmitted?: () => void
  role?: string | null
}

export function SubmitExpenseDialog({
  onSubmitted,
  role,
}: SubmitExpenseDialogProps) {
  const autoApproved = role === "treasurer" || role === "admin"
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState("")
  const [category, setCategory] = useState<ExpenseCategory>("other")
  const [description, setDescription] = useState("")
  const [expenseDate, setExpenseDate] = useState(
    format(new Date(), "yyyy-MM-dd")
  )
  const [notes, setNotes] = useState("")

  const mutation = useCreateExpenseMutation()

  function reset() {
    setAmount("")
    setCategory("other")
    setDescription("")
    setExpenseDate(format(new Date(), "yyyy-MM-dd"))
    setNotes("")
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const amtNum = Number.parseFloat(amount)
    if (!amount || isNaN(amtNum) || amtNum <= 0) {
      toast.error("Please enter a valid amount.")
      return
    }
    if (!description.trim()) {
      toast.error("Please enter a description.")
      return
    }

    await toast.promise(
      mutation.mutateAsync({
        amount: String(amtNum),
        category,
        description: description.trim(),
        expenseDate: new Date(expenseDate).toISOString(),
        notes: notes.trim() || undefined,
      }),
      {
        loading: "Submitting expense...",
        success: () => {
          setOpen(false)
          reset()
          onSubmitted?.()
          return autoApproved
            ? "Expense recorded and automatically approved."
            : "Expense submitted and awaiting treasurer approval."
        },
        error: (err) => err?.message ?? "Failed to submit expense.",
      }
    )
  }

  return (
    <>
      <Button
        size="sm"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2">
        <PlusCircle className="h-4 w-4" />
        Submit Expense
      </Button>

      <ResponsiveModal
        open={open}
        onOpenChange={setOpen}
        title="Record Operational Expense"
        description={
          autoApproved
            ? "Record an expense. As treasurer or admin, your submission is automatically approved and deducted from the fund balance."
            : "Submit an expense for treasurer approval. Approved expenses will be deducted from the fund balance."
        }>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="exp-amount">Amount (RWF)</Label>
              <Input
                id="exp-amount"
                type="number"
                min="1"
                step="1"
                placeholder="e.g. 15000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="exp-date">Expense Date</Label>
              <Input
                id="exp-date"
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="exp-category">Category</Label>
            <Select
              value={category}
              onValueChange={(v) => setCategory(v as ExpenseCategory)}>
              <SelectTrigger id="exp-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="exp-description">Description</Label>
            <Input
              id="exp-description"
              placeholder="e.g. Bank transfer fee for member disbursement"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="exp-notes">
              Notes{" "}
              <span className="text-xs text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="exp-notes"
              placeholder="Additional context or justification..."
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOpen(false)
                reset()
              }}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending
                ? "Submitting..."
                : autoApproved
                  ? "Record Expense"
                  : "Submit for Approval"}
            </Button>
          </div>
        </form>
      </ResponsiveModal>
    </>
  )
}
