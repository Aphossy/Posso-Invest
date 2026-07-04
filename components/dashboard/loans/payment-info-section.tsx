import type { IkiminaProfileMetadata } from "@/db/schemas"
import { Banknote, CreditCard } from "lucide-react"

interface PaymentInfoSectionProps {
  ikimina?: IkiminaProfileMetadata | null
  memberName?: string | null
  /** Mask bank account number — true by default */
  maskAccount?: boolean
}

function maskAccountNumber(value?: string | null) {
  const str = value?.trim()
  if (!str) return "Not provided"
  return `**** **** ${str.slice(-4)}`
}

export function PaymentInfoSection({
  ikimina,
  memberName,
  maskAccount = true,
}: PaymentInfoSectionProps) {
  if (!ikimina) {
    return (
      <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
        {memberName ? `${memberName} has` : "Member has"} not set up payout
        information yet.
      </div>
    )
  }

  // Normalise to lowercase so "Bank" / "BANK" / "bank" all match
  const raw = ikimina.preferredPayoutMethod ?? "bank"
  const method = raw.toLowerCase().trim()

  return (
    <div className="space-y-2 rounded-lg border bg-muted/30 p-3 text-sm">
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <CreditCard className="h-3.5 w-3.5" />
        Preferred Payout Method
      </div>
      <p className="font-medium capitalize">{raw.replace(/_/g, " ")}</p>

      {method === "bank" && (
        <div className="grid grid-cols-1 gap-2 pt-1">
          <div>
            <p className="text-xs text-muted-foreground">Bank</p>
            <p className="font-medium">{ikimina.bankName || "Not provided"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Account No.</p>
            <p className="font-mono font-medium">
              {maskAccount
                ? maskAccountNumber(ikimina.bankAccountNumber)
                : ikimina.bankAccountNumber?.trim() || "Not provided"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Account Holder</p>
            <p className="font-medium">
              {ikimina.bankAccountHolder || "Not provided"}
            </p>
          </div>
        </div>
      )}

      {method === "mobile_money" && (
        <div className="grid grid-cols-1 gap-2 pt-1">
          <div>
            <p className="text-xs text-muted-foreground">Provider</p>
            <p className="font-medium uppercase">
              {ikimina.mobileMoneyProvider || "Not provided"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Number</p>
            <p className="font-mono font-medium">
              {ikimina.mobileMoneyNumber || "Not provided"}
            </p>
          </div>
        </div>
      )}

      {method === "cash" && (
        <div className="flex items-center gap-1.5 pt-1 text-xs text-muted-foreground">
          <Banknote className="h-3.5 w-3.5" />
          Cash disbursement — coordinate directly with the member.
        </div>
      )}
    </div>
  )
}
