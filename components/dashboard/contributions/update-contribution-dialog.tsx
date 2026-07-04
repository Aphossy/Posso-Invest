"use client"

import { useState } from "react"
import type {
  Contribution,
  ContributionStatus,
} from "@/db/schemas/contribution-schema"
import { format } from "date-fns"
import { CalendarIcon, ClipboardEdit } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { useMediaQuery } from "@/hooks/use-media-query"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { Loader } from "@/components/common/loader"

interface UpdateContributionDialogProps {
  contribution: Contribution
  memberName?: string | null
  onUpdated?: () => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

const statusOptions: {
  value: ContributionStatus
  label: string
  color: string
}[] = [
  { value: "pending", label: "Pending", color: "bg-amber-100 text-amber-700" },
  {
    value: "confirmed",
    label: "Confirmed",
    color: "bg-emerald-100 text-emerald-700",
  },
  { value: "late", label: "Late", color: "bg-rose-100 text-rose-700" },
  { value: "waived", label: "Waived", color: "bg-slate-100 text-slate-600" },
]

function formatRwf(amount?: string | number | null) {
  if (!amount) return "-"
  const value =
    typeof amount === "number" ? amount : Number.parseFloat(String(amount))
  if (Number.isNaN(value)) return "-"
  return `${new Intl.NumberFormat("en-RW").format(value)}\u00A0RWF`
}

export function UpdateContributionDialog({
  contribution,
  memberName,
  onUpdated,
  open: controlledOpen,
  onOpenChange,
}: UpdateContributionDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setOpen = onOpenChange ?? setInternalOpen
  const isDesktop = useMediaQuery("(min-width: 768px)")

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [status, setStatus] = useState<ContributionStatus>(contribution.status)
  const [amount, setAmount] = useState(contribution.amount ?? "")
  const [period, setPeriod] = useState(contribution.period ?? "")
  const [paidAt, setPaidAt] = useState<Date | undefined>(
    contribution.paidAt ? new Date(contribution.paidAt) : undefined
  )
  const [receiptNumber, setReceiptNumber] = useState(
    contribution.receiptNumber ?? ""
  )
  const [penaltyAmount, setPenaltyAmount] = useState(
    contribution.penaltyAmount ?? ""
  )
  const [notes, setNotes] = useState(contribution.notes ?? "")

  const originalStatus = contribution.status
  const statusChanged = status !== originalStatus
  const selectedStatusMeta = statusOptions.find((s) => s.value === status)

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/contributions/${contribution.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({
          status,
          amount: amount.trim() || undefined,
          period: period.trim() || undefined,
          receiptNumber: receiptNumber.trim() || undefined,
          penaltyAmount: penaltyAmount.trim() || undefined,
          paidAt: paidAt ? paidAt.toISOString() : undefined,
          notes: notes.trim() || undefined,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to update contribution")
      }

      toast.success("Contribution updated successfully.")
      setOpen(false)
      onUpdated?.()
    } catch (error) {
      console.error(error)
      toast.error("Unable to update contribution.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const displayName = memberName ?? contribution.memberId

  const formContent = (
    <>
      <div className="px-6 py-5 space-y-5">
        <div className="space-y-2">
          <Label className="text-sm">Status</Label>
          <div className="flex flex-wrap items-center gap-2">
            {statusOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setStatus(opt.value)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  status === opt.value
                    ? `${opt.color} border-transparent ring-2 ring-offset-1 ring-current`
                    : "border-input bg-background text-muted-foreground hover:bg-muted"
                )}>
                {opt.label}
              </button>
            ))}
          </div>
          {statusChanged && (
            <p className="text-xs text-muted-foreground">
              Changing from{" "}
              <Badge
                className={
                  statusOptions.find((s) => s.value === originalStatus)
                    ?.color ?? ""
                }>
                {originalStatus}
              </Badge>{" "}
              to{" "}
              <Badge className={selectedStatusMeta?.color ?? ""}>
                {status}
              </Badge>
            </p>
          )}
        </div>

        <Separator />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="upd-amount" className="text-sm">
              Amount (RWF)
            </Label>
            <Input
              id="upd-amount"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 50000"
              className="font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="upd-period" className="text-sm">
              Contribution Period
            </Label>
            <Input
              id="upd-period"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              placeholder="YYYY-MM"
              className="font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">Paid Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !paidAt && "text-muted-foreground"
                  )}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {paidAt ? format(paidAt, "PPP") : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={paidAt}
                  onSelect={(date) => setPaidAt(date ?? undefined)}
                  captionLayout="dropdown"
                  fromYear={2025}
                  toYear={2027}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {paidAt && (
              <button
                type="button"
                onClick={() => setPaidAt(undefined)}
                className="text-xs text-muted-foreground hover:text-foreground">
                Clear date
              </button>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="upd-receipt" className="text-sm">
              Receipt Number
            </Label>
            <Input
              id="upd-receipt"
              value={receiptNumber}
              onChange={(e) => setReceiptNumber(e.target.value)}
              placeholder="TL-0001..."
            />
          </div>

          {(status === "late" || status === "waived") && (
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="upd-penalty" className="text-sm">
                Penalty Amount (RWF)
              </Label>
              <Input
                id="upd-penalty"
                inputMode="numeric"
                value={penaltyAmount}
                onChange={(e) => setPenaltyAmount(e.target.value)}
                placeholder="e.g. 8000"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Typically 10% of the contribution amount (
                {formatRwf(
                  Math.round(Number.parseFloat(String(amount || "0")) * 0.1)
                )}
                ).
              </p>
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="upd-notes" className="text-sm">
            Notes{" "}
            <span className="text-muted-foreground font-normal">
              (optional)
            </span>
          </Label>
          <Textarea
            id="upd-notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any clarification about this update..."
            className="resize-none text-sm"
          />
        </div>
      </div>

      <Separator />
    </>
  )

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden p-0 sm:max-w-2xl">
          <DialogHeader className="border-b bg-muted/50 px-6 py-4 text-left">
            <div className="flex items-center gap-3 pr-8">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border bg-background">
                <ClipboardEdit className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base font-semibold truncate">
                  Update Contribution
                </DialogTitle>
                <DialogDescription className="text-xs mt-0.5 truncate">
                  {displayName} - Period {contribution.period} -{" "}
                  {formatRwf(contribution.amount)}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto">{formContent}</div>

          <DialogFooter className="border-t px-6 py-4">
            <div className="flex w-full items-center justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isSubmitting}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader className="mr-2 h-4 w-4" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerContent className="max-h-[92vh] p-0">
        <DrawerHeader className="border-b bg-muted/50 px-4 py-4 text-left">
          <DrawerTitle className="text-base font-semibold">
            Update Contribution
          </DrawerTitle>
          <DrawerDescription className="text-xs">
            {displayName} - Period {contribution.period} -{" "}
            {formatRwf(contribution.amount)}
          </DrawerDescription>
        </DrawerHeader>

        <div className="min-h-0 flex-1 overflow-y-auto">{formContent}</div>

        <DrawerFooter className="border-t bg-background pb-6">
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader className="mr-2 h-4 w-4" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isSubmitting}>
            Cancel
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
