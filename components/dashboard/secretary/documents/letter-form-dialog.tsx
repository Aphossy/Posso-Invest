"use client"

import { useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  FileText,
  Hash,
  Loader2,
  Mail,
  MessageSquare,
  Tag,
  User,
  X,
} from "lucide-react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import * as z from "zod"

import {
  useCreateLetterMutation,
  useUpdateLetterMutation,
  type LetterEnriched,
} from "@/hooks/api/use-letters"
import { useMediaQuery } from "@/hooks/use-media-query"
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { FileUploadComponent } from "@/components/file-upload-component"

// ─── Constants ─────────────────────────────────────────────────────────────

export const LETTER_TYPE_LABELS: Record<string, string> = {
  approval_request: "Approval Request",
  official_notice: "Official Notice",
  legal_notice: "Legal Notice",
  meeting_notice: "Meeting Notice",
  member_communication: "Member Communication",
  general_correspondence: "General Correspondence",
}

export const LETTER_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  sent: "Sent",
  acknowledged: "Acknowledged",
  pending_signature: "Pending Signature",
  signed: "Signed",
  approved: "Approved",
  rejected: "Rejected",
  archived: "Archived",
}

// ─── Schema ─────────────────────────────────────────────────────────────────

const schema = z.object({
  subject: z.string().min(3, "Subject must be at least 3 characters"),
  letterType: z.enum([
    "approval_request",
    "official_notice",
    "legal_notice",
    "meeting_notice",
    "member_communication",
    "general_correspondence",
  ]),
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
  visibility: z.enum(["public", "authenticated", "committee", "private"]),
  recipient: z.string().optional(),
  refNumber: z.string().optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
  fileUrl: z.string().optional(),
  fileKey: z.string().optional(),
  fileSize: z.number().optional(),
  fileType: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

// ─── Props ──────────────────────────────────────────────────────────────────

interface LetterFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editLetter?: LetterEnriched | null
  defaultType?: string
  onSuccess?: () => void
}

// ─── Component ──────────────────────────────────────────────────────────────

export function LetterFormDialog({
  open,
  onOpenChange,
  editLetter,
  defaultType,
  onSuccess,
}: LetterFormDialogProps) {
  const createMutation = useCreateLetterMutation()
  const updateMutation = useUpdateLetterMutation()
  const isDesktop = useMediaQuery("(min-width: 768px)")
  const isEdit = !!editLetter

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      subject: "",
      letterType: (defaultType as any) ?? "general_correspondence",
      status: "draft",
      visibility: "committee",
      recipient: "",
      refNumber: "",
      description: "",
      notes: "",
    },
  })

  // Sync form when edit target or open state changes
  useEffect(() => {
    if (editLetter) {
      form.reset({
        subject: editLetter.subject,
        letterType: (editLetter.letterType as any) ?? "general_correspondence",
        status: (editLetter.status as any) ?? "draft",
        visibility: (editLetter.visibility as any) ?? "committee",
        recipient: editLetter.recipient ?? "",
        refNumber: editLetter.refNumber ?? "",
        description: editLetter.description ?? "",
        notes: editLetter.notes ?? "",
        fileUrl: editLetter.fileUrl ?? "",
        fileKey: editLetter.fileKey ?? "",
        fileSize: editLetter.fileSize ?? undefined,
        fileType: editLetter.fileType ?? "",
      })
    } else {
      form.reset({
        subject: "",
        letterType: (defaultType as any) ?? "general_correspondence",
        status: "draft",
        visibility: "committee",
        recipient: "",
        refNumber: "",
        description: "",
        notes: "",
      })
    }
  }, [defaultType, editLetter, form, open])

  const clearFile = () => {
    form.setValue("fileUrl", "")
    form.setValue("fileKey", "")
    form.setValue("fileSize", undefined)
    form.setValue("fileType", "")
  }

  const onSubmit = async (values: FormValues) => {
    try {
      if (isEdit && editLetter) {
        await updateMutation.mutateAsync({ id: editLetter.id, ...values })
        toast.success("Letter updated successfully")
      } else {
        await createMutation.mutateAsync(values)
        toast.success("Letter created successfully")
      }
      onSuccess?.()
      onOpenChange(false)
    } catch (err: any) {
      toast.error(err?.message || "Failed to save letter")
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending
  const fileUrl = form.watch("fileUrl")

  const formContent = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        {/* ── Core fields ── */}
        <FormField
          control={form.control}
          name="subject"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5" />
                Subject *
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g. Approval request for Q1 2026 budget"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="letterType"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5" />
                  Letter Type *
                </FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(LETTER_TYPE_LABELS).map(([v, l]) => (
                      <SelectItem key={v} value={v}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="acknowledged">Acknowledged</SelectItem>
                    <SelectItem value="pending_signature">
                      Pending Signature
                    </SelectItem>
                    <SelectItem value="signed">Signed</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="recipient"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  Recipient
                </FormLabel>
                <FormControl>
                  <Input placeholder="Name or organisation..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="refNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-1.5">
                  <Hash className="h-3.5 w-3.5" />
                  Reference Number
                </FormLabel>
                <FormControl>
                  <Input placeholder="e.g. TLG/L/2026/001" {...field} />
                </FormControl>
                <FormDescription className="text-xs">
                  Leave blank to auto-assign later
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="visibility"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Visibility</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="committee">Committee Only</SelectItem>
                    <SelectItem value="authenticated">All Members</SelectItem>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Separator />

        {/* ── Description & notes ── */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Brief description of the letter purpose..."
                  rows={3}
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Internal Notes</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Internal notes (not visible to recipients)..."
                  rows={2}
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Separator />

        {/* ── File attachment ── */}
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5 text-sm font-medium">
            <FileText className="h-3.5 w-3.5" />
            Attached Document
          </Label>
          {fileUrl ? (
            <div className="flex items-center gap-3 rounded-md border bg-muted/40 p-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-primary/10">
                <FileText className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {form.watch("fileType") || "Document attached"}
                </p>
                {form.watch("fileSize") && (
                  <p className="text-xs text-muted-foreground">
                    {(form.watch("fileSize")! / 1024).toFixed(1)} KB
                  </p>
                )}
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={clearFile}
                className="shrink-0 text-muted-foreground hover:text-destructive">
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <FileUploadComponent
              acceptedTypes="documents"
              maxFiles={1}
              onUploadComplete={(files) => {
                if (files[0]) {
                  form.setValue("fileUrl", files[0].url)
                  form.setValue("fileKey", files[0].key ?? "")
                  form.setValue("fileSize", files[0].size)
                  form.setValue("fileType", files[0].type)
                }
              }}
            />
          )}
          <p className="text-xs text-muted-foreground">
            Optional - attach a PDF, Word document, or other file
          </p>
        </div>
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
        type="submit"
        disabled={isPending}
        onClick={(e) => {
          e.preventDefault()
          form.handleSubmit(onSubmit)()
        }}>
        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {isPending ? "Saving..." : isEdit ? "Save Changes" : "Create Letter"}
      </Button>
    </div>
  )

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {isEdit ? "Edit Letter" : "Create New Letter"}
            </DialogTitle>
          </DialogHeader>

          {formContent}

          <DialogFooter className="gap-2 pt-2">{actions}</DialogFooter>
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
            {isEdit ? "Edit Letter" : "Create New Letter"}
          </DrawerTitle>
        </DrawerHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <div className="space-y-4">{formContent}</div>
        </div>

        <DrawerFooter className="border-t bg-background pb-6">
          {actions}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
