"use client"

import type { ContributionExportable } from "@/utils/contribution-export-utils"
import { Calendar, Clock3, History, User } from "lucide-react"

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

interface ContributionAuditDialogProps {
  contribution: ContributionExportable
  open: boolean
  onOpenChange: (open: boolean) => void
}

const formatDateTime = (value?: string | Date | null) => {
  if (!value) return "-"
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleString("en-RW", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function ContributionAuditDialog({
  contribution,
  open,
  onOpenChange,
}: ContributionAuditDialogProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)")
  const createdBy = contribution.recordedByName || "System"
  const updatedBy = contribution.updatedByName || createdBy
  const updatedAt = contribution.lastUpdatedAt || contribution.updatedAt
  const hasBeenEdited = Boolean(
    contribution.updatedByName || contribution.lastUpdatedAt
  )

  const content = (
    <div className="space-y-5 px-4 pb-4 sm:px-6 sm:pb-6">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border bg-background p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            Created
          </div>
          <p className="text-sm text-muted-foreground">
            {formatDateTime(contribution.createdAt)}
          </p>
          <Badge variant="outline" className="mt-3">
            By {createdBy}
          </Badge>
        </div>

        <div className="rounded-lg border bg-background p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium">
            <Clock3 className="h-4 w-4 text-muted-foreground" />
            Last Updated
          </div>
          <p className="text-sm text-muted-foreground">
            {formatDateTime(updatedAt)}
          </p>
          <Badge variant="secondary" className="mt-3">
            By {updatedBy}
          </Badge>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <User className="h-4 w-4" />
          Change Summary
        </h3>

        <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">Status:</span>
            <Badge>{contribution.status}</Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">Amount:</span>
            <span className="font-medium">{contribution.amount || "-"}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">Period:</span>
            <span className="font-medium">{contribution.period || "-"}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">Record ID:</span>
            <span className="font-mono text-xs break-all">
              {contribution.id}
            </span>
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Notes</h3>
        <p className="text-sm text-muted-foreground">
          {hasBeenEdited
            ? "This record has been updated after its initial creation. The latest updater and timestamp are captured here."
            : "This record has not been edited since it was created."}
        </p>
      </div>
    </div>
  )

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden p-0 sm:max-w-2xl">
          <DialogHeader className="border-b bg-muted/40 px-6 py-5 pr-14">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border bg-background">
                <History className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base font-semibold">
                  Audit Trail
                </DialogTitle>
                <DialogDescription>
                  Record history for {contribution.memberName || "this member"}
                </DialogDescription>
              </div>
            </div>
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
          <DrawerTitle>Audit Trail</DrawerTitle>
          <DrawerDescription>
            Record history for {contribution.memberName || "this member"}
          </DrawerDescription>
        </DrawerHeader>

        <div className="min-h-0 flex-1 overflow-y-auto">{content}</div>
      </DrawerContent>
    </Drawer>
  )
}
