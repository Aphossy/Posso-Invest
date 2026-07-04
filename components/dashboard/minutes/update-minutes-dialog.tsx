"use client"

import { useState } from "react"
import type { MeetingMinutes, MinutesStatus } from "@/db/schemas/minutes-schema"
import { toast } from "sonner"

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
import { Loader } from "@/components/common/loader"

interface UpdateMinutesDialogProps {
  minutes: MeetingMinutes
  onUpdated?: () => void
}

const statusOptions = [
  { value: "draft", label: "Draft" },
  { value: "finalized", label: "Finalized" },
  { value: "published", label: "Published" },
]

export function UpdateMinutesDialog({
  minutes,
  onUpdated,
}: UpdateMinutesDialogProps) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [status, setStatus] = useState<MinutesStatus>(minutes.status)

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/minutes/${minutes.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({
          status,
          publishedAt:
            status === "published" ? new Date() : minutes.publishedAt,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to update minutes")
      }

      toast.success("Minutes updated")
      setOpen(false)
      onUpdated?.()
    } catch (error) {
      console.error(error)
      toast.error("Unable to update minutes")
    } finally {
      setIsSubmitting(false)
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
          <DialogTitle>Update Minutes Status</DialogTitle>
          <DialogDescription>
            Move minutes between draft, finalized, and published states.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select
            value={status}
            onValueChange={(value) => setStatus(value as MinutesStatus)}>
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
        <DialogFooter>
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
                Update Minutes
              </>
            ) : (
              "Update Minutes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
