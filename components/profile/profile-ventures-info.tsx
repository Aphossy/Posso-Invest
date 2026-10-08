"use client"

import { useMemo, useState } from "react"
import type { User, VenturesProfileMetadata } from "@/db/schemas"
import { AlertCircle, Edit, Save, Smartphone, UserRound, X } from "lucide-react"
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

import { Loader } from "../common/loader"
import { UnsavedChangesDialog } from "../common/unsaved-changes-dialog"

interface ProfileVenturesInfoProps {
  profile: User
  onUpdate: (updates: Partial<User>) => Promise<User>
}

export function ProfileVenturesInfo({
  profile,
  onUpdate,
}: ProfileVenturesInfoProps) {
  const { session } = useActiveRole()
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)

  const metadata = profile.metadata || {}
  const ventures = metadata.venturesProfile || {}

  const [formData, setFormData] = useState({
    emergencyContactName: ventures.emergencyContactName || "",
    emergencyContactPhone: ventures.emergencyContactPhone || "",
  })

  const originalData = useMemo(
    () => ({
      emergencyContactName: ventures.emergencyContactName || "",
      emergencyContactPhone: ventures.emergencyContactPhone || "",
    }),
    [ventures.emergencyContactName, ventures.emergencyContactPhone]
  )

  const hasChanges = JSON.stringify(formData) !== JSON.stringify(originalData)
  const isOwner = session?.user?.id === profile.id

  const navGuard = useNavigationGuard({
    enabled: isEditing && hasChanges && isOwner,
  })

  const handleCancel = () => {
    setFormData(originalData)
    setIsEditing(false)
  }

  const handleSave = async () => {
    if (!isOwner) {
      toast.error("You are not allowed to edit emergency contact details.")
      return
    }

    const updatedVenturesProfile: VenturesProfileMetadata = {
      ...ventures,
      emergencyContactName: formData.emergencyContactName.trim() || undefined,
      emergencyContactPhone: formData.emergencyContactPhone.trim() || undefined,
    }

    setLoading(true)
    try {
      await onUpdate({
        metadata: {
          ...metadata,
          venturesProfile: updatedVenturesProfile,
        },
      })
      toast.success("Emergency contact details updated.")
      setIsEditing(false)
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update emergency contact details."
      )
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
              <AlertCircle className="size-5" />
              Emergency Contact
            </CardTitle>
            <CardDescription>
              Contact information for urgent communication.
            </CardDescription>
          </div>
          {isOwner && isEditing ? (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={loading}>
                <X className="mr-2 size-4" />
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={loading} size="sm">
                {loading ? (
                  <Loader className="mr-2 size-4" />
                ) : (
                  <Save className="mr-2 size-4" />
                )}
                {loading ? "Saving..." : "Save"}
              </Button>
            </div>
          ) : isOwner ? (
            <Button onClick={() => setIsEditing(true)}>
              <Edit className="mr-2 size-4" />
              Edit
            </Button>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {!isOwner ? (
          <Alert>
            <AlertCircle className="size-4" />
            <AlertDescription>
              Only the profile owner can view or edit emergency contact details.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label
                htmlFor="emergencyContactName"
                className="flex items-center gap-2">
                <UserRound className="size-4" />
                Emergency Contact Name
              </Label>
              {isEditing ? (
                <Input
                  id="emergencyContactName"
                  value={formData.emergencyContactName}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      emergencyContactName: event.target.value,
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
                <Smartphone className="size-4" />
                Emergency Contact Phone
              </Label>
              {isEditing ? (
                <Input
                  id="emergencyContactPhone"
                  value={formData.emergencyContactPhone}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      emergencyContactPhone: event.target.value,
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
        )}
      </CardContent>

      <UnsavedChangesDialog
        open={navGuard.active}
        onCancel={navGuard.reject}
        onDiscard={navGuard.accept}
      />
    </Card>
  )
}
