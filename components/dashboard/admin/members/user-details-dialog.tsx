"use client"

import { useEffect, useState } from "react"
import { getRoleBadgeColor, getRoleIcon } from "@/utils/user-utils"
import { format } from "date-fns"
import { Calendar, Mail, UserIcon } from "lucide-react"

import type { AdminUser } from "@/types/admin-users"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ResponsiveModal } from "@/components/ui/responsive-modal"

interface UserDetailsDialogProps {
  user: AdminUser
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function UserDetailsDialog({
  user,
  open,
  onOpenChange,
}: UserDetailsDialogProps) {
  const [userDetails, setUserDetails] = useState<AdminUser | null>(null)

  useEffect(() => {
    if (open) {
      setUserDetails(user)
    } else {
      setUserDetails(null)
    }
  }, [open, user])

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title="User Details"
      description={`Organization membership overview for ${user.name}`}
      className="md:max-w-4xl max-w-4xl">
      {userDetails ? (
        <div className="space-y-6">
          <div className="flex items-start gap-4 rounded-lg bg-muted/50 p-4">
            <Avatar className="h-16 w-16">
              <AvatarImage
                src={userDetails.image || "/placeholder.svg"}
                alt={`${userDetails.name} profile picture`}
              />
              <AvatarFallback className="text-lg">
                {userDetails.name[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-semibold">{userDetails.name}</h3>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span>{userDetails.email}</span>
              </div>
              <div className="flex items-center gap-3">
                <Badge
                  className={getRoleBadgeColor(userDetails.role ?? "member")}>
                  <span className="mr-1">
                    {getRoleIcon(userDetails.role ?? "member")}
                  </span>
                  {userDetails.role ?? "member"}
                </Badge>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserIcon className="h-4 w-4" />
                  Membership Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div>
                  <span className="text-muted-foreground">User ID:</span>
                  <p className="font-mono text-xs">
                    {userDetails.id.substring(0, 8)}…
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Member ID:</span>
                  <p className="font-mono text-xs">
                    {userDetails.memberId
                      ? `${userDetails.memberId.substring(0, 8)}…`
                      : "Not available"}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>
                    Joined{" "}
                    {format(new Date(userDetails.createdAt), "MMM dd, yyyy")}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Role Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    Organization Role
                  </span>
                  <Badge
                    className={getRoleBadgeColor(userDetails.role ?? "member")}>
                    {userDetails.role ?? "member"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Role changes are managed through organization membership.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <div className="flex h-32 items-center justify-center">
          <p className="text-muted-foreground">Failed to load user details</p>
        </div>
      )}
    </ResponsiveModal>
  )
}
