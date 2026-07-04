"use client"

import { useState } from "react"
import { QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { NavigationGuardProvider } from "next-navigation-guard"
import { NuqsAdapter } from "nuqs/adapters/next/app"
import { Toaster } from "sonner"

import { queryClient } from "@/lib/query-client"

const Providers = ({ children }: { children: React.ReactNode }) => {
  const [client] = useState(() => queryClient)

  return (
    <QueryClientProvider client={client}>
      <NavigationGuardProvider>
        <NuqsAdapter>
          <Toaster richColors />
          {children}
          <ReactQueryDevtools initialIsOpen={false} />
        </NuqsAdapter>
      </NavigationGuardProvider>
    </QueryClientProvider>
  )
}

export default Providers
