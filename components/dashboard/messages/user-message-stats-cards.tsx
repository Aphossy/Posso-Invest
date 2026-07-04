"use client"

import { AnimatePresence, motion } from "framer-motion"
import { CheckCircle2, Clock, MessageSquare, PlayCircle } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

interface UserMessageStatsCardsProps {
  stats: {
    total: number
    new: number
    inProgress: number
    resolved: number
  }
  loading: boolean
}

export function UserMessageStatsCards({
  stats,
  loading,
}: UserMessageStatsCardsProps) {
  const statItems = [
    {
      title: "Total Messages",
      value: stats.total,
      description: "All your submitted messages",
      icon: MessageSquare,
      color: "text-blue-600",
      bgColor: "bg-blue-100 dark:bg-blue-900/20",
    },
    {
      title: "New",
      value: stats.new,
      description: "Awaiting review",
      icon: Clock,
      color: "text-yellow-600",
      bgColor: "bg-yellow-100 dark:bg-yellow-900/20",
    },
    {
      title: "In Progress",
      value: stats.inProgress,
      description: "Currently being handled",
      icon: PlayCircle,
      color: "text-orange-600",
      bgColor: "bg-orange-100 dark:bg-orange-900/20",
    },
    {
      title: "Resolved",
      value: stats.resolved,
      description: "Successfully completed",
      icon: CheckCircle2,
      color: "text-green-600",
      bgColor: "bg-green-100 dark:bg-green-900/20",
    },
  ]

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <AnimatePresence mode="wait">
        {statItems.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}>
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <div className={cn("rounded-full p-2", stat.bgColor)}>
                  <stat.icon className={cn("h-4 w-4", stat.color)} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
