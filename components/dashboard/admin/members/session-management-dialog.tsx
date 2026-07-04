"use client"

import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Trash2 } from "lucide-react"
import { toast } from "sonner"

import type { AdminUser } from "@/types/admin-users"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { ResponsiveModal } from "@/components/ui/responsive-modal"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Loader } from "@/components/common/loader"

interface Session {
  id: string
  token: string
  createdAt: string
  expiresAt: string
  ipAddress: string
  userAgent: string
  userId: string
  impersonatedBy: string | null
}

interface SessionManagementDialogProps {
  user: AdminUser
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SessionManagementDialog({
  user,
  open,
  onOpenChange,
}: SessionManagementDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isRevoking, setIsRevoking] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])

  useEffect(() => {
    if (open) {
      const fetchSessions = async () => {
        setIsLoading(true)
        setError(null)
        try {
          const response = await authClient.admin.listUserSessions({
            userId: user.id,
          })
          if (response.error) {
            throw new Error(
              response.error.message || "Failed to fetch sessions"
            )
          }
          setSessions(
            (response.data?.sessions || []).map((s: any) => {
              const rawUA = s.userAgent ?? ""
              const parts: string[] = []
              const ua = String(rawUA).toLowerCase()

              if (
                ua.includes("chrome") &&
                !ua.includes("edge") &&
                !ua.includes("edg/") &&
                !ua.includes("opr")
              ) {
                parts.push("Chrome")
              } else if (ua.includes("firefox")) {
                parts.push("Firefox")
              } else if (
                (ua.includes("safari") && !ua.includes("chrome")) ||
                ua.includes("applewebkit")
              ) {
                parts.push("Safari")
              } else if (ua.includes("edge") || ua.includes("edg/")) {
                parts.push("Edge")
              } else if (ua.includes("opr") || ua.includes("opera")) {
                parts.push("Opera")
              }

              if (ua.includes("windows")) parts.push("on Windows")
              else if (ua.includes("mac") || ua.includes("darwin"))
                parts.push("on macOS")
              else if (ua.includes("linux") && !ua.includes("android"))
                parts.push("on Linux")
              else if (ua.includes("android")) parts.push("on Android")
              else if (
                ua.includes("iphone") ||
                ua.includes("ipad") ||
                ua.includes("ios")
              )
                parts.push("on iOS")

              const userAgentDisplay =
                parts.length > 0 ? parts.join(" ") : rawUA || "Unknown device"

              return {
                id: s.id,
                token: s.token,
                createdAt:
                  s.createdAt instanceof Date
                    ? s.createdAt.toISOString()
                    : String(s.createdAt),
                expiresAt:
                  s.expiresAt instanceof Date
                    ? s.expiresAt.toISOString()
                    : String(s.expiresAt),
                ipAddress: s.ipAddress,
                userAgent: userAgentDisplay,
                userId: s.userId,
                impersonatedBy: s.impersonatedBy ?? null,
              }
            })
          )
        } catch (err) {
          setError(
            err instanceof Error ? err.message : "Failed to fetch sessions"
          )
          toast.error("Failed to fetch user sessions", { description: error })
        } finally {
          setIsLoading(false)
        }
      }
      fetchSessions()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user.id])

  const handleRevokeSession = async (sessionToken: string) => {
    setIsRevoking(sessionToken)
    setError(null)

    try {
      const response = await authClient.admin.revokeUserSession({
        sessionToken,
      })

      if (response.error) {
        throw new Error(response.error.message || "Failed to revoke session")
      }

      setSessions(sessions.filter((session) => session.token !== sessionToken))
      toast.success("Session revoked successfully")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke session")
      toast.error("Failed to revoke session")
    } finally {
      setIsRevoking(null)
    }
  }

  const handleRevokeAllSessions = async () => {
    setIsRevoking("all")
    setError(null)

    try {
      const response = await authClient.admin.revokeUserSessions({
        userId: user.id,
      })

      if (response.error) {
        throw new Error(response.error.message || "Failed to revoke sessions")
      }

      setSessions([])
      toast.success("All user sessions revoked successfully")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke sessions")
      toast.error("Failed to revoke user sessions")
    } finally {
      setIsRevoking(null)
    }
  }

  const footer = (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <Button
        type="button"
        variant="outline"
        onClick={() => onOpenChange(false)}
        disabled={isLoading || isRevoking !== null}>
        Close
      </Button>
      {sessions.length > 0 && (
        <Button
          type="button"
          variant="destructive"
          onClick={handleRevokeAllSessions}
          disabled={isLoading || isRevoking !== null}>
          {isRevoking === "all" && <Loader className="mr-2 h-4 w-4" />}
          Revoke All Sessions
        </Button>
      )}
    </div>
  )

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title="Manage Sessions"
      description={`View and manage active sessions for ${user.name} (${user.email})`}
      footer={footer}
      className="sm:max-w-fit">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-4">
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="text-red-500 text-sm">
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {isLoading ? (
          <div className="flex justify-center items-center h-32">
            <Loader className="size-6" />
          </div>
        ) : sessions.length === 0 ? (
          <p className="text-center mt-3 text-muted-foreground">
            No active sessions found
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Session ID</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead>Expires At</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>User Agent</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell className="font-mono truncate max-w-[100px]">
                    {session.id}
                  </TableCell>
                  <TableCell>
                    {new Date(session.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    {new Date(session.expiresAt).toLocaleString()}
                  </TableCell>
                  <TableCell>{session.ipAddress}</TableCell>
                  <TableCell className="truncate max-w-[150px]">
                    {session.userAgent}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleRevokeSession(session.token)}
                      disabled={
                        isRevoking === session.token || isRevoking === "all"
                      }>
                      {isRevoking === session.token ? (
                        <Loader className="h-4 w-4" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                      <span className="sr-only">Revoke session</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </motion.div>
    </ResponsiveModal>
  )
}
