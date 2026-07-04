"use client"

import { useState } from "react"
import type { ShareOutStatus } from "@/db/schemas/share-out-schema"
import {
  Banknote,
  CheckCircle2,
  PiggyBank,
  Plus,
  RefreshCcw,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"

import {
  useCreateShareOut,
  useDeleteShareOut,
  useShareOut,
  useShareOutAction,
  useShareOuts,
} from "@/hooks/api/use-share-outs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader } from "@/components/common/loader"
import { ShareOutGuidanceDialog } from "@/components/dashboard/share-out/share-out-guidance-dialog"

const formatRwf = (value?: string | number | null) => {
  if (value === null || value === undefined || value === "") return "-"
  const n = typeof value === "number" ? value : Number.parseFloat(value)
  if (Number.isNaN(n)) return "-"
  return `${new Intl.NumberFormat("en-RW").format(n)} RWF`
}

const statusStyles: Record<ShareOutStatus, string> = {
  draft: "bg-slate-100 text-slate-700",
  approved: "bg-amber-100 text-amber-700",
  distributed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-rose-100 text-rose-700",
}

function CreateShareOutDialog({
  onCreated,
}: {
  onCreated: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState("")
  const [label, setLabel] = useState("")
  const [fiscalYear, setFiscalYear] = useState(String(new Date().getFullYear()))
  const [notes, setNotes] = useState("")
  const create = useCreateShareOut()

  const handleSubmit = async () => {
    const distributableAmount = Number.parseFloat(amount)
    if (!Number.isFinite(distributableAmount) || distributableAmount <= 0) {
      toast.error("Enter a valid distributable amount.")
      return
    }
    try {
      const res = await create.mutateAsync({
        distributableAmount,
        label: label.trim() || undefined,
        fiscalYear: Number.parseInt(fiscalYear, 10) || undefined,
        notes: notes.trim() || undefined,
      })
      toast.success("Share-out draft created.")
      setOpen(false)
      setAmount("")
      setLabel("")
      setNotes("")
      onCreated(res.data.cycle.id)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to create share-out"
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          New share-out
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New share-out</DialogTitle>
          <DialogDescription>
            Build a draft distribution. Each member&apos;s share is proportional
            to their contributions, less any outstanding loans and penalties.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="so-amount">Distributable amount (RWF)</Label>
            <Input
              id="so-amount"
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. cash on hand to share"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="so-year">Fiscal year</Label>
              <Input
                id="so-year"
                type="number"
                value={fiscalYear}
                onChange={(e) => setFiscalYear(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="so-label">Label (optional)</Label>
              <Input
                id="so-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="2026 Annual Share-out"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="so-notes">Notes</Label>
            <Textarea
              id="so-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={create.isPending}>
            Cancel
          </Button>
          <Button
            onClick={() => void handleSubmit()}
            disabled={create.isPending}>
            {create.isPending ? (
              <>
                <Loader className="mr-2 h-4 w-4" />
                Computing...
              </>
            ) : (
              "Create draft"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ShareOutDetail({ id }: { id: string }) {
  const { data, isPending, error } = useShareOut(id)
  const action = useShareOutAction(id)
  const del = useDeleteShareOut()

  if (isPending) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader className="h-4 w-4" />
        Loading allocations...
      </div>
    )
  }
  if (error || !data) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          {error?.help ?? error?.message ?? "Unable to load share-out."}
        </AlertDescription>
      </Alert>
    )
  }

  const { cycle, allocations } = data.data
  const status = cycle.status as ShareOutStatus

  const runAction = async (a: "approve" | "distribute" | "cancel") => {
    try {
      await action.mutateAsync({ action: a })
      toast.success(`Share-out ${a}d.`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Unable to ${a}`)
    }
  }

  const handleDelete = async () => {
    try {
      await del.mutateAsync({ id })
      toast.success("Draft deleted.")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to delete")
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            {cycle.label}
            <Badge className={statusStyles[status]}>{status}</Badge>
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            {cycle.memberCount} members · pool{" "}
            {formatRwf(cycle.distributableAmount)} · net payout{" "}
            {formatRwf(cycle.totalNet)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {status === "draft" && (
            <Button
              size="sm"
              variant="outline"
              className="text-rose-600"
              onClick={() => void handleDelete()}
              disabled={del.isPending}>
              <Trash2 className="h-3.5 w-3.5" />
              Delete draft
            </Button>
          )}
          {status === "approved" && (
            <>
              <Button
                size="sm"
                onClick={() => void runAction("distribute")}
                disabled={action.isPending}>
                <CheckCircle2 className="h-3.5 w-3.5" />
                Mark distributed
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => void runAction("cancel")}
                disabled={action.isPending}>
                Cancel
              </Button>
            </>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Member</th>
                <th className="py-2 pr-3 font-medium">Base</th>
                <th className="py-2 pr-3 font-medium">Share</th>
                <th className="py-2 pr-3 font-medium">Gross</th>
                <th className="py-2 pr-3 font-medium">Deductions</th>
                <th className="py-2 pr-3 font-medium">Net</th>
                <th className="py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {allocations.map((a) => (
                <tr key={a.id} className="border-b last:border-0">
                  <td className="py-2 pr-3">
                    <div className="font-medium">
                      {a.memberName ?? "Member"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {a.memberEmail ?? a.memberId}
                    </div>
                  </td>
                  <td className="py-2 pr-3 tabular-nums">
                    {formatRwf(a.contributionBase)}
                  </td>
                  <td className="py-2 pr-3 tabular-nums">{a.sharePercent}%</td>
                  <td className="py-2 pr-3 tabular-nums">
                    {formatRwf(a.grossShare)}
                  </td>
                  <td className="py-2 pr-3 tabular-nums text-rose-600">
                    {formatRwf(
                      Number(a.loanDeduction) + Number(a.penaltyDeduction)
                    )}
                  </td>
                  <td className="py-2 pr-3 font-semibold tabular-nums text-emerald-700">
                    {formatRwf(a.netShare)}
                  </td>
                  <td className="py-2">
                    <Badge
                      variant={a.status === "paid" ? "default" : "secondary"}>
                      {a.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

export function ShareOutManagementView() {
  const { data, isPending, isRefetching, error, refetch } = useShareOuts()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const cycles = data?.data ?? []
  const activeId = selectedId ?? cycles[0]?.id ?? null

  return (
    <div className="flex-1 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Year-end Share-out</h1>
          <p className="text-sm text-muted-foreground">
            Compute, approve, and distribute the group fund to members.
          </p>
        </div>
        <div className="flex gap-2">
          <ShareOutGuidanceDialog role="treasurer" />
          <Button
            variant="outline"
            onClick={() => void refetch()}
            disabled={isPending || isRefetching}>
            <RefreshCcw className="h-4 w-4" />
            {isRefetching ? "Refreshing..." : "Refresh"}
          </Button>
          <CreateShareOutDialog onCreated={setSelectedId} />
        </div>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>
            {error.help ?? error.message ?? "Unable to load share-outs."}
          </AlertDescription>
        </Alert>
      ) : null}

      {isPending ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader className="h-4 w-4" />
          Loading share-outs...
        </div>
      ) : cycles.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
            <PiggyBank className="h-8 w-8 text-muted-foreground/60" />
            No share-outs yet. Create one to distribute the group fund.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
          <div className="space-y-2">
            {cycles.map((c) => {
              const status = c.status as ShareOutStatus
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedId(c.id)}
                  className={`w-full rounded-lg border p-3 text-left transition-colors hover:bg-accent/40 ${
                    activeId === c.id ? "border-primary bg-accent/30" : ""
                  }`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{c.label}</span>
                    <Badge className={statusStyles[status]}>{status}</Badge>
                  </div>
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <Banknote className="h-3 w-3" />
                    {formatRwf(c.totalNet)} net
                  </p>
                </button>
              )
            })}
          </div>
          {activeId ? <ShareOutDetail id={activeId} /> : null}
        </div>
      )}
    </div>
  )
}
