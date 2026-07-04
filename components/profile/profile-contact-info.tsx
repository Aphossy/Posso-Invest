// components\profile\profile-contact-info.tsx
"use client"

import { useState } from "react"
import { type User } from "@/db/schemas"
import { isValidPhoneNumber } from "libphonenumber-js"
import { Edit, Mail, Phone, Save, X } from "lucide-react"
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
import { Label } from "@/components/ui/label"

import { Loader } from "../common/loader"
import { UnsavedChangesDialog } from "../common/unsaved-changes-dialog"
import { PhoneInput } from "../ui/phone-input"

interface ProfileContactInfoProps {
  profile: User
  onUpdate: (updates: Partial<User>) => Promise<User>
}

export function ProfileContactInfo({
  profile,
  onUpdate,
}: ProfileContactInfoProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [phoneError, setPhoneError] = useState<string | undefined>()
  const [formData, setFormData] = useState({
    phone: profile.phone || "",
  })

  // Check if form has changes
  const hasChanges = formData.phone !== (profile.phone || "")

  // Navigation guard to warn about unsaved changes when editing
  const navGuard = useNavigationGuard({
    enabled: isEditing && hasChanges,
  })

  const handleSave = async () => {
    // Validate phone if provided
    if (formData.phone && formData.phone.trim() !== "") {
      try {
        if (!isValidPhoneNumber(formData.phone)) {
          setPhoneError("Please enter a valid phone number ")
          toast.error("Please enter a valid phone number")
          return
        }
      } catch (error) {
        setPhoneError("Invalid phone number format")
        toast.error("Invalid phone number format")
        return
      }
    }

    setLoading(true)
    try {
      await onUpdate({
        phone: formData.phone || undefined,
      })
      setIsEditing(false)
      setPhoneError(undefined)
      toast.success("Contact information updated successfully")
    } catch (error: any) {
      toast.error(error.message || "Failed to update contact information")
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setFormData({
      phone: profile.phone || "",
    })
    setPhoneError(undefined)
    setIsEditing(false)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap gap-2 items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Contact Information
            </CardTitle>
            <CardDescription>
              How others can reach you and your preferences
            </CardDescription>
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
                <Button
                  onClick={handleSave}
                  disabled={loading || !!phoneError}
                  size="sm">
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
        {/* Email (Read-only) */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email Address
          </Label>
          <div className="rounded-md bg-muted/50 p-3">
            <p className="text-sm">{profile.email}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Email cannot be changed here. Use account settings to update your
              email.
            </p>
          </div>
        </div>

        {/* Phone */}
        <div className="space-y-2">
          <Label htmlFor="phone" className="flex items-center gap-2">
            <Phone className="h-4 w-4" />
            Phone Number
          </Label>
          {isEditing ? (
            <>
              <PhoneInput
                defaultCountry="RW"
                id="phone"
                disabled={loading}
                international={true}
                value={formData.phone}
                onChange={(val) => {
                  setFormData((prev) => ({ ...prev, phone: val || "" }))
                  setPhoneError(undefined)
                }}
                placeholder="+250 722 123 456"
              />
              {phoneError && (
                <p className="mt-2 text-sm text-red-500">{phoneError}</p>
              )}
            </>
          ) : (
            <div className="rounded-md bg-muted/50 p-3">
              <p className="text-sm">{profile.phone || "Not provided"}</p>
            </div>
          )}
        </div>
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
