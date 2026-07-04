// C:\Users\user\OneDrive\Desktop\trustlink-group\components\dashboard\admin\users\delete-user-dialog.tsx
"use client"

import { useState } from "react"
import { getRoleBadgeColor, getRoleIcon } from "@/utils/user-utils"

import type { AdminUser } from "@/types/admin-users"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ResponsiveModal } from "@/components/ui/responsive-modal"

interface DeleteUserDialogProps {
  user: AdminUser
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export function DeleteUserDialog({
  user,
  open,
  onOpenChange,
  onConfirm,
}: DeleteUserDialogProps) {
  const [deleteConfirm, setDeleteConfirm] = useState("")
  const confirmText = user.email
  const isDeleteEnabled = deleteConfirm === confirmText

  const handleConfirm = () => {
    if (isDeleteEnabled) {
      onConfirm()
      setDeleteConfirm("")
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen)
    if (!newOpen) {
      setDeleteConfirm("")
    }
  }

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={handleOpenChange}
      title="Remove Member"
      description="This will remove the member from the active organization. The user account remains intact."
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            onClick={() => setDeleteConfirm("")}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={!isDeleteEnabled}>
            Remove Member
          </Button>
        </>
      }
      className="max-w-md">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
          <Avatar className="h-10 w-10">
            <AvatarImage
              src={user.image || "/placeholder.svg"}
              alt={`${user.name} profile picture`}
            />
            <AvatarFallback>{user.name[0]}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="font-medium">{user.name}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <div className="mt-1 flex items-center gap-2">
              <Badge
                className={cn(
                  "text-xs",
                  getRoleBadgeColor(user.role ?? "member")
                )}>
                <span className="mr-1">
                  {getRoleIcon(user.role ?? "member")}
                </span>
                {user.role ?? "member"}
              </Badge>
              {user.emailVerified && (
                <Badge variant="outline" className="text-xs">
                  Verified
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">
            Please type{" "}
            <span className="rounded bg-muted px-1 font-mono">
              {user.email}
            </span>{" "}
            to confirm:
          </p>
          <Input
            type="text"
            placeholder={confirmText}
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            autoComplete="off"
          />
        </div>
      </div>
    </ResponsiveModal>
  )
}
