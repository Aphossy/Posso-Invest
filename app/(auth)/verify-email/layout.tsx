// import AnimatedLoader from "@/components/common/Loader/AnimatedLoader";
import { Suspense } from "react"

import { OrbitingSpinner } from "@/components/ui/spinner"

export const metadata = {
  title: "Verify Account",
}

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center py-20">
            <OrbitingSpinner />
          </div>
        }>
        {children}
      </Suspense>
    </>
  )
}
