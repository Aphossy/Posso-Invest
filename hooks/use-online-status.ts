"use client"

import { useEffect, useState } from "react"

/**
 * Hook to detect online/offline status using browser's navigator.onLine
 * and online/offline events for instant detection
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    // Initialize with current online status
    setIsOnline(navigator.onLine)

    // Handler for online event
    const handleOnline = () => {
      setIsOnline(true)
    }

    // Handler for offline event
    const handleOffline = () => {
      setIsOnline(false)
    }

    // Add event listeners
    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    // Cleanup
    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  return isOnline
}
