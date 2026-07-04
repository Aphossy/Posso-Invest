// app/(auth)/login/page.tsx
import type { Metadata, Route } from "next"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { auth } from "@/lib/auth"
import LoginPageComponent from "@/components/auth-pages/login-form"

// Map raw error codes to user-friendly messages
function mapErrorToMessage(error: string): string {
  const errorMap: Record<string, string> = {
    "google-login-failed-please-try-again":
      "Google login failed. Please try again.",
    invalid_code: "Invalid authorization code. Please log in again.",
    state_mismatch: "Session expired. Please try logging in again.",
    default: "An error occurred during login. Please try again.",
  }
  return errorMap[error] || errorMap.default
}

export const metadata: Metadata = {
  title: "Login",
}

interface LoginPageProps {
  searchParams: Promise<{ from?: string; error?: string | string[] }>
}

async function LoginPage({ searchParams }: LoginPageProps) {
  const searchParamsResolved = await searchParams

  const session = await auth.api.getSession({ headers: await headers() })
  if (session?.user) {
    const redirectTo = searchParamsResolved.from
      ? `/redirect?from=${encodeURIComponent(searchParamsResolved.from)}`
      : "/redirect"
    redirect(redirectTo as Route)
  }

  // Handle error param
  let rawError: string | undefined
  if (Array.isArray(searchParamsResolved.error)) {
    rawError = searchParamsResolved.error[searchParamsResolved.error.length - 1]
  } else if (typeof searchParamsResolved.error === "string") {
    rawError = searchParamsResolved.error
  }

  const errorMessage = rawError
    ? mapErrorToMessage(decodeURIComponent(rawError))
    : undefined

  return <LoginPageComponent error={errorMessage} />
}

export default LoginPage
