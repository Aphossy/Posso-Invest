"use client"

import { useEffect, useMemo, useState } from "react"
import { normalizeRoleValue } from "@/utils/role-utils"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Banknote,
  Check,
  ChevronsUpDown,
  FileText,
  Loader2,
  Receipt,
  User,
  X,
} from "lucide-react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import * as z from "zod"

import { organizationClient } from "@/lib/organization-client"
import { cn } from "@/lib/utils"
import {
  useIssueReceiptMutation,
  useUpdateReceiptMutation,
  type ReceiptEnriched,
} from "@/hooks/api/use-receipts"
import { useMediaQuery } from "@/hooks/use-media-query"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { MemberAvatar } from "@/components/common/member-avatar"
import { FileUploadComponent } from "@/components/file-upload-component"

// ─── Constants ──────────────────────────────────────────────────────────────

export const RECEIPT_TYPE_LABELS: Record<string, string> = {
  contribution: "Contribution",
  loan_repayment: "Loan Repayment",
  penalty_payment: "Penalty Payment",
  registration_fee: "Registration Fee",
  other: "Other",
}

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  bank_transfer: "Bank Transfer",
  mobile_money: "Mobile Money",
  check: "Check",
  other: "Other",
}

// ─── Schema ─────────────────────────────────────────────────────────────────

const schema = z.object({
  memberId: z.string().min(1, "Please select a member"),
  receiptType: z.enum([
    "contribution",
    "loan_repayment",
    "penalty_payment",
    "registration_fee",
    "other",
  ]),
  amount: z
    .string()
    .min(1, "Amount is required")
    .refine(
      (v) => !isNaN(Number(v)) && Number(v) > 0,
      "Must be a positive number"
    ),
  currency: z.string().default("RWF"),
  paymentMethod: z.enum([
    "cash",
    "bank_transfer",
    "mobile_money",
    "check",
    "other",
  ]),
  status: z.enum(["issued", "void", "replaced"]),
  period: z
    .string()
    .optional()
    .refine(
      (v) => !v || /^\d{4}-\d{2}$/.test(v),
      "Period must be in YYYY-MM format"
    ),
  contributionId: z.string().optional(),
  loanId: z.string().optional(),
  penaltyId: z.string().optional(),
  notes: z.string().optional(),
  fileUrl: z.string().optional(),
  fileKey: z.string().optional(),
  fileSize: z.number().optional(),
  fileType: z.string().optional(),
})

type FormInputValues = z.input<typeof schema>
type FormValues = z.output<typeof schema>

// ─── Member type ─────────────────────────────────────────────────────────────

type OrgMember = {
  id: string
  userId: string
  name?: string | null
  email?: string | null
  role?: string | null
  image?: string | null
}

const hasStrictMemberRole = (rawRole: unknown): boolean => {
  if (Array.isArray(rawRole)) {
    const normalized = rawRole
      .map((value) =>
        typeof value === "string" ? normalizeRoleValue(value) : null
      )
      .filter((value): value is string => Boolean(value))

    return normalized.length === 1 && normalized[0] === "member"
  }

  if (typeof rawRole === "string") {
    const parts = rawRole
      .split(",")
      .map((part) => normalizeRoleValue(part))
      .filter((value): value is string => Boolean(value))

    return parts.length === 1 && parts[0] === "member"
  }

  return false
}

// ─── Props ──────────────────────────────────────────────────────────────────

interface ReceiptFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editReceipt?: ReceiptEnriched | null
  defaultMemberId?: string
  defaultReceiptType?: string
  onSuccess?: () => void
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ReceiptFormDialog({
  open,
  onOpenChange,
  editReceipt,
  defaultMemberId,
  defaultReceiptType,
  onSuccess,
}: ReceiptFormDialogProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)")
  const issueMutation = useIssueReceiptMutation()
  const updateMutation = useUpdateReceiptMutation()
  const isEdit = !!editReceipt

  // Members for picker
  const [members, setMembers] = useState<OrgMember[]>([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [membersLoadError, setMembersLoadError] = useState<string | null>(null)
  const [memberPickerOpen, setMemberPickerOpen] = useState(false)
  const [memberSearch, setMemberSearch] = useState("")

  const form = useForm<FormInputValues, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      memberId: defaultMemberId ?? "",
      receiptType: (defaultReceiptType as any) ?? "contribution",
      amount: "",
      currency: "RWF",
      paymentMethod: "cash",
      status: "issued",
      period: "",
      notes: "",
    },
  })

  // Load org members once on open
  useEffect(() => {
    if (!open) return
    let isActive = true

    const fetchMembers = async () => {
      setMembersLoading(true)
      setMembersLoadError(null)

      try {
        const { data, error } = await organizationClient.listMembers({
          query: {
            limit: 500,
            offset: 0,
            role: "member",
          },
        })

        if (error) {
          throw new Error(error.message || "Failed to load members")
        }

        const mapById = new Map<string, OrgMember>()

        ;(data?.members ?? []).forEach((membership: any) => {
          if (!hasStrictMemberRole(membership?.role)) {
            return
          }

          const id = membership?.user?.id ?? membership?.userId ?? ""
          if (!id) {
            return
          }

          if (!mapById.has(id)) {
            mapById.set(id, {
              id,
              userId: id,
              name: membership?.user?.name ?? "Unnamed member",
              email: membership?.user?.email ?? "",
              role: "member",
              image: membership?.user?.image ?? null,
            })
          }
        })

        const nextMembers = [...mapById.values()].sort((a, b) =>
          (a.name ?? "").localeCompare(b.name ?? "")
        )

        if (isActive) {
          setMembers(nextMembers)
        }
      } catch (error) {
        console.error(error)
        if (isActive) {
          setMembers([])
          setMembersLoadError("Unable to load members. Please try again.")
        }
      } finally {
        if (isActive) {
          setMembersLoading(false)
        }
      }
    }

    void fetchMembers()

    return () => {
      isActive = false
    }
  }, [open])

  // Sync form when editing
  useEffect(() => {
    if (editReceipt) {
      form.reset({
        memberId: editReceipt.memberId,
        receiptType: (editReceipt.receiptType as any) ?? "contribution",
        amount: editReceipt.amount,
        currency: editReceipt.currency,
        paymentMethod: (editReceipt.paymentMethod as any) ?? "cash",
        status: (editReceipt.status as any) ?? "issued",
        period: editReceipt.period ?? "",
        contributionId: editReceipt.contributionId ?? "",
        loanId: editReceipt.loanId ?? "",
        penaltyId: editReceipt.penaltyId ?? "",
        notes: editReceipt.notes ?? "",
        fileUrl: editReceipt.fileUrl ?? "",
        fileKey: editReceipt.fileKey ?? "",
        fileSize: editReceipt.fileSize ?? undefined,
        fileType: editReceipt.fileType ?? "",
      })
    } else {
      form.reset({
        memberId: defaultMemberId ?? "",
        receiptType: (defaultReceiptType as any) ?? "contribution",
        amount: "",
        currency: "RWF",
        paymentMethod: "cash",
        status: "issued",
        period: "",
        notes: "",
      })
    }
  }, [editReceipt, open, defaultMemberId, defaultReceiptType, form])

  const filteredMembers = useMemo(() => {
    if (!memberSearch) return members
    const q = memberSearch.toLowerCase()
    return members.filter(
      (m) =>
        m.name?.toLowerCase().includes(q) || m.email?.toLowerCase().includes(q)
    )
  }, [members, memberSearch])

  const selectedMemberId = form.watch("memberId")
  const selectedMember = members.find(
    (m) => m.userId === selectedMemberId || m.id === selectedMemberId
  )

  const clearFile = () => {
    form.setValue("fileUrl", "")
    form.setValue("fileKey", "")
    form.setValue("fileSize", undefined)
    form.setValue("fileType", "")
  }

  const onSubmit = async (values: FormValues) => {
    // Resolve the user ID from the member record
    const member = members.find(
      (m) => m.userId === values.memberId || m.id === values.memberId
    )
    const resolvedMemberId = member?.userId ?? values.memberId

    try {
      if (isEdit && editReceipt) {
        await updateMutation.mutateAsync({
          id: editReceipt.id,
          ...values,
          memberId: resolvedMemberId,
        })
        toast.success("Receipt updated")
      } else {
        await issueMutation.mutateAsync({
          ...values,
          memberId: resolvedMemberId,
        })
        toast.success("Receipt issued successfully")
      }
      onSuccess?.()
      onOpenChange(false)
    } catch (err: any) {
      toast.error(err?.message || "Failed to save receipt")
    }
  }

  const isPending = issueMutation.isPending || updateMutation.isPending
  const fileUrl = form.watch("fileUrl")
  const receiptType = form.watch("receiptType")

  const formContent = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        {/* ── Member picker ── */}
        <FormField
          control={form.control}
          name="memberId"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                Member *
              </FormLabel>
              <Popover
                open={memberPickerOpen}
                onOpenChange={setMemberPickerOpen}>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={memberPickerOpen}
                      aria-controls="receipt-member-list"
                      className={cn(
                        "justify-between text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}>
                      {selectedMember ? (
                        <div className="min-w-0 flex items-center gap-2">
                          <MemberAvatar
                            name={selectedMember.name}
                            email={selectedMember.email}
                            image={selectedMember.image}
                            size="sm"
                          />
                          <span className="truncate">
                            {selectedMember.name ?? selectedMember.email}
                          </span>
                        </div>
                      ) : membersLoading ? (
                        <span className="flex items-center gap-2 text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading members...
                        </span>
                      ) : (
                        "Select a member..."
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent
                  className="w-(--radix-popover-trigger-width) p-0"
                  align="start">
                  <Command>
                    <CommandInput
                      placeholder="Search by name or email..."
                      value={memberSearch}
                      onValueChange={setMemberSearch}
                    />
                    <CommandList id="receipt-member-list">
                      <CommandEmpty>
                        {membersLoading
                          ? "Loading members..."
                          : "No members found."}
                      </CommandEmpty>
                      <CommandGroup>
                        {filteredMembers.map((m) => {
                          const val = m.userId ?? m.id
                          return (
                            <CommandItem
                              key={m.id}
                              value={val}
                              onSelect={() => {
                                field.onChange(val)
                                setMemberPickerOpen(false)
                                setMemberSearch("")
                              }}>
                              <div className="flex min-w-0 flex-1 items-center gap-2">
                                <MemberAvatar
                                  name={m.name}
                                  email={m.email}
                                  image={m.image}
                                  size="md"
                                />
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-medium">
                                    {m.name ?? "Unnamed"}
                                  </p>
                                  <p className="truncate text-xs text-muted-foreground">
                                    {m.email}
                                  </p>
                                </div>
                                {m.role && (
                                  <Badge
                                    variant="outline"
                                    className="shrink-0 text-xs capitalize">
                                    {m.role}
                                  </Badge>
                                )}
                              </div>
                              <Check
                                className={cn(
                                  "ml-2 h-4 w-4 shrink-0",
                                  field.value === val
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                            </CommandItem>
                          )
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <FormMessage />
              {membersLoadError && (
                <FormDescription className="text-destructive">
                  {membersLoadError}
                </FormDescription>
              )}
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Receipt type */}
          <FormField
            control={form.control}
            name="receiptType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Receipt Type *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(RECEIPT_TYPE_LABELS).map(([v, l]) => (
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
                    <SelectItem value="issued">Issued</SelectItem>
                    <SelectItem value="void">Void</SelectItem>
                    <SelectItem value="replaced">Replaced</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Amount */}
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-1.5">
                  <Banknote className="h-3.5 w-3.5" />
                  Amount *
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Currency */}
          <FormField
            control={form.control}
            name="currency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Currency</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="RWF">RWF - Rwandan Franc</SelectItem>
                    <SelectItem value="USD">USD - US Dollar</SelectItem>
                    <SelectItem value="EUR">EUR - Euro</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Payment method */}
          <FormField
            control={form.control}
            name="paymentMethod"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Payment Method</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(PAYMENT_METHOD_LABELS).map(([v, l]) => (
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

          {/* Period */}
          <FormField
            control={form.control}
            name="period"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Period</FormLabel>
                <FormControl>
                  <Input placeholder="YYYY-MM (e.g. 2026-03)" {...field} />
                </FormControl>
                <FormDescription className="text-xs">
                  Financial period this receipt covers
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Separator />

        {/* ── Reference links ── */}
        <div className="space-y-1">
          <p className="text-sm font-medium">Source Reference (optional)</p>
          <p className="text-xs text-muted-foreground">
            Link this receipt to an existing record
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {(receiptType === "contribution" || receiptType === "other") && (
            <FormField
              control={form.control}
              name="contributionId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Contribution ID</FormLabel>
                  <FormControl>
                    <Input
                      className="text-xs"
                      placeholder="Contribution record ID"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          {(receiptType === "loan_repayment" || receiptType === "other") && (
            <FormField
              control={form.control}
              name="loanId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Loan ID</FormLabel>
                  <FormControl>
                    <Input
                      className="text-xs"
                      placeholder="Loan record ID"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          {(receiptType === "penalty_payment" || receiptType === "other") && (
            <FormField
              control={form.control}
              name="penaltyId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Penalty ID</FormLabel>
                  <FormControl>
                    <Input
                      className="text-xs"
                      placeholder="Penalty record ID"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        <Separator />

        {/* Notes */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Additional notes or remarks..."
                  rows={3}
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* File */}
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5 text-sm font-medium">
            <FileText className="h-3.5 w-3.5" />
            Attach Receipt Document (optional)
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
        </div>

        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isPending
              ? "Saving..."
              : isEdit
                ? "Save Changes"
                : "Issue Receipt"}
          </Button>
        </div>
      </form>
    </Form>
  )

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-green-600" />
              {isEdit ? "Edit Receipt" : "Issue New Receipt"}
            </DialogTitle>
            <DialogDescription>
              {isEdit
                ? "Update the receipt details below."
                : "Fill in the payment details. A receipt number will be auto-generated."}
            </DialogDescription>
          </DialogHeader>

          {formContent}
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="flex max-h-[92vh] flex-col overflow-hidden p-0">
        <DrawerHeader className="border-b bg-muted/40 px-4 py-4 text-left">
          <DrawerTitle className="flex items-center gap-2 text-base">
            <Receipt className="h-5 w-5 text-green-600" />
            {isEdit ? "Edit Receipt" : "Issue New Receipt"}
          </DrawerTitle>
          <DrawerDescription>
            {isEdit
              ? "Update the receipt details below."
              : "Fill in the payment details. A receipt number will be auto-generated."}
          </DrawerDescription>
        </DrawerHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {formContent}
        </div>
      </DrawerContent>
    </Drawer>
  )
}
