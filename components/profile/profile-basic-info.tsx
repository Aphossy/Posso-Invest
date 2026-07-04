// components\profile\profile-basic-info.tsx
"use client"

import { useState } from "react"
import { type User } from "@/db/schemas"
import { Calendar, Edit, FileText, Save, UserIcon, X } from "lucide-react"
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
import { Textarea } from "@/components/ui/textarea"

import { Loader } from "../common/loader"
import { UnsavedChangesDialog } from "../common/unsaved-changes-dialog"

interface ProfileBasicInfoProps {
  profile: User
  onUpdate: (updates: Partial<User>) => Promise<User>
}

export function ProfileBasicInfo({ profile, onUpdate }: ProfileBasicInfoProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: profile.name || "",
    bio: profile.bio || "",
    dateOfBirth: profile.dateOfBirth
      ? new Date(profile.dateOfBirth).toISOString().split("T")[0]
      : "",
  })

  // Check if form has changes
  const hasChanges =
    formData.name.trim() !== (profile.name || "") ||
    formData.bio.trim() !== (profile.bio || "") ||
    formData.dateOfBirth !==
      (profile.dateOfBirth
        ? new Date(profile.dateOfBirth).toISOString().split("T")[0]
        : "")

  // Navigation guard to warn about unsaved changes when editing
  const navGuard = useNavigationGuard({
    enabled: isEditing && hasChanges,
  })

  const handleSave = async () => {
    if (!hasChanges) {
      toast.info("No changes detected")
      setIsEditing(false)
      return
    }

    setLoading(true)
    try {
      await onUpdate({
        name: formData.name.trim() || undefined,
        bio: formData.bio.trim() || undefined,
        dateOfBirth: formData.dateOfBirth || undefined,
      })
      setIsEditing(false)
    } catch (error: any) {
      // Error already handled in hook with toast
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setFormData({
      name: profile.name || "",
      bio: profile.bio || "",
      dateOfBirth: profile.dateOfBirth
        ? new Date(profile.dateOfBirth).toISOString().split("T")[0]
        : "",
    })
    setIsEditing(false)
  }

  return (
    <Card className="transition-all duration-200 hover:shadow-md">
      <CardHeader>
        <div className="flex flex-wrap gap-2 items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Basic Information
            </CardTitle>
            <CardDescription>
              Your personal details and basic information
            </CardDescription>
          </div>
          <div className="flex space-x-2">
            {isEditing ? (
              <>
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={loading}
                  size="sm">
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
              <Button onClick={() => setIsEditing(true)} size="sm">
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Name Field */}
        <div className="space-y-2">
          <Label htmlFor="name" className="flex items-center gap-2 font-medium">
            <UserIcon className="h-4 w-4 text-muted-foreground" />
            Full Name
          </Label>
          {isEditing ? (
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  name: e.target.value,
                }))
              }
              placeholder="Enter your full name"
              disabled={loading}
              className="transition-all duration-200"
            />
          ) : (
            <div className="rounded-md bg-muted/50 p-3 transition-colors hover:bg-muted">
              <p className="text-sm">{profile.name || "Not provided"}</p>
            </div>
          )}
        </div>

        {/* Date of Birth */}
        <div className="space-y-2">
          <Label
            htmlFor="dateOfBirth"
            className="flex items-center gap-2 font-medium">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            Date of Birth
          </Label>
          {isEditing ? (
            <Input
              id="dateOfBirth"
              type="date"
              value={formData.dateOfBirth}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  dateOfBirth: e.target.value,
                }))
              }
              disabled={loading}
              max={
                new Date(Date.now() - 5 * 365 * 24 * 60 * 60 * 1000)
                  .toISOString()
                  .split("T")[0]
              }
              className="transition-all duration-200"
            />
          ) : (
            <div className="rounded-md bg-muted/50 p-3 transition-colors hover:bg-muted">
              <p className="text-sm">
                {profile.dateOfBirth
                  ? new Date(profile.dateOfBirth).toLocaleDateString("en-RW", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "Not provided"}
              </p>
            </div>
          )}
        </div>

        {/* Bio */}
        <div className="space-y-2">
          <Label htmlFor="bio" className="flex items-center gap-2 font-medium">
            <FileText className="h-4 w-4 text-muted-foreground" />
            Bio
          </Label>
          {isEditing ? (
            <>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, bio: e.target.value }))
                }
                placeholder="Tell us about yourself..."
                rows={4}
                disabled={loading}
                maxLength={500}
                className="resize-none transition-all duration-200"
              />
              <div className="flex justify-between">
                <p className="text-xs text-muted-foreground">
                  {formData.bio.length}/500 characters
                </p>
                {formData.bio.length > 450 && (
                  <p className="text-xs text-amber-600">
                    {500 - formData.bio.length} characters remaining
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="min-h-25 rounded-md bg-muted/50 p-3 transition-colors hover:bg-muted">
              <p className="text-sm whitespace-pre-wrap">
                {profile.bio || "No bio provided"}
              </p>
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
