// components\dashboard\profile\page.tsx
"use client"

import { Suspense, useEffect, useTransition } from "react"
import {
  AlertCircle,
  HandCoins,
  MapPin,
  Phone,
  RefreshCw,
  User,
} from "lucide-react"
import { parseAsString, useQueryState } from "nuqs"

import { useProfile } from "@/hooks/use-profile"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProfileAddressInfo } from "@/components/profile/profile-address-info"
import { ProfileBasicInfo } from "@/components/profile/profile-basic-info"
import { ProfileContactInfo } from "@/components/profile/profile-contact-info"
import { ProfileHeader } from "@/components/profile/profile-header"
import { ProfileIkiminaInfo } from "@/components/profile/profile-ikimina-info"
import { ProfileSkeleton } from "@/components/profile/profile-skeleton"

export default function ProfilePage() {
  const { profile, loading, error, updateProfile, refetch } = useProfile()
  const [isPending, startTransition] = useTransition()
  const [activeTab, setActiveTab] = useQueryState(
    "tab",
    parseAsString.withOptions({ history: "replace" }).withDefault("overview")
  )

  // Validate activeTab
  useEffect(() => {
    if (!["overview", "contact", "address", "ikimina"].includes(activeTab)) {
      setActiveTab("overview")
    }
  }, [activeTab, setActiveTab])

  // Show skeleton while loading OR when profile exists but is being updated
  if (loading && !profile) {
    return <ProfileSkeleton />
  }

  // Show error state with retry option
  if (error && !profile) {
    return (
      <div className="container mx-auto p-2">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => startTransition(() => refetch())}
              disabled={isPending}>
              <RefreshCw
                className={`h-4 w-4 mr-2 ${isPending ? "animate-spin" : ""}`}
              />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // Show profile not found only when explicitly no profile
  if (!loading && !profile) {
    return (
      <div className="container mx-auto p-2">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>Profile not found. Please try refreshing the page.</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => startTransition(() => refetch())}
              disabled={isPending}>
              <RefreshCw
                className={`h-4 w-4 mr-2 ${isPending ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const currentTab = activeTab ?? "overview"

  return (
    <div className="container mx-auto space-y-8">
      {/* Profile Header */}
      <div className={loading ? "opacity-60 pointer-events-none" : ""}>
        <ProfileHeader profile={profile!} onUpdate={updateProfile} />
      </div>

      {/* Profile Content */}
      <Tabs
        value={currentTab}
        onValueChange={(value) => setActiveTab(value)}
        className="space-y-6">
        <TabsList className="" variant="underline">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span className="inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="contact" className="flex items-center gap-2">
            <Phone className="h-4 w-4" />
            <span className="inline">Contact</span>
          </TabsTrigger>
          <TabsTrigger value="address" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <span className="inline">Address</span>
          </TabsTrigger>
          <TabsTrigger value="ikimina" className="flex items-center gap-2">
            <HandCoins className="h-4 w-4" />
            <span className="inline">Ikimina</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Suspense fallback={<ProfileSkeleton />}>
            <ProfileBasicInfo profile={profile!} onUpdate={updateProfile} />
          </Suspense>
        </TabsContent>

        <TabsContent value="contact" className="space-y-6">
          <Suspense fallback={<ProfileSkeleton />}>
            <ProfileContactInfo profile={profile!} onUpdate={updateProfile} />
          </Suspense>
        </TabsContent>

        <TabsContent value="address" className="space-y-6">
          <Suspense fallback={<ProfileSkeleton />}>
            <ProfileAddressInfo profile={profile!} onUpdate={updateProfile} />
          </Suspense>
        </TabsContent>

        <TabsContent value="ikimina" className="space-y-6">
          <Suspense fallback={<ProfileSkeleton />}>
            <ProfileIkiminaInfo profile={profile!} onUpdate={updateProfile} />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  )
}
