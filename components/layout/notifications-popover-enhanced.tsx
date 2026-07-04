// components\layout\notifications-popover-enhanced.tsx
"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { Route } from "next"
import { useRouter } from "next/navigation"
import type { Notification } from "@/db/schemas/notification-schema"
import { formatDistanceToNow } from "date-fns"
import { AnimatePresence, motion } from "framer-motion"
import {
  AlertCircle,
  Archive,
  Check,
  CheckCheck,
  CheckCircle,
  CreditCard,
  Info,
  Mail,
  Megaphone,
  MoreVertical,
  Settings,
  Trash2,
  Wallet,
  Zap,
} from "lucide-react"
import { toast } from "sonner"

import { NOTIFICATION_ACTION } from "@/types/notifications"
import {
  useInfiniteNotifications,
  useNotificationOperations,
  useUnreadNotificationsCount,
} from "@/hooks/api/use-notifications"
import { useActiveRole } from "@/hooks/use-active-role"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"

import { Loader } from "../common/loader"
import { BellIcon } from "../ui/animated-icons/BellIcon"

interface NotificationsPopoverProps {
  isAuthenticated?: boolean
}

export const EnhancedNotificationsPopover = ({
  isAuthenticated = true,
}: NotificationsPopoverProps) => {
  const router = useRouter()
  const { role } = useActiveRole()

  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [hoveredNotification, setHoveredNotification] = useState<string | null>(
    null
  )
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const hoverTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({})
  const [filter, setFilter] = useState<"all" | "unread" | "archived">("unread")

  // React Query hooks
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
  } = useInfiniteNotifications({
    limit: 15,
    unreadOnly: filter === "unread",
    archivedOnly: filter === "archived",
    enabled: isAuthenticated && isOpen,
  })

  const { data: unreadCountData } = useUnreadNotificationsCount()
  const unreadCount = unreadCountData || 0

  const {
    markAsRead,
    archiveNotification,
    unarchiveNotification,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
  } = useNotificationOperations()

  // Flatten paginated data
  const notifications =
    data?.pages.flatMap((page) => page.data.notifications) || []

  // Infinite scroll handler
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const target = e.target as HTMLDivElement
      const bottom =
        target.scrollHeight - target.scrollTop <= target.clientHeight + 100

      if (bottom && hasNextPage && !isFetchingNextPage) {
        fetchNextPage()
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage]
  )

  // Refetch when popover opens
  useEffect(() => {
    if (isOpen && isAuthenticated) {
      refetch()
    }
  }, [isOpen, isAuthenticated, refetch])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current)
      }
    }
  }, [])

  // Handle delayed close with timeout
  const handleMouseLeave = useCallback(() => {
    closeTimeoutRef.current = setTimeout(() => {
      setIsOpen(false)
    }, 300) // 300ms delay before closing
  }, [])

  const handleMouseEnter = useCallback(() => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current)
      closeTimeoutRef.current = null
    }
    setIsOpen(true)
  }, [])

  const handleMarkAsRead = async (
    notificationId: string,
    e?: React.MouseEvent
  ) => {
    e?.stopPropagation()
    try {
      await markAsRead.mutateAsync(notificationId)
    } catch (error) {
      console.error("Mark as read error:", error)
      toast.error("Failed to mark notification as read")
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead.mutateAsync()
      toast.success("All notifications marked as read")
    } catch (error) {
      console.error("Mark all as read error:", error)
      toast.error("Failed to mark all notifications as read")
    }
  }

  const handleDeleteNotification = async (
    notificationId: string,
    e?: React.MouseEvent
  ) => {
    e?.stopPropagation()
    try {
      await deleteNotification.mutateAsync(notificationId)
      toast.success("Notification deleted")
    } catch (error) {
      console.error("Delete notification error:", error)
      toast.error("Failed to delete notification")
    }
  }

  const handleDeleteAll = async () => {
    try {
      await deleteAllNotifications.mutateAsync()
      toast.success("All notifications deleted")
    } catch {
      toast.error("Failed to delete all notifications")
    }
  }

  const handleArchiveNotification = async (
    notificationId: string,
    e?: React.MouseEvent
  ) => {
    e?.stopPropagation()
    try {
      await archiveNotification.mutateAsync(notificationId)
      toast.success("Notification archived")
    } catch (error) {
      console.error("Archive notification error:", error)
      toast.error("Failed to archive notification")
    }
  }

  const handleUnarchiveNotification = async (
    notificationId: string,
    e?: React.MouseEvent
  ) => {
    e?.stopPropagation()
    try {
      await unarchiveNotification.mutateAsync(notificationId)
      toast.success("Notification unarchived")
    } catch (error) {
      console.error("Unarchive notification error:", error)
      toast.error("Failed to unarchive notification")
    }
  }

  const handleNotificationHoverStart = (
    notificationId: string,
    canMarkAsRead: boolean
  ) => {
    setHoveredNotification(notificationId)
    if (canMarkAsRead) {
      hoverTimeoutRef.current[notificationId] = setTimeout(() => {
        handleMarkAsRead(notificationId)
      }, 1000)
    }
  }

  const handleNotificationHoverEnd = (notificationId: string) => {
    setHoveredNotification(null)
    if (hoverTimeoutRef.current[notificationId]) {
      clearTimeout(hoverTimeoutRef.current[notificationId])
      delete hoverTimeoutRef.current[notificationId]
    }
  }

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead && !notification.isArchived) {
      handleMarkAsRead(notification.id)
    }

    const baseUrl =
      role === "admin"
        ? "/admin"
        : role === "treasurer"
          ? "/treasurer"
          : role === "secretary"
            ? "/secretary"
            : role === "president"
              ? "/president"
              : "/member"

    const isInternalPath = (value?: string) =>
      Boolean(value && value.startsWith("/") && !value.startsWith("//"))

    let route = ""

    // Highest priority: explicit route provided by API
    if (isInternalPath(notification.actionUrl ?? undefined)) {
      route = notification.actionUrl as string
    } else if (isInternalPath(notification.data?.href)) {
      route = String(notification.data?.href)
    } else if (notification.data?.action) {
      const action = String(notification.data.action)

      switch (action) {
        case NOTIFICATION_ACTION.VIEW_CONTRIBUTION: {
          const contributionId = notification.data?.contributionId
          const roleRoute =
            role === "admin"
              ? "/admin/financial/contributions"
              : role === "treasurer"
                ? "/treasurer/contributions/members"
                : role === "member"
                  ? "/member/contributions/history"
                  : "/president/financial/overview"
          route = contributionId
            ? `${roleRoute}?contributionId=${contributionId}`
            : roleRoute
          break
        }
        case NOTIFICATION_ACTION.VIEW_PENALTY: {
          const penaltyId = notification.data?.penaltyId
          const roleRoute =
            role === "treasurer"
              ? "/treasurer/penalties"
              : role === "member"
                ? "/member/penalties"
                : "/admin/financial/contributions?tab=penalties"
          route =
            penaltyId && !roleRoute.includes("?")
              ? `${roleRoute}?penaltyId=${penaltyId}`
              : roleRoute
          break
        }
        case NOTIFICATION_ACTION.VIEW_ACTION_ITEM: {
          const actionItemId = notification.data?.actionItemId
          const roleRoute = `${baseUrl}/actions`
          route = actionItemId
            ? `${roleRoute}?actionItemId=${actionItemId}`
            : roleRoute
          break
        }
        case NOTIFICATION_ACTION.VIEW_ANNOUNCEMENT: {
          const announcementId = notification.data?.announcementId
          const roleRoute = `${baseUrl}/announcements`
          route = announcementId
            ? `${roleRoute}?announcementId=${announcementId}`
            : roleRoute
          break
        }
        case NOTIFICATION_ACTION.VIEW_MESSAGE: {
          const messageCode = notification.data?.messageCode
          const roleRoute =
            role === "admin" || role === "president" || role === "secretary"
              ? `${baseUrl}/messages`
              : "/member/support"
          route = messageCode
            ? `${roleRoute}?messageCode=${messageCode}`
            : roleRoute
          break
        }
        case NOTIFICATION_ACTION.VIEW_DASHBOARD:
          route = `${baseUrl}/dashboard`
          break
        case NOTIFICATION_ACTION.VIEW_PROFILE:
          route = `${baseUrl}/profile`
          break
        case NOTIFICATION_ACTION.VIEW_SECURITY_SETTINGS:
          route = `${baseUrl}/settings?tab=security`
          break
        case NOTIFICATION_ACTION.VIEW_LOAN:
          route =
            role === "treasurer"
              ? "/treasurer/loans/requests"
              : role === "member"
                ? "/member/loans"
                : "/admin/financial/loans"
          break
        case NOTIFICATION_ACTION.VIEW_MEETING:
          route = `${baseUrl}/meetings`
          break
        case NOTIFICATION_ACTION.VIEW_PAYMENT:
          route =
            role === "admin"
              ? "/admin/payments"
              : role === "treasurer"
                ? "/treasurer/contributions/members"
                : `${baseUrl}/dashboard`
          break
        default:
          break
      }
    }

    if (route) {
      setIsOpen(false)
      router.push(route as Route)
    }
  }

  const getNotificationIcon = (
    type: string,
    action?: string,
    title?: string
  ) => {
    // Check action first for more specific icons
    if (action) {
      switch (action) {
        case NOTIFICATION_ACTION.VIEW_MESSAGE:
          return Mail
        case NOTIFICATION_ACTION.VIEW_CONTRIBUTION:
          return Wallet
        case NOTIFICATION_ACTION.VIEW_ACTION_ITEM:
          return CheckCircle
        case NOTIFICATION_ACTION.VIEW_ANNOUNCEMENT:
          return Megaphone
        case NOTIFICATION_ACTION.VIEW_PENALTY:
          return CreditCard
        case NOTIFICATION_ACTION.VIEW_MEETING:
          return CheckCircle
        case NOTIFICATION_ACTION.VIEW_LOAN:
          return CreditCard
        case NOTIFICATION_ACTION.VIEW_SECURITY_SETTINGS:
          return Settings
        case NOTIFICATION_ACTION.VIEW_PROFILE:
          return Settings
        case NOTIFICATION_ACTION.VIEW_PAYMENT:
          return Wallet
        default:
          break
      }
    }

    // Check title for keyword matching
    if (title) {
      const lowerTitle = title.toLowerCase()
      if (lowerTitle.includes("message")) return Mail
      if (lowerTitle.includes("contribution")) return Wallet
      if (lowerTitle.includes("announcement")) return Megaphone
      if (lowerTitle.includes("action item")) return CheckCircle
      if (lowerTitle.includes("settings") || lowerTitle.includes("password"))
        return Settings
      if (lowerTitle.includes("payment") || lowerTitle.includes("penalty"))
        return CreditCard
    }

    // Fall back to type-based icons
    switch (type.toLowerCase()) {
      case "success":
        return Check
      case "error":
        return AlertCircle
      case "warning":
        return AlertCircle
      case "info":
      default:
        return Info
    }
  }

  const getNotificationColor = (
    type: string,
    action?: string,
    title?: string
  ) => {
    // Check action first for more specific colors
    if (action) {
      switch (action) {
        case NOTIFICATION_ACTION.VIEW_MESSAGE:
          return "text-blue-600 bg-linear-to-br from-blue-100 to-blue-200"
        case NOTIFICATION_ACTION.VIEW_CONTRIBUTION:
          return "text-emerald-600 bg-linear-to-br from-emerald-100 to-emerald-200"
        case NOTIFICATION_ACTION.VIEW_ACTION_ITEM:
          return "text-violet-600 bg-linear-to-br from-violet-100 to-violet-200"
        case NOTIFICATION_ACTION.VIEW_ANNOUNCEMENT:
          return "text-fuchsia-600 bg-linear-to-br from-fuchsia-100 to-fuchsia-200"
        case NOTIFICATION_ACTION.VIEW_PENALTY:
          return "text-amber-600 bg-linear-to-br from-amber-100 to-amber-200"
        case NOTIFICATION_ACTION.VIEW_MEETING:
          return "text-sky-600 bg-linear-to-br from-sky-100 to-sky-200"
        case NOTIFICATION_ACTION.VIEW_LOAN:
          return "text-teal-600 bg-linear-to-br from-teal-100 to-teal-200"
        case NOTIFICATION_ACTION.VIEW_SECURITY_SETTINGS:
          return "text-slate-600 bg-linear-to-br from-slate-100 to-slate-200"
        case NOTIFICATION_ACTION.VIEW_PROFILE:
          return "text-cyan-600 bg-linear-to-br from-cyan-100 to-cyan-200"
        case NOTIFICATION_ACTION.VIEW_PAYMENT:
          return "text-green-600 bg-linear-to-br from-green-100 to-green-200"
        default:
          break
      }
    }

    // Check title for keyword matching
    if (title) {
      const lowerTitle = title.toLowerCase()
      if (lowerTitle.includes("message"))
        return "text-blue-600 bg-linear-to-br from-blue-100 to-blue-200"
      if (lowerTitle.includes("contribution"))
        return "text-emerald-600 bg-linear-to-br from-emerald-100 to-emerald-200"
      if (lowerTitle.includes("announcement"))
        return "text-fuchsia-600 bg-linear-to-br from-fuchsia-100 to-fuchsia-200"
      if (lowerTitle.includes("action item"))
        return "text-violet-600 bg-linear-to-br from-violet-100 to-violet-200"
      if (lowerTitle.includes("settings") || lowerTitle.includes("password"))
        return "text-slate-600 bg-linear-to-br from-slate-100 to-slate-200"
      if (lowerTitle.includes("payment") || lowerTitle.includes("penalty"))
        return "text-green-600 bg-linear-to-br from-green-100 to-green-200"
    }

    // Fall back to type-based colors
    switch (type.toLowerCase()) {
      case "success":
        return "text-emerald-600 bg-linear-to-br from-emerald-100 to-emerald-200"
      case "error":
        return "text-red-600 bg-linear-to-br from-red-100 to-red-200"
      case "warning":
        return "text-amber-600 bg-linear-to-br from-amber-100 to-amber-200"
      case "info":
      default:
        return "text-blue-600 bg-linear-to-br from-blue-100 to-blue-200"
    }
  }

  if (!isAuthenticated) {
    return (
      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/login")}
          className="relative transition-all duration-300 hover:bg-primary/10 hover:text-primary">
          <BellIcon
            size={20}
            className="text-gray-600 transition-colors hover:text-primary"
          />
        </Button>
      </motion.div>
    )
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}>
          <Button
            variant="ghost"
            size="icon"
            className="group relative transition-all duration-300 hover:bg-primary/10 hover:text-primary">
            <motion.div
              animate={unreadCount > 0 ? { rotate: [0, -10, 10, -10, 0] } : {}}
              transition={{
                duration: 0.5,
                repeat: unreadCount > 0 ? Number.POSITIVE_INFINITY : 0,
                repeatDelay: 3,
              }}>
              <BellIcon
                size={20}
                className={`transition-all duration-300 ${
                  unreadCount > 0
                    ? "text-primary group-hover:text-primary"
                    : "text-gray-600 group-hover:text-primary"
                }`}
              />
            </motion.div>
            <AnimatePresence>
              {unreadCount > 0 && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}>
                  <Badge className="absolute -top-2 -right-2 h-5 w-5 border-2 border-white bg-primary p-0 text-xs shadow-lg hover:bg-primary">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </Badge>
                </motion.div>
              )}
            </AnimatePresence>
          </Button>
        </motion.div>
      </PopoverTrigger>
      <PopoverContent
        className="w-[90vw] border-0 bg-white/95 p-0 shadow-2xl backdrop-blur-xl sm:w-[420px]"
        align="end"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}>
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="overflow-hidden rounded-lg">
          {/* Header */}
          <div className="bg-linear-to-r from-primary to-primary/80 p-4 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <motion.div
                  animate={{
                    rotate: unreadCount > 0 ? [0, -10, 10, -10, 0] : 0,
                  }}
                  transition={{
                    duration: 0.5,
                    repeat: unreadCount > 0 ? Number.POSITIVE_INFINITY : 0,
                    repeatDelay: 3,
                  }}>
                  <BellIcon className="h-5 w-5" />
                </motion.div>
                <h3 className="text-lg font-semibold">Notifications</h3>
              </div>
              <div className="flex items-center gap-2">
                {notifications.length > 0 && (
                  <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => e.stopPropagation()}
                        className="h-8 text-white hover:bg-white/20">
                        <MoreVertical size={16} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="w-48"
                      onCloseAutoFocus={(e) => e.preventDefault()}>
                      {unreadCount > 0 && (
                        <>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              handleMarkAllAsRead()
                            }}
                            disabled={markAllAsRead.isPending}>
                            <CheckCheck className="mr-2 h-4 w-4" />
                            Mark all as read
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                        </>
                      )}
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteAll()
                        }}
                        disabled={deleteAllNotifications.isPending}
                        className="text-red-600">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete all
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                <Badge
                  variant="secondary"
                  className="border-white/30 bg-white/20 text-white">
                  {unreadCount} new
                </Badge>
              </div>
            </div>

            {/* Filter tabs */}
            <div className="mt-3 flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilter("all")}
                className={`h-8 text-xs ${
                  filter === "all"
                    ? "bg-white/20 text-white"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}>
                All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilter("unread")}
                className={`h-8 text-xs ${
                  filter === "unread"
                    ? "bg-white/20 text-white"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}>
                Unread ({unreadCount})
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilter("archived")}
                className={`h-8 text-xs ${
                  filter === "archived"
                    ? "bg-white/20 text-white"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}>
                Archived
              </Button>
            </div>
          </div>

          {/* Content */}
          <ScrollArea
            className="h-[450px]"
            ref={scrollAreaRef}
            onScroll={handleScroll}>
            {isLoading ? (
              <div className="p-4 space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex gap-3 p-3">
                    <Skeleton className="h-10 w-10 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-8 text-center text-gray-500">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                  className="mb-4">
                  <BellIcon className="mx-auto h-16 w-16 text-gray-300" />
                </motion.div>
                <p className="mb-2 text-lg font-medium">
                  {filter === "unread"
                    ? "No unread notifications"
                    : filter === "archived"
                      ? "No archived notifications"
                      : "All caught up!"}
                </p>
                <p className="text-sm">
                  {filter === "unread"
                    ? "You've read all your notifications"
                    : filter === "archived"
                      ? "Archived notifications will appear here"
                      : "We'll notify you when something exciting happens"}
                </p>
              </motion.div>
            ) : (
              <div className="p-2">
                <AnimatePresence>
                  {notifications.map((notification, index) => {
                    const Icon = getNotificationIcon(
                      notification.type,
                      notification.data?.action,
                      notification.title
                    )
                    const colorClass = getNotificationColor(
                      notification.type,
                      notification.data?.action,
                      notification.title
                    )

                    return (
                      <motion.div
                        key={notification.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ delay: index * 0.02 }}
                        onHoverStart={() =>
                          handleNotificationHoverStart(
                            notification.id,
                            !notification.isRead && !notification.isArchived
                          )
                        }
                        onHoverEnd={() =>
                          handleNotificationHoverEnd(notification.id)
                        }>
                        <motion.div
                          className={`group flex cursor-pointer items-start gap-3 rounded-xl p-3 transition-all duration-300 ${
                            notification.isArchived
                              ? "bg-gray-100/80 hover:bg-gray-100"
                              : !notification.isRead
                                ? "bg-primary/5 hover:bg-primary/10"
                                : "hover:bg-gray-50"
                          }`}
                          onClick={() => handleNotificationClick(notification)}
                          whileHover={{ scale: 1.01, x: 2 }}
                          whileTap={{ scale: 0.99 }}>
                          <motion.div
                            className={`rounded-xl p-2.5 ${colorClass} shadow-sm shrink-0`}
                            whileHover={{ scale: 1.1, rotate: 5 }}
                            transition={{ type: "spring", stiffness: 400 }}>
                            <Icon size={16} />
                          </motion.div>

                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-1 text-sm font-medium text-gray-900 transition-colors group-hover:text-primary">
                              {notification.title}
                            </p>
                            <p className="mt-1 line-clamp-2 text-sm text-gray-600">
                              {notification.message}
                            </p>
                            <div className="mt-2 flex items-center gap-2">
                              <p className="text-xs text-gray-400">
                                {formatDistanceToNow(
                                  new Date(notification.createdAt),
                                  {
                                    addSuffix: true,
                                  }
                                )}
                              </p>
                              {notification.data?.isSecurityAlert && (
                                <Badge
                                  variant="destructive"
                                  className="px-1.5 py-0.5 text-xs">
                                  <Zap size={8} className="mr-1" />
                                  Security
                                </Badge>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col items-center gap-2">
                            {!notification.isRead &&
                              !notification.isArchived && (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  exit={{ scale: 0 }}
                                  className="h-2.5 w-2.5 rounded-full bg-primary shadow-sm"
                                />
                              )}

                            {/* Actions dropdown */}
                            <AnimatePresence>
                              {(hoveredNotification === notification.id ||
                                openMenuId === notification.id) && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.8 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.8 }}>
                                  <DropdownMenu
                                    modal={false}
                                    onOpenChange={(open) =>
                                      setOpenMenuId(
                                        open ? notification.id : null
                                      )
                                    }>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={(e) => e.stopPropagation()}>
                                        <MoreVertical size={14} />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent
                                      align="end"
                                      className="w-44"
                                      onCloseAutoFocus={(e) =>
                                        e.preventDefault()
                                      }>
                                      {!notification.isRead &&
                                        !notification.isArchived && (
                                          <DropdownMenuItem
                                            onClick={(e) =>
                                              handleMarkAsRead(
                                                notification.id,
                                                e
                                              )
                                            }>
                                            <Check className="mr-2 h-4 w-4" />
                                            Mark as read
                                          </DropdownMenuItem>
                                        )}
                                      {notification.isArchived ? (
                                        <DropdownMenuItem
                                          onClick={(e) =>
                                            handleUnarchiveNotification(
                                              notification.id,
                                              e
                                            )
                                          }
                                          disabled={
                                            unarchiveNotification.isPending
                                          }>
                                          <Archive className="mr-2 h-4 w-4" />
                                          Unarchive
                                        </DropdownMenuItem>
                                      ) : (
                                        <DropdownMenuItem
                                          onClick={(e) =>
                                            handleArchiveNotification(
                                              notification.id,
                                              e
                                            )
                                          }
                                          disabled={
                                            archiveNotification.isPending
                                          }>
                                          <Archive className="mr-2 h-4 w-4" />
                                          Archive
                                        </DropdownMenuItem>
                                      )}
                                      <DropdownMenuItem
                                        onClick={(e) =>
                                          handleDeleteNotification(
                                            notification.id,
                                            e
                                          )
                                        }
                                        className="text-red-600">
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </motion.div>
                        {index < notifications.length - 1 && (
                          <Separator className="my-1 opacity-50" />
                        )}
                      </motion.div>
                    )
                  })}
                </AnimatePresence>

                {/* Loading more indicator */}
                {isFetchingNextPage && (
                  <div className="flex items-center justify-center py-4">
                    <Loader className="h-5 w-5 text-primary" />
                    <span className="ml-2 text-sm text-gray-500">
                      Loading more...
                    </span>
                  </div>
                )}

                {/* End of list indicator */}
                {!hasNextPage && notifications.length > 10 && (
                  <div className="py-4 text-center text-xs text-gray-400">
                    You've reached the end
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </motion.div>
      </PopoverContent>
    </Popover>
  )
}
