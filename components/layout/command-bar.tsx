"use client"

import * as React from "react"
import type { Route } from "next"
import { usePathname, useRouter } from "next/navigation"
import {
  getNavigationByRole,
  PUBLIC_PAGES,
  QUICK_ACTIONS,
  type NavigationItem,
  type UserRole,
} from "@/constants/navigation"
import { motion } from "framer-motion"
import {
  ArrowDown,
  ArrowUp,
  CornerDownLeft,
  ExternalLink,
  Zap,
} from "lucide-react"
import { useHotkeys } from "react-hotkeys-hook"
import Clock from "react-live-clock"

import { cn } from "@/lib/utils"
import { useNavigationBadges } from "@/hooks/use-navigation-badges"
import { Badge } from "@/components/ui/badge"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"

interface CommandBarProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userRole?: UserRole
}

export function CommandBar({
  open,
  onOpenChange,
  userRole = "member",
}: CommandBarProps) {
  const router = useRouter()
  const pathname = usePathname()

  // Get role-specific navigation
  const navigationGroups = getNavigationByRole(userRole)
  const navigationBadges = useNavigationBadges(userRole)

  const quickActions = QUICK_ACTIONS[userRole] || []

  // Flatten all navigation items
  const roleNavigationItems = navigationGroups.flatMap((group) =>
    group.items.map((item) => ({ ...item, group: group.label }))
  )

  const publicPagesWithGroup = PUBLIC_PAGES.map((item) => ({
    ...item,
    group: "Public Pages",
  }))

  const quickActionsWithGroup = quickActions.map((item) => ({
    ...item,
    group: "Quick Actions",
  }))

  const allItems = [
    ...roleNavigationItems,
    ...publicPagesWithGroup,
    ...quickActionsWithGroup,
  ]

  // Group items by their group label
  const groupedItems = allItems.reduce(
    (acc, item) => {
      const group = item.group || "Other"
      if (!acc[group]) {
        acc[group] = []
      }
      acc[group].push(item)
      return acc
    },
    {} as Record<string, (NavigationItem & { group: string })[]>
  )

  const allShortcutItems = [
    ...roleNavigationItems.filter((item) => item.shortcut),
    ...quickActions.filter((item) => item.shortcut),
  ]

  useHotkeys(
    allShortcutItems.map((item) => item.shortcut!).join(","),
    (e, handler) => {
      e.preventDefault()
      const item = allShortcutItems.find(
        (i) => i.shortcut!.toLowerCase() === handler.hotkey
      )
      if (item) router.push(item.url as Route)
    },
    { enableOnFormTags: false }
  )

  const handleSelect = (url: string, external?: boolean) => {
    onOpenChange(false)
    if (external) {
      window.open(url, "_blank")
    } else {
      router.push(url as Route)
    }
  }

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        onOpenChange(!open)
      }

      if (open && e.key === "Escape") {
        e.preventDefault()
        onOpenChange(false)
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [open, onOpenChange])

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      className="md:min-w-2xl">
      <div className="flex items-center border-b px-3">
        <CommandInput
          placeholder="Search pages and actions..."
          className="border-0 focus:ring-0"
        />
      </div>

      <CommandList>
        <CommandEmpty>
          <div className="py-6 text-center">
            <div className="text-sm text-muted-foreground">
              No results found
            </div>
            <div className="mt-1 text-xs text-muted-foreground/60">
              Try searching for something else
            </div>
          </div>
        </CommandEmpty>

        {Object.entries(groupedItems).map(([group, items], index) => (
          <React.Fragment key={group}>
            {index > 0 && <CommandSeparator />}
            <CommandGroup heading={group}>
              {items.map((item) => {
                const isCurrent = pathname === item.url
                const Icon = item.icon

                // Use dynamic badge from hook, fallback to static badge from navigation
                const badgeValue = navigationBadges[item.url] || item.badge

                return (
                  <CommandItem
                    key={item.url}
                    onSelect={() => handleSelect(item.url, item.external)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5",
                      isCurrent && "bg-accent"
                    )}>
                    <div
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
                        isCurrent ? "bg-primary/20" : "bg-muted"
                      )}>
                      <Icon
                        className={cn("h-4 w-4", isCurrent && "text-primary")}
                      />
                    </div>

                    <div className="flex flex-1 flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "text-sm font-medium",
                            isCurrent && "text-primary"
                          )}>
                          {item.title}
                        </span>
                        {isCurrent && (
                          <Badge variant="secondary" className="h-5 text-xs">
                            Current
                          </Badge>
                        )}
                        {item.isNew && (
                          <Badge variant="default" className="h-5 text-xs">
                            New
                          </Badge>
                        )}

                        {badgeValue && (
                          <Badge variant="destructive" className="h-5 text-xs">
                            {badgeValue}
                          </Badge>
                        )}
                        {item.external && (
                          <ExternalLink className="h-3 w-3 text-muted-foreground" />
                        )}
                      </div>
                      {item.description && (
                        <span className="text-xs text-muted-foreground">
                          {item.description}
                        </span>
                      )}
                    </div>

                    {item.shortcut && (
                      <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground sm:inline-flex">
                        <span className="text-xs">⌘</span>
                        {item.shortcut.replace("mod+", "")}
                      </kbd>
                    )}

                    {isCurrent && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="h-2 w-2 rounded-full bg-primary"
                      />
                    )}
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </React.Fragment>
        ))}
      </CommandList>

      <div className="flex items-center justify-between border-t bg-muted/50 px-3 py-2">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-background px-1.5 font-mono text-[10px] font-medium">
              <ArrowUp className="h-3 w-3" />
              <ArrowDown className="h-3 w-3" />
            </kbd>
            <span>navigate</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-background px-1.5 font-mono text-[10px] font-medium">
              <CornerDownLeft className="h-3 w-3" />
            </kbd>
            <span>select</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-background px-1.5 font-mono text-[10px] font-medium">
              Esc
            </kbd>
            <span>close</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Zap className="h-3 w-3" />
            <span>{allItems.length} pages</span>
          </div>
          <span aria-hidden="true" className="text-muted-foreground/40">
            |
          </span>
          <span className="font-medium tabular-nums">
            <Clock
              format={"hh:mm A - ddd, MMM DD"}
              ticking={true}
              timezone={"Africa/Kigali"}
            />
          </span>
        </div>
      </div>
    </CommandDialog>
  )
}
