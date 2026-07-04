"use client"

import { useState } from "react"
import { AlertTriangle, Loader2, Mail } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import {
  useDeleteLetterMutation,
  type LetterEnriched,
} from "@/hooks/api/use-letters"
import { useMediaQuery } from "@/hooks/use-media-query"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"

const LETTER_TYPE_LABELS: Record<string, string> = {
  approval_request: "Approval Request",
  official_notice: "Official Notice",
  legal_notice: "Legal Notice",
  meeting_notice: "Meeting Notice",
  member_communication: "Member Communication",
  general_correspondence: "General Correspondence",
}

const LETTER_STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  sent: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  acknowledged:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  approved:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  archived:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
}

interface LetterDeleteDialogProps {
  letter: LetterEnriched | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function LetterDeleteDialog({
  letter,
  open,
  onOpenChange,
  onSuccess,
}: LetterDeleteDialogProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)")
  const deleteMutation = useDeleteLetterMutation()
  const [confirm, setConfirm] = useState("")

  if (!letter) return null

  // Require the user to type the subject's first 20 chars to confirm
  const confirmText =
    letter.subject.length > 20 ? letter.subject.slice(0, 20) : letter.subject
  const canDelete = confirm.trim() === confirmText

  const handleDelete = async () => {
    if (!canDelete) return
    try {
      await deleteMutation.mutateAsync(letter.id)
      toast.success("Letter deleted")
      setConfirm("")
      onOpenChange(false)
      onSuccess?.()
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete letter")
    }
  }

  const handleOpenChange = (v: boolean) => {
    if (!v) setConfirm("")
    onOpenChange(v)
  }

  const content = (
    <div className="flex flex-col gap-4">
      {/* ── Warning header ── */}
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
          <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
        </div>
        <div>
          <h2 className="text-left font-semibold">Delete Letter</h2>
          <p className="mt-1 text-left text-sm text-muted-foreground">
            This action is permanent and cannot be undone. The letter record and
            any attached file reference will be removed.
          </p>
        </div>
      </div>

      {/* ── Letter preview ── */}
      <div className="flex items-start gap-3 rounded-lg border bg-muted/40 p-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-primary/10">
          <Mail className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm font-medium leading-snug">
            {letter.subject}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <Badge
              className={cn(
                "text-xs",
                LETTER_STATUS_COLORS[letter.status] ?? ""
              )}>
              {letter.status}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {LETTER_TYPE_LABELS[letter.letterType] ?? letter.letterType}
            </Badge>
            {letter.refNumber && (
              <span className="font-mono text-xs text-muted-foreground">
                {letter.refNumber}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Confirm input ── */}
      <div className="space-y-1.5">
        <p className="text-sm">
          Type{" "}
          <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
            {confirmText}
          </span>{" "}
          to confirm deletion:
        </p>
        <Input
          placeholder={confirmText}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="off"
        />
      </div>
    </div>
  )

  const actions = (
    <>
      <Button
        variant="outline"
        onClick={() => handleOpenChange(false)}
        disabled={deleteMutation.isPending}>
        Cancel
      </Button>
      <Button
        variant="destructive"
        disabled={!canDelete || deleteMutation.isPending}
        onClick={handleDelete}>
        {deleteMutation.isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : null}
        Delete Letter
      </Button>
    </>
  )

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-md">
          {content}
          <DialogFooter className="mt-2">{actions}</DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent className="flex max-h-[92vh] flex-col overflow-hidden p-0">
        <DrawerHeader className="border-b bg-muted/40 px-4 py-4 text-left">
          <DrawerTitle>Delete Letter</DrawerTitle>
        </DrawerHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <div className="space-y-4">{content}</div>
        </div>
        <DrawerFooter className="border-t bg-background pb-6">
          {actions}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
