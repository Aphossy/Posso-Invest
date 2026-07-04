"use client"

import { useEffect, useState } from "react"
import { EXPENSE_CATEGORY_LABELS } from "@/db/schemas/operational-expense-schema"
import type { ExpenseCategory } from "@/db/schemas/operational-expense-schema"
import { format } from "date-fns"
import { Pencil } from "lucide-react"
import { toast } from "sonner"

import {
  useUpdateExpenseMutation,
  type OperationalExpenseEnriched,
} from "@/hooks/api/use-operational-expenses"
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

interface EditExpenseDialogProps {
  expense: OperationalExpenseEnriched
  onUpdated?: () => void
}

export function EditExpenseDialog({
  expense,
  onUpdated,
}: EditExpenseDialogProps) {
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState("")
  const [category, setCategory] = useState<ExpenseCategory>("other")
  const [description, setDescription] = useState("")
  const [expenseDate, setExpenseDate] = useState("")
  const [notes, setNotes] = useState("")

  const mutation = useUpdateExpenseMutation()

  useEffect(() => {
    if (open) {
      setAmount(
        expense.amount ? String(Number.parseFloat(String(expense.amount))) : ""
      )
      setCategory((expense.category as ExpenseCategory) ?? "other")
      setDescription(expense.description ?? "")
      setExpenseDate(
        expense.expenseDate
          ? format(new Date(expense.expenseDate), "yyyy-MM-dd")
          : format(new Date(), "yyyy-MM-dd")
      )
      setNotes(expense.notes ?? "")
    }
  }, [open, expense])

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
        id: expense.id,
        amount: String(amtNum),
        category,
        description: description.trim(),
        expenseDate: new Date(expenseDate).toISOString(),
        notes: notes.trim() || undefined,
      }),
      {
        loading: "Saving changes...",
        success: () => {
          setOpen(false)
          onUpdated?.()
          return "Expense updated successfully."
        },
        error: (err) => err?.message ?? "Failed to update expense.",
      }
    )
  }

  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setOpen(true)}
        className="h-7 text-xs gap-1">
        <Pencil className="h-3 w-3" />
        Edit
      </Button>

      <ResponsiveModal
        open={open}
        onOpenChange={setOpen}
        title="Edit Expense"
        description="Update the details of this operational expense.">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-amount">Amount (RWF)</Label>
              <Input
                id="edit-amount"
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
              <Label htmlFor="edit-date">Expense Date</Label>
              <Input
                id="edit-date"
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-category">Category</Label>
            <Select
              value={category}
              onValueChange={(v) => setCategory(v as ExpenseCategory)}>
              <SelectTrigger id="edit-category">
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
            <Label htmlFor="edit-description">Description</Label>
            <Input
              id="edit-description"
              placeholder="e.g. Bank transfer fee for member disbursement"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-notes">
              Notes{" "}
              <span className="text-xs text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="edit-notes"
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
              onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </ResponsiveModal>
    </>
  )
}
