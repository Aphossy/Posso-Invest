// components\layout\sidebar-user.tsx
"use client"

import { useEffect, useState } from "react"
import type { Route } from "next"
import Link from "next/link"
import {
  ChevronsUpDown,
  Home,
  Settings,
  User2,
  UserRoundCheck,
  Wifi,
  WifiOff,
} from "lucide-react"
import Clock from "react-live-clock"
import { toast } from "sonner"

import { authClient } from "@/lib/auth-client"
import { cn } from "@/lib/utils"
import { useActiveRole } from "@/hooks/use-active-role"
import { useLogout } from "@/hooks/use-logout"
import { useOnlineStatus } from "@/hooks/use-online-status"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SidebarMenuButton } from "@/components/ui/sidebar"

import { LogoutIcon } from "../ui/animated-icons/LogoutIcon"

const SidebarUser = () => {
  const { data: session } = authClient.useSession()
  const { role } = useActiveRole()
  const user = session?.user

  const isImpersonating = Boolean(
    (
      session as {
        session?: {
          impersonatedBy?: string | null
        }
      } | null
    )?.session?.impersonatedBy
  )

  const { logout } = useLogout()

  const handleLogout = async () => {
    await logout()
  }

  const handleStopImpersonating = async () => {
    const stopImpersonatePromise = authClient.admin.stopImpersonating()

    await toast.promise(stopImpersonatePromise, {
      loading: "Stopping impersonation...",
      success: "Returned to admin account",
      error: (err) => err.message || "Failed to stop impersonation",
    })

    window.location.assign("/admin/dashboard")
  }

  const [isLoading, setIsLoading] = useState(true)
  const isConnected = useOnlineStatus()

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => setIsLoading(false), 1000)
    return () => clearTimeout(timer)
  }, [])

  if (isLoading || !user) {
    return (
      <div className="flex items-center gap-2 px-2 py-1.5">
        <div className="bg-muted h-8 w-8 animate-pulse rounded-lg" />
        <div className="flex-1 space-y-1">
          <div className="bg-muted h-3 animate-pulse rounded" />
          <div className="bg-muted h-2 w-3/4 animate-pulse rounded" />
        </div>
      </div>
    )
  }

  const getProfileLink = () => {
    switch (role) {
      case "admin":
        return "/admin/profile"
      case "president":
        return "/president/profile"
      case "treasurer":
        return "/treasurer/profile"
      case "secretary":
        return "/secretary/profile"
      default:
        return "/member/profile"
    }
  }

  const getSettingsLink = () => {
    switch (role) {
      case "admin":
        return "/admin/settings"
      case "president":
        return "/president/settings"
      case "treasurer":
        return "/treasurer/settings"
      case "secretary":
        return "/secretary/settings"
      default:
        return "/member/settings"
    }
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton
          size="lg"
          className="w-full rounded-lg bg-primary px-2 transition-colors data-[state=open]:bg-[#004225] data-[state=open]:text-white">
          <div className="relative">
            <Avatar className="h-8 w-8 rounded-lg">
              <AvatarImage
                src={user.image || "/placeholder.svg"}
                alt={`${user.name}'s avatar`}
              />
              <AvatarFallback className="rounded-lg">
                {`${user.name[0]}`}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -right-1 -bottom-1 rounded-full border border-primary/60 bg-background p-0.5 shadow-sm">
              {isConnected ? (
                <Wifi className="h-3 w-3 text-primary" />
              ) : (
                <WifiOff className="h-3 w-3 text-red-500" />
              )}
            </div>
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate text-white font-semibold">{`${user.name}`}</span>
            <span className="text-muted-foreground truncate text-xs">
              {user.email}
            </span>
          </div>
          <ChevronsUpDown className="ml-auto size-4 text-white" />
        </SidebarMenuButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-[--radix-dropdown-menu-trigger-width] min-w-60 rounded-xl border border-border/70 p-1.5 shadow-xl"
        side="bottom"
        align="end"
        sideOffset={4}>
        <DropdownMenuLabel className="p-1 font-normal">
          <div className="rounded-lg  border border-border/60  p-2">
            <div className="flex items-center gap-2 text-left text-sm">
              <div className="relative">
                <Avatar className="h-9 w-9 rounded-lg">
                  <AvatarImage
                    src={user.image || "/placeholder.svg"}
                    alt={`${user.name}'s avatar`}
                  />
                  <AvatarFallback className="rounded-lg">
                    {`${user.name[0]}`}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -right-1 -bottom-1 rounded-full border border-border/70 bg-background p-0.5 shadow-sm">
                  {isConnected ? (
                    <Wifi className="h-3 w-3 text-[#004225]" />
                  ) : (
                    <WifiOff className="h-3 w-3 text-red-500" />
                  )}
                </div>
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate text-white font-semibold">{`${user.name}`}</span>
                <span className="text-muted-foreground truncate text-xs">
                  {user.email}
                </span>
                <div className="mt-1 flex items-center gap-1">
                  <span className=" inline-flex w-fit rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                    {role || "member"}
                  </span>
                  <span
                    className={cn(
                      " items-center border  inline-flex w-fit rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide  ",
                      isConnected
                        ? "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400"
                        : "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400"
                    )}>
                    {isConnected ? "Online" : "Offline"}
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-2 flex w-fit items-center justify-between rounded-md border border-border/60 bg-background/70 px-2 py-1.5 text-xs">
              <span className="tabular-nums font-medium">
                <Clock
                  format={"hh:mm A - ddd, MMM DD"}
                  ticking={true}
                  timezone={"Africa/Kigali"}
                />
              </span>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild className="rounded-md">
            <Link href={"/" as Route} className="flex items-center">
              <Home className="mr-2 h-4 w-4" />
              Homepage
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="rounded-md">
            <Link href={getProfileLink()} className="flex items-center">
              <User2 className="mr-2 h-4 w-4" />
              Profile
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="rounded-md">
            <Link href={getSettingsLink()} className="flex items-center">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {isImpersonating && (
          <>
            <DropdownMenuItem
              onClick={handleStopImpersonating}
              className="rounded-md">
              <UserRoundCheck className="mr-2 h-4 w-4" />
              Stop Impersonating
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem
          onClick={handleLogout}
          variant="destructive"
          className="rounded-md">
          <LogoutIcon className="mr-2 h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default SidebarUser
