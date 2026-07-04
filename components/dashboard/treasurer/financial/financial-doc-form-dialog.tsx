"use client"

import { useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  BarChart3,
  Calendar,
  FileText,
  Loader2,
  StickyNote,
  Tag,
  X,
} from "lucide-react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import * as z from "zod"

import {
  useCreateFinancialDocumentMutation,
  useUpdateFinancialDocumentMutation,
  type FinancialDocumentEnriched,
} from "@/hooks/api/use-financial-documents"
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

// ─── Constants ──────────────────────────────────────────────────────────────

export const FINANCIAL_DOC_TYPE_LABELS: Record<string, string> = {
  monthly_report: "Monthly Report",
  balance_sheet: "Balance Sheet",
  income_statement: "Income Statement",
  contribution_schedule: "Contribution Schedule",
  loan_agreement: "Loan Agreement",
  disbursement_record: "Disbursement Record",
  repayment_schedule: "Repayment Schedule",
  audit_report: "Audit Report",
  bank_statement: "Bank Statement",
  budget: "Budget",
  other: "Other",
}

// ─── Schema ─────────────────────────────────────────────────────────────────

const schema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  docType: z.enum([
    "monthly_report",
    "balance_sheet",
    "income_statement",
    "contribution_schedule",
    "loan_agreement",
    "disbursement_record",
    "repayment_schedule",
    "audit_report",
    "bank_statement",
    "budget",
    "other",
  ]),
  status: z.enum(["draft", "published", "archived"]),
  visibility: z.enum(["public", "authenticated", "committee", "private"]),
  period: z
    .string()
    .optional()
    .refine(
      (v) => !v || /^\d{4}-\d{2}$/.test(v),
      "Period must be in YYYY-MM format"
    ),
  fiscalYear: z.coerce.number().int().min(2000).max(2100).optional(),
  notes: z.string().optional(),
  fileUrl: z.string().optional(),
  fileKey: z.string().optional(),
  fileSize: z.number().optional(),
  fileType: z.string().optional(),
})

type FormInputValues = z.input<typeof schema>
type FormValues = z.output<typeof schema>

// ─── Props ──────────────────────────────────────────────────────────────────

interface FinancialDocFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editDoc?: FinancialDocumentEnriched | null
  defaultDocType?: string
  onSuccess?: () => void
}

// ─── Component ──────────────────────────────────────────────────────────────

export function FinancialDocFormDialog({
  open,
  onOpenChange,
  editDoc,
  defaultDocType,
  onSuccess,
}: FinancialDocFormDialogProps) {
  const createMutation = useCreateFinancialDocumentMutation()
  const updateMutation = useUpdateFinancialDocumentMutation()
  const isEdit = !!editDoc

  const form = useForm<FormInputValues, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      description: "",
      docType: (defaultDocType as any) ?? "other",
      status: "draft",
      visibility: "committee",
      period: "",
      notes: "",
    },
  })

  useEffect(() => {
    if (editDoc) {
      form.reset({
        title: editDoc.title,
        description: editDoc.description ?? "",
        docType: (editDoc.docType as any) ?? "other",
        status: (editDoc.status as any) ?? "draft",
        visibility: (editDoc.visibility as any) ?? "committee",
        period: editDoc.period ?? "",
        fiscalYear: editDoc.fiscalYear ?? undefined,
        notes: editDoc.notes ?? "",
        fileUrl: editDoc.fileUrl ?? "",
        fileKey: editDoc.fileKey ?? "",
        fileSize: editDoc.fileSize ?? undefined,
        fileType: editDoc.fileType ?? "",
      })
    } else {
      form.reset({
        title: "",
        description: "",
        docType: (defaultDocType as any) ?? "other",
        status: "draft",
        visibility: "committee",
        period: "",
        notes: "",
      })
    }
  }, [editDoc, open, defaultDocType])

  const clearFile = () => {
    form.setValue("fileUrl", "")
    form.setValue("fileKey", "")
    form.setValue("fileSize", undefined)
    form.setValue("fileType", "")
  }

  const onSubmit = async (values: FormValues) => {
    try {
      if (isEdit && editDoc) {
        await updateMutation.mutateAsync({ id: editDoc.id, ...values })
        toast.success("Document updated successfully")
      } else {
        await createMutation.mutateAsync(values)
        toast.success("Document uploaded successfully")
      }
      onSuccess?.()
      onOpenChange(false)
    } catch (err: any) {
      toast.error(err?.message || "Failed to save document")
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending
  const fileUrl = form.watch("fileUrl")
  const isDesktop = useMediaQuery("(min-width: 768px)")

  const formContent = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        {/* ── Title ── */}
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title *</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g. March 2026 Monthly Financial Report"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Type */}
          <FormField
            control={form.control}
            name="docType"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5" />
                  Document Type *
                </FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(FINANCIAL_DOC_TYPE_LABELS).map(([v, l]) => (
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

          {/* Status */}
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Period */}
          <FormField
            control={form.control}
            name="period"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  Period
                </FormLabel>
                <FormControl>
                  <Input placeholder="YYYY-MM (e.g. 2026-03)" {...field} />
                </FormControl>
                <FormDescription className="text-xs">
                  Month this document covers
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Fiscal Year */}
          <FormField
            control={form.control}
            name="fiscalYear"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fiscal Year</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="e.g. 2026"
                    name={field.name}
                    ref={field.ref}
                    onBlur={field.onBlur}
                    value={typeof field.value === "number" ? field.value : ""}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value ? parseInt(e.target.value) : undefined
                      )
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Visibility */}
          <FormField
            control={form.control}
            name="visibility"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
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

        {/* Description & Notes */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Brief description of the document..."
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
              <FormLabel className="flex items-center gap-1.5">
                <StickyNote className="h-3.5 w-3.5" />
                Internal Notes
              </FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Internal notes..."
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

        {/* File upload */}
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5 text-sm font-medium">
            <FileText className="h-3.5 w-3.5" />
            Document File
          </Label>
          {fileUrl ? (
            <div className="flex items-center gap-3 rounded-md border bg-muted/40 p-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-green-500/10">
                <FileText className="h-4 w-4 text-green-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {form.watch("fileType") || "File attached"}
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
            Optional - attach a PDF, spreadsheet, or other document
          </p>
        </div>
      </form>
    </Form>
  )

  const actions = (
    <div className="gap-2 flex flex-col-reverse sm:flex-row sm:justify-end">
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
        {isPending ? "Saving..." : isEdit ? "Save Changes" : "Upload Document"}
      </Button>
    </div>
  )

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-green-600" />
              {isEdit ? "Edit Financial Document" : "Upload Financial Document"}
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
            <BarChart3 className="h-5 w-5 text-green-600" />
            {isEdit ? "Edit Financial Document" : "Upload Financial Document"}
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
