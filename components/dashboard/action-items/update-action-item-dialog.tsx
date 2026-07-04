"use client"

import { useState } from "react"
import type {
  ActionItem,
  ActionItemPriority,
  ActionItemStatus,
} from "@/db/schemas/action-item-schema"
import { toast } from "sonner"

import { ApiErrorException } from "@/types/api"
import { cn } from "@/lib/utils"
import { useUpdateActionItemMutation } from "@/hooks/api/use-action-items"
import { useActionItemAssignees } from "@/hooks/use-action-item-assignees"
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
import { Input } from "@/components/ui/input"
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

interface UpdateActionItemDialogProps {
  actionItem: ActionItem
  onUpdated?: () => void
}

const statusOptions = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "blocked", label: "Blocked" },
  { value: "done", label: "Done" },
  { value: "cancelled", label: "Cancelled" },
]

const priorityOptions = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
]

export function UpdateActionItemDialog({
  actionItem,
  onUpdated,
}: UpdateActionItemDialogProps) {
  const [open, setOpen] = useState(false)
  const updateActionItem = useUpdateActionItemMutation()
  const { assigneeOptions, getAssigneeLabel } = useActionItemAssignees()
  const [status, setStatus] = useState<ActionItemStatus>(actionItem.status)
  const [priority, setPriority] = useState<ActionItemPriority>(
    actionItem.priority
  )
  const [formState, setFormState] = useState({
    title: actionItem.title,
    description: actionItem.description || "",
    ownerId: actionItem.ownerId || "",
    dueDate: actionItem.dueDate
      ? new Date(actionItem.dueDate).toISOString().slice(0, 10)
      : "",
    notes: actionItem.notes || "",
  })

  const selectedOwnerLabel = getAssigneeLabel(formState.ownerId)

  const handleSubmit = async () => {
    try {
      await updateActionItem.mutateAsync({
        id: actionItem.id,
        title: formState.title.trim(),
        description: formState.description.trim() || undefined,
        ownerId: formState.ownerId.trim() || undefined,
        dueDate: formState.dueDate
          ? new Date(formState.dueDate).toISOString()
          : undefined,
        status,
        priority,
        notes: formState.notes.trim() || undefined,
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

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)

    if (nextOpen) {
      setStatus(actionItem.status)
      setPriority(actionItem.priority)
      setFormState({
        title: actionItem.title,
        description: actionItem.description || "",
        ownerId: actionItem.ownerId || "",
        dueDate: actionItem.dueDate
          ? new Date(actionItem.dueDate).toISOString().slice(0, 10)
          : "",
        notes: actionItem.notes || "",
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Update
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Update Action Item</DialogTitle>
          <DialogDescription>
            Update progress, ownership, and due dates.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              name="title"
              value={formState.title}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  title: event.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              rows={3}
              value={formState.description}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  description: event.target.value,
                }))
              }
            />
          </div>
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
            <Label>Priority</Label>
            <Select
              value={priority}
              onValueChange={(value) =>
                setPriority(value as ActionItemPriority)
              }>
              <SelectTrigger>
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                {priorityOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="dueDate">Due Date</Label>
            <Input
              id="dueDate"
              name="dueDate"
              type="date"
              value={formState.dueDate}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  dueDate: event.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Assigned member</Label>
            <Select
              value={formState.ownerId || "unassigned"}
              onValueChange={(value) =>
                setFormState((prev) => ({
                  ...prev,
                  ownerId: value === "unassigned" ? "" : value,
                }))
              }>
              <SelectTrigger>
                <SelectValue placeholder="Select a member or leader" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">No member assigned</SelectItem>
                {assigneeOptions.map((member) => (
                  <SelectItem key={member.value} value={member.value}>
                    {member.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className={cn("text-xs text-muted-foreground")}>
              {selectedOwnerLabel}
            </p>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              rows={3}
              value={formState.notes}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  notes: event.target.value,
                }))
              }
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
                Update Action Item
              </>
            ) : (
              "Update Action Item"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
