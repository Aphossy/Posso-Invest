// components\dashboard\admin\users\user-stats-cards.tsx
"use client"

import { Activity, TrendingUp, Users } from "lucide-react"

import type { AdminUser } from "@/types/admin-users"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

interface UserStatsCardsProps {
  users: AdminUser[]
  loading?: boolean
}

export function UserStatsCards({ users, loading }: UserStatsCardsProps) {
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)
  const monthAgo = new Date()
  monthAgo.setDate(monthAgo.getDate() - 30)

  const totalUsers = users.length
  const adminUsers = users.filter((u) => u.role === "admin").length
  const treasurerUsers = users.filter((u) => u.role === "treasurer").length
  const secretaryUsers = users.filter((u) => u.role === "secretary").length
  const presidentUsers = users.filter((u) => u.role === "president").length
  const memberUsers = users.filter((u) => u.role === "member").length
  const recentUsers = users.filter((u) => new Date(u.createdAt) > weekAgo).length
  const recentMonthUsers = users.filter(
    (u) => new Date(u.createdAt) > monthAgo
  ).length

  if (loading) {
    return <UserStatsCardsSkeleton />
  }

  const stats = [
    {
      title: "Total Members",
      value: totalUsers.toLocaleString(),
      description: "All organization members",
      icon: Users,
      trend:
        recentUsers > 0
          ? `+${recentUsers} this week`
          : "No new members this week",
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-950",
    },
    {
      title: "Admins",
      value: adminUsers.toLocaleString(),
      description: "Full access roles",
      icon: Users,
      trend: adminUsers === 1 ? "1 admin" : `${adminUsers} admins`,
      color: "text-red-600",
      bgColor: "bg-red-50 dark:bg-red-950",
    },
    {
      title: "Committee Roles",
      value: (
        treasurerUsers +
        secretaryUsers +
        presidentUsers
      ).toLocaleString(),
      description: "Treasurer + Secretary + President roles",
      icon: Activity,
      trend: `${treasurerUsers} treasurer, ${secretaryUsers} secretary, ${presidentUsers} president`,
      color: "text-amber-600",
      bgColor: "bg-amber-50 dark:bg-amber-950",
    },
    {
      title: "New This Month",
      value: recentMonthUsers.toLocaleString(),
      description: "Joined in the last 30 days",
      icon: TrendingUp,
      trend:
        recentMonthUsers > 0
          ? `${recentMonthUsers} new members`
          : "No new members",
      color: "text-green-600",
      bgColor: "bg-green-50 dark:bg-green-950",
    },
  ]

  const roleStats = [
    {
      role: "Admin",
      count: adminUsers,
      color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    },
    {
      role: "Treasurers",
      count: treasurerUsers,
      color:
        "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    },
    {
      role: "Secretaries",
      count: secretaryUsers,
      color:
        "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
    },
    {
      role: "Presidents",
      count: presidentUsers,
      color:
        "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200",
    },

    {
      role: "Members",
      count: memberUsers,
      color:
        "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    },
  ]

  return (
    <div className="space-y-6">
      {/* Main Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <div className={`rounded-md p-2 ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
              <div className="flex items-center pt-1">
                <TrendingUp className="mr-1 h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {stat.trend}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Role Distribution & Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Role Distribution
            </CardTitle>
            <CardDescription>User roles breakdown</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {roleStats.map((role) => (
              <div
                key={role.role}
                className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className={role.color}>{role.role}</Badge>
                  <span className="text-sm text-muted-foreground">
                    {totalUsers > 0
                      ? ((role.count / totalUsers) * 100).toFixed(1)
                      : 0}
                    %
                  </span>
                </div>
                <span className="font-medium">{role.count}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Membership Activity
            </CardTitle>
            <CardDescription>Recent member changes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">New members (7 days)</span>
              <Badge variant="outline">{recentUsers}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">New members (30 days)</span>
              <Badge variant="outline">{recentMonthUsers}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Committee members</span>
              <Badge variant="outline">
                {treasurerUsers + secretaryUsers + presidentUsers}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Regular members</span>
              <Badge variant="outline">{memberUsers}</Badge>
            </div>
            {/* <div className="flex items-center justify-between">
              <span className="text-sm">Account health</span>
              <Badge variant={bannedUsers === 1 ? "default" : "destructive"}>
                {bannedUsers === 1 ? "Excellent" : "Needs attention"}
              </Badge>
            </div> */}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function UserStatsCardsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-20 animate-pulse rounded bg-muted" />
              <div className="h-8 w-8 animate-pulse rounded-md bg-muted" />
            </CardHeader>
            <CardContent>
              <div className="mb-2 h-8 w-16 animate-pulse rounded bg-muted" />
              <div className="mb-2 h-3 w-24 animate-pulse rounded bg-muted" />
              <div className="h-3 w-20 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <div className="h-5 w-32 animate-pulse rounded bg-muted" />
              <div className="h-4 w-40 animate-pulse rounded bg-muted" />
            </CardHeader>
            <CardContent className="space-y-3">
              {Array.from({ length: 5 }).map((_, j) => (
                <div key={j} className="flex items-center justify-between">
                  <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                  <div className="h-6 w-12 animate-pulse rounded bg-muted" />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
