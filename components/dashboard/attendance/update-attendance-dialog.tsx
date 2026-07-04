"use client"

import { useEffect, useState } from "react"
import type {
  Attendance,
  AttendanceStatus,
} from "@/db/schemas/attendance-schema"
import { toast } from "sonner"

import { ApiErrorException } from "@/types/api"
import { useUpdateAttendanceMutation } from "@/hooks/api/use-attendance"
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

interface UpdateAttendanceDialogProps {
  attendance: Attendance & {
    memberName?: string | null
    memberEmail?: string | null
    meetingTitle?: string | null
  }
  onUpdated?: () => void
}

const statusOptions = [
  { value: "present", label: "Present" },
  { value: "absent", label: "Absent" },
  { value: "excused", label: "Excused" },
  { value: "late", label: "Late" },
]

export function UpdateAttendanceDialog({
  attendance,
  onUpdated,
}: UpdateAttendanceDialogProps) {
  const toDateTimeLocal = (value?: string | Date | null) => {
    if (!value) return ""
    const date = value instanceof Date ? value : new Date(value)
    if (Number.isNaN(date.getTime())) return ""

    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    return local.toISOString().slice(0, 16)
  }

  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<AttendanceStatus>(attendance.status)
  const updateAttendance = useUpdateAttendanceMutation()
  const [formState, setFormState] = useState({
    checkedInAt: toDateTimeLocal(attendance.checkedInAt),
    notes: attendance.notes || "",
  })

  const initialValues = {
    status: attendance.status,
    checkedInAt: toDateTimeLocal(attendance.checkedInAt),
    notes: (attendance.notes || "").trim(),
  }

  useEffect(() => {
    if (!open) return

    setStatus(attendance.status)
    setFormState({
      checkedInAt: toDateTimeLocal(attendance.checkedInAt),
      notes: attendance.notes || "",
    })
  }, [attendance, open])

  const handleStatusChange = (nextStatus: AttendanceStatus) => {
    setStatus(nextStatus)

    if (nextStatus === "present" || nextStatus === "late") {
      setFormState((prev) => {
        if (prev.checkedInAt) return prev
        return {
          ...prev,
          checkedInAt: toDateTimeLocal(new Date()),
        }
      })
      return
    }

    setFormState((prev) => ({
      ...prev,
      checkedInAt: "",
    }))
  }

  const handleSubmit = async () => {
    const normalizedNotes = formState.notes.trim()
    const isUnchanged =
      status === initialValues.status &&
      formState.checkedInAt === initialValues.checkedInAt &&
      normalizedNotes === initialValues.notes

    if (isUnchanged) {
      toast.info("No changes to update")
      return
    }

    try {
      await updateAttendance.mutateAsync({
        id: attendance.id,
        status,
        checkedInAt: formState.checkedInAt
          ? new Date(formState.checkedInAt).toISOString()
          : undefined,
        notes: normalizedNotes || undefined,
      })

      toast.success("Attendance updated")
      setOpen(false)
      onUpdated?.()
    } catch (error) {
      const message =
        error instanceof ApiErrorException
          ? error.help || error.message
          : "Unable to update attendance"
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Update Attendance</DialogTitle>
          <DialogDescription>
            Adjust attendance status and check-in notes.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">
            {attendance.memberName || "Member"}
          </p>
          <p>
            {attendance.memberEmail || attendance.memberId} •{" "}
            {attendance.meetingTitle || attendance.meetingId}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={status}
              onValueChange={(value) =>
                handleStatusChange(value as AttendanceStatus)
              }>
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
            <Label htmlFor="checkedInAt">Check-in Time</Label>
            <Input
              id="checkedInAt"
              name="checkedInAt"
              type="datetime-local"
              value={formState.checkedInAt}
              disabled={status === "absent" || status === "excused"}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  checkedInAt: event.target.value,
                }))
              }
            />
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
            disabled={updateAttendance.isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              updateAttendance.isPending ||
              (status === initialValues.status &&
                formState.checkedInAt === initialValues.checkedInAt &&
                formState.notes.trim() === initialValues.notes)
            }>
            {updateAttendance.isPending ? (
              <>
                <Loader className="mr-2 h-4 w-4" />
                Update Attendance
              </>
            ) : (
              "Update Attendance"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
