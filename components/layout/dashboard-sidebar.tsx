// components/layout/dashboard-sidebar.tsx

"use client"

import type { Route } from "next"
import Image from "next/image"
import Link, { useLinkStatus } from "next/link"
import { usePathname } from "next/navigation"
import { getNavigationByRole, type UserRole } from "@/constants/navigation"

import { useActiveRole } from "@/hooks/use-active-role"
import { useNavigationBadges } from "@/hooks/use-navigation-badges"
import { Badge } from "@/components/ui/badge"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup as SidebarGroupComponent,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

import { Loader } from "../common/loader"
import SidebarUser from "./sidebar-user"

export function DashboardSidebar() {
  const pathname = usePathname()
  const { role } = useActiveRole()
  const userRole = (role ?? "member") as UserRole

  const navigationGroups = getNavigationByRole(userRole)
  const navigationBadges = useNavigationBadges(userRole)

  const LinkStatus = () => {
    const { pending } = useLinkStatus()

    return pending ? (
      <span aria-label="Loading" className="">
        <Loader size="sm" />
      </span>
    ) : null
  }

  return (
    <Sidebar variant="inset">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-4 py-2">
          <Image
            src="/brand/logo.png"
            alt="Posso Ventures Group logo"
            width={200}
            height={200}
            className="rounded-lg size-10"
          />
          <div className="grid flex-1 text-left text-sm">
            <span className="truncate capitalize font-semibold">
              POSSO VENTURES
            </span>
            <span className="truncate text-xs text-gray-500">
              Saving together for a Clinic.
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {navigationGroups.map((group, index) => (
          <SidebarGroupComponent key={index}>
            {group.label && (
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const isActive =
                    pathname === item.url ||
                    (item.url !== "/" && pathname.startsWith(item.url + "/"))

                  // Use dynamic badge from hook, fallback to static badge from navigation
                  const badgeValue = navigationBadges[item.url] || item.badge

                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={isActive}>
                        <Link
                          href={item.url as Route}
                          className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <item.icon size={16} />
                            <span className="truncate">{item.title}</span>
                          </div>

                          <div className="flex items-center gap-1">
                            {badgeValue && (
                              <Badge
                                variant="destructive"
                                className="h-5 min-w-5 px-1 text-[10px]">
                                {badgeValue}
                              </Badge>
                            )}
                            {item.isNew && (
                              <Badge
                                variant="default"
                                className="h-5 px-1.5 text-[10px]">
                                New
                              </Badge>
                            )}

                            <LinkStatus />
                          </div>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroupComponent>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarUser />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
