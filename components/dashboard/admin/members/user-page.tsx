"use client"

import { useState } from "react"
import type { Route } from "next"
import Link from "next/link"
import {
  AlertCircle,
  MailPlus,
  RefreshCw,
  Settings2,
  Users,
} from "lucide-react"

import { useAdminUsers } from "@/hooks/use-admin-users"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

import InviteUserDialog from "./invite-user-dialog"
import { UserStatsCards } from "./user-stats-cards"
import UsersTable from "./users-table"

export default function UserPage() {
  const { users, loading, error, refetch, updateUser, deleteUser } =
    useAdminUsers()
  const [refreshing, setRefreshing] = useState(false)
  const [isInviteOpen, setIsInviteOpen] = useState(false)

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await refetch()
    } catch {
      // DataTable handles the toast
    } finally {
      setRefreshing(false)
    }
  }

  if (error) {
    return (
      <div className="container mx-auto py-5">
        <Card>
          <CardContent className="flex h-40 flex-col items-center justify-center gap-4 text-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="text-muted-foreground">
              Failed to load users: {error}
            </p>
            <Button
              onClick={handleRefresh}
              variant="outline"
              disabled={refreshing}>
              <RefreshCw
                className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto space-y-8 px-2 py-5">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-1 rounded-md bg-primary/10 p-2">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">
              Member Management
            </h1>
            <p className="mt-1 text-muted-foreground">
              Manage Posso Ventures organization members and committee access.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button variant="outline" asChild>
            <Link href={"/admin/roles" as Route}>
              <Settings2 className="mr-2 h-4 w-4" />
              Permissions
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={"/admin/members/invitations" as Route}>
              <MailPlus className="mr-2 h-4 w-4" />
              Invitations
            </Link>
          </Button>
          <Button onClick={() => setIsInviteOpen(true)}>
            <MailPlus className="mr-2 h-4 w-4" />
            Invite Member
          </Button>
        </div>
      </div>

      <Separator />

      {/* ── Stats Cards ─────────────────────────────────────────────── */}
      <UserStatsCards users={users} loading={loading} />

      {/* ── Members Table ───────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>All Members</CardTitle>
          <CardDescription>
            Organization members synced from Better Auth
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 py-0 pb-4">
          <UsersTable
            users={users}
            loading={loading}
            error={error}
            onUpdateUser={updateUser}
            onDeleteUser={deleteUser}
            onRefetch={refetch}
          />
        </CardContent>
      </Card>

      <InviteUserDialog
        open={isInviteOpen}
        onOpenChange={setIsInviteOpen}
        onSuccess={refetch}
      />
    </div>
  )
}
