"use client"

import type { ContributionExportable } from "@/utils/contribution-export-utils"
import { Calendar, Hash, User, Wallet } from "lucide-react"

import { useMediaQuery } from "@/hooks/use-media-query"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Separator } from "@/components/ui/separator"

interface ContributionDetailsDialogProps {
  contribution: ContributionExportable
  open: boolean
  onOpenChange: (open: boolean) => void
}

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  confirmed: "bg-emerald-100 text-emerald-700",
  late: "bg-rose-100 text-rose-700",
  waived: "bg-slate-100 text-slate-700",
}

const formatRwf = (amount?: string | null) => {
  if (!amount) return "-"
  const value = Number.parseFloat(amount)
  if (Number.isNaN(value)) return amount
  return `${new Intl.NumberFormat("en-RW").format(value)}\u00A0RWF`
}

const formatDate = (value?: string | Date | null) => {
  if (!value) return "-"
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleDateString("en-RW", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export function ContributionDetailsDialog({
  contribution,
  open,
  onOpenChange,
}: ContributionDetailsDialogProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)")

  const content = (
    <div className="space-y-4 sm:space-y-6 px-4 pb-4 sm:px-6 sm:pb-6">
      <div className="space-y-3 sm:space-y-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <User className="h-4 w-4" />
          Member Information
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Member Name</p>
            <p className="font-medium">{contribution.memberName || "-"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Email Address</p>
            <p className="font-medium text-sm break-all">
              {contribution.memberEmail || "-"}
            </p>
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-3 sm:space-y-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Wallet className="h-4 w-4" />
          Contribution Details
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Amount</p>
            <p className="font-semibold text-lg tabular-nums">
              {formatRwf(contribution.amount)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Period</p>
            <p className="font-semibold">{contribution.period || "-"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Status</p>
            <Badge className={statusColors[contribution.status] || ""}>
              {contribution.status || "pending"}
            </Badge>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Penalty</p>
            <p className="font-semibold">
              {formatRwf(contribution.penaltyAmount)}
            </p>
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-3 sm:space-y-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Calendar className="h-4 w-4" />
          Timeline
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Paid Date</p>
            <p className="text-sm font-medium">
              {formatDate(contribution.paidAt)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Recorded Date</p>
            <p className="text-sm font-medium">
              {formatDate(contribution.createdAt)}
            </p>
          </div>
        </div>
      </div>

      {contribution.receiptNumber && (
        <>
          <Separator />
          <div className="space-y-3 sm:space-y-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Hash className="h-4 w-4" />
              Receipt Information
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Receipt Number</p>
                <p className="font-mono font-semibold">
                  {contribution.receiptNumber}
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {contribution.notes && (
        <>
          <Separator />
          <div className="space-y-3 sm:space-y-4">
            <h3 className="text-sm font-semibold">Notes</h3>
            <p className="text-sm text-muted-foreground">
              {contribution.notes}
            </p>
          </div>
        </>
      )}

      <Separator />
      <div className="space-y-1 sm:space-y-2 text-xs text-muted-foreground">
        <p>
          Recorded by:{" "}
          <span className="font-medium text-foreground">
            {contribution.recordedByName || "System"}
          </span>
        </p>
        <p>
          Record ID: <span className="font-mono">{contribution.id || "-"}</span>
        </p>
      </div>
    </div>
  )

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden p-0 sm:max-w-3xl">
          <DialogHeader className="shrink-0 px-6 pt-6 pr-14">
            <DialogTitle>Contribution Details</DialogTitle>
            <DialogDescription>
              Complete record for {contribution.memberName || "member"}
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto">{content}</div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[92vh] p-0">
        <DrawerHeader className="border-b bg-muted/40 px-4 py-4">
          <DrawerTitle>Contribution Details</DrawerTitle>
          <DrawerDescription>
            Complete record for {contribution.memberName || "member"}
          </DrawerDescription>
        </DrawerHeader>

        <div className="min-h-0 flex-1 overflow-y-auto">{content}</div>
      </DrawerContent>
    </Drawer>
  )
}
