"use client"

import { formatDistanceToNow, parseISO } from "date-fns"
import { motion } from "framer-motion"
import {
  Calendar,
  Clock,
  Globe,
  Laptop,
  MapPin,
  Monitor,
  Smartphone,
  Tablet,
  Trash2,
} from "lucide-react"

import { type SessionInfo } from "@/hooks/use-sessions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader } from "@/components/common/loader"

// Session Card Component
interface SessionCardProps {
  session: SessionInfo
  isTerminating: boolean
  onTerminate: (sessionId: string) => void
}

export const SessionCard = ({
  session,
  isTerminating,
  onTerminate,
}: SessionCardProps) => {
  const getDeviceIcon = (deviceInfo?: SessionInfo["deviceInfo"]) => {
    if (!deviceInfo) return <Monitor className="h-5 w-5" />
    if (deviceInfo.isMobile) return <Smartphone className="h-5 w-5" />
    if (deviceInfo.device?.toLowerCase().includes("tablet"))
      return <Tablet className="h-5 w-5" />
    if (deviceInfo.device?.toLowerCase().includes("laptop"))
      return <Laptop className="h-5 w-5" />
    return <Monitor className="h-5 w-5" />
  }

  const getDeviceDescription = (session: SessionInfo) => {
    const parts: string[] = []
    if (session.deviceInfo?.browser) parts.push(session.deviceInfo.browser)
    if (session.deviceInfo?.os) parts.push(`on ${session.deviceInfo.os}`)
    if (parts.length === 0 && session.userAgent) {
      const ua = session.userAgent.toLowerCase()
      if (ua.includes("chrome")) parts.push("Chrome")
      else if (ua.includes("firefox")) parts.push("Firefox")
      else if (ua.includes("safari")) parts.push("Safari")
      else if (ua.includes("edge")) parts.push("Edge")

      if (ua.includes("windows")) parts.push("on Windows")
      else if (ua.includes("mac")) parts.push("on macOS")
      else if (ua.includes("linux")) parts.push("on Linux")
      else if (ua.includes("android")) parts.push("on Android")
      else if (ua.includes("ios")) parts.push("on iOS")
    }
    return parts.length > 0 ? parts.join(" ") : "Unknown device"
  }

  const getLocationDescription = (session: SessionInfo) => {
    if (session.location?.city && session.location?.country) {
      return `${session.location.city}, ${session.location.country}`
    }
    if (session.location?.country) return session.location.country
    if (session.ipAddress) return `IP: ${session.ipAddress}`
    return "Unknown location"
  }

  return (
    <motion.div
      key={session.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-3 rounded-lg border p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <div className="mt-1 text-gray-600">
            {getDeviceIcon(session.deviceInfo)}
          </div>
          <div className="flex-1">
            <div className="mb-2 flex items-center space-x-2">
              <span className="font-medium text-gray-800">
                {getDeviceDescription(session)}
              </span>
              {session.isCurrent && (
                <Badge
                  variant="success"
                  className="text-xs bg-green-100 text-green-800">
                  Current
                </Badge>
              )}
              {session.isValid === false && (
                <Badge
                  variant="warning"
                  className="text-xs bg-yellow-100 text-yellow-800">
                  Suspicious
                </Badge>
              )}
            </div>
            <div className="space-y-1.5 text-sm text-gray-600">
              <div className="flex items-center space-x-1.5">
                <MapPin className="h-4 w-4" />
                <span>{getLocationDescription(session)}</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <Calendar className="h-4 w-4" />
                <span>
                  Last active{" "}
                  {session.lastAccessedAt
                    ? formatDistanceToNow(parseISO(session.lastAccessedAt)) +
                      " ago"
                    : "Unknown"}
                </span>
              </div>
              <div className="flex items-center space-x-1.5">
                <Globe className="h-4 w-4" />
                <span>
                  Created{" "}
                  {session.createdAt
                    ? formatDistanceToNow(parseISO(session.createdAt)) + " ago"
                    : "Unknown"}
                </span>
              </div>
              <div className="flex items-center space-x-1.5">
                <Clock className="h-4 w-4" />
                <span>
                  Expires{" "}
                  {session.expires
                    ? formatDistanceToNow(parseISO(session.expires)) +
                      " from now"
                    : "Unknown"}
                </span>
              </div>
              {session.lastAction && session.lastActionAt && (
                <div className="flex items-center space-x-1.5">
                  <Globe className="h-4 w-4" />
                  <span>
                    Last action: {session.lastAction} (
                    {formatDistanceToNow(parseISO(session.lastActionAt))} ago)
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
        {!session.isCurrent && (
          <Button
            onClick={() => onTerminate(session.id)}
            variant="outline"
            size="sm"
            disabled={isTerminating}
            className={`text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors ${isTerminating ? "cursor-not-allowed opacity-70" : ""}`}>
            {isTerminating ? (
              <Loader className="inline-block h-4 w-4" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>
    </motion.div>
  )
}
