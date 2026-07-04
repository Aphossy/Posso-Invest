"use client"

import { useMemo, useState } from "react"
import { type IkiminaProfileMetadata, type User } from "@/db/schemas"
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

type PayoutMethod = NonNullable<IkiminaProfileMetadata["preferredPayoutMethod"]>
type MobileMoneyProvider = NonNullable<
  IkiminaProfileMetadata["mobileMoneyProvider"]
>

const IKIMINA_ALLOWED_ROLES = new Set([
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

interface ProfileIkiminaInfoProps {
  profile: User
  onUpdate: (updates: Partial<User>) => Promise<User>
}

export function ProfileIkiminaInfo({
  profile,
  onUpdate,
}: ProfileIkiminaInfoProps) {
  const { role, session } = useActiveRole()
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)

  const metadata = profile.metadata || {}
  const ikimina = metadata.ikiminaProfile || {}

  const [formData, setFormData] = useState({
    bankName: ikimina.bankName || "",
    bankAccountNumber: ikimina.bankAccountNumber || "",
    bankAccountHolder: ikimina.bankAccountHolder || "",
    preferredPayoutMethod: (ikimina.preferredPayoutMethod ||
      "bank") as PayoutMethod,
    mobileMoneyProvider: (ikimina.mobileMoneyProvider ||
      "mtn") as MobileMoneyProvider,
    mobileMoneyNumber: ikimina.mobileMoneyNumber || "",
    emergencyContactName: ikimina.emergencyContactName || "",
    emergencyContactPhone: ikimina.emergencyContactPhone || "",
  })

  const originalData = useMemo(
    () => ({
      bankName: ikimina.bankName || "",
      bankAccountNumber: ikimina.bankAccountNumber || "",
      bankAccountHolder: ikimina.bankAccountHolder || "",
      preferredPayoutMethod: (ikimina.preferredPayoutMethod ||
        "bank") as PayoutMethod,
      mobileMoneyProvider: (ikimina.mobileMoneyProvider ||
        "mtn") as MobileMoneyProvider,
      mobileMoneyNumber: ikimina.mobileMoneyNumber || "",
      emergencyContactName: ikimina.emergencyContactName || "",
      emergencyContactPhone: ikimina.emergencyContactPhone || "",
    }),
    [
      ikimina.bankAccountHolder,
      ikimina.bankAccountNumber,
      ikimina.bankName,
      ikimina.emergencyContactName,
      ikimina.emergencyContactPhone,
      ikimina.mobileMoneyNumber,
      ikimina.mobileMoneyProvider,
      ikimina.preferredPayoutMethod,
    ]
  )

  const hasChanges = JSON.stringify(formData) !== JSON.stringify(originalData)
  const isOwner = session?.user?.id === profile.id
  const canEditIkimina = isOwner && !!role && IKIMINA_ALLOWED_ROLES.has(role)

  const navGuard = useNavigationGuard({
    enabled: isEditing && hasChanges && canEditIkimina,
  })

  const handleCancel = () => {
    setFormData(originalData)
    setIsEditing(false)
  }

  const handleSave = async () => {
    if (!canEditIkimina) {
      toast.error("You are not allowed to edit Ikimina payout details")
      return
    }

    const cleanedIkiminaProfile: IkiminaProfileMetadata = {
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
      cleanedIkiminaProfile.preferredPayoutMethod === "mobile_money" &&
      !cleanedIkiminaProfile.mobileMoneyNumber
    ) {
      toast.error("Mobile money number is required for mobile money payouts")
      return
    }

    if (
      cleanedIkiminaProfile.preferredPayoutMethod === "bank" &&
      (!cleanedIkiminaProfile.bankName ||
        !cleanedIkiminaProfile.bankAccountNumber ||
        !cleanedIkiminaProfile.bankAccountHolder)
    ) {
      toast.error("Bank name, account number, and account holder are required")
      return
    }

    setLoading(true)
    try {
      await onUpdate({
        metadata: {
          ...(profile.metadata || {}),
          ikiminaProfile: cleanedIkiminaProfile,
        },
      })
      toast.success("Ikimina payout details updated successfully")
      setIsEditing(false)
    } catch (error: any) {
      toast.error(error.message || "Failed to update ikimina profile")
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
              Ikimina Financial Details
            </CardTitle>
            <CardDescription>
              Payout destination and emergency contact used for contributions,
              loans, and urgent communication.
            </CardDescription>
          </div>
          <div className="flex space-x-2">
            {canEditIkimina && isEditing ? (
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
            ) : canEditIkimina ? (
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
        {!canEditIkimina && (
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
                {(ikimina.preferredPayoutMethod || "Not provided").replace(
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
                <p className="text-sm">{ikimina.bankName || "Not provided"}</p>
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
                  {maskAccountNumber(ikimina.bankAccountNumber)}
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
                  {ikimina.bankAccountHolder || "Not provided"}
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
                  {ikimina.mobileMoneyProvider || "Not provided"}
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
                  {ikimina.mobileMoneyNumber || "Not provided"}
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
                  {ikimina.emergencyContactName || "Not provided"}
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
                  {ikimina.emergencyContactPhone || "Not provided"}
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
