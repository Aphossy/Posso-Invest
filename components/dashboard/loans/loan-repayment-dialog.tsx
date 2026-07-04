"use client"

import { useState } from "react"
import type { LoanExportable } from "@/utils/loan-export-utils"
import {
  computeLoanTotals,
  computeOutstanding,
  computeProgressPercent,
} from "@/utils/loan-finance"
import { AlertTriangle, Banknote, CheckCircle2, User } from "lucide-react"
import { toast } from "sonner"

import {
  useDeleteRepaymentMutation,
  useLoanRepayments,
  useRecordRepaymentMutation,
} from "@/hooks/api/use-loans"
import { useMediaQuery } from "@/hooks/use-media-query"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { Loader } from "@/components/common/loader"

interface LoanRepaymentDialogProps {
  loan: LoanExportable
  onUpdated?: () => void
}

const paymentMethodOptions = [
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "mobile_money", label: "Mobile money" },
  { value: "check", label: "Check" },
  { value: "other", label: "Other" },
] as const

const statusStyles: Record<string, string> = {
  disbursed: "bg-blue-100 text-blue-700",
  repaying: "bg-amber-100 text-amber-700",
  repaid: "bg-emerald-100 text-emerald-700",
  overdue: "bg-rose-100 text-rose-700",
}

const formatRwf = (amount?: string | number | null) => {
  if (amount === null || amount === undefined || amount === "") return "-"
  const value = typeof amount === "number" ? amount : Number.parseFloat(amount)
  if (Number.isNaN(value)) return "-"
  return `${new Intl.NumberFormat("en-RW").format(value)} RWF`
}

const formatDate = (value?: string | Date | null) => {
  if (!value) return "-"
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleDateString("en-RW")
}

export function LoanRepaymentDialog({
  loan,
  onUpdated,
}: LoanRepaymentDialogProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)")
  const [open, setOpen] = useState(false)
  const [repaymentToVoid, setRepaymentToVoid] = useState<{
    id: string
    amount?: string | number | null
    paidAt?: string | Date | null
    paymentMethod?: string | null
  } | null>(null)

  const repaymentsQuery = useLoanRepayments(open ? loan.id : undefined)
  const recordMutation = useRecordRepaymentMutation(loan.id)
  const deleteMutation = useDeleteRepaymentMutation(loan.id)

  const [amount, setAmount] = useState("")
  const [paymentMethod, setPaymentMethod] =
    useState<(typeof paymentMethodOptions)[number]["value"]>("cash")
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState("")
  const [amountError, setAmountError] = useState<string | null>(null)

  const repayments = repaymentsQuery.data?.data.repayments ?? []
  const fetchedSummary = repaymentsQuery.data?.data.summary

  // Fall back to enriched list data while the detailed summary loads.
  const { totalRepayable } = computeLoanTotals(loan)
  const totalRepaid = fetchedSummary?.totalRepaid ?? loan.totalRepaid ?? 0
  const outstanding =
    fetchedSummary?.outstanding ??
    loan.outstandingBalance ??
    computeOutstanding(totalRepayable, totalRepaid)
  const progressPercent =
    fetchedSummary?.progressPercent ??
    computeProgressPercent(totalRepayable, totalRepaid)

  const handleRecord = async () => {
    const value = Number.parseFloat(amount)
    if (!Number.isFinite(value) || value <= 0) {
      setAmountError("Enter a valid amount greater than zero.")
      return
    }
    if (value > outstanding) {
      setAmountError(
        `Amount cannot exceed the outstanding balance of ${formatRwf(outstanding)}.`
      )
      return
    }
    setAmountError(null)

    try {
      const result = await recordMutation.mutateAsync({
        amount: value,
        paymentMethod,
        paidAt: new Date(paidAt).toISOString(),
        notes: notes.trim() || undefined,
      })
      toast.success(
        result.data.fullyRepaid
          ? "Final repayment recorded — loan fully repaid."
          : "Repayment recorded."
      )
      setAmount("")
      setNotes("")
      onUpdated?.()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to record repayment"
      )
    }
  }

  const handleDelete = async (repaymentId: string) => {
    try {
      await deleteMutation.mutateAsync({ repaymentId })
      toast.success("Repayment voided.")
      onUpdated?.()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to void repayment"
      )
    }
  }

  const handleConfirmVoid = async () => {
    if (!repaymentToVoid) return

    try {
      await handleDelete(repaymentToVoid.id)
      setRepaymentToVoid(null)
    } catch {
      // handleDelete already surfaces the error toast
    }
  }

  const isFullyRepaid = outstanding <= 0

  const content = (
    <>
      <div className="space-y-3 rounded-lg border bg-muted/40 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium leading-tight">
                {loan.memberName ?? "Member"}
              </p>
              <p className="text-xs text-muted-foreground">
                {loan.memberEmail ?? loan.memberId}
              </p>
            </div>
          </div>
          <Badge className={statusStyles[loan.status] ?? ""}>
            {loan.status}
          </Badge>
        </div>

        <Separator />

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Repayment progress</span>
            <span className="font-medium tabular-nums">{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        <div className="grid grid-cols-3 gap-x-4 gap-y-2 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Total to repay</p>
            <p className="font-semibold tabular-nums">
              {formatRwf(totalRepayable)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Repaid</p>
            <p className="font-medium tabular-nums text-emerald-700 dark:text-emerald-400">
              {formatRwf(totalRepaid)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Outstanding</p>
            <p className="font-semibold tabular-nums">
              {formatRwf(outstanding)}
            </p>
          </div>
        </div>
      </div>

      {isFullyRepaid ? (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          This loan has been fully repaid.
        </div>
      ) : (
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="repayment-amount">Amount (RWF)</Label>
              <Input
                id="repayment-amount"
                type="number"
                min={1}
                max={outstanding}
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value)
                  setAmountError(null)
                }}
                placeholder={String(outstanding)}
                className={amountError ? "border-red-500" : ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="repayment-date">Payment date</Label>
              <Input
                id="repayment-date"
                type="date"
                value={paidAt}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setPaidAt(e.target.value)}
              />
            </div>
          </div>
          {amountError ? (
            <p className="-mt-2 text-xs text-red-500">{amountError}</p>
          ) : null}

          <div className="space-y-2">
            <Label>Payment method</Label>
            <Select
              value={paymentMethod}
              onValueChange={(value) =>
                setPaymentMethod(
                  value as (typeof paymentMethodOptions)[number]["value"]
                )
              }>
              <SelectTrigger>
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent>
                {paymentMethodOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="repayment-notes">Notes</Label>
            <Textarea
              id="repayment-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Payment reference, remarks, etc."
            />
          </div>
        </div>
      )}

      <div className="space-y-2">
        <p className="text-sm font-medium">Payment history</p>
        {repaymentsQuery.isPending && open ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader className="h-4 w-4" />
            Loading payments...
          </div>
        ) : repayments.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No payments recorded yet.
          </p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {repayments.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                <div>
                  <p className="font-medium tabular-nums">
                    {formatRwf(item.amount)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(item.paidAt)} ·{" "}
                    {item.paymentMethod?.replace("_", " ") ?? "cash"}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-rose-600 hover:text-rose-700"
                  disabled={deleteMutation.isPending}
                  onClick={() => setRepaymentToVoid(item)}>
                  Void
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <AlertDialog
        open={repaymentToVoid !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setRepaymentToVoid(null)
          }
        }}>
        <AlertDialogContent className="max-w-md">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/40">
              <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
            </div>
            <AlertDialogHeader className="text-left">
              <AlertDialogTitle>Void repayment?</AlertDialogTitle>
              <AlertDialogDescription className="mt-2">
                This will permanently remove the repayment record and update the
                loan balance. This action cannot be undone.
                {repaymentToVoid ? (
                  <span className="mt-2 block text-sm text-muted-foreground">
                    Amount: {formatRwf(repaymentToVoid.amount)} · Date:{" "}
                    {formatDate(repaymentToVoid.paidAt)}
                  </span>
                ) : null}
              </AlertDialogDescription>
            </AlertDialogHeader>
          </div>

          <AlertDialogFooter className="mt-2">
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-600"
              disabled={deleteMutation.isPending}
              onClick={() => void handleConfirmVoid()}>
              {deleteMutation.isPending ? "Voiding..." : "Void repayment"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )

  const triggerButton = (
    <Button variant="outline" size="sm" className="gap-1.5">
      <Banknote className="h-3.5 w-3.5" />
      Record
    </Button>
  )

  const actions = (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(false)}
        disabled={recordMutation.isPending}>
        Close
      </Button>
      {!isFullyRepaid ? (
        <Button
          onClick={() => void handleRecord()}
          disabled={recordMutation.isPending}>
          {recordMutation.isPending ? (
            <>
              <Loader className="mr-2 h-4 w-4" />
              Saving...
            </>
          ) : (
            "Record Payment"
          )}
        </Button>
      ) : null}
    </>
  )

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{triggerButton}</DialogTrigger>
        <DialogContent className="flex max-h-[calc(100dvh-2rem)] max-w-lg flex-col overflow-hidden p-0">
          <DialogHeader className="shrink-0 border-b px-6 py-4 pr-14">
            <DialogTitle>Record Repayment</DialogTitle>
            <DialogDescription>
              Record an installment and track the outstanding balance.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
            {content}
          </div>

          <DialogFooter className="shrink-0 border-t px-6 py-4">
            {actions}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>{triggerButton}</DrawerTrigger>
      <DrawerContent className="flex max-h-[calc(100dvh-0.75rem)] flex-col overflow-hidden p-0">
        <DrawerHeader className="border-b bg-muted/40 px-4 py-4 text-left">
          <DrawerTitle>Record Repayment</DrawerTitle>
          <DrawerDescription>
            Record an installment and track the outstanding balance.
          </DrawerDescription>
        </DrawerHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <div className="space-y-4">{content}</div>
        </div>

        <DrawerFooter className="shrink-0 border-t bg-background pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          {actions}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
