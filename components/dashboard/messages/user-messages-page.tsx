// C:\Users\user\OneDrive\Desktop\trustlink-group\components\dashboard\user\messages\user-messages-page.tsx
"use client"

import { useState } from "react"
import { Plus, RefreshCw } from "lucide-react"
import { toast } from "sonner"

import { useSession } from "@/lib/auth-client"
import { useMessages } from "@/hooks/api/use-messages"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import { CreateMessageDialog } from "./create-message-dialog"
import { UserMessageStatsCards } from "./user-message-stats-cards"
import { UserMessagesTable } from "./user-messages-table"

export default function UserMessagesPage() {
  const [refreshing, setRefreshing] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const { data: session } = useSession()
  const { data, isLoading, error, refetch } = useMessages()

  const messages = data?.data.messages || []

  // Filter messages to only show those belonging to the current user
  const userMessages = messages.filter(
    (message) => message.email === session?.user?.email
  )

  // Calculate user-specific stats
  const stats = {
    total: userMessages.length,
    new: userMessages.filter((m) => m.status === "new").length,
    inProgress: userMessages.filter((m) => m.status === "in-progress").length,
    resolved: userMessages.filter((m) => m.status === "resolved").length,
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await refetch()
      toast.success("Messages refreshed successfully")
    } catch (error) {
      console.error("Failed to refresh messages:", error)
      toast.error("Failed to refresh messages")
    } finally {
      setRefreshing(false)
    }
  }

  if (error) {
    return (
      <div className="container mx-auto py-5">
        <Card>
          <CardContent className="flex h-32 items-center justify-center">
            <div className="text-center">
              <p className="mb-4 text-muted-foreground">
                Failed to load messages: {error.message}
              </p>
              <Button onClick={handleRefresh} variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto space-y-8 py-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Messages</h1>
          <p className="text-muted-foreground">
            View your submitted messages and track their status
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}>
            <RefreshCw
              className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Message
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <UserMessageStatsCards stats={stats} loading={isLoading} />

      {/* Messages Table */}
      <Card>
        <CardHeader>
          <CardTitle>Your Messages</CardTitle>
          <CardDescription>
            Messages you&apos;ve sent through the contact form
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 py-0">
          <UserMessagesTable
            messages={userMessages}
            loading={isLoading}
            error={error || null}
            onRefetch={refetch}
          />
        </CardContent>
      </Card>

      {/* Create Message Dialog */}
      <CreateMessageDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={() => {
          refetch()
          setCreateDialogOpen(false)
        }}
      />
    </div>
  )
}
