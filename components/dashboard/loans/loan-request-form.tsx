"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { siteConfig } from "@/constants/site-config"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { ApiErrorException } from "@/types/api"
import { useMyConfirmedSavings } from "@/hooks/api/use-contributions"
import { useCreateLoanMutation, useMyLoans } from "@/hooks/api/use-loans"
import { useMediaQuery } from "@/hooks/use-media-query"
import { useProfile } from "@/hooks/use-profile"
import { Alert, AlertDescription } from "@/components/ui/alert"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Loader } from "@/components/common/loader"
import { PaymentInfoSection } from "@/components/dashboard/loans/payment-info-section"

interface LoanRequestFormProps {
  onSuccess?: () => void
  formId?: string
  hideActions?: boolean
  onSubmittingChange?: (isSubmitting: boolean) => void
  submitLabel?: string
  initialValues?: Partial<LoanRequestFormValues>
  onSubmitLoan?: (payload: LoanRequestSubmitPayload) => Promise<void> | void
}

const moneyPattern = /^\d+$/
const normalizeMoneyInput = (value: string) => value.trim().replace(/,/g, "")
const formatRwf = (value: number) =>
  `${new Intl.NumberFormat("en-RW").format(value)} RWF`
const createLoanRequestSchema = (maxSavings: number) =>
  z.object({
    requestedAmount: z
      .string()
      .trim()
      .min(1, "Requested amount is required.")
      .refine((value) => moneyPattern.test(normalizeMoneyInput(value)), {
        message: "Requested amount must be a whole number in RWF.",
      })
      .refine((value) => Number(normalizeMoneyInput(value)) > 0, {
        message: "Requested amount must be greater than zero.",
      })
      .refine((value) => Number(normalizeMoneyInput(value)) <= maxSavings, {
        message: `Requested amount cannot exceed your available borrowing limit (${new Intl.NumberFormat("en-RW").format(maxSavings)} RWF).`,
      }),
    termMonths: z
      .string()
      .min(1, "Term is required.")
      .refine((value) => ["1", "2", "3", "4"].includes(value), {
        message: "Term must be 1, 2, 3, or 4 months.",
      }),
    purpose: z
      .string()
      .trim()
      .min(3, "Purpose is required.")
      .max(200, "Purpose must be 200 characters or less."),
    notes: z
      .string()
      .trim()
      .max(500, "Notes must be 500 characters or less.")
      .optional(),
  })

type LoanRequestFormValues = z.infer<ReturnType<typeof createLoanRequestSchema>>

type LoanRequestSubmitPayload = {
  requestedAmount: string
  termMonths?: number
  notes?: string
  metadata: {
    reason?: string
  }
  memberId?: string
}

const createDefaultValues = (
  initialValues?: Partial<LoanRequestFormValues>
): LoanRequestFormValues => ({
  requestedAmount: initialValues?.requestedAmount
    ? normalizeMoneyInput(initialValues.requestedAmount).replace(/\..*$/, "")
    : "",
  termMonths: initialValues?.termMonths ?? "",
  purpose: initialValues?.purpose ?? "",
  notes: initialValues?.notes ?? "",
})

const TERM_OPTIONS = [
  { value: "1", label: "1 month" },
  { value: "2", label: "2 months" },
  { value: "3", label: "3 months" },
  { value: "4", label: "4 months" },
]

export function LoanRequestForm({
  onSuccess,
  formId,
  hideActions = false,
  onSubmittingChange,
  submitLabel = "Request Loan",
  initialValues,
  onSubmitLoan,
}: LoanRequestFormProps) {
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [pendingSubmission, setPendingSubmission] =
    useState<LoanRequestSubmitPayload | null>(null)
  const [isConfirmSubmitting, setIsConfirmSubmitting] = useState(false)

  const createLoan = useCreateLoanMutation()
  const isDesktop = useMediaQuery("(min-width: 768px)")
  const { totalSavings, isPending: isSavingsPending } = useMyConfirmedSavings()
  const { data: myLoansData, isPending: isLoansPending } = useMyLoans(50)
  const { profile } = useProfile()
  const ikimina = profile?.metadata?.ikiminaProfile
  const interestRate = siteConfig.platform.loans.interestRate
  const interestRatePercent = Math.round(interestRate * 100)
  const loanPolicySummary = [
    "Loan amount cannot exceed your available savings after active loans.",
    `A flat ${interestRatePercent}% interest applies to the principal amount.`,
    "Approved loans are disbursed within 3 business days.",
    "Missing repayment for 3 consecutive months may lead to dismissal.",
  ]

  const activeLoansTotal = useMemo(() => {
    const activeStatuses = ["approved", "disbursed", "repaying", "overdue"]
    return (myLoansData?.data ?? []).reduce((sum, loan) => {
      if (!activeStatuses.includes(loan.status)) return sum
      const amount = Number.parseFloat(
        String(loan.approvedAmount || loan.requestedAmount || "0")
      )
      return sum + (Number.isNaN(amount) ? 0 : Math.floor(amount))
    }, 0)
  }, [myLoansData?.data])

  const effectiveMax = useMemo(
    () => Math.max(0, Math.floor(totalSavings - activeLoansTotal)),
    [totalSavings, activeLoansTotal]
  )

  const loanRequestSchema = useMemo(
    () => createLoanRequestSchema(effectiveMax),
    [effectiveMax]
  )

  const {
    register,
    handleSubmit,
    setError,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<LoanRequestFormValues>({
    resolver: zodResolver(loanRequestSchema),
    defaultValues: createDefaultValues(initialValues),
  })

  const isBusy =
    isSubmitting ||
    isConfirmSubmitting ||
    createLoan.isPending ||
    isSavingsPending ||
    isLoansPending

  useEffect(() => {
    onSubmittingChange?.(isBusy)
  }, [isBusy, onSubmittingChange])

  useEffect(() => {
    reset(createDefaultValues(initialValues))
  }, [initialValues, reset])

  const submitLoanRequest = async (payload: LoanRequestSubmitPayload) => {
    setSubmitError(null)

    try {
      if (onSubmitLoan) {
        await onSubmitLoan(payload)
      } else {
        await createLoan.mutateAsync(payload)
      }

      reset({
        requestedAmount: "",
        termMonths: "",
        purpose: "",
        notes: "",
      })
      setShowConfirm(false)
      setPendingSubmission(null)
      toast.success("Loan request submitted")
      onSuccess?.()
    } catch (error) {
      console.error(error)
      if (error instanceof ApiErrorException) {
        const validationErrors = error.details?.validationErrors as
          | Array<{ path: string; message: string }>
          | undefined

        validationErrors?.forEach((issue) => {
          setError(issue.path as keyof LoanRequestFormValues, {
            type: "server",
            message: issue.message,
          })
        })

        const message =
          error.help || error.message || "Unable to submit loan request"
        setSubmitError(message)
        toast.error(message)
        return
      }

      const message =
        error instanceof Error ? error.message : "Unable to submit loan request"
      setSubmitError(message)
      toast.error(message)
    }
  }

  const onPreviewSubmit = (values: LoanRequestFormValues) => {
    const payload: LoanRequestSubmitPayload = {
      requestedAmount: normalizeMoneyInput(values.requestedAmount),
      termMonths: Number.parseInt(values.termMonths, 10),
      notes: values.notes?.trim() || undefined,
      metadata: {
        reason: values.purpose.trim() || undefined,
      },
    }

    setPendingSubmission(payload)
    setShowConfirm(true)
  }

  const handleConfirmSubmit = async () => {
    if (!pendingSubmission) return

    setIsConfirmSubmitting(true)
    try {
      await submitLoanRequest(pendingSubmission)
    } finally {
      setIsConfirmSubmitting(false)
    }
  }

  const principalAmount = pendingSubmission
    ? Number.parseInt(pendingSubmission.requestedAmount, 10)
    : 0
  const interestAmount = Math.round(principalAmount * interestRate)
  const totalRepayment = principalAmount + interestAmount
  const installmentAmount = pendingSubmission?.termMonths
    ? Math.ceil(totalRepayment / pendingSubmission.termMonths)
    : null

  const confirmationContent = (
    <>
      <div className="space-y-3 text-sm">
        <div className="rounded-md border bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">Requested amount</p>
          <p className="text-base font-semibold">
            {formatRwf(principalAmount)}
          </p>
        </div>

        <div className="grid gap-2 rounded-md border p-3">
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Interest rate</span>
            <span className="font-medium">{interestRatePercent}%</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Interest amount</span>
            <span className="font-medium">{formatRwf(interestAmount)}</span>
          </div>
          <div className="flex items-center justify-between gap-4 border-t pt-2">
            <span className="font-medium">Total to repay</span>
            <span className="text-base font-semibold">
              {formatRwf(totalRepayment)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Term</span>
            <span className="font-medium">
              {pendingSubmission?.termMonths
                ? `${pendingSubmission.termMonths} month${pendingSubmission.termMonths > 1 ? "s" : ""}`
                : "Not specified"}
            </span>
          </div>
          {installmentAmount ? (
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">
                Estimated monthly payment
              </span>
              <span className="font-medium">
                {formatRwf(installmentAmount)}
              </span>
            </div>
          ) : null}
        </div>

        <div className="rounded-md border p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-foreground">
            Loan Policy Summary
          </p>
          <ul className="mt-2 space-y-1.5">
            {loanPolicySummary.map((item) => (
              <li
                key={item}
                className="flex gap-2 text-xs text-muted-foreground">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-foreground">
            Your Payout Details
          </p>
          <PaymentInfoSection ikimina={ikimina} maskAccount={false} />
          {!ikimina && (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/40">
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                Payout details missing
              </p>
              <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                The committee needs your payout details to disburse your loan.
                Please update them as soon as possible.
              </p>
              <Link
                href="/member/profile?tab=ikimina"
                className="mt-2 inline-flex items-center text-xs font-medium text-amber-800 underline underline-offset-2 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-200">
                Update payout details &rarr;
              </Link>
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Confirm to submit this loan request for committee review, or cancel to
        adjust details.
      </p>
    </>
  )

  return (
    <>
      <form
        id={formId}
        onSubmit={handleSubmit(onPreviewSubmit)}
        className="space-y-4">
        {submitError ? (
          <Alert variant="destructive">
            <AlertDescription>{submitError}</AlertDescription>
          </Alert>
        ) : null}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="requestedAmount">Requested Amount (RWF)</Label>
            <Input
              id="requestedAmount"
              inputMode="numeric"
              autoComplete="off"
              disabled={isSavingsPending || isLoansPending}
              {...register("requestedAmount")}
              placeholder="200,000..."
            />
            <p className="text-xs text-muted-foreground">
              Use whole numbers only.{" "}
              {isSavingsPending || isLoansPending ? (
                <span>Loading your savings...</span>
              ) : (
                <span className="block mt-1 font-medium text-foreground">
                  Maximum you can borrow:{" "}
                  <span
                    className={
                      effectiveMax <= 0
                        ? "text-red-600 dark:text-red-400"
                        : "text-green-600 dark:text-green-400"
                    }>
                    {new Intl.NumberFormat("en-RW").format(effectiveMax)} RWF
                  </span>
                  {activeLoansTotal > 0 && (
                    <span className="block text-xs font-normal text-muted-foreground">
                      Confirmed savings:{" "}
                      {new Intl.NumberFormat("en-RW").format(totalSavings)} RWF
                      {" · "}Active loans:{" "}
                      {new Intl.NumberFormat("en-RW").format(activeLoansTotal)}{" "}
                      RWF
                    </span>
                  )}
                </span>
              )}
            </p>
            {errors.requestedAmount?.message && (
              <p className="text-xs text-destructive" aria-live="polite">
                {errors.requestedAmount.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="termMonths">
              Term (Months) <span className="text-destructive">*</span>
            </Label>
            <Controller
              name="termMonths"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={isBusy}>
                  <SelectTrigger id="termMonths">
                    <SelectValue placeholder="Select term..." />
                  </SelectTrigger>
                  <SelectContent>
                    {TERM_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.termMonths?.message && (
              <p className="text-xs text-destructive" aria-live="polite">
                {errors.termMonths.message}
              </p>
            )}
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="purpose">Purpose</Label>
            <Input
              id="purpose"
              {...register("purpose")}
              placeholder="Emergency, personal use, business, ..."
            />
            {errors.purpose?.message && (
              <p className="text-xs text-destructive" aria-live="polite">
                {errors.purpose.message}
              </p>
            )}
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              rows={3}
              {...register("notes")}
              placeholder="Add any extra details for the committee..."
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
            {errors.notes?.message && (
              <p className="text-xs text-destructive" aria-live="polite">
                {errors.notes.message}
              </p>
            )}
          </div>
        </div>
        {!hideActions ? (
          <Button type="submit" disabled={isBusy}>
            {isBusy ? (
              <>
                <Loader className="mr-2 h-4 w-4" />
                {submitLabel}
              </>
            ) : (
              submitLabel
            )}
          </Button>
        ) : null}
      </form>

      {isDesktop ? (
        <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
          <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden p-0 md:min-w-3xl">
            <DialogHeader className="shrink-0 border-b px-6 py-4 pr-14">
              <DialogTitle>Confirm Loan Repayment</DialogTitle>
              <DialogDescription>
                Review your loan amount, {interestRatePercent}% interest, and
                repayment estimate.
              </DialogDescription>
            </DialogHeader>
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
              {confirmationContent}
            </div>
            <DialogFooter className="shrink-0 border-t px-6 py-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowConfirm(false)}
                disabled={isConfirmSubmitting || createLoan.isPending}>
                Change Mind
              </Button>
              <Button
                type="button"
                onClick={() => void handleConfirmSubmit()}
                disabled={isConfirmSubmitting || createLoan.isPending}>
                {isConfirmSubmitting || createLoan.isPending ? (
                  <>
                    <Loader className="mr-2 h-4 w-4" />
                    Submitting...
                  </>
                ) : (
                  "Confirm & Submit"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : (
        <Drawer open={showConfirm} onOpenChange={setShowConfirm}>
          <DrawerContent className="flex max-h-[88vh] flex-col">
            <DrawerHeader className="shrink-0 text-left">
              <DrawerTitle>Confirm Loan Repayment</DrawerTitle>
              <DrawerDescription>
                Review your loan amount, {interestRatePercent}% interest, and
                repayment estimate.
              </DrawerDescription>
            </DrawerHeader>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-2">
              {confirmationContent}
            </div>
            <DrawerFooter className="shrink-0 border-t bg-background pb-6">
              <Button
                type="button"
                onClick={() => void handleConfirmSubmit()}
                disabled={isConfirmSubmitting || createLoan.isPending}>
                {isConfirmSubmitting || createLoan.isPending ? (
                  <>
                    <Loader className="mr-2 h-4 w-4" />
                    Submitting...
                  </>
                ) : (
                  "Confirm & Submit"
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowConfirm(false)}
                disabled={isConfirmSubmitting || createLoan.isPending}>
                Change Mind
              </Button>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      )}
    </>
  )
}
