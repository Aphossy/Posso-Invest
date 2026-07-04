"use client"

import { useState } from "react"
import { Pencil } from "lucide-react"

import type { MeetingRecord } from "@/hooks/api/use-meetings"
import { useMediaQuery } from "@/hooks/use-media-query"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { Loader } from "@/components/common/loader"
import { RecordMeetingForm } from "@/components/dashboard/meetings/record-meeting-form"

interface EditMeetingTriggerProps {
  meeting: MeetingRecord
  onSuccess?: () => void
}

export function EditMeetingTrigger({
  meeting,
  onSuccess,
}: EditMeetingTriggerProps) {
  const formId = `edit-meeting-form-${meeting.id}`
  const isDesktop = useMediaQuery("(min-width: 768px)")
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSuccess = () => {
    setOpen(false)
    onSuccess?.()
  }

  const trigger = (
    <Button size="sm" variant="outline" className="gap-1.5">
      <Pencil className="h-3.5 w-3.5" />
      Edit
    </Button>
  )

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden p-0 sm:max-w-3xl">
          <DialogHeader className="shrink-0 px-6 pt-6 pr-14">
            <DialogTitle>Edit Meeting</DialogTitle>
            <DialogDescription>
              Update meeting details and schedule.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-4">
            <RecordMeetingForm
              mode="edit"
              meeting={meeting}
              formId={formId}
              hideActions
              onSuccess={handleSuccess}
              onSubmittingChange={setIsSubmitting}
            />
          </div>
          <DialogFooter className="shrink-0 border-t px-6 py-4">
            <DialogClose asChild>
              <Button variant="outline" disabled={isSubmitting}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" form={formId} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader className="mr-2 h-4 w-4" />
                  Updating...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>{trigger}</DrawerTrigger>
      <DrawerContent className="flex max-h-[92vh] flex-col">
        <DrawerHeader className="shrink-0">
          <DrawerTitle>Edit Meeting</DrawerTitle>
          <DrawerDescription>
            Update meeting details and schedule.
          </DrawerDescription>
        </DrawerHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-2">
          <RecordMeetingForm
            mode="edit"
            meeting={meeting}
            formId={formId}
            hideActions
            onSuccess={handleSuccess}
            onSubmittingChange={setIsSubmitting}
          />
        </div>
        <DrawerFooter className="shrink-0 border-t bg-background pb-6">
          <Button type="submit" form={formId} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader className="mr-2 h-4 w-4" />
                Updating...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
          <DrawerClose asChild>
            <Button variant="outline" disabled={isSubmitting}>
              Cancel
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
