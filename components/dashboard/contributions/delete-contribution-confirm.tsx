"use client"

import { useMemo, useState } from "react"
import { AlertTriangle } from "lucide-react"

import { useMediaQuery } from "@/hooks/use-media-query"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"

interface DeleteContributionConfirmProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => Promise<void>
  memberName?: string | null
  isLoading?: boolean
}

export function DeleteContributionConfirm({
  open,
  onOpenChange,
  onConfirm,
  memberName,
  isLoading = false,
}: DeleteContributionConfirmProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)")
  const [confirmationInput, setConfirmationInput] = useState("")

  const memberDisplay = memberName || "this member"
  const confirmationPhrase = useMemo(
    () => `DELETE ${memberDisplay.toUpperCase()}`,
    [memberDisplay]
  )
  const canDelete = confirmationInput.trim() === confirmationPhrase

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setConfirmationInput("")
    }
    onOpenChange(nextOpen)
  }

  const content = (
    <div className="space-y-4 px-4 pb-4 sm:px-6 sm:pb-6">
      <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 text-destructive" />
          <div className="space-y-1.5 text-sm">
            <p className="font-medium text-destructive">
              Warning: Permanent action
            </p>
            <p className="text-muted-foreground">
              This will permanently delete the contribution record for{" "}
              <span className="font-semibold text-foreground">
                {memberDisplay}
              </span>
              .
            </p>
            <p className="text-muted-foreground">
              This affects contribution history, reports, and future
              reconciliations.
            </p>
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-2">
        <Label htmlFor="delete-confirm-input">Type confirmation phrase</Label>
        <p className="text-xs text-muted-foreground">
          Enter{" "}
          <span className="font-mono font-semibold">{confirmationPhrase}</span>{" "}
          to confirm deletion.
        </p>
        <Input
          id="delete-confirm-input"
          autoComplete="off"
          value={confirmationInput}
          onChange={(event) => setConfirmationInput(event.target.value)}
          placeholder={confirmationPhrase}
          disabled={isLoading}
        />
      </div>
    </div>
  )

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden p-0 sm:max-w-lg">
          <DialogHeader className="border-b bg-muted/40 px-6 py-5 pr-14">
            <DialogTitle className="text-destructive">
              Delete Contribution Record?
            </DialogTitle>
            <DialogDescription>
              Confirm this destructive action to continue.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto">{content}</div>

          <DialogFooter className="border-t px-6 py-4">
            <div className="flex w-full items-center justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isLoading}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => void onConfirm()}
                disabled={isLoading || !canDelete}>
                {isLoading ? "Deleting..." : "Delete Record"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent className="max-h-[92vh] p-0">
        <DrawerHeader className="border-b bg-muted/40 px-4 py-4 text-left">
          <DrawerTitle className="text-destructive">
            Delete Contribution Record?
          </DrawerTitle>
          <DrawerDescription>
            Confirm this destructive action to continue.
          </DrawerDescription>
        </DrawerHeader>

        <div className="min-h-0 flex-1 overflow-y-auto">{content}</div>

        <DrawerFooter className="border-t bg-background pb-6">
          <Button
            variant="destructive"
            onClick={() => void onConfirm()}
            disabled={isLoading || !canDelete}>
            {isLoading ? "Deleting..." : "Delete Record"}
          </Button>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}>
            Cancel
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
