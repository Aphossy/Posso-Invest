"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { copyToClipboard } from "@/utils/user-export-utils"
import {
  Ban,
  Copy,
  Edit,
  Eye,
  Key,
  List,
  Mail,
  MoreHorizontal,
  Shield,
  ShieldCheck,
  TrashIcon,
  Unlock,
  UserPlus,
  UserX,
} from "lucide-react"
import { toast } from "sonner"

import type { AdminUser } from "@/types/admin-users"
import { authClient } from "@/lib/auth-client"
import { sendUnbanNotificationEmail } from "@/lib/email-actions"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { BanUserDialog } from "./ban-user-dialog"
import { DeleteUserDialog } from "./delete-user-dialog"
import { EditUserDialog } from "./edit-user-dialog"
import { SendUserEmailDialog } from "./send-user-email-dialog"
import { SessionManagementDialog } from "./session-management-dialog"
import { SetUserPasswordDialog } from "./set-user-password-dialog"
import { SetUserRoleDialog } from "./set-user-role-dialog"
import { UserDetailsDialog } from "./user-details-dialog"

interface UserRowActionsProps {
  user: AdminUser
  onUpdate: (userId: string, data: Partial<AdminUser>) => Promise<void>
  onDelete: (userId: string) => Promise<void>
}

export function UserRowActions({
  user,
  onUpdate,
  onDelete,
}: UserRowActionsProps) {
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [roleDialogOpen, setRoleDialogOpen] = useState(false)
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false)
  const [banDialogOpen, setBanDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [emailDialogOpen, setEmailDialogOpen] = useState(false)
  const router = useRouter()

  const { data: session } = authClient.useSession()
  const currentUserId = session?.user.id
  const isCurrentUser = user.id === currentUserId
  // Impersonation: the session's `impersonatedBy` field is set when active
  const isImpersonating = !!(session?.session as any)?.impersonatedBy

  const handleCopyToClipboard = async (text: string, label: string) => {
    const success = await copyToClipboard(text)
    if (success) {
      toast.success(`${label} copied to clipboard`)
    } else {
      toast.error(`Failed to copy ${label}`)
    }
  }

  const handleDelete = async () => {
    const deletePromise = onDelete(user.id)
    toast.promise(deletePromise, {
      loading: "Deleting user...",
      success: "User deleted successfully",
      error: "Failed to delete user",
    })
    setDeleteDialogOpen(false)
  }

  const handleToggleVerification = async () => {
    const newVerificationStatus = !user.emailVerified
    const updatePromise = onUpdate(user.id, {
      emailVerified: newVerificationStatus,
    })
    toast.promise(updatePromise, {
      loading: `${newVerificationStatus ? "Verifying" : "Unverifying"} user...`,
      success: `User ${newVerificationStatus ? "verified" : "unverified"} successfully`,
      error: `Failed to ${newVerificationStatus ? "verify" : "unverify"} user`,
    })
  }

  const handleUnbanUser = async () => {
    try {
      const originalBanReason = user.banReason || undefined
      const wasPermanent = user.banExpires === null

      const unbanPromise = authClient.admin.unbanUser({ userId: user.id })
      await toast.promise(unbanPromise, {
        loading: "Unbanning user...",
        success: () => {
          onUpdate(user.id, { banned: false })
          return "User unbanned successfully"
        },
        error: (err) => err.message || "Failed to unban user",
      })

      try {
        const emailResult = await sendUnbanNotificationEmail({
          userName: user.name,
          userEmail: user.email,
          originalBanReason,
          wasPermanent,
        })
        if (!emailResult.success) {
          toast.info("User unbanned, but email notification failed to send")
        }
      } catch {
        // Email failure is non-fatal
      }
    } catch (error) {
      console.error("Error unbanning user:", error)
    }
  }

  const handleImpersonateUser = async () => {
    const impersonatePromise = authClient.admin.impersonateUser({
      userId: user.id,
    })
    toast.promise(impersonatePromise, {
      loading: "Impersonating user...",
      success: "User impersonation started successfully",
      error: (err) => err.message || "Failed to impersonate user",
    })
    router.push("/login") // Redirect to login after starting impersonation
  }

  const handleStopImpersonating = async () => {
    const stopImpersonatePromise = authClient.admin.stopImpersonating()
    toast.promise(stopImpersonatePromise, {
      loading: "Stopping impersonation...",
      success: "Impersonation stopped successfully",
      error: (err) => err.message || "Failed to stop impersonation",
    })
    router.push("/login") // Redirect to login after stopping impersonation
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" variant="ghost" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {/* View & Edit */}
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => setDetailsDialogOpen(true)}>
              <Eye className="mr-2 h-4 w-4" />
              <span>View Details</span>
              <DropdownMenuShortcut>⌘V</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
              <Edit className="mr-2 h-4 w-4" />
              <span>Edit User</span>
              <DropdownMenuShortcut>⌘E</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setRoleDialogOpen(true)}>
              <Shield className="mr-2 h-4 w-4" />
              <span>Set Role</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setPasswordDialogOpen(true)}>
              <Key className="mr-2 h-4 w-4" />
              <span>Change Password</span>
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          {/* Copy actions */}
          <DropdownMenuGroup>
            <DropdownMenuItem
              onClick={() => handleCopyToClipboard(user.id, "User ID")}>
              <Copy className="mr-2 h-4 w-4" />
              <span>Copy ID</span>
              <DropdownMenuShortcut>⌘I</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleCopyToClipboard(user.email, "Email")}>
              <Copy className="mr-2 h-4 w-4" />
              <span>Copy Email</span>
              <DropdownMenuShortcut>⌘C</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleCopyToClipboard(user.name, "Full name")}>
              <Copy className="mr-2 h-4 w-4" />
              <span>Copy Name</span>
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          {/* Account actions */}
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => setEmailDialogOpen(true)}>
              <Mail className="mr-2 h-4 w-4" />
              <span>Send Email</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleToggleVerification}>
              {user.emailVerified ? (
                <>
                  <Shield className="mr-2 h-4 w-4" />
                  <span>Unverify</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  <span>Verify</span>
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSessionDialogOpen(true)}>
              <List className="mr-2 h-4 w-4" />
              <span>Manage Sessions</span>
            </DropdownMenuItem>
          </DropdownMenuGroup>

          {/* Ban / Unban - hidden for the current user */}
          {!isCurrentUser && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                {user.banned ? (
                  <DropdownMenuItem onClick={handleUnbanUser}>
                    <Unlock className="mr-2 h-4 w-4" />
                    <span>Unban User</span>
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => setBanDialogOpen(true)}>
                    <Ban className="mr-2 h-4 w-4" />
                    <span>Ban User</span>
                  </DropdownMenuItem>
                )}
              </DropdownMenuGroup>
            </>
          )}

          {/* Impersonation - hidden for the current user */}
          {!isCurrentUser && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                {isImpersonating ? (
                  <DropdownMenuItem onClick={handleStopImpersonating}>
                    <UserX className="mr-2 h-4 w-4" />
                    <span>Stop Impersonating</span>
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={handleImpersonateUser}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    <span>Impersonate User</span>
                  </DropdownMenuItem>
                )}
              </DropdownMenuGroup>
            </>
          )}

          {/* Delete - hidden for the current user */}
          {!isCurrentUser && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setDeleteDialogOpen(true)}>
                  <TrashIcon className="mr-2 h-4 w-4" />
                  <span>Delete User</span>
                  <DropdownMenuShortcut>⌘⌫</DropdownMenuShortcut>
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <UserDetailsDialog
        user={user}
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
      />

      <DeleteUserDialog
        user={user}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
      />

      <SetUserRoleDialog
        user={user}
        open={roleDialogOpen}
        onOpenChange={setRoleDialogOpen}
        onUpdate={onUpdate}
      />

      <EditUserDialog
        user={user}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onUpdate={onUpdate}
      />

      <SetUserPasswordDialog
        user={user}
        open={passwordDialogOpen}
        onOpenChange={setPasswordDialogOpen}
      />

      <SessionManagementDialog
        user={user}
        open={sessionDialogOpen}
        onOpenChange={setSessionDialogOpen}
      />

      <SendUserEmailDialog
        user={user}
        open={emailDialogOpen}
        onOpenChange={setEmailDialogOpen}
      />

      <BanUserDialog
        user={user}
        open={banDialogOpen}
        onOpenChange={setBanDialogOpen}
        onSuccess={() => onUpdate(user.id, { banned: true })}
      />
    </>
  )
}
