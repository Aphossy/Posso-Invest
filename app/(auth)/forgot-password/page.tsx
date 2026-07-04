import { Suspense } from "react"

import { OrbitingSpinner } from "@/components/ui/spinner"
import ForgotPasswordPage from "@/components/auth-pages/forgot-password"

export default function ForgotPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center py-20">
          <OrbitingSpinner />
        </div>
      }>
      <ForgotPasswordPage />
    </Suspense>
  )
}
