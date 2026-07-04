// components\settings\settings-header.tsx
"use client"

import { formatDistanceToNow } from "date-fns"
import {
  AlertTriangle,
  Bell,
  Check,
  ExternalLink,
  Settings,
  Shield,
} from "lucide-react"

import type { UserSettings } from "@/hooks/use-settings"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface SettingsHeaderProps {
  settings: UserSettings
  onTabChange: (tab: string) => void
}

export function SettingsHeader({ settings, onTabChange }: SettingsHeaderProps) {
  const getSecurityScore = () => {
    let score = 0
    if (settings.isVerified) score += 33
    if (settings.twoFactorEnabled) score += 33
    if (settings.lastPasswordChange) {
      const daysSinceChange = Math.floor(
        (Date.now() - new Date(settings.lastPasswordChange).getTime()) /
          (1000 * 60 * 60 * 24)
      )
      if (daysSinceChange < 90) score += 34 // Less than 90 days since last change
    }
    // if (settings.securityNotifications) score += 25;
    return score
  }

  const securityScore = getSecurityScore()

  const getScoreColor = (score: number) => {
    if (score >= 75) return "text-green-600 border-green-600"
    if (score >= 50) return "text-yellow-600 border-yellow-600"
    return "text-red-600 border-red-600"
  }

  const getScoreText = (score: number) => {
    if (score >= 75) return "Excellent"
    if (score >= 50) return "Good"
    return "Needs Improvement"
  }

  return (
    <Card className="relative overflow-hidden">
      <div className="absolute inset-0 bg-linear-to-r from-blue-600/10 to-emerald-600/20" />
      <CardContent className="relative md:p-8">
        <div className="flex flex-col items-start gap-2 lg:gap-20 lg:flex-row lg:items-center">
          {/* Settings Icon */}
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
              <Settings className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Account Settings</h1>
              <p className="text-muted-foreground">Manage your preferences</p>
            </div>
          </div>

          {/* Stats */}
          <div className="hidden md:grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="text-center hidden md:block lg:text-left">
              <div className="flex items-center justify-center gap-2 lg:justify-start">
                <Shield className="h-4 w-4 text-blue-600" />
                <Badge
                  variant="outline"
                  className={getScoreColor(securityScore)}>
                  {getScoreText(securityScore)}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">Security Score</p>
            </div>

            <div className="text-center lg:text-left hidden sm:block">
              <div className="flex items-center justify-center gap-2 lg:justify-start">
                <Bell className="h-4 w-4 text-green-600" />
                <span className="font-medium">
                  {
                    [
                      settings.emailNotifications,
                      settings.smsNotifications,

                      settings.securityEmails,
                    ].filter(Boolean).length
                  }
                  /4
                </span>
              </div>
              <p className="text-sm text-muted-foreground">Notifications</p>
            </div>

            <div className="text-center lg:text-left">
              <div className="flex items-center justify-center gap-2 lg:justify-start">
                <Settings className="h-4 w-4 text-emerald-600" />
                <span className="font-medium">
                  {settings.lastLogin
                    ? formatDistanceToNow(new Date(settings.lastLogin), {
                        addSuffix: true,
                      })
                    : "Never"}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">Last Login</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="hidden md:flex gap-3">
            <Button variant="outline" size="sm">
              <ExternalLink className="w-4 h-4 mr-2" />
              Help
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
