"use client"

import { useMemo, useState } from "react"
import { type VenturesProfileMetadata, type User } from "@/db/schemas"
import {
  AlertCircle,
  Building2,
  CreditCard,
  Edit,
  HandCoins,
  Save,
  ShieldCheck,
  Smartphone,
  UserRound,
  X,
} from "lucide-react"
import { useNavigationGuard } from "next-navigation-guard"
import { toast } from "sonner"

import { useActiveRole } from "@/hooks/use-active-role"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { Loader } from "../common/loader"
import { UnsavedChangesDialog } from "../common/unsaved-changes-dialog"

type PayoutMethod = NonNullable<VenturesProfileMetadata["preferredPayoutMethod"]>
type MobileMoneyProvider = NonNullable<
  VenturesProfileMetadata["mobileMoneyProvider"]
>

const VENTURES_ALLOWED_ROLES = new Set([
  "member",
  "treasurer",
  "president",
  "admin",
])

function maskAccountNumber(value?: string) {
  if (!value) return "Not provided"
  const normalized = value.trim()
  if (!normalized) return "Not provided"
  const last4 = normalized.slice(-4)
  return `**** **** ${last4}`
}

interface ProfileVenturesInfoProps {
  profile: User
  onUpdate: (updates: Partial<User>) => Promise<User>
}

export function ProfileVenturesInfo({
  profile,
  onUpdate,
}: ProfileVenturesInfoProps) {
  const { role, session } = useActiveRole()
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)

  const metadata = profile.metadata || {}
  const ventures = metadata.venturesProfile || {}

  const [formData, setFormData] = useState({
    bankName: ventures.bankName || "",
    bankAccountNumber: ventures.bankAccountNumber || "",
    bankAccountHolder: ventures.bankAccountHolder || "",
    preferredPayoutMethod: (ventures.preferredPayoutMethod ||
      "bank") as PayoutMethod,
    mobileMoneyProvider: (ventures.mobileMoneyProvider ||
      "mtn") as MobileMoneyProvider,
    mobileMoneyNumber: ventures.mobileMoneyNumber || "",
    emergencyContactName: ventures.emergencyContactName || "",
    emergencyContactPhone: ventures.emergencyContactPhone || "",
  })

  const originalData = useMemo(
    () => ({
      bankName: ventures.bankName || "",
      bankAccountNumber: ventures.bankAccountNumber || "",
      bankAccountHolder: ventures.bankAccountHolder || "",
      preferredPayoutMethod: (ventures.preferredPayoutMethod ||
        "bank") as PayoutMethod,
      mobileMoneyProvider: (ventures.mobileMoneyProvider ||
        "mtn") as MobileMoneyProvider,
      mobileMoneyNumber: ventures.mobileMoneyNumber || "",
      emergencyContactName: ventures.emergencyContactName || "",
      emergencyContactPhone: ventures.emergencyContactPhone || "",
    }),
    [
      ventures.bankAccountHolder,
      ventures.bankAccountNumber,
      ventures.bankName,
      ventures.emergencyContactName,
      ventures.emergencyContactPhone,
      ventures.mobileMoneyNumber,
      ventures.mobileMoneyProvider,
      ventures.preferredPayoutMethod,
    ]
  )

  const hasChanges = JSON.stringify(formData) !== JSON.stringify(originalData)
  const isOwner = session?.user?.id === profile.id
  const canEditVentures = isOwner && !!role && VENTURES_ALLOWED_ROLES.has(role)

  const navGuard = useNavigationGuard({
    enabled: isEditing && hasChanges && canEditVentures,
  })

  const handleCancel = () => {
    setFormData(originalData)
    setIsEditing(false)
  }

  const handleSave = async () => {
    if (!canEditVentures) {
      toast.error("You are not allowed to edit Ventures payout details")
      return
    }

    const cleanedVenturesProfile: VenturesProfileMetadata = {
      bankName: formData.bankName.trim() || undefined,
      bankAccountNumber: formData.bankAccountNumber.trim() || undefined,
      bankAccountHolder: formData.bankAccountHolder.trim() || undefined,
      preferredPayoutMethod: formData.preferredPayoutMethod,
      mobileMoneyProvider:
        formData.preferredPayoutMethod === "mobile_money"
          ? formData.mobileMoneyProvider
          : undefined,
      mobileMoneyNumber:
        formData.preferredPayoutMethod === "mobile_money"
          ? formData.mobileMoneyNumber.trim() || undefined
          : undefined,
      emergencyContactName: formData.emergencyContactName.trim() || undefined,
      emergencyContactPhone: formData.emergencyContactPhone.trim() || undefined,
    }

    if (
      cleanedVenturesProfile.preferredPayoutMethod === "mobile_money" &&
      !cleanedVenturesProfile.mobileMoneyNumber
    ) {
      toast.error("Mobile money number is required for mobile money payouts")
      return
    }

    if (
      cleanedVenturesProfile.preferredPayoutMethod === "bank" &&
      (!cleanedVenturesProfile.bankName ||
        !cleanedVenturesProfile.bankAccountNumber ||
        !cleanedVenturesProfile.bankAccountHolder)
    ) {
      toast.error("Bank name, account number, and account holder are required")
      return
    }

    setLoading(true)
    try {
      await onUpdate({
        metadata: {
          ...(profile.metadata || {}),
          venturesProfile: cleanedVenturesProfile,
        },
      })
      toast.success("Ventures payout details updated successfully")
      setIsEditing(false)
    } catch (error: any) {
      toast.error(error.message || "Failed to update ventures profile")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <HandCoins className="h-5 w-5" />
              Ventures Financial Details
            </CardTitle>
            <CardDescription>
              Payout destination and emergency contact used for contributions,
              loans, and urgent communication.
            </CardDescription>
          </div>
          <div className="flex space-x-2">
            {canEditVentures && isEditing ? (
              <>
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={loading}>
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={loading} size="sm">
                  {loading ? (
                    <>
                      <Loader className="mr-2 h-4 w-4" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save
                    </>
                  )}
                </Button>
              </>
            ) : canEditVentures ? (
              <Button onClick={() => setIsEditing(true)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
            ) : (
              <Button
                variant="outline"
                disabled
                title="Only authorized roles can edit payout details">
                <Edit className="mr-2 h-4 w-4" />
                Read only
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {!canEditVentures && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You can view these details, but only members and authorized
              leadership can edit payout information.
            </AlertDescription>
          </Alert>
        )}

        <Alert variant="info">
          <AlertDescription className="text-blue-700!">
            These details are used internally by leadership for loan
            disbursement and record matching. Keep them up to date.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Preferred Payout Method
          </Label>
          {isEditing ? (
            <Select
              value={formData.preferredPayoutMethod}
              onValueChange={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  preferredPayoutMethod: value as PayoutMethod,
                }))
              }>
              <SelectTrigger>
                <SelectValue placeholder="Select payout method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mobile_money">Mobile Money</SelectItem>
                <SelectItem value="bank">Bank Transfer</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <div className="rounded-md bg-muted/50 p-3">
              <p className="text-sm capitalize">
                {(ventures.preferredPayoutMethod || "Not provided").replace(
                  "_",
                  " "
                )}
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="bankName" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Bank Name
            </Label>
            {isEditing ? (
              <Input
                id="bankName"
                value={formData.bankName}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, bankName: e.target.value }))
                }
                placeholder="Equity Bank Rwanda"
                disabled={loading || formData.preferredPayoutMethod !== "bank"}
              />
            ) : (
              <div className="rounded-md bg-muted/50 p-3">
                <p className="text-sm">{ventures.bankName || "Not provided"}</p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="bankAccountNumber"
              className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Bank Account Number
            </Label>
            {isEditing ? (
              <Input
                id="bankAccountNumber"
                value={formData.bankAccountNumber}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    bankAccountNumber: e.target.value,
                  }))
                }
                placeholder="1234567890"
                disabled={loading || formData.preferredPayoutMethod !== "bank"}
              />
            ) : (
              <div className="rounded-md bg-muted/50 p-3">
                <p className="text-sm">
                  {maskAccountNumber(ventures.bankAccountNumber)}
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="bankAccountHolder"
              className="flex items-center gap-2">
              <UserRound className="h-4 w-4" />
              Account Holder
            </Label>
            {isEditing ? (
              <Input
                id="bankAccountHolder"
                value={formData.bankAccountHolder}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    bankAccountHolder: e.target.value,
                  }))
                }
                placeholder="Name on bank account"
                disabled={loading || formData.preferredPayoutMethod !== "bank"}
              />
            ) : (
              <div className="rounded-md bg-muted/50 p-3">
                <p className="text-sm">
                  {ventures.bankAccountHolder || "Not provided"}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label
              htmlFor="mobileMoneyProvider"
              className="flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              Mobile Money Provider
            </Label>
            {isEditing ? (
              <Select
                value={formData.mobileMoneyProvider}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    mobileMoneyProvider: value as MobileMoneyProvider,
                  }))
                }
                disabled={formData.preferredPayoutMethod !== "mobile_money"}>
                <SelectTrigger id="mobileMoneyProvider">
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mtn">MTN Mobile Money</SelectItem>
                  <SelectItem value="airtel">Airtel Money</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <div className="rounded-md bg-muted/50 p-3">
                <p className="text-sm uppercase">
                  {ventures.mobileMoneyProvider || "Not provided"}
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="mobileMoneyNumber"
              className="flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              Mobile Money Number
            </Label>
            {isEditing ? (
              <Input
                id="mobileMoneyNumber"
                value={formData.mobileMoneyNumber}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    mobileMoneyNumber: e.target.value,
                  }))
                }
                placeholder="e.g. +2507XXXXXXXX"
                disabled={
                  loading || formData.preferredPayoutMethod !== "mobile_money"
                }
              />
            ) : (
              <div className="rounded-md bg-muted/50 p-3">
                <p className="text-sm">
                  {ventures.mobileMoneyNumber || "Not provided"}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label
              htmlFor="emergencyContactName"
              className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Emergency Contact Name
            </Label>
            {isEditing ? (
              <Input
                id="emergencyContactName"
                value={formData.emergencyContactName}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    emergencyContactName: e.target.value,
                  }))
                }
                placeholder="Emergency contact full name"
                disabled={loading}
              />
            ) : (
              <div className="rounded-md bg-muted/50 p-3">
                <p className="text-sm">
                  {ventures.emergencyContactName || "Not provided"}
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="emergencyContactPhone"
              className="flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              Emergency Contact Phone
            </Label>
            {isEditing ? (
              <Input
                id="emergencyContactPhone"
                value={formData.emergencyContactPhone}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    emergencyContactPhone: e.target.value,
                  }))
                }
                placeholder="e.g. +2507XXXXXXXX"
                disabled={loading}
              />
            ) : (
              <div className="rounded-md bg-muted/50 p-3">
                <p className="text-sm">
                  {ventures.emergencyContactPhone || "Not provided"}
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>

      <UnsavedChangesDialog
        open={navGuard.active}
        onCancel={navGuard.reject}
        onDiscard={navGuard.accept}
      />
    </Card>
  )
}
