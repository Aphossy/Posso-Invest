// components\dashboard\settings\page.tsx
"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, Bell, Clock, Settings, Shield } from "lucide-react"
import { parseAsString, useQueryState } from "nuqs"

import { useSettings } from "@/hooks/use-settings"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SessionManager } from "@/components/auth/session/session-manager"
import { GeneralSettings } from "@/components/settings/general-settings"
import { PreferenceSettings } from "@/components/settings/preference-settings"
import { SecuritySettings } from "@/components/settings/security-settings"
import { SettingsHeader } from "@/components/settings/settings-header"
import { SettingsSkeleton } from "@/components/settings/settings-skeleton"

export default function SettingsPage() {
  const { settings, loading, error, updateSettings } = useSettings()
  const [activeTab, setActiveTab] = useQueryState(
    "tab",
    parseAsString.withOptions({ history: "replace" }).withDefault("general")
  )
  const [updating, setUpdating] = useState(false)

  type UpdateSettingsResult = {
    success: boolean
    requiresVerification?: boolean
  }

  const handleUpdateSettings = async (
    updates: any
  ): Promise<UpdateSettingsResult> => {
    setUpdating(true)
    try {
      const result = (await updateSettings(updates)) as UpdateSettingsResult
      return {
        success: result?.success ?? false,
        requiresVerification: result?.requiresVerification,
      }
    } finally {
      setUpdating(false)
    }
  }

  // Validate activeTab
  useEffect(() => {
    if (
      !["general", "security", "preferences", "session"].includes(activeTab)
    ) {
      setActiveTab("general")
    }
  }, [activeTab, setActiveTab])

  // Loading state
  if (loading) {
    return <SettingsSkeleton />
  }

  // Error state
  if (error) {
    return (
      <div className="container mx-auto max-w-6xl ">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  // Not authenticated or no settings
  if (!settings) {
    return null
  }

  const currentTab = activeTab ?? "general"

  return (
    <div className="container mx-auto space-y-6 ">
      {/* Header */}
      <SettingsHeader
        settings={settings}
        onTabChange={(tab: string) => setActiveTab(tab)}
      />

      <Tabs
        value={currentTab}
        onValueChange={(value) => setActiveTab(value)}
        className="space-y-4 w-full ">
        <TabsList className="grid w-full grid-cols-2   md:grid-cols-4">
          <TabsTrigger
            value="general"
            className="flex items-center justify-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>General</span>
          </TabsTrigger>
          <TabsTrigger
            value="security"
            className="flex items-center justify-center space-x-2">
            <Shield className="h-4 w-4" />
            <span>Account & Security</span>
          </TabsTrigger>
          <TabsTrigger
            value="preferences"
            className="flex items-center justify-center space-x-2">
            <Bell className="h-4 w-4" />
            <span>Preferences</span>
          </TabsTrigger>
          <TabsTrigger
            value="session"
            className="flex items-center justify-center space-x-2">
            <Clock className="h-4 w-4" />
            <span>Session</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="rounded-lg bg-card ">
          <GeneralSettings
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            updating={updating}
          />
        </TabsContent>
        <TabsContent value="security" className="rounded-lg bg-card ">
          <SecuritySettings
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            updating={updating}
          />
        </TabsContent>
        <TabsContent value="preferences" className="rounded-lg bg-card ">
          <PreferenceSettings
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            updating={updating}
          />
        </TabsContent>
        <TabsContent value="session" className="rounded-lg bg-card ">
          <SessionManager />
        </TabsContent>
      </Tabs>
    </div>
  )
}
