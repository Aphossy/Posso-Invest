"use client"

import { AlertTriangle } from "lucide-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface UnsavedChangesDialogProps {
  open: boolean
  onCancel: () => void
  onDiscard: () => void
}

export function UnsavedChangesDialog({
  open,
  onCancel,
  onDiscard,
}: UnsavedChangesDialogProps) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <AlertDialogTitle className="text-xl">
              Unsaved Changes
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="pt-2 text-base">
            You have unsaved changes that will be lost if you leave this page.
            Are you sure you want to discard your changes?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Stay on Page</AlertDialogCancel>
          <AlertDialogAction
            onClick={onDiscard}
            className="bg-destructive hover:bg-destructive/90">
            Discard Changes
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
