// components\settings\preference-settings.tsx
"use client"

import { useState } from "react"
import {
  Bell,
  Globe,
  Info,
  Mail,
  Moon,
  Palette,
  Shield,
  Sun,
} from "lucide-react"

import type { UserSettings } from "@/hooks/use-settings"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"

import { Label } from "../ui/label"

interface PreferenceSettingsProps {
  settings: UserSettings
  onUpdateSettings: (
    updates: any
  ) => Promise<{ success: boolean; requiresVerification?: boolean }>
  updating: boolean
}

export function PreferenceSettings({
  settings,
  onUpdateSettings,
  updating,
}: PreferenceSettingsProps) {
  const [preferences, setPreferences] = useState({
    emailNotifications: settings.emailNotifications,
    smsNotifications: settings.smsNotifications,
    securityEmails: settings.securityEmails,
    language: settings.language,
    theme: settings.theme,
  })

  const handlePreferenceUpdate = async (
    key: keyof typeof preferences,
    value: boolean | string
  ) => {
    try {
      await onUpdateSettings({ [key]: value })
      setPreferences((prev) => ({ ...prev, [key]: value }))
      // toast.success("Preference updated");
    } catch (error: any) {
      // toast.error(error.message);
      console.error("Preference update error:", error)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Preferences
          </CardTitle>
          <CardDescription>
            Choose what notifications you&apos;d like to receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-blue-600" />
                <span className="font-medium">Email Notifications</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Account updates, feature announcements, and general information
              </p>
            </div>
            <Switch
              checked={preferences.emailNotifications}
              onCheckedChange={(checked) =>
                handlePreferenceUpdate("emailNotifications", checked)
              }
              disabled={updating}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-green-600" />
                <span className="font-medium">SMS Notifications</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Instant alerts via text message
              </p>
            </div>
            <Switch
              checked={preferences.smsNotifications}
              onCheckedChange={(checked) =>
                handlePreferenceUpdate("smsNotifications", checked)
              }
              disabled={updating}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <Shield className="h-4 w-4 text-red-600" />
                <span className="font-medium">Security Emails</span>
                <span className="rounded bg-red-100 px-2 py-1 text-xs text-red-800">
                  Recommended
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Login alerts, password changes, and security-related updates
              </p>
            </div>
            <Switch
              checked={preferences.securityEmails}
              onCheckedChange={(checked) =>
                handlePreferenceUpdate("securityEmails", checked)
              }
              disabled={updating}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Display Preferences
          </CardTitle>
          <CardDescription>Customize your interface</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Globe className="h-4 w-4 text-blue-600" />
              <Label>Language</Label>
            </div>
            <Select
              value={preferences.language}
              onValueChange={(value) =>
                handlePreferenceUpdate("language", value)
              }
              disabled={updating}>
              <SelectTrigger>
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="rw">Kinyarwanda</SelectItem>
                <SelectItem value="fr">Français</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Moon className="h-4 w-4 text-indigo-600" />
              <Label>Theme</Label>
            </div>
            <Select
              value={preferences.theme}
              onValueChange={(value) => handlePreferenceUpdate("theme", value)}
              disabled={updating}>
              <SelectTrigger>
                <SelectValue placeholder="Select theme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">
                  <Sun className="inline mr-2 h-4 w-4" /> Light
                </SelectItem>
                <SelectItem value="dark">
                  <Moon className="inline mr-2 h-4 w-4" /> Dark
                </SelectItem>
                <SelectItem value="system">
                  <Palette className="inline mr-2 h-4 w-4" /> System
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Privacy Notice */}
      <Card>
        <CardContent className="pt-6">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Privacy Notice:</strong> Your preferences are stored
              securely and you can change them at any time. We respect your
              privacy and will only send communications you&apos;ve opted into.
              Security notifications are highly recommended to keep your account
              safe.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Preference Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Preference Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="rounded-lg bg-blue-50 p-4 text-center">
              <Mail className="mx-auto mb-2 h-8 w-8 text-blue-600" />
              <p className="font-medium">Email</p>
              <p className="text-sm text-muted-foreground">
                {preferences.emailNotifications ? "Enabled" : "Disabled"}
              </p>
            </div>
            <div className="rounded-lg bg-green-50 p-4 text-center">
              <Mail className="mx-auto mb-2 h-8 w-8 text-green-600" />
              <p className="font-medium">SMS</p>
              <p className="text-sm text-muted-foreground">
                {preferences.smsNotifications ? "Enabled" : "Disabled"}
              </p>
            </div>

            <div className="rounded-lg bg-red-50 p-4 text-center">
              <Shield className="mx-auto mb-2 h-8 w-8 text-red-600" />
              <p className="font-medium">Security</p>
              <p className="text-sm text-muted-foreground">
                {preferences.securityEmails ? "Enabled" : "Disabled"}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 mt-4">
            <div className="rounded-lg bg-indigo-50 p-4 text-center">
              <Globe className="mx-auto mb-2 h-8 w-8 text-indigo-600" />
              <p className="font-medium">Language</p>
              <p className="text-sm text-muted-foreground capitalize">
                {preferences.language === "en"
                  ? "English"
                  : preferences.language === "rw"
                    ? "Kinyarwanda"
                    : "Français"}
              </p>
            </div>
            <div className="rounded-lg bg-yellow-50 p-4 text-center">
              <Palette className="mx-auto mb-2 h-8 w-8 text-yellow-600" />
              <p className="font-medium">Theme</p>
              <p className="text-sm text-muted-foreground capitalize">
                {preferences.theme}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
