"use client"

import { useState } from "react"
import type {
  ActionItem,
  ActionItemStatus,
} from "@/db/schemas/action-item-schema"
import { toast } from "sonner"

import { ApiErrorException } from "@/types/api"
import { useUpdateActionItemMutation } from "@/hooks/api/use-action-items"
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
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Loader } from "@/components/common/loader"

interface MemberActionItemDialogProps {
  actionItem: ActionItem
  onUpdated?: () => void
}

const statusOptions = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "blocked", label: "Blocked" },
  { value: "done", label: "Done" },
]

export function MemberActionItemDialog({
  actionItem,
  onUpdated,
}: MemberActionItemDialogProps) {
  const [open, setOpen] = useState(false)
  const updateActionItem = useUpdateActionItemMutation()
  const [status, setStatus] = useState<ActionItemStatus>(actionItem.status)
  const [notes, setNotes] = useState(actionItem.notes || "")

  const handleSubmit = async () => {
    try {
      await updateActionItem.mutateAsync({
        id: actionItem.id,
        status,
        notes: notes.trim() || undefined,
        completedAt: status === "done" ? new Date().toISOString() : undefined,
      })

      toast.success("Action item updated")
      setOpen(false)
      onUpdated?.()
    } catch (error) {
      const message =
        error instanceof ApiErrorException
          ? error.help || error.message
          : "Unable to update action item"
      toast.error(message)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Update
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Update My Action</DialogTitle>
          <DialogDescription>
            Share progress and notes for this task.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={status}
              onValueChange={(value) => setStatus(value as ActionItemStatus)}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Share progress or blockers…"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={updateActionItem.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={updateActionItem.isPending}>
            {updateActionItem.isPending ? (
              <>
                <Loader className="mr-2 h-4 w-4" />
                Update Action
              </>
            ) : (
              "Update Action"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
