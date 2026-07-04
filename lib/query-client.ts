// lib/query-client.ts
import { DefaultOptions, QueryClient } from "@tanstack/react-query"

const queryConfig: DefaultOptions = {
  queries: {
    refetchOnWindowFocus: false,
    retry: (failureCount, error: any) => {
      // Don't retry on 4xx errors (client errors)
      if (error?.statusCode >= 400 && error?.statusCode < 500) {
        return false
      }
      // Retry up to 3 times for 5xx errors
      return failureCount < 3
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  },
  mutations: {
    retry: false,
  },
}

export const queryClient = new QueryClient({ defaultOptions: queryConfig })
