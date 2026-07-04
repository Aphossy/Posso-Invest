import { ArrowDown, ArrowUp, LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface StatCardProps {
  title: string
  value: string | number
  change?: number
  icon: any | LucideIcon
  description?: string
}

export function StatCard({
  title,
  value,
  change,
  icon: Icon,
  description,
}: StatCardProps) {
  const hasPositiveChange = change && change > 0
  const hasNegativeChange = change && change < 0

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
         <div className="p-2 bg-primary rounded-full">
        <Icon className="h-4 w-4 text-white" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tabular-nums">{value}</div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {change !== undefined && (
            <div
              className={cn(
                "flex items-center gap-1",
                hasPositiveChange && "text-green-600",
                hasNegativeChange && "text-red-600"
              )}>
              {hasPositiveChange && <ArrowUp className="h-3 w-3" />}
              {hasNegativeChange && <ArrowDown className="h-3 w-3" />}
              <span>{Math.abs(change)}%</span>
            </div>
          )}
          {description && <span>{description}</span>}
        </div>
      </CardContent>
    </Card>
  )
}
