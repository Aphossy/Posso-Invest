"use client"

import { useState } from "react"
import { WifiOff } from "lucide-react"

import { Button } from "@/components/ui/button"

interface OfflineAlertProps {
  onDismiss: () => void
  onRetry: () => Promise<void>
}

export function OfflineAlert({ onDismiss, onRetry }: OfflineAlertProps) {
  const [isRetrying, setIsRetrying] = useState(false)

  const handleRetry = async () => {
    setIsRetrying(true)
    try {
      await onRetry()
    } finally {
      setIsRetrying(false)
    }
  }

  return (
    <div className="fixed right-4 bottom-4 z-[999999999] w-[350px] animate-in duration-300 slide-in-from-bottom-5">
      <div className="relative h-[180px] w-full overflow-hidden rounded-lg border border-red-500 bg-linear-to-r from-red-500/10 to-red-500/5 p-6 backdrop-blur-sm dark:from-red-600/20 dark:to-red-900/10">
        {/* Background effects */}
        <div className="absolute top-0 -left-20 h-40 w-40 animate-pulse rounded-full bg-red-500/20 blur-3xl"></div>
        <div className="absolute -right-20 bottom-0 h-40 w-40 animate-pulse rounded-full bg-red-500/20 blur-3xl"></div>

        {/* Pulsing border */}
        <div className="absolute top-0 left-0 h-full w-1 animate-pulse bg-red-500"></div>

        {/* Content */}
        <div className="relative flex h-full flex-col justify-between">
          <div>
            <div className="mb-3 flex items-center text-lg font-bold text-red-600 dark:text-red-400">
              <div className="mr-2 rounded-full bg-red-100 p-1.5 dark:bg-red-900/30">
                <WifiOff className="h-5 w-5 animate-pulse text-red-600 dark:text-red-400" />
              </div>
              Connection Lost
            </div>
            <p className="text-sm">
              You are currently offline. Some features may be unavailable until
              connection is restored.
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 animate-ping rounded-full bg-red-500"></span>
              <span className="text-xs text-red-600 dark:text-red-400">
                Reconnecting...
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={isRetrying}
                className="border-red-200 bg-white/50 text-xs hover:bg-red-50 dark:border-red-900 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/30"
                onClick={handleRetry}>
                {isRetrying ? "Checking..." : "Try Again"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-xs text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/30 dark:hover:text-red-300"
                onClick={onDismiss}>
                Dismiss
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
