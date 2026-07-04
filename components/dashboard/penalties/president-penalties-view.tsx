"use client"

import { useMemo, useState, type ReactNode } from "react"
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronsUpDown,
  ChevronUp,
  CircleDollarSign,
  Eye,
  Link2,
  MoreVertical,
  Pencil,
  RefreshCcw,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  Users,
  X,
} from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import {
  useDeletePenaltyMutation,
  usePenalties,
  useUpdatePenaltyMutation,
  type PenaltyEnriched,
} from "@/hooks/api/use-penalties"
import { useMediaQuery } from "@/hooks/use-media-query"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsList, TabsTab } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Loader } from "@/components/common/loader"

import { IssuePenaltyDialog } from "./issue-penalty-dialog"

function formatRwf(amount?: string | number | null) {
  if (amount === null || amount === undefined || amount === "") return "-"
  const value =
    typeof amount === "number" ? amount : Number.parseFloat(String(amount))
  if (Number.isNaN(value)) return "-"
  return `${new Intl.NumberFormat("en-RW").format(value)} RWF`
}

function formatDate(value?: string | Date | null) {
  if (!value) return "-"
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleDateString("en-RW", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

type SortField = "memberName" | "period" | "amount" | "waivedAt" | "createdAt"
type SortDir = "asc" | "desc"

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) {
    return (
      <ChevronsUpDown className="ml-1 inline h-3.5 w-3.5 text-muted-foreground/50" />
    )
  }
  return dir === "asc" ? (
    <ChevronUp className="ml-1 inline h-3.5 w-3.5 text-foreground" />
  ) : (
    <ChevronDown className="ml-1 inline h-3.5 w-3.5 text-foreground" />
  )
}

function StatCard({
  title,
  value,
  sub,
  icon,
  loading,
  highlight,
}: {
  title: string
  value: ReactNode
  sub: string
  icon: ReactNode
  loading: boolean
  highlight?: boolean
}) {
  return (
    <Card className={highlight ? "border-rose-200 dark:border-rose-800" : ""}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {loading ? (
          <>
            <Skeleton className="h-8 w-32" />
            <Skeleton className="mt-2 h-3 w-24" />
          </>
        ) : (
          <>
            <div className="text-2xl font-semibold tabular-nums">{value}</div>
            <p className="text-xs text-muted-foreground">{sub}</p>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function DetailField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="space-y-1 rounded-lg border bg-muted/40 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="text-sm font-medium wrap-break-word">{value}</div>
    </div>
  )
}

function ResponsiveOverlay({
  open,
  onOpenChange,
  title,
  description,
  header,
  footer,
  children,
  desktopWidthClassName,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  header?: ReactNode
  footer?: ReactNode
  children: ReactNode
  desktopWidthClassName?: string
}) {
  const isDesktop = useMediaQuery("(min-width: 768px)")

  if (isDesktop) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          className={cn(
            "flex h-full w-full flex-col overflow-hidden p-0",
            desktopWidthClassName ?? "sm:max-w-md"
          )}>
          {header ? (
            <div className="shrink-0">{header}</div>
          ) : (
            <SheetHeader className="shrink-0 border-b px-6 pt-6 pb-4 text-left">
              <SheetTitle>{title}</SheetTitle>
              <SheetDescription>{description}</SheetDescription>
            </SheetHeader>
          )}
          <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
          {footer ? (
            <div className="shrink-0 border-t px-6 py-4">{footer}</div>
          ) : null}
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="flex max-h-[92vh] flex-col overflow-hidden p-0">
        {header ? (
          <div className="shrink-0">{header}</div>
        ) : (
          <DrawerHeader className="shrink-0 text-left">
            <DrawerTitle>{title}</DrawerTitle>
            <DrawerDescription>{description}</DrawerDescription>
          </DrawerHeader>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        {footer ? (
          <DrawerFooter className="shrink-0 border-t bg-background px-6 py-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
            {footer}
          </DrawerFooter>
        ) : null}
      </DrawerContent>
    </Drawer>
  )
}

export function PresidentPenaltiesView() {
  const { data, isPending, error, refetch, isRefetching } = usePenalties({
    limit: 500,
  })
  const updateMutation = useUpdatePenaltyMutation()
  const deleteMutation = useDeletePenaltyMutation()

  const [statusTab, setStatusTab] = useState<"all" | "active" | "waived">("all")
  const [filterMember, setFilterMember] = useState("")
  const [filterPeriod, setFilterPeriod] = useState("")
  const [sortField, setSortField] = useState<SortField>("createdAt")
  const [sortDir, setSortDir] = useState<SortDir>("desc")

  const [detailsTarget, setDetailsTarget] = useState<PenaltyEnriched | null>(
    null
  )
  const [waiverTarget, setWaiverTarget] = useState<PenaltyEnriched | null>(null)
  const [waiverReason, setWaiverReason] = useState("")
  const [waiverConfirmed, setWaiverConfirmed] = useState(false)
  const [editTarget, setEditTarget] = useState<PenaltyEnriched | null>(null)
  const [editAmount, setEditAmount] = useState("")
  const [editReason, setEditReason] = useState("")
  const [editNotes, setEditNotes] = useState("")
  const [deleteTarget, setDeleteTarget] = useState<PenaltyEnriched | null>(null)

  const allPenalties = useMemo(() => data?.data ?? [], [data?.data])
  const activePenalties = useMemo(
    () => allPenalties.filter((p) => p.status === "active"),
    [allPenalties]
  )
  const waivedPenalties = useMemo(
    () => allPenalties.filter((p) => p.status === "waived"),
    [allPenalties]
  )

  const totalOwed = useMemo(
    () =>
      activePenalties.reduce(
        (sum, p) => sum + (Number.parseFloat(String(p.amount ?? "0")) || 0),
        0
      ),
    [activePenalties]
  )
  const totalWaived = useMemo(
    () =>
      waivedPenalties.reduce(
        (sum, p) => sum + (Number.parseFloat(String(p.amount ?? "0")) || 0),
        0
      ),
    [waivedPenalties]
  )
  const uniqueMembers = useMemo(
    () => new Set(activePenalties.map((p) => p.memberId)).size,
    [activePenalties]
  )

  const memberBreakdown = useMemo(() => {
    const map = new Map<
      string,
      { name: string; count: number; total: number }
    >()
    for (const p of activePenalties) {
      const v = Number.parseFloat(String(p.amount ?? "0")) || 0
      const existing = map.get(p.memberId)
      if (existing) {
        existing.count++
        existing.total += v
      } else {
        map.set(p.memberId, {
          name: p.memberName ?? p.memberId,
          count: 1,
          total: v,
        })
      }
    }
    return [...map.values()].sort((a, b) => b.total - a.total)
  }, [activePenalties])

  const maxMemberTotal = memberBreakdown[0]?.total ?? 1

  const filtered = useMemo(() => {
    const source =
      statusTab === "active"
        ? activePenalties
        : statusTab === "waived"
          ? waivedPenalties
          : allPenalties

    return [...source]
      .filter((p) => {
        if (
          filterMember &&
          !(p.memberName ?? "")
            .toLowerCase()
            .includes(filterMember.toLowerCase())
        ) {
          return false
        }
        if (filterPeriod && !(p.period ?? "").includes(filterPeriod)) {
          return false
        }
        return true
      })
      .sort((a, b) => {
        let left: string | number = ""
        let right: string | number = ""

        if (sortField === "memberName") {
          left = (a.memberName ?? "").toLowerCase()
          right = (b.memberName ?? "").toLowerCase()
        } else if (sortField === "period") {
          left = a.period ?? ""
          right = b.period ?? ""
        } else if (sortField === "amount") {
          left = Number.parseFloat(String(a.amount ?? "0")) || 0
          right = Number.parseFloat(String(b.amount ?? "0")) || 0
        } else if (sortField === "waivedAt") {
          left = a.waivedAt ? new Date(a.waivedAt).getTime() : 0
          right = b.waivedAt ? new Date(b.waivedAt).getTime() : 0
        } else {
          left = new Date(a.createdAt).getTime()
          right = new Date(b.createdAt).getTime()
        }

        if (left < right) return sortDir === "asc" ? -1 : 1
        if (left > right) return sortDir === "asc" ? 1 : -1
        return 0
      })
  }, [
    allPenalties,
    activePenalties,
    waivedPenalties,
    filterMember,
    filterPeriod,
    statusTab,
    sortField,
    sortDir,
  ])

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((v) => (v === "asc" ? "desc" : "asc"))
      return
    }
    setSortField(field)
    setSortDir("asc")
  }

  function openDetails(penalty: PenaltyEnriched) {
    setDetailsTarget(penalty)
  }

  function openWaiver(penalty: PenaltyEnriched) {
    setWaiverTarget(penalty)
    setWaiverReason("")
    setWaiverConfirmed(false)
  }

  function openEdit(penalty: PenaltyEnriched) {
    setEditTarget(penalty)
    setEditAmount(String(penalty.amount ?? ""))
    setEditReason(penalty.reason ?? "")
    setEditNotes(penalty.notes ?? "")
  }

  function openDelete(penalty: PenaltyEnriched) {
    setDeleteTarget(penalty)
  }

  async function handleWaive() {
    if (!waiverTarget) return
    await updateMutation.mutateAsync(
      {
        id: waiverTarget.id,
        status: "waived",
        waivedReason: waiverReason.trim() || "Waived by president",
      },
      {
        onSuccess: () => {
          toast.success("Penalty waived.")
          setWaiverTarget(null)
        },
        onError: (err) => {
          toast.error(err.message || "Failed to waive penalty.")
        },
      }
    )
  }

  async function handleUndoWaiver(penalty: PenaltyEnriched) {
    await updateMutation.mutateAsync(
      { id: penalty.id, status: "active" },
      {
        onSuccess: () => {
          toast.success("Waiver reversed — penalty is active again.")
        },
        onError: (err) => {
          toast.error(err.message || "Failed to update penalty.")
        },
      }
    )
  }

  async function handleEditPenalty() {
    if (!editTarget) return
    const parsedAmount = Number.parseFloat(editAmount.trim().replace(/,/g, ""))
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error("Enter a valid positive amount.")
      return
    }
    await updateMutation.mutateAsync(
      {
        id: editTarget.id,
        amount: String(Math.round(parsedAmount)),
        reason: editReason.trim() || undefined,
        notes: editNotes.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Penalty updated.")
          setEditTarget(null)
        },
        onError: (err) => {
          toast.error(err.message || "Failed to update penalty.")
        },
      }
    )
  }

  async function handleDeletePenalty() {
    if (!deleteTarget) return
    await deleteMutation.mutateAsync(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Penalty deleted.")
        setDeleteTarget(null)
        if (detailsTarget?.id === deleteTarget.id) setDetailsTarget(null)
        if (editTarget?.id === deleteTarget.id) setEditTarget(null)
      },
      onError: (err) => {
        toast.error(err.message || "Failed to delete penalty.")
      },
    })
  }

  const editCurrent = editTarget
    ? Number.parseFloat(String(editTarget.amount ?? "0")) || 0
    : 0
  const editNew = Number.parseFloat(editAmount.trim().replace(/,/g, "")) || 0
  const contributionAmount = editTarget
    ? Number.parseFloat(String(editTarget.contributionAmount ?? "0")) || 0
    : 0
  const suggestedTenPercent = Math.round(contributionAmount * 0.1)

  // ── Overlay headers / bodies / footers ──

  const detailsHeader = detailsTarget ? (
    <div className="flex items-center gap-3 border-b border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-950/30">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-900/50">
        <Eye className="h-5 w-5 text-slate-600 dark:text-slate-400" />
      </div>
      <div>
        <p className="text-base font-semibold text-slate-900 dark:text-slate-200">
          Penalty Details
        </p>
        <p className="mt-0.5 text-xs text-slate-700/80 dark:text-slate-400/80">
          Full record information for the selected penalty.
        </p>
      </div>
    </div>
  ) : null

  const detailsBody = detailsTarget ? (
    <div className="space-y-5 px-6 py-5">
      <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-medium leading-tight">
              {detailsTarget.memberName ?? detailsTarget.memberId}
            </p>
            <p className="text-xs text-muted-foreground">
              {detailsTarget.memberEmail ?? "No email available"}
            </p>
          </div>
          <Badge
            variant={detailsTarget.status === "waived" ? "secondary" : "danger"}
            className="text-xs">
            {detailsTarget.status === "waived" ? "Waived" : "Active"}
          </Badge>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <DetailField label="Period" value={detailsTarget.period || "-"} />
        <DetailField label="Amount" value={formatRwf(detailsTarget.amount)} />
        <DetailField label="Currency" value={detailsTarget.currency || "RWF"} />
        <DetailField
          label="Issued By"
          value={detailsTarget.issuedByName ?? "-"}
        />
        <DetailField
          label="Contribution"
          value={
            detailsTarget.contributionId ? (
              <span className="inline-flex flex-wrap items-center gap-1.5">
                <Link2 className="h-3.5 w-3.5 text-muted-foreground/60" />
                {detailsTarget.contributionAmount
                  ? formatRwf(detailsTarget.contributionAmount)
                  : detailsTarget.contributionId}
              </span>
            ) : (
              "Standalone penalty"
            )
          }
        />
        <DetailField
          label="Created"
          value={formatDate(detailsTarget.createdAt)}
        />
        <DetailField
          label="Updated"
          value={formatDate(detailsTarget.updatedAt)}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <DetailField label="Reason" value={detailsTarget.reason ?? "-"} />
        <DetailField label="Notes" value={detailsTarget.notes ?? "-"} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <DetailField
          label="Waived At"
          value={
            detailsTarget.waivedAt ? formatDate(detailsTarget.waivedAt) : "-"
          }
        />
        <DetailField
          label="Waived By"
          value={detailsTarget.waivedByName ?? "-"}
        />
        <DetailField
          label="Waived Reason"
          value={detailsTarget.waivedReason ?? "-"}
        />
        <DetailField
          label="Contribution Receipt"
          value={detailsTarget.contributionReceiptNumber ?? "-"}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <DetailField
          label="Contribution Due"
          value={formatDate(detailsTarget.contributionDueDate)}
        />
        <DetailField
          label="Contribution Paid"
          value={formatDate(detailsTarget.contributionPaidAt)}
        />
      </div>
    </div>
  ) : null

  const waiverHeader = waiverTarget ? (
    <div className="flex items-center gap-3 border-b border-amber-200 bg-amber-50 px-6 py-4 dark:border-amber-800 dark:bg-amber-950/30">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/50">
        <ShieldCheck className="h-5 w-5 text-amber-600 dark:text-amber-400" />
      </div>
      <div>
        <p className="text-base font-semibold text-amber-900 dark:text-amber-200">
          Waive Penalty
        </p>
        <p className="mt-0.5 text-xs text-amber-700/80 dark:text-amber-400/80">
          Requires your authorisation as president.
        </p>
      </div>
    </div>
  ) : null

  const waiverBody = waiverTarget ? (
    <div className="space-y-5 px-6 py-5">
      <div className="divide-y rounded-lg border bg-muted/40 text-sm">
        <div className="flex items-center justify-between px-4 py-2.5">
          <span className="text-muted-foreground">Member</span>
          <span className="font-medium">
            {waiverTarget.memberName ?? waiverTarget.memberId}
          </span>
        </div>
        <div className="flex items-center justify-between px-4 py-2.5">
          <span className="text-muted-foreground">Period</span>
          <span className="font-mono font-medium">
            {waiverTarget.period || "-"}
          </span>
        </div>
        {waiverTarget.contributionAmount ? (
          <div className="flex items-center justify-between px-4 py-2.5">
            <span className="text-muted-foreground">Contribution</span>
            <span className="tabular-nums font-medium">
              {formatRwf(waiverTarget.contributionAmount)}
            </span>
          </div>
        ) : null}
        <div className="flex items-center justify-between bg-rose-50/60 px-4 py-2.5 dark:bg-rose-950/20">
          <span className="text-muted-foreground">Penalty to waive</span>
          <span className="font-bold tabular-nums text-rose-600">
            {formatRwf(waiverTarget.amount)}
          </span>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="wr-reason" className="text-sm">
          Reason for waiver{" "}
          <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          id="wr-reason"
          rows={3}
          placeholder="e.g. Grace period approved by the president at the general meeting"
          value={waiverReason}
          onChange={(e) => setWaiverReason(e.target.value)}
          className="resize-none text-sm"
        />
      </div>

      <label className="flex cursor-pointer select-none items-start gap-3">
        <input
          type="checkbox"
          checked={waiverConfirmed}
          onChange={(e) => setWaiverConfirmed(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-input accent-amber-500"
        />
        <span className="text-xs leading-relaxed text-muted-foreground">
          I confirm this waiver has been approved and I am authorised as
          president to record it.
        </span>
      </label>
    </div>
  ) : null

  const waiverFooter = (
    <>
      <Button
        variant="outline"
        onClick={() => setWaiverTarget(null)}
        disabled={updateMutation.isPending}>
        Cancel
      </Button>
      <Button
        className="bg-amber-500 text-white hover:bg-amber-600"
        onClick={() => void handleWaive()}
        disabled={!waiverConfirmed || updateMutation.isPending}>
        {updateMutation.isPending ? (
          <>
            <Loader className="mr-2 h-4 w-4" />
            Waiving...
          </>
        ) : (
          "Confirm Waiver"
        )}
      </Button>
    </>
  )

  const editHeader = editTarget ? (
    <div className="flex items-center gap-3 border-b border-blue-200 bg-blue-50 px-6 py-4 dark:border-blue-800 dark:bg-blue-950/30">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/50">
        <SlidersHorizontal className="h-5 w-5 text-blue-600 dark:text-blue-400" />
      </div>
      <div>
        <p className="text-base font-semibold text-blue-900 dark:text-blue-200">
          Adjust Penalty
        </p>
        <p className="mt-0.5 text-xs text-blue-700/70 dark:text-blue-400/70">
          {editTarget.memberName ?? editTarget.memberId} —{" "}
          {editTarget.period || "-"}
        </p>
      </div>
    </div>
  ) : null

  const editBody = editTarget ? (
    <div className="space-y-5 px-6 py-5">
      <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="font-medium leading-tight">
              {editTarget.memberName ?? editTarget.memberId}
            </p>
            <p className="text-xs text-muted-foreground">
              {editTarget.memberEmail ?? "No email available"}
            </p>
          </div>
          <Badge
            variant={editTarget.status === "waived" ? "secondary" : "danger"}>
            {editTarget.status === "waived" ? "Waived" : "Active"}
          </Badge>
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-lg border bg-muted/40 px-4 py-3">
        <div className="flex-1 text-center">
          <p className="mb-0.5 text-xs text-muted-foreground">Current</p>
          <p className="font-semibold tabular-nums text-rose-500">
            {editCurrent > 0 ? formatRwf(editCurrent) : "-"}
          </p>
        </div>
        <ChevronDown className="-rotate-90 h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="flex-1 text-center">
          <p className="mb-0.5 text-xs text-muted-foreground">New</p>
          <p
            className={
              editNew > 0
                ? "font-semibold tabular-nums text-blue-600"
                : "font-semibold tabular-nums text-muted-foreground"
            }>
            {editNew > 0 ? formatRwf(editNew) : "-"}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="ea-amount" className="text-sm">
            New Penalty Amount (RWF)
          </Label>
          {suggestedTenPercent > 0 ? (
            <button
              type="button"
              className="text-xs text-blue-600 hover:underline dark:text-blue-400"
              onClick={() => setEditAmount(String(suggestedTenPercent))}>
              Suggest 10%: {formatRwf(suggestedTenPercent)}
            </button>
          ) : null}
        </div>
        <Input
          id="ea-amount"
          inputMode="numeric"
          placeholder="e.g. 8,000"
          value={editAmount}
          onChange={(e) => setEditAmount(e.target.value)}
          className="font-mono"
        />
        {editNew > 0 && editNew !== editCurrent ? (
          <p className="text-xs text-muted-foreground">
            Change:{" "}
            <span
              className={
                editNew > editCurrent ? "text-rose-500" : "text-emerald-600"
              }>
              {editNew > editCurrent ? "+" : ""}
              {formatRwf(editNew - editCurrent)}
            </span>
          </p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="ea-reason" className="text-sm">
          Reason for adjustment{" "}
          <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          id="ea-reason"
          rows={2}
          placeholder="e.g. Corrected from initial entry"
          value={editReason}
          onChange={(e) => setEditReason(e.target.value)}
          className="resize-none text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="ea-notes" className="text-sm">
          Notes{" "}
          <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          id="ea-notes"
          rows={2}
          placeholder="Internal notes for this change"
          value={editNotes}
          onChange={(e) => setEditNotes(e.target.value)}
          className="resize-none text-sm"
        />
      </div>

      <p className="text-xs text-muted-foreground">
        Status changes are managed via waiver actions.
      </p>
    </div>
  ) : null

  const editFooter = (
    <>
      <Button
        variant="outline"
        onClick={() => setEditTarget(null)}
        disabled={updateMutation.isPending}>
        Cancel
      </Button>
      <Button
        onClick={() => void handleEditPenalty()}
        disabled={updateMutation.isPending || editNew <= 0}>
        {updateMutation.isPending ? (
          <>
            <Loader className="mr-2 h-4 w-4" />
            Saving...
          </>
        ) : (
          "Save Adjustment"
        )}
      </Button>
    </>
  )

  const deleteHeader = deleteTarget ? (
    <div className="flex items-center gap-3 border-b border-red-200 bg-red-50 px-6 py-4 dark:border-red-800 dark:bg-red-950/30">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/50">
        <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
      </div>
      <div>
        <p className="text-base font-semibold text-red-900 dark:text-red-200">
          Delete Penalty
        </p>
        <p className="mt-0.5 text-xs text-red-700/80 dark:text-red-400/80">
          Permanently remove this penalty record.
        </p>
      </div>
    </div>
  ) : null

  const deleteBody = deleteTarget ? (
    <div className="space-y-5 px-6 py-5">
      <Alert variant="destructive">
        <AlertDescription>
          This action cannot be undone. The penalty will be removed immediately.
        </AlertDescription>
      </Alert>

      <div className="divide-y rounded-lg border bg-muted/40 text-sm">
        <div className="flex items-center justify-between px-4 py-2.5">
          <span className="text-muted-foreground">Member</span>
          <span className="font-medium">
            {deleteTarget.memberName ?? deleteTarget.memberId}
          </span>
        </div>
        <div className="flex items-center justify-between px-4 py-2.5">
          <span className="text-muted-foreground">Period</span>
          <span className="font-mono font-medium">
            {deleteTarget.period || "-"}
          </span>
        </div>
        <div className="flex items-center justify-between px-4 py-2.5">
          <span className="text-muted-foreground">Amount</span>
          <span className="font-semibold tabular-nums text-rose-600">
            {formatRwf(deleteTarget.amount)}
          </span>
        </div>
      </div>
    </div>
  ) : null

  const deleteFooter = (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="outline"
        onClick={() => setDeleteTarget(null)}
        disabled={deleteMutation.isPending}>
        Cancel
      </Button>
      <Button
        variant="destructive"
        onClick={() => void handleDeletePenalty()}
        disabled={deleteMutation.isPending}>
        {deleteMutation.isPending ? (
          <>
            <Loader className="mr-2 h-4 w-4" />
            Deleting...
          </>
        ) : (
          "Delete Penalty"
        )}
      </Button>
    </div>
  )

  return (
    <div className="flex-1 space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Penalties Management
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Group-wide oversight of late payment penalties. 10% penalty applies
            per the Group Constitution.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <IssuePenaltyDialog />
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refetch()}
            disabled={isRefetching}>
            <RefreshCcw className="h-4 w-4" />
            {isRefetching ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>
            {error.help || error.message || "Unable to load penalties."}
          </AlertDescription>
        </Alert>
      ) : null}

      {/* ── Stat cards ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Outstanding Penalties"
          value={
            <span className={activePenalties.length > 0 ? "text-rose-600" : ""}>
              {formatRwf(totalOwed)}
            </span>
          }
          sub={`${activePenalties.length} active record${activePenalties.length !== 1 ? "s" : ""}`}
          icon={<AlertTriangle className="h-4 w-4 text-rose-500" />}
          loading={isPending}
          highlight={activePenalties.length > 0}
        />
        <StatCard
          title="Penalties Waived"
          value={formatRwf(totalWaived)}
          sub={`${waivedPenalties.length} waived`}
          icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />}
          loading={isPending}
        />
        <StatCard
          title="Members Affected"
          value={uniqueMembers}
          sub="With active penalties"
          icon={<Users className="h-4 w-4 text-amber-500" />}
          loading={isPending}
        />
        <StatCard
          title="Total Records"
          value={allPenalties.length}
          sub="Active + waived (all time)"
          icon={<CircleDollarSign className="h-4 w-4 text-cyan-500" />}
          loading={isPending}
        />
      </div>

      {/* ── Disciplinary alert ── */}
      {memberBreakdown.some((m) => m.count >= 3) ? (
        <Alert className="border-rose-200 bg-rose-50 dark:border-rose-800 dark:bg-rose-950/20">
          <ShieldAlert className="h-4 w-4 text-rose-600" />
          <AlertDescription className="text-rose-700 dark:text-rose-400">
            <span className="font-semibold">
              Disciplinary action may be required.
            </span>{" "}
            {memberBreakdown.filter((m) => m.count >= 3).length} member
            {memberBreakdown.filter((m) => m.count >= 3).length !== 1
              ? "s have"
              : " has"}{" "}
            reached the 3-penalty threshold defined in the Group Constitution
            (Article 8.3).
          </AlertDescription>
        </Alert>
      ) : null}

      {/* ── Outstanding by member ── */}
      {memberBreakdown.length > 0 ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              Outstanding by Member
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {memberBreakdown.map((m) => (
                <div key={m.name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 font-medium">
                      {m.name}
                      {m.count >= 3 ? (
                        <Badge variant="danger" className="text-xs">
                          Action needed
                        </Badge>
                      ) : null}
                    </div>
                    <div className="text-right">
                      <span className="font-semibold tabular-nums text-rose-600">
                        {formatRwf(m.total)}
                      </span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {m.count} penalt{m.count !== 1 ? "ies" : "y"}
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full transition-all ${m.count >= 3 ? "bg-rose-500" : "bg-amber-400"}`}
                      style={{
                        width: `${Math.round((m.total / maxMemberTotal) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* ── Records table ── */}
      <Card>
        <CardHeader className="space-y-3 pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base font-semibold">
              Penalty Records
            </CardTitle>
            <Tabs
              value={statusTab}
              onValueChange={(v) => setStatusTab(v as typeof statusTab)}>
              <TabsList>
                <TabsTab value="all">
                  All
                  {!isPending ? (
                    <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                      {allPenalties.length}
                    </span>
                  ) : null}
                </TabsTab>
                <TabsTab value="active">
                  Active
                  {!isPending ? (
                    <span className="ml-1.5 rounded-full bg-rose-100 px-1.5 py-0.5 text-xs font-medium text-rose-700 dark:bg-rose-900/30 dark:text-rose-400">
                      {activePenalties.length}
                    </span>
                  ) : null}
                </TabsTab>
                <TabsTab value="waived">
                  Waived
                  {!isPending ? (
                    <span className="ml-1.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                      {waivedPenalties.length}
                    </span>
                  ) : null}
                </TabsTab>
              </TabsList>
            </Tabs>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Input
                placeholder="Filter by member..."
                value={filterMember}
                onChange={(e) => setFilterMember(e.target.value)}
                className="h-8 max-w-50 pr-6 text-sm"
              />
              {filterMember ? (
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setFilterMember("")}>
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
            <div className="relative">
              <Input
                placeholder="Period (e.g. 2026-04)..."
                value={filterPeriod}
                onChange={(e) => setFilterPeriod(e.target.value)}
                className="h-8 max-w-45 pr-6 text-sm"
              />
              {filterPeriod ? (
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setFilterPeriod("")}>
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
            {filterMember || filterPeriod ? (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 px-2 text-xs text-muted-foreground"
                onClick={() => {
                  setFilterMember("")
                  setFilterPeriod("")
                }}>
                Clear filters
              </Button>
            ) : null}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isPending ? (
            <div className="space-y-2 p-6">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="border-t border-dashed p-12 text-center">
              <CircleDollarSign className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm font-medium text-muted-foreground">
                {allPenalties.length === 0
                  ? 'No penalties yet. Use "Issue Penalty" to create one, or record a late contribution.'
                  : "No records match your current filters."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead
                      className="cursor-pointer select-none whitespace-nowrap"
                      onClick={() => toggleSort("memberName")}>
                      Member{" "}
                      <SortIcon
                        active={sortField === "memberName"}
                        dir={sortDir}
                      />
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none whitespace-nowrap"
                      onClick={() => toggleSort("period")}>
                      Period{" "}
                      <SortIcon active={sortField === "period"} dir={sortDir} />
                    </TableHead>
                    <TableHead className="whitespace-nowrap">
                      Contribution
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none whitespace-nowrap"
                      onClick={() => toggleSort("amount")}>
                      Penalty{" "}
                      <SortIcon active={sortField === "amount"} dir={sortDir} />
                    </TableHead>
                    <TableHead className="whitespace-nowrap">
                      Issued By
                    </TableHead>
                    <TableHead className="whitespace-nowrap">Status</TableHead>
                    <TableHead
                      className="cursor-pointer select-none whitespace-nowrap"
                      onClick={() => toggleSort("waivedAt")}>
                      Waived{" "}
                      <SortIcon
                        active={sortField === "waivedAt"}
                        dir={sortDir}
                      />
                    </TableHead>
                    <TableHead className="whitespace-nowrap">
                      Reason / Notes
                    </TableHead>
                    <TableHead className="text-right whitespace-nowrap">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((item) => {
                    const penaltyValue = Number.parseFloat(
                      String(item.amount ?? "0")
                    )
                    const isWaived = item.status === "waived"

                    return (
                      <TableRow
                        key={item.id}
                        className={isWaived ? "opacity-60" : ""}>
                        <TableCell>
                          <div className="font-medium leading-tight">
                            {item.memberName ?? item.memberId}
                          </div>
                          {item.memberEmail ? (
                            <div className="text-xs text-muted-foreground">
                              {item.memberEmail}
                            </div>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-sm font-medium">
                            {item.period || "-"}
                          </span>
                        </TableCell>
                        <TableCell className="tabular-nums text-sm">
                          {item.contributionAmount ? (
                            <span className="inline-flex items-center gap-1">
                              <Link2 className="h-3 w-3 text-muted-foreground/60" />
                              {formatRwf(item.contributionAmount)}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">
                              standalone
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              "font-semibold tabular-nums",
                              isWaived
                                ? "text-muted-foreground line-through"
                                : "text-rose-600"
                            )}>
                            {penaltyValue > 0 ? formatRwf(penaltyValue) : "-"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground">
                            {item.issuedByName ?? "-"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={isWaived ? "secondary" : "danger"}
                            className="text-xs">
                            {isWaived ? "Waived" : "Active"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {isWaived ? (
                            <div className="space-y-0.5">
                              <div className="text-xs font-medium">
                                {formatDate(item.waivedAt)}
                              </div>
                              {item.waivedByName ? (
                                <div className="text-xs text-muted-foreground">
                                  by {item.waivedByName}
                                </div>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              -
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-40">
                          <span
                            className="block truncate text-xs text-muted-foreground"
                            title={
                              item.waivedReason ||
                              item.reason ||
                              item.notes ||
                              ""
                            }>
                            {item.waivedReason ||
                              item.reason ||
                              item.notes ||
                              "-"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu modal={false}>
                            <DropdownMenuTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0"
                                aria-label="Open penalty actions"
                                disabled={
                                  updateMutation.isPending ||
                                  deleteMutation.isPending
                                }>
                                <MoreVertical className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuItem
                                onClick={() => openDetails(item)}>
                                <Eye className="mr-2 h-4 w-4" />
                                View details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openEdit(item)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              {!isWaived ? (
                                <DropdownMenuItem
                                  onClick={() => openWaiver(item)}>
                                  <ShieldCheck className="mr-2 h-4 w-4" />
                                  Waive
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  onClick={() => void handleUndoWaiver(item)}>
                                  <ShieldCheck className="mr-2 h-4 w-4" />
                                  Undo waiver
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => openDelete(item)}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {!isPending && filtered.length > 0 ? (
            <div className="border-t px-4 py-2.5 text-xs text-muted-foreground">
              Showing{" "}
              <span className="font-medium text-foreground">
                {filtered.length}
              </span>{" "}
              of{" "}
              <span className="font-medium text-foreground">
                {allPenalties.length}
              </span>{" "}
              record{allPenalties.length !== 1 ? "s" : ""}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* ── Overlays ── */}
      <ResponsiveOverlay
        open={Boolean(detailsTarget)}
        onOpenChange={(open) => !open && setDetailsTarget(null)}
        title="Penalty Details"
        description="Full record information for the selected penalty."
        desktopWidthClassName="sm:max-w-3xl"
        header={detailsHeader}
        footer={
          <Button variant="outline" onClick={() => setDetailsTarget(null)}>
            Close
          </Button>
        }>
        {detailsBody}
      </ResponsiveOverlay>

      <ResponsiveOverlay
        open={Boolean(waiverTarget)}
        onOpenChange={(open) => !open && setWaiverTarget(null)}
        title="Waive Penalty"
        description="Requires your authorisation as president."
        desktopWidthClassName="sm:max-w-md"
        header={waiverHeader}
        footer={waiverFooter}>
        {waiverBody}
      </ResponsiveOverlay>

      <ResponsiveOverlay
        open={Boolean(editTarget)}
        onOpenChange={(open) => !open && setEditTarget(null)}
        title="Adjust Penalty"
        description="Edit the penalty amount, reason, and notes."
        desktopWidthClassName="sm:max-w-lg"
        header={editHeader}
        footer={editFooter}>
        {editBody}
      </ResponsiveOverlay>

      <ResponsiveOverlay
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Penalty"
        description="Permanently remove this penalty record."
        desktopWidthClassName="sm:max-w-md"
        header={deleteHeader}
        footer={deleteFooter}>
        {deleteBody}
      </ResponsiveOverlay>
    </div>
  )
}
