"use client"

import { useState } from "react"
import type { Route } from "next"
import Link from "next/link"
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  MailPlus,
  Send,
  ShieldAlert,
  XCircle,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

import { InvitationsTable } from "./invitations-table"
import InviteUserDialog from "./invite-user-dialog"

const infoCards = [
  {
    icon: Clock,
    iconClass: "text-amber-500",
    title: "Pending access only",
    description:
      "Pending invitations must be accepted within 48 hours (default) before they expire.",
  },
  {
    icon: Send,
    iconClass: "text-blue-500",
    title: "Active organization scope",
    description:
      "Invitations are scoped to the organization active in your current session.",
  },
  {
    icon: ShieldAlert,
    iconClass: "text-rose-500",
    title: "Review before resending",
    description:
      "Resend only when the recipient still needs access and the invitation is still valid.",
  },
  {
    icon: XCircle,
    iconClass: "text-red-500",
    title: "Cancel or delete",
    description:
      "Cancel pending invitations to revoke access before acceptance. Delete removes the record permanently.",
  },
  {
    icon: CheckCircle2,
    iconClass: "text-emerald-500",
    title: "Accepted invitations",
    description:
      "Once accepted, the invitee becomes an active member. The invitation record is kept for audit purposes.",
  },
]

export default function InvitationsPage() {
  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const handleInviteSuccess = () => {
    setRefreshKey((k) => k + 1)
  }

  return (
    <div className="container mx-auto space-y-8 px-2 py-5">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Member Invitations</h1>
          <p className="mt-1 text-muted-foreground">
            Review pending invitations, resend access, cancel or delete invites
            that are no longer needed.
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button variant="outline" asChild>
            <Link href={"/admin/members" as Route}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Members
            </Link>
          </Button>
          <Button onClick={() => setIsInviteOpen(true)}>
            <MailPlus className="mr-2 h-4 w-4" />
            Invite Member
          </Button>
        </div>
      </div>

      <Separator />

      {/* ── Info Cards ──────────────────────────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {infoCards.map(({ icon: Icon, iconClass, title, description }) => (
          <Card
            key={title}
            className="border-border/60 bg-muted/30 shadow-none">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Icon className={cn("h-4 w-4 shrink-0", iconClass)} />
                {title}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 text-xs text-muted-foreground">
              {description}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Invitations Table ────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Invitation List</CardTitle>
          <CardDescription>
            All invitations for the active organization - pending, accepted, and
            canceled.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 py-0 pb-4">
          <InvitationsTable key={refreshKey} />
        </CardContent>
      </Card>

      <InviteUserDialog
        open={isInviteOpen}
        onOpenChange={setIsInviteOpen}
        onSuccess={handleInviteSuccess}
      />
    </div>
  )
}
