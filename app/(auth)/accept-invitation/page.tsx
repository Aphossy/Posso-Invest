"use client"

import { useMemo, useState } from "react"
import type { Route } from "next"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { extractRoleValue, getRoleDashboard } from "@/utils/role-utils"
import { CheckCircle2, Mail, XCircle } from "lucide-react"
import { toast } from "sonner"

import { authClient } from "@/lib/auth-client"
import { organizationClient } from "@/lib/organization-client"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Loader } from "@/components/common/loader"

export default function AcceptInvitationPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { data: session } = authClient.useSession()

  const invitationId = searchParams.get("invitationId")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectConfirm, setRejectConfirm] = useState("")
  const [rejectError, setRejectError] = useState<string | null>(null)
  const [status, setStatus] = useState<
    "idle" | "accepted" | "rejected" | "error"
  >("idle")
  const isAuthenticated = Boolean(session?.user)

  const loginRedirect = useMemo(() => {
    if (!invitationId) return "/login"
    const from = `/accept-invitation?invitationId=${encodeURIComponent(invitationId)}`
    return `/login?from=${encodeURIComponent(from)}`
  }, [invitationId])

  const handleAccept = async () => {
    if (!invitationId) return

    if (!session?.user) {
      router.replace(loginRedirect as Route)
      return
    }

    setIsSubmitting(true)
    try {
      const response = await organizationClient.acceptInvitation({
        invitationId,
      })

      if (response.error) {
        throw new Error(response.error.message || "Failed to accept invitation")
      }

      setStatus("accepted")

      let emitData: { organizationId?: string; role?: string } = {}

      try {
        const emitResponse = await fetch(
          "/api/organization/invitation-accepted",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ invitationId }),
          }
        )

        emitData = await emitResponse
          .json()
          .catch(() => ({}) as { organizationId?: string; role?: string })

        if (!emitResponse.ok) {
          console.error("Failed to emit invitation accepted event", {
            status: emitResponse.status,
          })
        } else if (emitData.organizationId) {
          const activeResponse = await organizationClient.setActive({
            organizationId: emitData.organizationId,
          })

          if (activeResponse.error) {
            throw new Error(
              activeResponse.error.message || "Failed to activate organization"
            )
          }
        }
      } catch (emitError) {
        console.error("Error emitting invitation accepted event", emitError)
      }

      const roleResponse = await organizationClient.getActiveMemberRole()
      const resolvedRole =
        extractRoleValue(emitData.role ?? roleResponse) ?? "member"

      toast.success("Invitation accepted. Welcome to TrustLink Group.")
      router.push(getRoleDashboard(resolvedRole) as Route)
    } catch (error) {
      console.error(error)
      setStatus("error")
      toast.error("Unable to accept invitation")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReject = async () => {
    if (!invitationId) return

    if (!session?.user) {
      router.replace(loginRedirect as Route)
      return
    }

    setIsRejecting(true)
    setRejectError(null)
    try {
      const response = await organizationClient.rejectInvitation({
        invitationId,
      })

      if (response.error) {
        throw new Error(response.error.message || "Failed to reject invitation")
      }

      setStatus("rejected")
      setRejectOpen(false)
      setRejectConfirm("")
      toast.success("Invitation rejected.")
      router.push("/")
    } catch (error) {
      console.error(error)
      setRejectError(
        error instanceof Error ? error.message : "Unable to reject invitation"
      )
      toast.error("Unable to reject invitation")
    } finally {
      setIsRejecting(false)
    }
  }

  const handleRejectOpenChange = (open: boolean) => {
    setRejectOpen(open)
    if (!open) {
      setRejectConfirm("")
      setRejectError(null)
    }
  }

  const rejectConfirmText = "reject"
  const isRejectEnabled =
    rejectConfirm.trim().toLowerCase() === rejectConfirmText

  return (
    <div className="mx-auto flex min-h-screen max-w-lg items-center px-4 py-12">
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <Mail className="h-4 w-4" />
            TrustLink Group Invitation
          </div>
          <CardTitle className="text-2xl">Accept your invitation</CardTitle>
          <CardDescription>
            Join the TrustLink Group workspace to access your Ikimina dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!invitationId && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              <XCircle className="h-4 w-4" />
              Missing invitation link. Please check your email.
            </div>
          )}

          {status === "accepted" && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              Invitation accepted. Redirecting you now.
            </div>
          )}

          {status === "error" && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              <XCircle className="h-4 w-4" />
              Unable to accept the invitation. Please contact an administrator.
            </div>
          )}

          {status === "rejected" && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              <XCircle className="h-4 w-4" />
              Invitation rejected. If this was a mistake, request a new invite.
            </div>
          )}

          <div className="space-y-3">
            {!isAuthenticated && invitationId && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                <p className="mb-2">
                  Sign in to accept or reject this invitation.
                </p>
                <Button asChild className="w-full">
                  <Link href={loginRedirect as Route}>Sign in to continue</Link>
                </Button>
              </div>
            )}
            <Button
              className="w-full"
              onClick={handleAccept}
              disabled={
                !invitationId ||
                !isAuthenticated ||
                isSubmitting ||
                isRejecting ||
                status === "accepted"
              }>
              {isSubmitting ? <Loader className="mr-2 h-4 w-4" /> : null}
              Accept Invitation
            </Button>

            <AlertDialog
              open={rejectOpen}
              onOpenChange={handleRejectOpenChange}>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={
                    !invitationId ||
                    !isAuthenticated ||
                    isSubmitting ||
                    isRejecting ||
                    status === "accepted"
                  }>
                  Reject Invitation
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reject invitation?</AlertDialogTitle>
                  <AlertDialogDescription className="space-y-2">
                    <span className="block">
                      Rejecting this invitation removes your access to the
                      TrustLink Group workspace.
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      Note: you can only join later with a new invitation link.
                    </span>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <form
                  className="space-y-2"
                  onSubmit={(event) => {
                    event.preventDefault()
                    if (isRejectEnabled && !isRejecting) {
                      void handleReject()
                    }
                  }}>
                  <p className="text-sm font-medium">
                    Type{" "}
                    <span className="rounded bg-muted px-1 font-mono">
                      {rejectConfirmText}
                    </span>{" "}
                    to confirm.
                  </p>
                  <Input
                    type="text"
                    placeholder={rejectConfirmText}
                    value={rejectConfirm}
                    onChange={(event) => setRejectConfirm(event.target.value)}
                    autoComplete="off"
                  />
                  {rejectError && (
                    <p className="text-xs text-destructive">{rejectError}</p>
                  )}
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      type="submit"
                      disabled={!isRejectEnabled || isRejecting}
                      className={`bg-destructive text-destructive-foreground hover:bg-destructive/90 ${
                        !isRejectEnabled ? "cursor-not-allowed opacity-50" : ""
                      }`}>
                      {isRejecting ? <Loader className="mr-2 h-4 w-4" /> : null}
                      Reject Invitation
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </form>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
