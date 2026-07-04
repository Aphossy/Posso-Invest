"use client"

import { useState } from "react"
import { Search, UserX } from "lucide-react"
import { toast } from "sonner"

import { authClient } from "@/lib/auth-client"
import { useActiveRole } from "@/hooks/use-active-role"
import { Button } from "@/components/ui/button"
import { SidebarTrigger } from "@/components/ui/sidebar"

import { LogoutButton } from "../auth/logout-button"
import { CommandBar } from "./command-bar"
import { EnhancedNotificationsPopover } from "./notifications-popover-enhanced"

interface DashboardHeaderProps {
  title?: string
  showSearch?: boolean
  showNotifications?: boolean
}

export function DashboardHeader({
  title = "Dashboard",
  showSearch = true,
  showNotifications = true,
}: DashboardHeaderProps) {
  const { data: session } = authClient.useSession()
  const { role } = useActiveRole()
  const isAuthenticated = !!session

  const isImpersonating = Boolean(
    (
      session as {
        session?: {
          impersonatedBy?: string | null
        }
      } | null
    )?.session?.impersonatedBy
  )

  const handleStopImpersonating = async () => {
    const stopImpersonatePromise = authClient.admin.stopImpersonating()

    await toast.promise(stopImpersonatePromise, {
      loading: "Stopping impersonation...",
      success: "Returned to admin account",
      error: (err) => err.message || "Failed to stop impersonation",
    })

    window.location.assign("/admin/dashboard")
  }

  const [isCommandBarOpen, setIsCommandBarOpen] = useState(false)
  return (
    <>
      <CommandBar
        open={isCommandBarOpen}
        onOpenChange={setIsCommandBarOpen}
        userRole={role ?? "member"}
      />

      <header className="sticky top-0 z-40 rounded-t-4xl border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="flex h-16 items-center gap-2 sm:gap-4 px-2 lg:px-6">
          <SidebarTrigger className="-ml-1" />

          {/* Title */}
          <div className="flex-1">
            <h1 className="text-base sm:text-lg font-semibold text-gray-900">
              {title}
            </h1>
          </div>

          {/* Search */}
          {showSearch && (
            <Button
              variant="outline"
              className="hidden max-w-md flex-1 justify-start gap-2 text-muted-foreground md:flex bg-transparent"
              onClick={() => setIsCommandBarOpen(true)}>
              <Search className="h-4 w-4" />
              <span>Search... </span>
              <kbd className="pointer-events-none ml-auto inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                <span className="text-xs">⌘</span>K
              </kbd>
            </Button>
          )}

          {showSearch && (
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsCommandBarOpen(true)}>
              <Search className="h-5 w-5" />
              <span className="sr-only">Search</span>
            </Button>
          )}

          <div className="flex items-center gap-2">
            {/* Notifications */}

            {isImpersonating && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleStopImpersonating}
                className="hidden sm:inline-flex">
                <UserX className="mr-2 h-4 w-4" />
                Stop Impersonating
              </Button>
            )}

            {isImpersonating && (
              <Button
                variant="outline"
                size="icon"
                onClick={handleStopImpersonating}
                className="sm:hidden">
                <UserX className="h-4 w-4" />
                <span className="sr-only">Stop Impersonating</span>
              </Button>
            )}

            {showNotifications && (
              <EnhancedNotificationsPopover isAuthenticated={isAuthenticated} />
            )}

            <LogoutButton showText={false} className="text-red-500" />
          </div>
        </div>
      </header>
    </>
  )
}
