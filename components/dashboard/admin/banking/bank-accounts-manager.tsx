"use client"

import { useCallback, useEffect, useState } from "react"
import {
  Building2,
  Landmark,
  LoaderCircle,
  Pencil,
  Plus,
  Power,
} from "lucide-react"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type BankAccountRow = {
  id: string
  accountName: string
  bankName: string
  accountHolder: string
  accountType: BankAccountForm["accountType"]
  currency: string
  branch: string | null
  isActive: boolean
  maskedAccountNumber: string
}

type BankAccountForm = {
  accountName: string
  bankName: string
  accountNumber: string
  accountHolder: string
  accountType: "current" | "savings" | "business" | "other"
  currency: string
  branch: string
}

const EMPTY_FORM: BankAccountForm = {
  accountName: "",
  bankName: "",
  accountNumber: "",
  accountHolder: "",
  accountType: "current",
  currency: "RWF",
  branch: "",
}

async function readApiResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as {
    success: boolean
    data: T
    error?: { message?: string }
  }
  if (!response.ok || !payload.success) {
    throw new Error(payload.error?.message || "The request failed.")
  }
  return payload.data
}

export function BankAccountsManager() {
  const [accounts, setAccounts] = useState<BankAccountRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<BankAccountRow | null>(
    null
  )
  const [form, setForm] = useState<BankAccountForm>(EMPTY_FORM)

  const loadAccounts = useCallback(async () => {
    try {
      const response = await fetch("/api/bank-accounts", { cache: "no-store" })
      const data = await readApiResponse<BankAccountRow[]>(response)
      setAccounts(data)
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

  function openCreateDialog() {
    setEditingAccount(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  function openEditDialog(account: BankAccountRow) {
    setEditingAccount(account)
    setForm({
      accountName: account.accountName,
      bankName: account.bankName,
      accountNumber: "",
      accountHolder: account.accountHolder,
      accountType: account.accountType,
      currency: account.currency,
      branch: account.branch ?? "",
    })
    setDialogOpen(true)
  }

  async function saveAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)

    const { accountNumber, ...otherFields } = form
    const payload = editingAccount
      ? {
          ...otherFields,
          ...(accountNumber.trim()
            ? { accountNumber: accountNumber.trim() }
            : {}),
          branch: form.branch.trim() || undefined,
        }
      : {
          ...form,
          accountNumber: accountNumber.trim(),
          branch: form.branch.trim() || undefined,
        }

    try {
      const response = await fetch(
        editingAccount
          ? `/api/bank-accounts/${editingAccount.id}`
          : "/api/bank-accounts",
        {
          method: editingAccount ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      )
      await readApiResponse(response)
      toast.success(
        editingAccount ? "Bank account updated." : "Bank account added."
      )
      setDialogOpen(false)
      await loadAccounts()
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to save the bank account."
      )
    } finally {
      setIsSaving(false)
    }
  }

  async function toggleAccountStatus(account: BankAccountRow) {
    const action = account.isActive ? "deactivate" : "reactivate"
    const confirmed = window.confirm(
      `Are you sure you want to ${action} “${account.accountName}”?`
    )
    if (!confirmed) return

    try {
      const response = await fetch(`/api/bank-accounts/${account.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !account.isActive }),
      })
      await readApiResponse(response)
      toast.success(
        `Bank account ${account.isActive ? "deactivated" : "reactivated"}.`
      )
      await loadAccounts()
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to change the bank account status."
      )
    }
  }

  return (
    <div className="flex-1 space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold">Bank Accounts</h1>
          <p className="text-sm text-muted-foreground">
            Manage the official bank accounts for your active organization.
            Account numbers are masked in this list.
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus />
          Add bank account
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Landmark className="size-5" />
            Organization accounts
          </CardTitle>
          <CardDescription>
            Only organization administrators can view or change these records.
            Deactivated records stay in the system for reference.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" />
              Loading bank accounts…
            </div>
          ) : accounts.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <Building2 className="mx-auto mb-3 size-8 text-muted-foreground" />
              <p className="font-medium">No bank accounts added yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Add the group’s official account details to keep them organized.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {accounts.map((account) => (
                <div
                  key={account.id}
                  className="flex flex-col gap-4 py-5 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold">{account.accountName}</h2>
                      <Badge
                        variant={account.isActive ? "success" : "secondary"}>
                        {account.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {account.bankName} · {account.accountType} ·{" "}
                      {account.currency}
                    </p>
                    <p className="text-sm">
                      {account.maskedAccountNumber} · {account.accountHolder}
                      {account.branch ? ` · ${account.branch}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(account)}>
                      <Pencil />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void toggleAccountStatus(account)}>
                      <Power />
                      {account.isActive ? "Deactivate" : "Reactivate"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingAccount ? "Edit bank account" : "Add bank account"}
            </DialogTitle>
            <DialogDescription>
              Store the group account details. The full account number is never
              returned by the listing API.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={saveAccount} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="account-name">Account label</Label>
                <Input
                  id="account-name"
                  required
                  maxLength={120}
                  value={form.accountName}
                  onChange={(event) =>
                    setForm({ ...form, accountName: event.target.value })
                  }
                  placeholder="e.g. Main operating account"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bank-name">Bank name</Label>
                <Input
                  id="bank-name"
                  required
                  maxLength={120}
                  value={form.bankName}
                  onChange={(event) =>
                    setForm({ ...form, bankName: event.target.value })
                  }
                  placeholder="e.g. Equity Bank Rwanda"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="account-holder">Account holder</Label>
                <Input
                  id="account-holder"
                  required
                  maxLength={120}
                  value={form.accountHolder}
                  onChange={(event) =>
                    setForm({ ...form, accountHolder: event.target.value })
                  }
                  placeholder="Registered account name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="account-number">
                  Account number{editingAccount ? " (optional)" : ""}
                </Label>
                <Input
                  id="account-number"
                  required={!editingAccount}
                  maxLength={64}
                  autoComplete="off"
                  value={form.accountNumber}
                  onChange={(event) =>
                    setForm({ ...form, accountNumber: event.target.value })
                  }
                  placeholder={
                    editingAccount
                      ? `Currently ${editingAccount.maskedAccountNumber}; leave blank to keep`
                      : "Enter account number"
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="account-type">Account type</Label>
                <select
                  id="account-type"
                  className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
                  value={form.accountType}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      accountType: event.target
                        .value as BankAccountForm["accountType"],
                    })
                  }>
                  <option value="current">Current</option>
                  <option value="savings">Savings</option>
                  <option value="business">Business</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="account-currency">Currency</Label>
                <Input
                  id="account-currency"
                  required
                  minLength={3}
                  maxLength={3}
                  value={form.currency}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      currency: event.target.value.toUpperCase(),
                    })
                  }
                  placeholder="RWF"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="account-branch">Branch (optional)</Label>
                <Input
                  id="account-branch"
                  maxLength={120}
                  value={form.branch}
                  onChange={(event) =>
                    setForm({ ...form, branch: event.target.value })
                  }
                  placeholder="Branch or location"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={isSaving}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving
                  ? "Saving…"
                  : editingAccount
                    ? "Save changes"
                    : "Add account"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
