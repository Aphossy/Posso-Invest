import { formatDistanceToNow } from "date-fns"
import { Activity, AlertCircle, CheckCircle2, RefreshCw } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface DatabaseHealthCardProps {
  health: {
    status: "healthy" | "unhealthy"
    latency?: number
    error?: string
    timestamp: string
    connectionInfo: {
      isConnected: boolean
      maxConnections: number
    }
  }
  onRefresh?: () => void
}

export function DatabaseHealthCard({
  health,
  onRefresh,
}: DatabaseHealthCardProps) {
  const isHealthy = health.status === "healthy"

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isHealthy ? (
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-500" />
          )}
          <Badge variant={isHealthy ? "default" : "destructive"}>
            {health.status.toUpperCase()}
          </Badge>
        </div>
        {onRefresh && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            className="h-8">
            <RefreshCw className="h-3 w-3" />
          </Button>
        )}
      </div>

      <div className="grid gap-3">
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Connection</span>
          </div>
          <Badge
            variant={
              health.connectionInfo.isConnected ? "default" : "secondary"
            }>
            {health.connectionInfo.isConnected ? "Connected" : "Disconnected"}
          </Badge>
        </div>

        {health.latency && (
          <div className="flex items-center justify-between rounded-lg border p-3">
            <span className="text-sm text-muted-foreground">Latency</span>
            <span className="text-sm font-semibold">{health.latency}ms</span>
          </div>
        )}

        <div className="flex items-center justify-between rounded-lg border p-3">
          <span className="text-sm text-muted-foreground">Max Connections</span>
          <span className="text-sm font-semibold">
            {health.connectionInfo.maxConnections}
          </span>
        </div>

        <div className="flex items-center justify-between rounded-lg border p-3">
          <span className="text-sm text-muted-foreground">Last Check</span>
          <span className="text-sm font-semibold">
            {formatDistanceToNow(new Date(health.timestamp), {
              addSuffix: true,
            })}
          </span>
        </div>

        {health.error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="text-xs text-red-600">{health.error}</p>
          </div>
        )}
      </div>
    </div>
  )
}
