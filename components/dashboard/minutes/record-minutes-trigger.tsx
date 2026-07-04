"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { FileText } from "lucide-react"

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
import { MinutesForm } from "@/components/dashboard/minutes/minutes-form"

interface RecordMinutesTriggerProps {
  onSuccess?: () => void
}

export function RecordMinutesTrigger({ onSuccess }: RecordMinutesTriggerProps) {
  const formId = "record-minutes-form"
  const router = useRouter()
  const isDesktop = useMediaQuery("(min-width: 768px)")
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSuccess = () => {
    setOpen(false)
    onSuccess?.()
    router.refresh()
  }

  const trigger = (
    <Button>
      <FileText className="h-4 w-4" />
      Record Minutes
    </Button>
  )

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden p-0 sm:max-w-4xl">
          <DialogHeader className="shrink-0 px-6 pt-6 pr-14">
            <DialogTitle>Record Meeting Minutes</DialogTitle>
            <DialogDescription>
              Capture decisions, attendance, action items, and upload supporting
              documents.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-4">
            <MinutesForm
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
                  Saving...
                </>
              ) : (
                "Save Minutes"
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
          <DrawerTitle>Record Meeting Minutes</DrawerTitle>
          <DrawerDescription>
            Capture decisions, attendance, action items, and upload supporting
            documents.
          </DrawerDescription>
        </DrawerHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-2">
          <MinutesForm
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
                Saving...
              </>
            ) : (
              "Save Minutes"
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
