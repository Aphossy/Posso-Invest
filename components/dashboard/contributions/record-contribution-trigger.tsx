"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"

import { useMediaQuery } from "@/hooks/use-media-query"
import { Button } from "@/components/ui/button"
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Loader } from "@/components/common/loader"
import { RecordContributionForm } from "@/components/dashboard/contributions/record-contribution-form"

export function RecordContributionTrigger() {
  const formId = "record-contribution-form"
  const router = useRouter()
  const isDesktop = useMediaQuery("(min-width: 768px)")
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSuccess = () => {
    setOpen(false)
    router.refresh()
  }

  const trigger = (
    <Button>
      <Plus className="h-4 w-4" />
      Record Contribution
    </Button>
  )

  if (isDesktop) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>{trigger}</SheetTrigger>
        <SheetContent className="w-full p-0 sm:max-w-2xl">
          <SheetHeader className="shrink-0 border-b px-6 pt-6 pb-4 text-left">
            <SheetTitle>Record Contribution</SheetTitle>
            <SheetDescription>
              Capture a member contribution and save it to the cycle records.
            </SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-4">
            <RecordContributionForm
              formId={formId}
              hideActions
              onSuccess={handleSuccess}
              onSubmittingChange={setIsSubmitting}
            />
          </div>
          <div className="shrink-0 border-t px-6 py-4">
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                disabled={isSubmitting}
                onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" form={formId} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader className="mr-2 h-4 w-4" />
                    Adding...
                  </>
                ) : (
                  "Add Contribution"
                )}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>{trigger}</DrawerTrigger>
      <DrawerContent className="flex max-h-[92vh] flex-col">
        <DrawerHeader className="shrink-0">
          <DrawerTitle>Record Contribution</DrawerTitle>
          <DrawerDescription>
            Capture a member contribution and save it to the cycle records.
          </DrawerDescription>
        </DrawerHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-2">
          <RecordContributionForm
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
                Adding...
              </>
            ) : (
              "Add Contribution"
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
