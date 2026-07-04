"use client"

import { useState } from "react"
import { Trash2 } from "lucide-react"
import { toast } from "sonner"

import { ApiErrorException } from "@/types/api"
import { useDeleteActionItemMutation } from "@/hooks/api/use-action-items"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface DeleteActionItemDialogProps {
  actionItem: {
    id: string
    title: string
  }
  onDeleted?: () => void
}

export function DeleteActionItemDialog({
  actionItem,
  onDeleted,
}: DeleteActionItemDialogProps) {
  const [open, setOpen] = useState(false)
  const [confirmationText, setConfirmationText] = useState("")
  const deleteActionItem = useDeleteActionItemMutation()

  const canDelete = confirmationText.trim() === actionItem.title.trim()

  const handleDelete = async () => {
    if (!canDelete) return

    try {
      await deleteActionItem.mutateAsync({ id: actionItem.id })
      toast.success("Action item deleted")
      setOpen(false)
      setConfirmationText("")
      onDeleted?.()
    } catch (error) {
      const message =
        error instanceof ApiErrorException
          ? error.help || error.message
          : "Failed to delete action item"
      toast.error(message)
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (!nextOpen) {
          setConfirmationText("")
        }
      }}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-destructive">
          <Trash2 className="h-4 w-4" />
          Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete action item?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently remove {actionItem.title}. Type the exact
            title below to confirm.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2">
          <Label htmlFor={`delete-confirm-${actionItem.id}`}>
            Confirmation text
          </Label>
          <Input
            id={`delete-confirm-${actionItem.id}`}
            value={confirmationText}
            onChange={(event) => setConfirmationText(event.target.value)}
            placeholder={actionItem.title}
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteActionItem.isPending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            asChild
            disabled={!canDelete || deleteActionItem.isPending}>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={!canDelete || deleteActionItem.isPending}>
              {deleteActionItem.isPending ? "Deleting..." : "Delete action"}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
