// components\settings\general-settings.tsx
"use client"

import { formatDistanceToNow } from "date-fns"
import { AlertTriangle, Calendar, Check, Clock, Mail } from "lucide-react"

import type { UserSettings } from "@/hooks/use-settings"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

import { Label } from "../ui/label"

interface GeneralSettingsProps {
  settings: UserSettings
  onUpdateSettings: (
    updates: any
  ) => Promise<{ success: boolean; requiresVerification?: boolean }>
  updating: boolean
}

export function GeneralSettings({ settings }: GeneralSettingsProps) {
  return (
    <div className="space-y-6">
      <Card className="">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Account Information
          </CardTitle>
          <CardDescription className="">
            Your basic account information. Email changes must be requested to
            admin.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-8">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="flex space-x-2">
                <div className="rounded-md bg-muted/50 p-3 flex-1">
                  <p className="text-sm">{settings.email}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {settings.isVerified ? (
                  <Badge
                    variant="outline"
                    className="border-green-600 text-green-600">
                    <Check className="mr-1 h-3 w-3" />
                    Verified
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="border-yellow-600 text-yellow-600">
                    <AlertTriangle className="mr-1 h-3 w-3" />
                    Unverified
                  </Badge>
                )}
              </div>
              {!settings.isVerified && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Please verify your email address to secure your account and
                    receive important notifications.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Account Created
                </Label>
                <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(settings.accountCreated), {
                    addSuffix: true,
                  })}
                </p>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Last Login
                </Label>
                <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
                  {settings.lastLogin
                    ? formatDistanceToNow(new Date(settings.lastLogin), {
                        addSuffix: true,
                      })
                    : "Never"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
