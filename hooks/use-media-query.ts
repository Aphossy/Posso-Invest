// hooks\use-media-query.ts
"use client"

import { useEffect, useState } from "react"

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true)

    const mediaQuery = window.matchMedia(query)
    setMatches(mediaQuery.matches)

    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches)
    }

    mediaQuery.addEventListener("change", handler)
    return () => mediaQuery.removeEventListener("change", handler)
  }, [query])

  // Return false during SSR
  if (!isMounted) return false

  return matches
}
