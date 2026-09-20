"use client"

import { useEffect, useMemo, useState } from "react"
import { siteConfig } from "@/constants/site-config"
import { isMemberOrLeadershipRole } from "@/utils/role-utils"
import { zodResolver } from "@hookform/resolvers/zod"
import { addMonths, format, subMonths } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { ApiErrorException } from "@/types/api"
import { organizationClient } from "@/lib/organization-client"
import { cn } from "@/lib/utils"
import {
  useContributions,
  useCreateContributionMutation,
} from "@/hooks/api/use-contributions"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import MultipleSelector, { type Option } from "@/components/ui/multiselect"
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
import { Textarea } from "@/components/ui/textarea"
import { Loader } from "@/components/common/loader"
import { MemberAvatar } from "@/components/common/member-avatar"
import { FileUploadComponent } from "@/components/file-upload-component"

interface RecordContributionFormProps {
  onSuccess?: () => void
  formId?: string
  hideActions?: boolean
  onSubmittingChange?: (isSubmitting: boolean) => void
}

const currentPeriod = format(new Date(), "yyyy-MM")
const contributionPeriodOptions: Option[] = Array.from(
  { length: 24 },
  (_, index) => {
    const date = new Date(2026, 8 + index, 1)
    return { value: format(date, "yyyy-MM"), label: format(date, "MMMM yyyy") }
  }
)

const moneyPattern = /^\d+$/
const normalizeMoneyInput = (value: string) => value.trim().replace(/,/g, "")

const recordContributionSchema = z
  .object({
    memberId: z.string().trim().min(1, "Member selection is required."),
    amount: z
      .string()
      .trim()
      .min(1, "Amount is required.")
      .refine((value) => moneyPattern.test(normalizeMoneyInput(value)), {
        message: "Amount must be a whole number in RWF.",
      })
      .refine((value) => Number(normalizeMoneyInput(value)) > 0, {
        message: "Amount must be greater than zero.",
      }),
    periods: z.array(z.string()).min(1, "Select at least one unpaid period."),
    receiptNumber: z.string().optional(),
    penaltyAmount: z
      .string()
      .optional()
      .refine(
        (value) => {
          const normalized = normalizeMoneyInput(value ?? "")
          return normalized === "" || moneyPattern.test(normalized)
        },
        {
          message: "Penalty must be a whole number in RWF.",
        }
      )
      .refine(
        (value) => {
          const normalized = normalizeMoneyInput(value ?? "")
          return normalized === "" || Number(normalized) >= 0
        },
        {
          message: "Penalty cannot be negative.",
        }
      ),
    paidAt: z.string().optional(),
    notes: z.string().optional(),
    paymentMethod: z.enum(["cash", "momo", "bank"]),
    status: z.enum(["pending", "confirmed", "late", "waived"]),
  })
  .superRefine((values, ctx) => {
    if (["confirmed", "late"].includes(values.status) && !values.paidAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["paidAt"],
        message: "Paid date is required for confirmed or late contributions.",
      })
    }

    if (values.status === "late") {
      const penalty = values.penaltyAmount
        ? Number(normalizeMoneyInput(values.penaltyAmount))
        : 0
      if (
        !values.penaltyAmount?.trim() ||
        Number.isNaN(penalty) ||
        penalty <= 0
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["penaltyAmount"],
          message: "Late contributions require a penalty greater than zero.",
        })
      }
    }
  })

type RecordContributionFormValues = z.infer<typeof recordContributionSchema>

const statusOptions = [
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "late", label: "Late" },
  { value: "waived", label: "Waived" },
]

const paymentMethodOptions = [
  { value: "cash", label: "Cash" },
  { value: "momo", label: "Mobile Money" },
  { value: "bank", label: "Bank Transfer" },
]

type MemberOption = {
  id: string
  name: string
  email: string
  image?: string | null
}

type ContributionAttachment = {
  id: string
  name: string
  url: string
  signedUrl?: string
  size: number
  type: string
  key?: string
  dbId?: string
  storageProvider?: string
  publicId?: string
  width?: number
  height?: number
  format?: string
  thumbnailUrl?: string
  mediumUrl?: string
}

const hasStrictMemberRole = (rawRole: unknown): boolean => {
  if (Array.isArray(rawRole)) {
    return rawRole.some((value) => isMemberOrLeadershipRole(String(value)))
  }

  if (typeof rawRole === "string") {
    return isMemberOrLeadershipRole(rawRole)
  }

  return false
}

export function RecordContributionForm({
  onSuccess,
  formId,
  hideActions = false,
  onSubmittingChange,
}: RecordContributionFormProps) {
  const [isUploadingAttachments, setIsUploadingAttachments] = useState(false)
  const [members, setMembers] = useState<MemberOption[]>([])
  const [isLoadingMembers, setIsLoadingMembers] = useState(true)
  const [memberLoadError, setMemberLoadError] = useState<string | null>(null)
  const [attachmentUploadKey, setAttachmentUploadKey] = useState(0)
  const [attachments, setAttachments] = useState<ContributionAttachment[]>([])
  const [submitError, setSubmitError] = useState<string | null>(null)
  const createContribution = useCreateContributionMutation()

  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RecordContributionFormValues>({
    resolver: zodResolver(recordContributionSchema),
    defaultValues: {
      memberId: "",
      amount: String(siteConfig.platform.savings.monthlyContributionRwf),
      periods: [currentPeriod],
      receiptNumber: "",
      penaltyAmount: "",
      paidAt: "",
      notes: "",
      paymentMethod: "bank",
      status: "pending",
    },
  })

  const selectedMemberId = watch("memberId")
  const selectedPeriods = watch("periods") ?? []
  const {
    data: memberContributionData,
    isPending: isLoadingMemberContributions,
  } = useContributions({
    memberId: selectedMemberId,
    limit: 1000,
    enabled: Boolean(selectedMemberId),
  })
  const existingPeriods = useMemo(
    () =>
      new Set((memberContributionData?.data ?? []).map((item) => item.period)),
    [memberContributionData?.data]
  )
  const periodOptions = useMemo(
    () =>
      contributionPeriodOptions.map((option) => ({
        ...option,
        disable: existingPeriods.has(option.value),
      })),
    [existingPeriods]
  )
  const monthlyAmount = Number(normalizeMoneyInput(watch("amount") || "0")) || 0
  const totalAmount = monthlyAmount * selectedPeriods.length

  useEffect(() => {
    onSubmittingChange?.(
      isSubmitting || isUploadingAttachments || createContribution.isPending
    )
  }, [
    isSubmitting,
    isUploadingAttachments,
    createContribution.isPending,
    onSubmittingChange,
  ])

  useEffect(() => {
    let isActive = true

    const fetchMembers = async () => {
      setIsLoadingMembers(true)
      setMemberLoadError(null)

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

        const mapById = new Map<string, MemberOption>()

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
              name: membership?.user?.name ?? "Unnamed member",
              email: membership?.user?.email ?? "",
              image: membership?.user?.image ?? null,
            })
          }
        })

        const memberOptions = [...mapById.values()]

        memberOptions.sort((a, b) => a.name.localeCompare(b.name))

        if (isActive) {
          setMembers(memberOptions)
        }
      } catch (error) {
        console.error(error)
        if (isActive) {
          setMemberLoadError("Unable to load members. Please try again.")
          setMembers([])
        }
      } finally {
        if (isActive) {
          setIsLoadingMembers(false)
        }
      }
    }

    void fetchMembers()

    return () => {
      isActive = false
    }
  }, [])

  const onSubmit = async (values: RecordContributionFormValues) => {
    setSubmitError(null)

    try {
      await createContribution.mutateAsync({
        memberId: values.memberId.trim(),
        amount: normalizeMoneyInput(values.amount),
        periods: values.periods,
        status: values.status,
        receiptNumber: values.receiptNumber?.trim() || undefined,
        penaltyAmount: values.penaltyAmount?.trim()
          ? normalizeMoneyInput(values.penaltyAmount)
          : undefined,
        paidAt: values.paidAt
          ? new Date(values.paidAt).toISOString()
          : undefined,
        notes: values.notes?.trim() || undefined,
        metadata: {
          paymentMethod: values.paymentMethod,
          attachments,
        },
      })

      reset({
        memberId: "",
        amount: String(siteConfig.platform.savings.monthlyContributionRwf),
        periods: [currentPeriod],
        receiptNumber: "",
        penaltyAmount: "",
        paidAt: "",
        notes: "",
        paymentMethod: "cash",
        status: "pending",
      })
      setAttachments([])
      setAttachmentUploadKey((prev) => prev + 1)
      toast.success("Contribution recorded successfully")
      onSuccess?.()
    } catch (error) {
      console.error(error)
      if (error instanceof ApiErrorException) {
        const validationErrors = error.details?.validationErrors as
          | Array<{ path: string; message: string }>
          | undefined

        validationErrors?.forEach((issue) => {
          setError(issue.path as any, {
            type: "server",
            message: issue.message,
          })
        })

        const message =
          error.help || error.message || "Unable to record contribution"
        setSubmitError(message)
        toast.error(message)
        return
      }

      const message =
        error instanceof Error ? error.message : "Unable to record contribution"
      setSubmitError(message)
      toast.error(message)
    }
  }

  return (
    <form id={formId} onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {submitError && (
        <Alert variant="destructive">
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="memberId">Member</Label>
          <Controller
            control={control}
            name="memberId"
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={(value) => field.onChange(value)}
                disabled={isLoadingMembers || members.length === 0}>
                <SelectTrigger
                  id="memberId"
                  aria-invalid={Boolean(errors.memberId)}>
                  <SelectValue
                    placeholder={
                      isLoadingMembers
                        ? "Loading members..."
                        : members.length === 0
                          ? "No members available"
                          : "Select a member"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {members.length > 0 ? (
                    members.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        <div className="flex min-w-0 items-center gap-2">
                          <MemberAvatar
                            name={member.name}
                            email={member.email}
                            image={member.image}
                            size="sm"
                          />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {member.name}
                            </p>
                            {/* <p className="truncate text-xs text-muted-foreground">
                              {member.email}
                            </p> */}
                          </div>
                        </div>
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="__no_members" disabled>
                      No members found
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            )}
          />
          <p className="text-xs text-muted-foreground">
            Select the member who made the contribution
          </p>
          {memberLoadError && (
            <p className="text-xs text-destructive" aria-live="polite">
              {memberLoadError}
            </p>
          )}
          {errors.memberId?.message && (
            <p className="text-xs text-destructive" aria-live="polite">
              {errors.memberId.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="amount">Monthly Amount (RWF)</Label>
          <Input
            id="amount"
            inputMode="numeric"
            autoComplete="off"
            {...register("amount")}
            placeholder="100,000..."
          />
          <p className="text-xs text-muted-foreground">
            Use whole numbers only.
          </p>
          {errors.amount?.message && (
            <p className="text-xs text-destructive" aria-live="polite">
              {errors.amount.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="periods">Contribution Periods</Label>
          <Controller
            control={control}
            name="periods"
            render={({ field }) => (
              <MultipleSelector
                value={periodOptions.filter((option) =>
                  field.value.includes(option.value)
                )}
                options={periodOptions}
                onChange={(options: Option[]) =>
                  field.onChange(options.map((option) => option.value))
                }
                disabled={!selectedMemberId || isLoadingMemberContributions}
                placeholder={
                  !selectedMemberId
                    ? "Select a member first"
                    : isLoadingMemberContributions
                      ? "Loading unpaid periods..."
                      : "Select unpaid periods"
                }
                hidePlaceholderWhenSelected
                emptyIndicator="No unpaid periods available"
              />
            )}
          />
          <p className="text-xs text-muted-foreground">
            Already recorded periods are unavailable.
          </p>
          {errors.periods?.message && (
            <p className="text-xs text-destructive" aria-live="polite">
              {errors.periods.message}
            </p>
          )}
        </div>

        <div className="rounded-md border bg-muted/30 p-3 md:col-span-2">
          <div className="grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <p className="text-muted-foreground">Monthly contribution</p>
              <p className="font-semibold tabular-nums">
                {new Intl.NumberFormat("en-RW").format(monthlyAmount)} RWF
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Selected periods</p>
              <p className="font-semibold">{selectedPeriods.length}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Total amount</p>
              <p className="font-semibold tabular-nums">
                {new Intl.NumberFormat("en-RW").format(totalAmount)} RWF
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="paidAt">Paid Date</Label>
          <Controller
            control={control}
            name="paidAt"
            render={({ field }) => {
              const selectedDate = field.value
                ? new Date(`${field.value}T00:00:00`)
                : undefined

              return (
                <div className="space-y-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value
                          ? format(selectedDate ?? new Date(), "PPP")
                          : "Select payment date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) =>
                          field.onChange(date ? format(date, "yyyy-MM-dd") : "")
                        }
                        captionLayout="dropdown"
                        fromYear={2025}
                        toYear={2027}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  {field.value ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => field.onChange("")}>
                      Clear date
                    </Button>
                  ) : null}
                </div>
              )
            }}
          />
          {errors.paidAt?.message && (
            <p className="text-xs text-destructive" aria-live="polite">
              {errors.paidAt.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="receiptNumber">Receipt Number</Label>
          <Input
            id="receiptNumber"
            autoComplete="off"
            {...register("receiptNumber")}
            placeholder="TL-0001..."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="penaltyAmount">Penalty Amount (Optional)</Label>
          <Input
            id="penaltyAmount"
            inputMode="numeric"
            autoComplete="off"
            {...register("penaltyAmount")}
            placeholder="0..."
          />
          <p className="text-xs text-muted-foreground">
            Required when status is Late.
          </p>
          {errors.penaltyAmount?.message && (
            <p className="text-xs text-destructive" aria-live="polite">
              {errors.penaltyAmount.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Payment Method</Label>
          <Controller
            control={control}
            name="paymentMethod"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethodOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.paymentMethod?.message && (
            <p className="text-xs text-destructive" aria-live="polite">
              {errors.paymentMethod.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Status</Label>
          <Controller
            control={control}
            name="status"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.status?.message && (
            <p className="text-xs text-destructive" aria-live="polite">
              {errors.status.message}
            </p>
          )}
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            {...register("notes")}
            placeholder="Add any clarification for the contribution..."
            rows={3}
            onKeyDown={(event) => {
              if (
                (event.metaKey || event.ctrlKey) &&
                event.key.toLowerCase() === "enter"
              ) {
                event.preventDefault()
                event.currentTarget.form?.requestSubmit()
              }
            }}
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label>Attachments (Optional)</Label>
          <FileUploadComponent
            key={attachmentUploadKey}
            category="contribution-receipt"
            acceptedTypes="all"
            maxFiles={5}
            multiple
            onUploadingChange={setIsUploadingAttachments}
            onUploadComplete={(uploadedFiles) => {
              setAttachments((prev) => {
                const next = [...prev]
                uploadedFiles.forEach((file) => {
                  if (!next.some((existing) => existing.id === file.id)) {
                    next.push(file)
                  }
                })
                return next
              })
            }}
          />
          <p className="text-xs text-muted-foreground">
            Upload receipt images, bank transfer proof, or related documents.
          </p>
        </div>
      </div>

      {!hideActions && (
        <Button
          type="submit"
          disabled={
            isSubmitting ||
            isUploadingAttachments ||
            createContribution.isPending
          }>
          {isSubmitting ||
          isUploadingAttachments ||
          createContribution.isPending ? (
            <>
              <Loader className="mr-2 h-4 w-4" />
              {isUploadingAttachments
                ? "Uploading attachments..."
                : "Recording..."}
            </>
          ) : (
            "Record Contribution"
          )}
        </Button>
      )}
    </form>
  )
}
