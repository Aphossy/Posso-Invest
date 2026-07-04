import { siteConfig } from "@/constants/site-config"
import { addMonths, format, isWithinInterval, parse, subMonths } from "date-fns"

export interface ContributionWindow {
  isOpen: boolean
  label: string
  period: string
  daysRemaining: number
  daysUntilNext: number
}

/**
 * Compute the current contribution window for a given instant (used by API routes).
 *
 * Three cases:
 *   day ≤ endDay   → still in the closing tail of last month's window (open)
 *   day ≥ startDay → this month's window has opened (open)
 *   else           → gap: `label` / `daysUntilNext` point to the upcoming window
 *                    so the UI can show "Opens in Xd", but `period` references
 *                    the most-recently-closed window so payment lookups are correct.
 */
export function getContributionWindow(now: Date): ContributionWindow {
  const { startDay, endDay } = siteConfig.platform.savings.contributionWindow
  const year = now.getFullYear()
  const month = now.getMonth()
  const day = now.getDate()

  let windowStart: Date
  let windowEnd: Date
  let periodStart: Date
  let isOpen: boolean

  if (day <= endDay) {
    windowStart = new Date(year, month - 1, startDay)
    windowEnd = new Date(year, month, endDay)
    periodStart = windowStart
    isOpen = true
  } else if (day >= startDay) {
    windowStart = new Date(year, month, startDay)
    windowEnd = new Date(year, month + 1, endDay)
    periodStart = windowStart
    isOpen = true
  } else {
    // Gap: display the upcoming window in the UI, but period = last closed window
    windowStart = new Date(year, month, startDay)
    windowEnd = new Date(year, month + 1, endDay)
    periodStart = new Date(year, month - 1, startDay)
    isOpen = false
  }

  const label = `${windowStart.toLocaleString("default", { month: "short" })} ${windowStart.getDate()} – ${windowEnd.toLocaleString("default", { month: "short" })} ${windowEnd.getDate()}`

  const period = `${periodStart.getFullYear()}-${String(periodStart.getMonth() + 1).padStart(2, "0")}`

  const daysRemaining = Math.max(
    0,
    Math.ceil((windowEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  )
  const daysUntilNext = Math.max(
    0,
    Math.ceil((windowStart.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  )

  return { isOpen, label, period, daysRemaining, daysUntilNext }
}

/**
 * Given a period string ("yyyy-MM"), return the window start/end dates.
 * Window = startDay of that month → endDay of the following month.
 */
export function getWindowForPeriod(period: string): {
  windowStart: Date
  windowEnd: Date
} {
  const { startDay, endDay } = siteConfig.platform.savings.contributionWindow
  const periodDate = parse(period, "yyyy-MM", new Date())
  const nextMonth = addMonths(periodDate, 1)
  return {
    windowStart: new Date(
      periodDate.getFullYear(),
      periodDate.getMonth(),
      startDay
    ),
    windowEnd: new Date(nextMonth.getFullYear(), nextMonth.getMonth(), endDay),
  }
}

/**
 * Return the period string whose window contains today.
 * During the gap between windows (after endDay, before startDay), returns the
 * most recently closed window's period so components default to real data
 * instead of an empty future month.
 */
export function getActivePeriod(): string {
  const today = new Date()
  for (const d of [subMonths(today, 1), today, addMonths(today, 1)]) {
    const p = format(d, "yyyy-MM")
    const { windowStart, windowEnd } = getWindowForPeriod(p)
    if (isWithinInterval(today, { start: windowStart, end: windowEnd }))
      return p
  }
  // Gap: return the period whose window most recently closed
  return format(subMonths(today, 1), "yyyy-MM")
}
