"use client"

import { useState } from "react"
import type { ShareOutStatus } from "@/db/schemas/share-out-schema"
import {
  Banknote,
  CheckCircle2,
  PiggyBank,
  RefreshCcw,
  XCircle,
} from "lucide-react"
import { toast } from "sonner"

import {
  useShareOut,
  useShareOutAction,
  useShareOuts,
} from "@/hooks/api/use-share-outs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader } from "@/components/common/loader"

import { ShareOutGuidanceDialog } from "./share-out-guidance-dialog"

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

function ShareOutDetail({ id }: { id: string }) {
  const { data, isPending, error } = useShareOut(id)
  const action = useShareOutAction(id)

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
            <>
              <Button
                size="sm"
                onClick={() => void runAction("approve")}
                disabled={action.isPending}>
                <CheckCircle2 className="h-3.5 w-3.5" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-rose-600"
                onClick={() => void runAction("cancel")}
                disabled={action.isPending}>
                <XCircle className="h-3.5 w-3.5" />
                Cancel
              </Button>
            </>
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
                className="text-rose-600"
                onClick={() => void runAction("cancel")}
                disabled={action.isPending}>
                <XCircle className="h-3.5 w-3.5" />
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

interface Props {
  role?: "president" | "admin"
}

export function PresidentShareOutView({ role = "president" }: Props) {
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
            Review and approve the annual fund distribution to members.
          </p>
        </div>
        <div className="flex gap-2">
          <ShareOutGuidanceDialog role={role} />
          <Button
            variant="outline"
            onClick={() => void refetch()}
            disabled={isPending || isRefetching}>
            <RefreshCcw className="h-4 w-4" />
            {isRefetching ? "Refreshing..." : "Refresh"}
          </Button>
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
            No share-outs yet. The treasurer will create one when the group fund
            is ready to distribute.
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
