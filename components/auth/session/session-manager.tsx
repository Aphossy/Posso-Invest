"use client"

import { useState } from "react"
import { AnimatePresence } from "framer-motion"
import { Monitor } from "lucide-react"
import ReactPaginate from "react-paginate"
import { toast } from "sonner"

import { useLogout } from "@/hooks/use-logout"
import { useSessions } from "@/hooks/use-sessions"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { RefreshCCWIcon, RefreshCWIcon } from "@/components/ui/animated-icons"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader } from "@/components/common/loader"

import { LogoutIcon } from "../../ui/animated-icons/LogoutIcon"
import { SessionCard } from "./session-card"
import { SessionSkeleton } from "./session-skeleton"

// Main SessionManager Component
export function SessionManager() {
  const [currentPage, setCurrentPage] = useState(1)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const pageSize = 10
  const {
    sessions,
    totalPages,
    isLoading,
    error,
    terminateSession,
    refreshSessions,
  } = useSessions(currentPage, pageSize)
  const { logoutAll, isLoggingOutAll, logoutOther, isLoggingOutOther } =
    useLogout()
  const [sessionToTerminate, setSessionToTerminate] = useState<string | null>(
    null
  )
  const [showLogoutAllConfirm, setShowLogoutAllConfirm] = useState(false)
  const [showLogoutOtherConfirm, setShowLogoutOtherConfirm] = useState(false)
  const [isTerminating, setIsTerminating] = useState(false)

  // Handle session termination with refresh
  const handleTerminateSession = async (sessionId: string) => {
    setIsTerminating(true)
    setSessionToTerminate(sessionId)

    try {
      toast.promise(terminateSession(sessionId), {
        loading: "Terminating session...",
        success: "Session terminated successfully",
        error: "Failed to terminate session",
      })
      // Refresh sessions after successful termination
      refreshSessions()
    } finally {
      setIsTerminating(false)
      setSessionToTerminate(null)
    }
  }

  // Handle refresh with loading skeleton
  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await refreshSessions()
    } finally {
      setIsRefreshing(false)
    }
  }

  // Handle logout all devices
  const handleLogoutAll = async () => {
    toast.promise(
      logoutAll().finally(() => setShowLogoutAllConfirm(false)),
      {
        loading: "Logging out all devices...",
        success: "Successfully logged out all devices",
        error: "Failed to logout all devices",
      }
    )
  }

  // Handle logout other devices with refresh
  const handleLogoutOther = async () => {
    try {
      await toast.promise(logoutOther(), {
        loading: "Logging out other devices...",
        success: "Successfully logged out other devices",
        error: "Failed to logout other devices",
      })
      // Refresh sessions after successful logout
      await refreshSessions()
    } finally {
      setShowLogoutOtherConfirm(false)
    }
  }

  // Show loading skeleton during initial load or refresh
  if (isLoading || isRefreshing) {
    return (
      <Card className="">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Monitor className="h-5 w-5" />
            <span>Active Sessions</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <SessionSkeleton key={i} />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Monitor className="h-5 w-5" />
            <span>Active Sessions</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center">
            <p className="mb-4 text-red-600">
              {(error as any)?.response?.error?.message ||
                (error as any)?.response?.error?.fieldErrors?.[0]?.message ||
                error}
            </p>
            <Button
              onClick={handleRefresh}
              variant="outline"
              className="hover:bg-gray-100 transition-colors">
              <RefreshCWIcon className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className="">
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
            <CardTitle className="flex  items-center space-x-2">
              <Monitor className="h-5 w-5" />
              <span>Active Sessions ({sessions.length})</span>
            </CardTitle>
            <div className="flex space-x-2">
              <Button
                onClick={handleRefresh}
                variant="outline"
                size="sm"
                className="hover:bg-gray-100 transition-colors"
                disabled={isRefreshing}>
                {isRefreshing ? (
                  <Loader className="h-4 w-4" />
                ) : (
                  <RefreshCCWIcon className="h-4 w-4" />
                )}
              </Button>
              {/* {sessions.length > 1 && (
                <Button
                  onClick={() => setShowLogoutOtherConfirm(true)}
                  size="sm"
                  disabled={isLoggingOutOther}
                  className="bg-amber-400 hover:bg-amber-500 transition-colors"
                >
                  {isLoggingOutOther ? (
                    <Loader className="h-4 w-4" />
                  ) : (
                    <LogoutIcon className="h-4 w-4" />
                  )}
                  <span className="ml-2">Logout Other Devices</span>
                </Button>
              )} */}
              <Button
                onClick={() => setShowLogoutAllConfirm(true)}
                variant="destructive"
                size="sm"
                disabled={isLoggingOutAll}
                className="hover:bg-red-700 transition-colors">
                {isLoggingOutAll ? (
                  <Loader className="h-4 w-4" />
                ) : (
                  <LogoutIcon className="h-4 w-4" />
                )}
                <span className="ml-2">Logout All Devices</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <AnimatePresence>
              {sessions.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  isTerminating={
                    isTerminating && sessionToTerminate === session.id
                  }
                  onTerminate={handleTerminateSession}
                />
              ))}
            </AnimatePresence>
            {sessions.length === 0 && (
              <div className="py-8 text-center text-gray-500">
                <Monitor className="mx-auto mb-4 h-12 w-12 opacity-50" />
                <p>No active sessions found</p>
              </div>
            )}
          </div>
          {totalPages > 1 && (
            <div className="mt-6">
              <ReactPaginate
                previousLabel="Previous"
                nextLabel="Next"
                pageCount={totalPages}
                onPageChange={({ selected }) => setCurrentPage(selected + 1)}
                containerClassName="flex space-x-2 justify-center items-center"
                pageClassName="px-3 py-1 border rounded hover:bg-gray-100 transition-colors"
                activeClassName="bg-blue-600 text-white"
                previousClassName="px-3 py-1 border rounded hover:bg-gray-100 transition-colors"
                nextClassName="px-3 py-1 border rounded hover:bg-gray-100 transition-colors"
                disabledClassName="opacity-50 cursor-not-allowed"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Logout Other Dialog */}
      <AlertDialog
        open={showLogoutOtherConfirm}
        onOpenChange={setShowLogoutOtherConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Logout Other Devices</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to logout from all other devices? This will
              terminate all active sessions except the current one.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogoutOther}
              disabled={isLoggingOutOther}
              className="bg-red-600 hover:bg-red-700 transition-colors">
              {isLoggingOutOther ? (
                <>
                  <Loader className="mr-2 h-4 w-4" />
                  Logging out...
                </>
              ) : (
                "Logout Other Devices"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Logout All Dialog */}
      <AlertDialog
        open={showLogoutAllConfirm}
        onOpenChange={setShowLogoutAllConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Logout All Devices</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to logout from all devices? This will
              terminate all active sessions including the current one.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogoutAll}
              disabled={isLoggingOutAll}
              className="bg-red-600 hover:bg-red-700 transition-colors">
              {isLoggingOutAll ? (
                <>
                  <Loader className="mr-2 h-4 w-4" />
                  Logging out...
                </>
              ) : (
                "Logout All"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
