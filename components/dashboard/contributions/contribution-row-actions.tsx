"use client"

import { useState } from "react"
import type { Contribution } from "@/db/schemas/contribution-schema"
import type { ContributionExportable } from "@/utils/contribution-export-utils"
import { copyToClipboard } from "@/utils/user-export-utils"
import {
  CheckCircle2,
  Copy,
  Edit,
  Eye,
  History,
  MoreHorizontal,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { ContributionAuditDialog } from "./contribution-audit-dialog"
import { ContributionDetailsDialog } from "./contribution-details-dialog"
import { DeleteContributionConfirm } from "./delete-contribution-confirm"
import { UpdateContributionDialog } from "./update-contribution-dialog"

interface ContributionRowActionsProps {
  contribution: ContributionExportable
  userRole?: string
  onUpdated?: () => Promise<void> | void
  onDeleted?: () => Promise<void> | void
}

export function ContributionRowActions({
  contribution,
  userRole = "admin",
  onUpdated,
  onDeleted,
}: ContributionRowActionsProps) {
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)
  const [auditDialogOpen, setAuditDialogOpen] = useState(false)
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const canManageContribution = userRole === "admin" || userRole === "treasurer"

  const handleCopyToClipboard = async (
    text: string | null | undefined,
    label: string
  ) => {
    if (!text) {
      toast.error(`${label} is not available`)
      return
    }

    const success = await copyToClipboard(text)
    if (success) {
      toast.success(`${label} copied to clipboard`)
      return
    }

    toast.error(`Failed to copy ${label}`)
  }

  const handleConfirmReceipt = async () => {
    try {
      const response = await fetch(`/api/contributions/${contribution.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "confirmed" }),
      })

      if (!response.ok) {
        throw new Error("Failed to confirm receipt")
      }

      toast.success("Contribution marked as confirmed")
      await onUpdated?.()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to confirm receipt"
      )
    }
  }

  const handleWaiveContribution = async () => {
    try {
      const response = await fetch(`/api/contributions/${contribution.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "waived" }),
      })

      if (!response.ok) {
        throw new Error("Failed to waive contribution")
      }

      toast.success("Contribution marked as waived")
      await onUpdated?.()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to waive contribution"
      )
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)

    try {
      const response = await fetch(`/api/contributions/${contribution.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete contribution")
      }

      toast.success("Contribution deleted successfully")
      setDeleteConfirmOpen(false)
      await onDeleted?.()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete contribution"
      )
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={(event) => event.stopPropagation()}>
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => setDetailsDialogOpen(true)}>
              <Eye className="mr-2 h-4 w-4" />
              <span>View Details</span>
              <DropdownMenuShortcut>⌘V</DropdownMenuShortcut>
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => setAuditDialogOpen(true)}>
              <History className="mr-2 h-4 w-4" />
              <span>View Audit Trail</span>
              <DropdownMenuShortcut>⌘H</DropdownMenuShortcut>
            </DropdownMenuItem>

            {canManageContribution && (
              <DropdownMenuItem onClick={() => setUpdateDialogOpen(true)}>
                <Edit className="mr-2 h-4 w-4" />
                <span>Edit Contribution</span>
                <DropdownMenuShortcut>⌘E</DropdownMenuShortcut>
              </DropdownMenuItem>
            )}
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          {canManageContribution ? (
            <>
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={handleConfirmReceipt}>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  <span>Confirm Receipt</span>
                </DropdownMenuItem>

                <DropdownMenuItem onClick={handleWaiveContribution}>
                  <CheckCircle2 className="mr-2 h-4 w-4 text-slate-500" />
                  <span>Mark as Waived</span>
                </DropdownMenuItem>
              </DropdownMenuGroup>

              <DropdownMenuSeparator />

              <DropdownMenuGroup>
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setDeleteConfirmOpen(true)}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  <span>Delete Record</span>
                  <DropdownMenuShortcut>⌘⌫</DropdownMenuShortcut>
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <ContributionDetailsDialog
        contribution={contribution}
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
      />

      <ContributionAuditDialog
        contribution={contribution}
        open={auditDialogOpen}
        onOpenChange={setAuditDialogOpen}
      />

      <UpdateContributionDialog
        contribution={contribution as Contribution}
        memberName={contribution.memberName}
        open={updateDialogOpen}
        onOpenChange={setUpdateDialogOpen}
        onUpdated={onUpdated}
      />

      <DeleteContributionConfirm
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={handleDelete}
        memberName={contribution.memberName}
        isLoading={isDeleting}
      />
    </>
  )
}
