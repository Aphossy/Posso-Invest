"use client"

import type React from "react"
import { useEffect, useState } from "react"

import { useOnlineStatus } from "@/hooks/use-online-status"
import { OfflineAlert } from "@/components/ui/offline-alert"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { ActiveOrganizationGuard } from "@/components/auth/active-organization-guard"

import { DashboardHeader } from "./dashboard-header"
import { DashboardSidebar } from "./dashboard-sidebar"

// import { Toaster } from "sonner"

interface DashboardLayoutProps {
  children: React.ReactNode
  title?: string
  showSearch?: boolean
  showNotifications?: boolean
}

export function DashboardLayout({
  children,
  title,
  showSearch = true,
  showNotifications = true,
}: DashboardLayoutProps) {
  const isOnline = useOnlineStatus()
  const [showOfflineAlert, setShowOfflineAlert] = useState(false)
  const [hasShownAlert, setHasShownAlert] = useState(false)

  // Show alert when going offline
  useEffect(() => {
    if (!isOnline && !hasShownAlert) {
      setShowOfflineAlert(true)
      setHasShownAlert(true)
    }

    // Reset the flag when back online
    if (isOnline) {
      setShowOfflineAlert(false)
      setHasShownAlert(false)
    }
  }, [isOnline, hasShownAlert])

  const handleDismiss = () => {
    setShowOfflineAlert(false)
  }

  const handleRetry = async () => {
    // Force a check by reloading a small resource
    try {
      await fetch("/favicon.ico", { method: "HEAD", cache: "no-cache" })
      // If successful, the online event will fire automatically
    } catch (error) {
      // Still offline, the error is expected
      console.log("Still offline")
    }
  }

  return (
    <SidebarProvider>
      <ActiveOrganizationGuard />
      <DashboardSidebar />
      <SidebarInset>
        <DashboardHeader
          title={title}
          showSearch={showSearch}
          showNotifications={showNotifications}
        />
        <div className="flex flex-1 flex-col gap-4 p-2 sm:p-5">{children}</div>
      </SidebarInset>
      {/* <Toaster position="top-right" richColors /> */}

      {/* Offline Alert */}
      {showOfflineAlert && !isOnline && (
        <OfflineAlert onDismiss={handleDismiss} onRetry={handleRetry} />
      )}
    </SidebarProvider>
  )
}
