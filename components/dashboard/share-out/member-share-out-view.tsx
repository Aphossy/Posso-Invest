"use client"

import { CheckCircle2, Clock, PiggyBank } from "lucide-react"

import { useMyShareOuts } from "@/hooks/api/use-share-outs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader } from "@/components/common/loader"

const formatRwf = (value?: string | number | null) => {
  if (value === null || value === undefined || value === "") return "-"
  const n = typeof value === "number" ? value : Number.parseFloat(value)
  if (Number.isNaN(n)) return "-"
  return `${new Intl.NumberFormat("en-RW").format(n)} RWF`
}

const formatDate = (value?: string | null) => {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString("en-RW")
}

export function MemberShareOutView() {
  const { data, isPending, error } = useMyShareOuts()
  const statements = data?.data ?? []

  return (
    <div className="flex-1 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">My Share-out</h1>
        <p className="text-sm text-muted-foreground">
          Your year-end distribution from the group fund.
        </p>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>
            {error.help ?? error.message ?? "Unable to load your share-outs."}
          </AlertDescription>
        </Alert>
      ) : null}

      {isPending ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader className="h-4 w-4" />
          Loading...
        </div>
      ) : statements.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
            <PiggyBank className="h-8 w-8 text-muted-foreground/60" />
            No share-out has been published for you yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {statements.map((s) => {
            const paid = s.allocationStatus === "paid"
            return (
              <Card key={s.allocationId}>
                <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                  <CardTitle className="text-base">{s.label}</CardTitle>
                  <Badge variant={paid ? "default" : "secondary"}>
                    {paid ? (
                      <>
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        Paid
                      </>
                    ) : (
                      <>
                        <Clock className="mr-1 h-3 w-3" />
                        Pending
                      </>
                    )}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Net payout</p>
                    <p className="text-2xl font-bold tabular-nums text-emerald-700">
                      {formatRwf(s.netShare)}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Your contributions
                      </p>
                      <p className="font-medium tabular-nums">
                        {formatRwf(s.contributionBase)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Share of fund
                      </p>
                      <p className="font-medium tabular-nums">
                        {s.sharePercent}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Gross share
                      </p>
                      <p className="font-medium tabular-nums">
                        {formatRwf(s.grossShare)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Deductions
                      </p>
                      <p className="font-medium tabular-nums text-rose-600">
                        {formatRwf(
                          Number(s.loanDeduction) + Number(s.penaltyDeduction)
                        )}
                      </p>
                    </div>
                  </div>
                  {(Number(s.loanDeduction) > 0 ||
                    Number(s.penaltyDeduction) > 0) && (
                    <p className="text-xs text-muted-foreground">
                      Deductions cover{" "}
                      {Number(s.loanDeduction) > 0
                        ? `${formatRwf(s.loanDeduction)} outstanding loan`
                        : ""}
                      {Number(s.loanDeduction) > 0 &&
                      Number(s.penaltyDeduction) > 0
                        ? " and "
                        : ""}
                      {Number(s.penaltyDeduction) > 0
                        ? `${formatRwf(s.penaltyDeduction)} penalties`
                        : ""}
                      .
                    </p>
                  )}
                  {paid && formatDate(s.paidAt) ? (
                    <p className="text-xs text-muted-foreground">
                      Paid on {formatDate(s.paidAt)}
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
