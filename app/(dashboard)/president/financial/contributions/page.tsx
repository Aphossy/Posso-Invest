import { Metadata } from "next"
import { headers } from "next/headers"
import type { ContributionExportable } from "@/utils/contribution-export-utils"
import { AlertTriangle, FileStack, Wallet } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ContributionsTable } from "@/components/dashboard/contributions/contributions-table"

export const metadata: Metadata = {
  title: "Contribution Overview",
  description: "Monitor TrustLink Group savings performance.",
}

type ApiListResponse<T> = { data: T[]; total?: number }

async function fetchWithAuth<T>(url: string): Promise<T | null> {
  const headersList = await headers()
  const cookie = headersList.get("cookie")
  const host = headersList.get("host") ?? "localhost:3000"
  const protocol = headersList.get("x-forwarded-proto") ?? "http"
  const absoluteUrl = url.startsWith("http")
    ? url
    : `${protocol}://${host}${url}`
  const res = await fetch(absoluteUrl, {
    cache: "no-store",
    headers: cookie ? { cookie } : undefined,
  })
  if (!res.ok) return null
  return res.json()
}

function formatRwf(amount?: string | null) {
  if (!amount) return "-"
  const value = Number.parseFloat(amount)
  if (Number.isNaN(value)) return amount
  return `${new Intl.NumberFormat("en-RW").format(value)}\u00A0RWF`
}

export default async function AdminContributionsPage() {
  const contributionsRes = await fetchWithAuth<
    ApiListResponse<ContributionExportable>
  >("/api/contributions?limit=500")

  const data = contributionsRes?.data ?? []

  const totalCollected = data.reduce((sum, item) => {
    const value = Number.parseFloat(item.amount || "0")
    return Number.isNaN(value) ? sum : sum + value
  }, 0)

  const totalPenalties = data.reduce((sum, item) => {
    const value = Number.parseFloat(item.penaltyAmount || "0")
    return Number.isNaN(value) ? sum : sum + value
  }, 0)

  const penalizedCount = data.filter((item) => {
    const value = Number.parseFloat(item.penaltyAmount || "0")
    return !Number.isNaN(value) && value > 0
  }).length

  return (
    <div className="flex-1 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Contribution Overview</h1>
          <p className="text-sm text-muted-foreground">
            Track group savings health and compliance.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">
              Total Collected
            </CardTitle>
            <Wallet className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums">
              {totalCollected ? formatRwf(String(totalCollected)) : "-"}
            </div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Total Records</CardTitle>
            <FileStack className="h-4 w-4 text-cyan-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums">
              {data.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Contribution records
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">
              Total Penalties
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums">
              {totalPenalties > 0 ? formatRwf(String(totalPenalties)) : "-"}
            </div>
            <p className="text-xs text-muted-foreground">
              {penalizedCount > 0
                ? `${penalizedCount} record${penalizedCount !== 1 ? "s" : ""} with penalties`
                : "No penalties issued"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Contribution History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ContributionsTable
            initialData={data}
            refreshUrl="/api/contributions?limit=500"
          />
        </CardContent>
      </Card>
    </div>
  )
}
