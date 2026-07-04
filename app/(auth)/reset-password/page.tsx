import { Suspense } from "react"

import ResetPasswordPage from "@/components/auth-pages/reset-password"

export default function ResetPassword() {
  return (
    <Suspense>
      <ResetPasswordPage />
    </Suspense>
  )
}
