import type { Metadata } from "next"
import { headers } from "next/headers"
import Link from "next/link"
import { redirect } from "next/navigation"
import { organisationEmail } from "@/constants/organisation"
import { AlertCircle, Home, Mail, ShieldX } from "lucide-react"

import { auth } from "@/lib/auth"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export const metadata: Metadata = {
  title: "Account Suspended - TrustLink Group",
  description: "Your account has been suspended",
}

export default async function BannedPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  // If user is not banned, redirect to home
  if (session?.user && !session.user.banned) {
    redirect("/")
  }

  const user = session?.user
  const banReason = user?.banReason || "Terms of Service violation"
  const banExpiresAt = user?.banExpires

  // Calculate if ban is temporary
  const isTemporary = banExpiresAt !== null && banExpiresAt !== undefined
  const banEndDate = isTemporary ? new Date(banExpiresAt) : null
  // eslint-disable-next-line react-hooks/purity
  const isExpired = banEndDate ? banEndDate.getTime() < Date.now() : false

  // If ban is expired, they shouldn't be on this page
  if (isExpired) {
    redirect("/")
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-red-50 via-white to-orange-50 p-4">
      <div className="w-full max-w-2xl">
        <Card className="border-red-200 shadow-xl">
          <CardHeader className="space-y-4 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
              <ShieldX className="h-10 w-10 text-red-600" />
            </div>
            <CardTitle className="text-3xl font-bold text-red-600">
              Account Suspended
            </CardTitle>
            <CardDescription className="text-base">
              {isTemporary
                ? "Your account has been temporarily suspended"
                : "Your account has been permanently suspended"}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Suspension Details */}
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Suspension Details</AlertTitle>
              <AlertDescription className="mt-2 space-y-2">
                <div className="grid gap-2">
                  <div className="flex justify-between">
                    <span className="font-medium">Reason:</span>
                    <span className="text-right">{banReason}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Status:</span>
                    <span className="text-right font-semibold">
                      {isTemporary ? "Temporary Ban" : "Permanent Ban"}
                    </span>
                  </div>
                  {banEndDate && (
                    <div className="flex justify-between">
                      <span className="font-medium">Expires:</span>
                      <span className="text-right">
                        {banEndDate.toLocaleDateString("en-RW", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>

            {/* What This Means */}
            <div className="rounded-lg bg-amber-50 p-4 border border-amber-200">
              <h3 className="font-semibold text-amber-900 mb-3 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                What This Means
              </h3>
              <ul className="space-y-2 text-sm text-amber-800">
                <li className="flex items-start gap-2">
                  <span className="text-amber-600 mt-0.5">•</span>
                  <span>You cannot access your account or dashboard</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-600 mt-0.5">•</span>
                  <span>
                    All features and services are temporarily unavailable
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-600 mt-0.5">•</span>
                  <span>
                    Your data remains secure and will be restored when the
                    suspension is lifted
                  </span>
                </li>
                {isTemporary && (
                  <li className="flex items-start gap-2">
                    <span className="text-amber-600 mt-0.5">•</span>
                    <span>
                      Your account will be automatically reinstated after the
                      ban period
                    </span>
                  </li>
                )}
              </ul>
            </div>

            {/* Appeal Process */}
            <div className="rounded-lg bg-blue-50 p-4 border border-blue-200">
              <h3 className="font-semibold text-blue-900 mb-3">
                Appeal This Decision
              </h3>
              <p className="text-sm text-blue-800 mb-3">
                If you believe this suspension was made in error or you would
                like to provide additional information, you can contact our
                support team.
              </p>
              <div className="flex flex-col gap-2 text-sm text-blue-800">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <span>
                    Email:{" "}
                    <a
                      href={`mailto:${organisationEmail}`}
                      className="font-medium underline hover:text-blue-600">
                      {organisationEmail}
                    </a>
                  </span>
                </div>
              </div>
            </div>

            {/* Email Notification Notice */}
            {user?.email && (
              <div className="rounded-lg bg-gray-50 p-4 border border-gray-200">
                <p className="text-sm text-gray-700">
                  A detailed suspension notification has been sent to{" "}
                  <span className="font-medium">{user.email}</span>
                </p>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex flex-wrap gap-3">
            <Button variant="outline" className="w-full" asChild>
              <Link href="/">
                <Home className="mr-2 h-4 w-4" />
                Return to Home
              </Link>
            </Button>
            <Button className="w-full" asChild>
              <a
                href={`mailto:${organisationEmail}?subject=Account Suspension Appeal`}>
                <Mail className="mr-2 h-4 w-4" />
                Contact Support
              </a>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
