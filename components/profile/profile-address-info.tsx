// components\profile\profile-address-info.tsx
"use client"

import { useState } from "react"
import { type User } from "@/db/schemas"
import { Building, Edit, Home, MapPin, Navigation, Save, X } from "lucide-react"
import { useNavigationGuard } from "next-navigation-guard"
import { toast } from "sonner"

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

import { Loader } from "../common/loader"
import { UnsavedChangesDialog } from "../common/unsaved-changes-dialog"

interface ProfileAddressInfoProps {
  profile: User
  onUpdate: (updates: Partial<User>) => Promise<User>
}

export function ProfileAddressInfo({
  profile,
  onUpdate,
}: ProfileAddressInfoProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    district: profile.address?.district || "",
    sector: profile.address?.sector || "",
    cell: profile.address?.cell || "",
    village: profile.address?.village || "",
    city: profile.address?.city || "",
  })

  // Check if form has changes
  const hasChanges =
    formData.district !== (profile.address?.district || "") ||
    formData.sector !== (profile.address?.sector || "") ||
    formData.cell !== (profile.address?.cell || "") ||
    formData.village !== (profile.address?.village || "") ||
    formData.city !== (profile.address?.city || "")

  // Navigation guard to warn about unsaved changes when editing
  const navGuard = useNavigationGuard({
    enabled: isEditing && hasChanges,
  })

  const handleSave = async () => {
    setLoading(true)
    try {
      const addressData = {
        district: formData.district.trim() || undefined,
        sector: formData.sector.trim() || undefined,
        cell: formData.cell.trim() || undefined,
        village: formData.village.trim() || undefined,
        city: formData.city.trim() || undefined,
      }

      const hasData = Object.values(addressData).some((v) => v !== undefined)

      await onUpdate({
        address: hasData ? addressData : undefined,
      })
      setIsEditing(false)
      toast.success("Address information updated successfully")
    } catch (error: any) {
      toast.error(error.message || "Failed to update address information")
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setFormData({
      district: profile.address?.district || "",
      sector: profile.address?.sector || "",
      cell: profile.address?.cell || "",
      village: profile.address?.village || "",
      city: profile.address?.city || "",
    })
    setIsEditing(false)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap gap-2 items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Address Information
            </CardTitle>
            <CardDescription>Your physical address</CardDescription>
          </div>
          <div className="flex space-x-2">
            {isEditing ? (
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
            ) : (
              <Button onClick={() => setIsEditing(true)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* District and Sector */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="district" className="flex items-center gap-2">
              <Building className="h-4 w-4" />
              District
            </Label>
            {isEditing ? (
              <Input
                id="district"
                value={formData.district}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, district: e.target.value }))
                }
                placeholder="e.g., Kigali"
                disabled={loading}
              />
            ) : (
              <div className="rounded-md bg-muted/50 p-3">
                <p className="text-sm">
                  {profile.address?.district || "Not provided"}
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="sector" className="flex items-center gap-2">
              <Navigation className="h-4 w-4" />
              Sector
            </Label>
            {isEditing ? (
              <Input
                id="sector"
                value={formData.sector}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, sector: e.target.value }))
                }
                placeholder="e.g., Nyarugenge"
                disabled={loading}
              />
            ) : (
              <div className="rounded-md bg-muted/50 p-3">
                <p className="text-sm">
                  {profile.address?.sector || "Not provided"}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Cell and Village */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="cell" className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              Cell
            </Label>
            {isEditing ? (
              <Input
                id="cell"
                value={formData.cell}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, cell: e.target.value }))
                }
                placeholder="e.g., Nyakabanda"
                disabled={loading}
              />
            ) : (
              <div className="rounded-md bg-muted/50 p-3">
                <p className="text-sm">
                  {profile.address?.cell || "Not provided"}
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="village" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Village
            </Label>
            {isEditing ? (
              <Input
                id="village"
                value={formData.village}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, village: e.target.value }))
                }
                placeholder="e.g., Kimisagara"
                disabled={loading}
              />
            ) : (
              <div className="rounded-md bg-muted/50 p-3">
                <p className="text-sm">
                  {profile.address?.village || "Not provided"}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* City */}
        <div className="space-y-2">
          <Label htmlFor="city" className="flex items-center gap-2">
            <Building className="h-4 w-4" />
            City
          </Label>
          {isEditing ? (
            <Input
              id="city"
              value={formData.city}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, city: e.target.value }))
              }
              placeholder="e.g., Kigali"
              disabled={loading}
            />
          ) : (
            <div className="rounded-md bg-muted/50 p-3">
              <p className="text-sm">
                {profile.address?.city || "Not provided"}
              </p>
            </div>
          )}
        </div>

        {/* Full Address Display */}
        {profile.address && Object.values(profile.address).some((v) => v) && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <h4 className="mb-2 font-medium text-blue-900">Complete Address</h4>
            <p className="text-blue-800">
              {[
                profile.address.village,
                profile.address.cell,
                profile.address.sector,
                profile.address.district,
                profile.address.city,
              ]
                .filter(Boolean)
                .join(", ")}
            </p>
          </div>
        )}
      </CardContent>

      {/* Unsaved Changes Dialog */}
      <UnsavedChangesDialog
        open={navGuard.active}
        onCancel={navGuard.reject}
        onDiscard={navGuard.accept}
      />
    </Card>
  )
}
