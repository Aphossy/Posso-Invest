// lib\auth-client.ts
import {
  adminClient,
  emailOTPClient,
  lastLoginMethodClient,
  oneTapClient,
  organizationClient,
  twoFactorClient,
} from "better-auth/client/plugins"
import { createAuthClient } from "better-auth/react"

import { organizationRoles } from "@/lib/organization-roles"

const googleOneTapClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ""
export const isOneTapEnabled = Boolean(googleOneTapClientId)

export const authClient = createAuthClient({
  plugins: [
    lastLoginMethodClient(),
    adminClient(),
    twoFactorClient(),
    emailOTPClient(),
    organizationClient({ roles: organizationRoles }),
    oneTapClient({
      clientId: googleOneTapClientId,
      autoSelect: false,
      cancelOnTapOutside: true,
      context: "signin",
    }),
  ],
})

export const { signIn, signUp, useSession } = authClient
