"use client"

import { useEffect, useState } from "react"
import { normalizeRoleValue } from "@/utils/role-utils"
import { AlertCircle, Plus } from "lucide-react"
import { toast } from "sonner"
import { z } from "zod"

import { organizationClient } from "@/lib/organization-client"
import { useCreatePenaltyMutation } from "@/hooks/api/use-penalties"
import { useMediaQuery } from "@/hooks/use-media-query"
import { Alert, AlertDescription } from "@/components/ui/alert"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { Loader } from "@/components/common/loader"
import { MemberAvatar } from "@/components/common/member-avatar"

type MemberOption = {
  id: string
  name: string
  email: string
  image?: string | null
}

const periodOptions = [
  { value: "2026-01", label: "January 2026" },
  { value: "2026-02", label: "February 2026" },
  { value: "2026-03", label: "March 2026" },
  { value: "2026-04", label: "April 2026" },
  { value: "2026-05", label: "May 2026" },
  { value: "2026-06", label: "June 2026" },
  { value: "2026-07", label: "July 2026" },
  { value: "2026-08", label: "August 2026" },
  { value: "2026-09", label: "September 2026" },
  { value: "2026-10", label: "October 2026" },
  { value: "2026-11", label: "November 2026" },
  { value: "2026-12", label: "December 2026" },
] as const

const schema = z.object({
  memberId: z.string().min(1, "Select a member"),
  period: z.string().min(1, "Select a period"),
  amount: z
    .string()
    .min(1, "Amount is required")
    .refine((v) => /^\d+$/.test(v.trim().replace(/,/g, "")), {
      message: "Enter a whole number in RWF",
    })
    .refine((v) => Number(v.trim().replace(/,/g, "")) > 0, {
      message: "Amount must be greater than zero",
    }),
  reason: z.string().optional(),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof schema>
type FormErrors = Partial<Record<keyof FormValues, string>>

function hasStrictMemberRole(rawRole: unknown): boolean {
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

export function IssuePenaltyDialog() {
  const isDesktop = useMediaQuery("(min-width: 768px)")
  const [open, setOpen] = useState(false)
  const [members, setMembers] = useState<MemberOption[]>([])
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [memberError, setMemberError] = useState<string | null>(null)

  const [form, setForm] = useState<FormValues>({
    memberId: "",
    period: "2026-04",
    amount: "",
    reason: "",
    notes: "",
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)

  const createMutation = useCreatePenaltyMutation()

  useEffect(() => {
    if (!open) return
    let active = true
    setLoadingMembers(true)
    setMemberError(null)
    organizationClient
      .listMembers({
        query: {
          limit: 500,
          offset: 0,
          role: "member",
        },
      })
      .then(({ data, error }: any) => {
        if (!active) return
        if (error) {
          throw new Error(error.message || "Failed to load members")
        }
        const seen = new Map<string, MemberOption>()
        ;(data?.members ?? []).forEach((membership: any) => {
          if (!hasStrictMemberRole(membership?.role)) return

          const id = membership?.user?.id ?? membership?.userId ?? ""
          if (!id || seen.has(id)) return
          seen.set(id, {
            id,
            name:
              membership?.user?.name ?? membership?.name ?? "Unnamed member",
            email: membership?.user?.email ?? membership?.email ?? "",
            image: membership?.user?.image ?? null,
          })
        })

        const memberOptions = [...seen.values()].sort((a, b) =>
          a.name.localeCompare(b.name)
        )
        setMembers(memberOptions)
      })
      .catch((error) => {
        if (!active) return
        console.error(error)
        setMemberError("Unable to load members. Please try again.")
        setMembers([])
      })
      .finally(() => {
        if (active) setLoadingMembers(false)
      })
    return () => {
      active = false
    }
  }, [open])

  function set<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError(null)

    const result = schema.safeParse({
      ...form,
      amount: form.amount.trim().replace(/,/g, ""),
    })
    if (!result.success) {
      const fieldErrors: FormErrors = {}
      result.error.issues.forEach((issue) => {
        const key = issue.path[0] as keyof FormValues
        if (key) fieldErrors[key] = issue.message
      })
      setErrors(fieldErrors)
      return
    }

    const selectedMember = members.find((m) => m.id === result.data.memberId)

    await createMutation.mutateAsync(
      {
        memberId: result.data.memberId,
        period: result.data.period,
        amount: result.data.amount,
        reason:
          result.data.reason?.trim() ||
          `Manual penalty issued for period ${result.data.period} - ${selectedMember?.name ?? "member"}`,
        notes: result.data.notes?.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Penalty issued successfully.")
          setOpen(false)
          setForm({
            memberId: "",
            period: "2026-04",
            amount: "",
            reason: "",
            notes: "",
          })
          setErrors({})
        },
        onError: (err) => {
          setSubmitError(err.message || "Failed to issue penalty.")
        },
      }
    )
  }

  const selectedMember = members.find((m) => m.id === form.memberId)
  const amountNum = Number(form.amount.trim().replace(/,/g, ""))

  const formBody = (
    <form id="ip-submit" onSubmit={(e) => void handleSubmit(e)}>
      <div className="space-y-4 px-6 py-5">
        {submitError && (
          <Alert variant="destructive">
            <AlertDescription>{submitError}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="ip-member">Member</Label>
          {memberError ? (
            <p className="text-xs text-destructive">{memberError}</p>
          ) : (
            <Select
              value={form.memberId}
              onValueChange={(v) => set("memberId", v)}
              disabled={loadingMembers || members.length === 0}>
              <SelectTrigger id="ip-member" className="w-full">
                <SelectValue
                  placeholder={
                    loadingMembers
                      ? "Loading members…"
                      : members.length === 0
                        ? "No members available"
                        : "Select member"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {members.length > 0 ? (
                  members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      <div className="flex min-w-0 items-center gap-2">
                        <MemberAvatar
                          name={m.name}
                          email={m.email}
                          image={m.image}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {m.name}
                          </p>
                          {/* <p className="truncate text-xs text-muted-foreground">
                            {m.email}
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
          {errors.memberId && (
            <p className="text-xs text-destructive">{errors.memberId}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ip-period">Period</Label>
          <Select value={form.period} onValueChange={(v) => set("period", v)}>
            <SelectTrigger id="ip-period" className="w-full">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              {periodOptions.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.period && (
            <p className="text-xs text-destructive">{errors.period}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ip-amount">Penalty Amount (RWF)</Label>
          <Input
            id="ip-amount"
            inputMode="numeric"
            placeholder="e.g. 8,000"
            value={form.amount}
            onChange={(e) => set("amount", e.target.value)}
            className="font-mono"
          />
          {errors.amount && (
            <p className="text-xs text-destructive">{errors.amount}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ip-reason">
            Reason{" "}
            <span className="font-normal text-muted-foreground">
              (optional)
            </span>
          </Label>
          <Textarea
            id="ip-reason"
            rows={2}
            placeholder="e.g. Late contribution for March 2026…"
            value={form.reason}
            onChange={(e) => set("reason", e.target.value)}
            className="resize-none text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ip-notes">
            Notes{" "}
            <span className="font-normal text-muted-foreground">
              (optional)
            </span>
          </Label>
          <Textarea
            id="ip-notes"
            rows={2}
            placeholder="Any additional details…"
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            className="resize-none text-sm"
          />
        </div>

        {selectedMember && amountNum > 0 && (
          <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm">
            <p className="mb-1 text-xs text-muted-foreground">Preview</p>
            <p>
              <span className="font-medium">{selectedMember.name}</span>
              {" will be charged "}
              <span className="font-bold tabular-nums text-rose-600">
                {new Intl.NumberFormat("en-RW").format(amountNum)}&nbsp;RWF
              </span>
              {" for period "}
              <span className="font-medium">{form.period}</span>.
            </p>
          </div>
        )}
      </div>
    </form>
  )

  const submitButton = (
    <Button
      type="submit"
      form="ip-submit"
      variant="destructive"
      disabled={createMutation.isPending}>
      {createMutation.isPending ? (
        <>
          <Loader className="mr-2 h-4 w-4" />
          Issuing…
        </>
      ) : (
        "Issue Penalty"
      )}
    </Button>
  )

  const trigger = (
    <Button size="sm" className="gap-1.5">
      <Plus className="h-4 w-4" />
      Issue Penalty
    </Button>
  )

  if (isDesktop) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>{trigger}</SheetTrigger>
        <SheetContent className="flex h-full w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
          <SheetHeader className="shrink-0 border-b border-rose-200 bg-rose-50 px-6 py-4 text-left dark:border-rose-800 dark:bg-rose-950/30">
            <SheetTitle className="text-base font-semibold text-rose-900 dark:text-rose-200">
              Issue Penalty
            </SheetTitle>
            <SheetDescription className="mt-0.5 text-xs text-rose-700/80 dark:text-rose-400/80">
              Issue a standalone penalty directly to a member.
            </SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto">{formBody}</div>
          <div className="shrink-0 border-t px-6 py-4">
            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={createMutation.isPending}>
                Cancel
              </Button>
              {submitButton}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>{trigger}</DrawerTrigger>
      <DrawerContent className="flex max-h-[92vh] flex-col overflow-hidden p-0">
        <DrawerHeader className="shrink-0 border-b border-rose-200 bg-rose-50 px-6 py-4 text-left dark:border-rose-800 dark:bg-rose-950/30">
          <DrawerTitle className="text-base font-semibold text-rose-900 dark:text-rose-200">
            Issue Penalty
          </DrawerTitle>
          <DrawerDescription className="mt-0.5 text-xs text-rose-700/80 dark:text-rose-400/80">
            Issue a standalone penalty directly to a member.
          </DrawerDescription>
        </DrawerHeader>
        <div className="min-h-0 flex-1 overflow-y-auto">{formBody}</div>
        <DrawerFooter className="shrink-0 border-t bg-background px-6 py-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          <DrawerClose asChild>
            <Button
              type="button"
              variant="outline"
              disabled={createMutation.isPending}>
              Cancel
            </Button>
          </DrawerClose>
          {submitButton}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
