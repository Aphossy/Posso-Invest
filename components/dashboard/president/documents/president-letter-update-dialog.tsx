"use client"

import { useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  CheckCircle2,
  FileText,
  Loader2,
  Mail,
  PenLine,
  XCircle,
} from "lucide-react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import * as z from "zod"

import {
  useUpdateLetterMutation,
  type LetterEnriched,
} from "@/hooks/api/use-letters"
import { useMediaQuery } from "@/hooks/use-media-query"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"

// ─── Status config ────────────────────────────────────────────────────────────

const ALL_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "acknowledged", label: "Acknowledged" },
  { value: "pending_signature", label: "Pending Signature" },
  { value: "signed", label: "Signed" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "archived", label: "Archived" },
] as const

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  sent: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  acknowledged:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  pending_signature:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  signed:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  approved:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  archived:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
}

// ─── Schema ──────────────────────────────────────────────────────────────────

const schema = z.object({
  status: z.enum([
    "draft",
    "sent",
    "acknowledged",
    "pending_signature",
    "signed",
    "approved",
    "rejected",
    "archived",
  ]),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

// ─── Props ────────────────────────────────────────────────────────────────────

interface PresidentLetterUpdateDialogProps {
  letter: LetterEnriched | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

// ─── Component ───────────────────────────────────────────────────────────────

export function PresidentLetterUpdateDialog({
  letter,
  open,
  onOpenChange,
  onSuccess,
}: PresidentLetterUpdateDialogProps) {
  const updateMutation = useUpdateLetterMutation()
  const isDesktop = useMediaQuery("(min-width: 768px)")

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { status: "draft", notes: "" },
  })

  useEffect(() => {
    if (letter) {
      form.reset({
        status: (letter.status as FormValues["status"]) ?? "draft",
        notes: letter.notes ?? "",
      })
    }
  }, [letter, open, form])

  if (!letter) return null

  const onSubmit = async (values: FormValues) => {
    try {
      await updateMutation.mutateAsync({ id: letter.id, ...values })
      toast.success("Letter updated")
      onSuccess?.()
      onOpenChange(false)
    } catch (err: any) {
      toast.error(err?.message || "Failed to update letter")
    }
  }

  const quickUpdate = async (status: FormValues["status"]) => {
    form.setValue("status", status)
    await form.handleSubmit(onSubmit)()
  }

  const isPending = updateMutation.isPending
  const currentStatus = form.watch("status")

  const formContent = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        {/* ── Letter summary card ── */}
        <div className="rounded-lg border bg-muted/30 p-4">
          <div className="mb-2 flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-primary/10">
              <FileText className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold leading-snug">{letter.subject}</p>
              {letter.refNumber && (
                <p className="font-mono text-xs text-muted-foreground">
                  {letter.refNumber}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 text-xs text-muted-foreground">
            {letter.recipient && <span>To: {letter.recipient}</span>}
            {letter.issuedByName && (
              <span>· Prepared by: {letter.issuedByName}</span>
            )}
          </div>
        </div>

        {/* ── Quick actions ── */}
        <div>
          <p className="mb-2 text-sm font-medium">Quick Actions</p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={currentStatus === "signed" ? "default" : "outline"}
              className="gap-1.5"
              disabled={isPending}
              onClick={() => quickUpdate("signed")}>
              <PenLine className="h-3.5 w-3.5" />
              Sign Letter
            </Button>
            <Button
              type="button"
              size="sm"
              variant={
                currentStatus === "pending_signature" ? "default" : "outline"
              }
              className="gap-1.5"
              disabled={isPending}
              onClick={() => quickUpdate("pending_signature")}>
              <CheckCircle2 className="h-3.5 w-3.5" />
              Mark Pending Signature
            </Button>
            <Button
              type="button"
              size="sm"
              variant={currentStatus === "rejected" ? "destructive" : "outline"}
              className="gap-1.5"
              disabled={isPending}
              onClick={() => quickUpdate("rejected")}>
              <XCircle className="h-3.5 w-3.5" />
              Reject
            </Button>
          </div>
        </div>

        <Separator />

        {/* ── Status select ── */}
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <div className="flex items-center gap-3">
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {ALL_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Badge className={STATUS_COLORS[field.value] ?? ""}>
                  {ALL_STATUSES.find((s) => s.value === field.value)?.label ??
                    field.value}
                </Badge>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* ── Notes ── */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Internal Notes</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Add notes about this decision (internal use only)..."
                  rows={3}
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  )

  const actions = (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <Button
        type="button"
        variant="outline"
        onClick={() => onOpenChange(false)}
        disabled={isPending}>
        Cancel
      </Button>
      <Button
        disabled={isPending}
        onClick={() => form.handleSubmit(onSubmit)()}>
        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {isPending ? "Saving..." : "Save Changes"}
      </Button>
    </div>
  )

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Update Letter
            </DialogTitle>
          </DialogHeader>
          {formContent}
          <DialogFooter className="pt-2">{actions}</DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="flex max-h-[92vh] flex-col overflow-hidden p-0">
        <DrawerHeader className="border-b bg-muted/40 px-4 py-4 text-left">
          <DrawerTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Update Letter
          </DrawerTitle>
        </DrawerHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {formContent}
        </div>
        <DrawerFooter className="border-t bg-background pb-6">
          {actions}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
