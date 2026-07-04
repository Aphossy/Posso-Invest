// components\profile\profile-header.tsx
"use client"

import type { Route } from "next"
import { useRouter } from "next/navigation"
import { type User } from "@/db/schemas"
import { getRoleBadgeColor, getRoleDisplayName } from "@/utils/role-utils"
import { Settings, Share2 } from "lucide-react"
import { toast } from "sonner"

import { useActiveRole } from "@/hooks/use-active-role"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

import { ProfilePictureUpload } from "./profile-picture-upload"

interface ProfileHeaderProps {
  profile: User
  onUpdate: (updates: Partial<User>) => Promise<any>
}

export function ProfileHeader({ profile, onUpdate }: ProfileHeaderProps) {
  const { role } = useActiveRole()
  const getProfileCompletion = () => {
    const ikiminaProfile = profile.metadata?.ikiminaProfile
    const fields = [
      profile.name,
      profile.email,
      profile.phone,
      profile.bio,
      profile.dateOfBirth,
      profile.address?.district,
      profile.address?.sector,
      profile.address?.cell,
      profile.address?.village,
      profile.address?.city,
      ikiminaProfile?.preferredPayoutMethod,
      ikiminaProfile?.bankName,
      ikiminaProfile?.bankAccountNumber,
      ikiminaProfile?.bankAccountHolder,
      ikiminaProfile?.mobileMoneyProvider,
      ikiminaProfile?.mobileMoneyNumber,
      ikiminaProfile?.emergencyContactName,
      ikiminaProfile?.emergencyContactPhone,
    ]
    const filledFields = fields.filter(
      (field) => field && field.toString().trim() !== ""
    ).length
    return Math.round((filledFields / fields.length) * 100)
  }

  const profileCompletion = getProfileCompletion()

  const router = useRouter()

  const getProfileLink = () => {
    switch (role) {
      case "admin":
        return "/admin/profile"
      case "president":
        return "/president/profile"
      case "treasurer":
        return "/treasurer/profile"
      case "secretary":
        return "/secretary/profile"
      default:
        return "/member/profile"
    }
  }

  const getSettingsLink = () => {
    switch (role) {
      case "admin":
        return "/admin/settings"
      case "president":
        return "/president/settings"
      case "treasurer":
        return "/treasurer/settings"
      case "secretary":
        return "/secretary/settings"
      default:
        return "/member/settings"
    }
  }

  const handleSettingsClick = () => {
    // Navigate to the settings page
    router.push(getSettingsLink() as Route)
  }

  // Handle share profile url
  const handleShareClick = () => {
    const profileUrl = `${window.location.origin}${getProfileLink()}`
    navigator.clipboard
      .writeText(profileUrl)
      .then(() => {
        toast.success("Profile URL copied to clipboard!")
      })
      .catch((error) => {
        console.error("Failed to copy profile URL:", error)
        toast.error("Failed to copy profile URL")
      })
  }

  const handleAvatarUpdate = async (image: string) => {
    try {
      // Update the profile with the new avatar URL
      await onUpdate({
        image,
      })
    } catch (error) {
      console.error("Error updating avatar:", error)
      throw error // Re-throw to let the upload component handle the error
    }
  }

  return (
    <Card className="relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-linear-to-r from-blue-600/10 to-emerald-400/20" />
      <CardContent className="relative py-4">
        <div className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
          {/* Avatar and Basic Info */}
          <div className="flex items-center gap-4">
            <ProfilePictureUpload
              currentAvatarUrl={profile.image || "/placeholder-user.jpg"}
              name={profile.name || "U"}
              onAvatarUpdate={handleAvatarUpdate}
              size="lg"
            />
            <div>
              <h1 className="text-2xl font-bold md:text-3xl">{profile.name}</h1>
              <p className="text-lg text-muted-foreground">{profile.email}</p>
              <div className="mt-2 flex items-center gap-2">
                <Badge
                  className={`${getRoleBadgeColor(role as any)} px-2 py-1 rounded-md ring-1 ring-inset ring-gray-200 flex items-center gap-2`}>
                  {getRoleDisplayName(role as any)}
                </Badge>
                {profile.emailVerified && (
                  <Badge
                    variant="outline"
                    className="flex items-center gap-2 border-green-600 bg-green-50/60 text-green-700 px-2 py-1 rounded-md ring-1 ring-green-100"
                    title="Email verified"
                    aria-label="Email verified">
                    <span className="text-xs font-medium">Email Verified</span>
                  </Badge>
                )}{" "}
                {profile.banned && <Badge variant="destructive">Banned</Badge>}
              </div>
            </div>
          </div>

          {/* Bio */}
          {profile.bio && (
            <div className="flex-1 md:mx-6">
              <p className="leading-relaxed text-muted-foreground">
                {profile.bio}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleShareClick}>
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </Button>
            <Button variant="outline" size="sm" onClick={handleSettingsClick}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="mt-6 flex flex-wrap justify-between  pt-4 border-t ">
          <div className=" pl-0 md:pl-22">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {profileCompletion}%
              </div>
              <div className="text-sm text-muted-foreground">
                Profile Complete
              </div>
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {new Date(profile.createdAt ?? "").toLocaleDateString("en-RW", {
                month: "short",
                year: "numeric",
              })}
            </div>
            <div className="text-sm text-muted-foreground">Member Since</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
