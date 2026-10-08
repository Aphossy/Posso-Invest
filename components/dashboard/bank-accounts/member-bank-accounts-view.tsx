"use client"

import { useCallback, useEffect, useState } from "react"
import { Building2, Copy, Landmark, LoaderCircle } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type BankAccount = {
  id: string
  accountName: string
  bankName: string
  accountNumber: string
  accountHolder: string
  accountType: string
  currency: string
  branch: string | null
  isActive: boolean
}

async function readAccounts(response: Response) {
  const payload = (await response.json()) as {
    success: boolean
    data: BankAccount[]
    error?: { message?: string }
  }
  if (!response.ok || !payload.success) {
    throw new Error(payload.error?.message || "Unable to load bank accounts.")
  }
  return payload.data
}

export function MemberBankAccountsView() {
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadAccounts = useCallback(async () => {
    try {
      const response = await fetch("/api/bank-accounts/active", {
        cache: "no-store",
      })
      setAccounts(await readAccounts(response))
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to load bank accounts."
      )
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadAccounts()
  }, [loadAccounts])

  async function copyAccountNumber(accountNumber: string) {
    try {
      await navigator.clipboard.writeText(accountNumber)
      toast.success("Account number copied.")
    } catch {
      toast.error(
        "Could not copy the account number. Please select and copy it."
      )
    }
  }

  return (
    <div className="flex-1 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Group Bank Accounts</h1>
        <p className="text-sm text-muted-foreground">
          Use an active account below for group contributions or other approved
          payments. Confirm payment instructions with the treasurer if unsure.
        </p>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin" />
            Loading group accounts…
          </CardContent>
        </Card>
      ) : accounts.length === 0 ? (
        <Card>
          <CardContent className="rounded-lg border-dashed py-10 text-center">
            <Building2 className="mx-auto mb-3 size-8 text-muted-foreground" />
            <p className="font-medium">No active group bank accounts</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Please contact the treasurer for current payment details.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {accounts.map((account) => (
            <Card key={account.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Landmark className="size-5 text-primary" />
                  {account.accountName}
                  <Badge variant="success">Active</Badge>
                </CardTitle>
                <CardDescription>
                  {account.bankName} · {account.accountType} ·{" "}
                  {account.currency}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-muted-foreground">Account holder</dt>
                    <dd className="font-medium">{account.accountHolder}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Branch</dt>
                    <dd className="font-medium">
                      {account.branch || "Not specified"}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-muted-foreground">Account number</dt>
                    <dd className="mt-1 flex flex-wrap items-center justify-between gap-2">
                      <span className="break-all font-mono text-base font-semibold">
                        {account.accountNumber}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          void copyAccountNumber(account.accountNumber)
                        }>
                        <Copy />
                        Copy
                      </Button>
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
