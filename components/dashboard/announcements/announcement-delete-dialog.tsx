"use client"

import { useState } from "react"
import { Trash2 } from "lucide-react"
import { toast } from "sonner"

import { useDeleteAnnouncementMutation } from "@/hooks/api/use-announcements"
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
import { Loader } from "@/components/common/loader"

interface Props {
  id: string
  title: string
  trigger?: React.ReactNode
  onDeleted?: () => void
}

export function AnnouncementDeleteDialog({
  id,
  title,
  trigger,
  onDeleted,
}: Props) {
  const [open, setOpen] = useState(false)
  const deleteMutation = useDeleteAnnouncementMutation()

  async function handleDelete() {
    try {
      await deleteMutation.mutateAsync(id)
      toast.success("Announcement deleted.")
      setOpen(false)
      onDeleted?.()
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete announcement.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive">
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete Announcement?</DialogTitle>
          <DialogDescription>
            This will permanently delete <strong>&ldquo;{title}&rdquo;</strong>.
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={deleteMutation.isPending}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => void handleDelete()}
            disabled={deleteMutation.isPending}>
            {deleteMutation.isPending ? (
              <Loader className="h-4 w-4" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            {deleteMutation.isPending ? "Deleting…" : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
