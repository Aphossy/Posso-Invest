import { siteConfig } from "@/constants/site-config"
import { addMonths, endOfDay, format, parse, subMonths } from "date-fns"

export const FIRST_CONTRIBUTION_PERIOD = "2026-09"

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
 * The statute assigns each contribution to a calendar month and gives members
 * the 1st of that month through the 5th of the following month to pay it.
 */
export function getContributionWindow(now: Date): ContributionWindow {
  const { startDay, endDay } = siteConfig.platform.savings.contributionWindow
  const currentPeriod = new Date(now.getFullYear(), now.getMonth(), 1)
  const currentMonthWindowEnd = endOfDay(new Date(
    currentPeriod.getFullYear(),
    currentPeriod.getMonth(),
    endDay
  ))
  const periodStart =
    now <= currentMonthWindowEnd ? subMonths(currentPeriod, 1) : currentPeriod
  const isOpen = true
  const windowStart = new Date(
    periodStart.getFullYear(),
    periodStart.getMonth(),
    startDay
  )
  const followingPeriod = addMonths(periodStart, 1)
  const windowEnd = endOfDay(new Date(
    followingPeriod.getFullYear(),
    followingPeriod.getMonth(),
    endDay
  ))

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
 * Window = startDay of the period through endDay of the following month.
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
    windowEnd: endOfDay(
      new Date(nextMonth.getFullYear(), nextMonth.getMonth(), endDay)
    ),
  }
}

/**
 * Return the period currently being paid or prepared for.
 */
export function getActivePeriod(): string {
  const today = new Date()
  const periodDate = new Date(today.getFullYear(), today.getMonth(), 1)
  const currentMonthWindowEnd = endOfDay(new Date(
    periodDate.getFullYear(),
    periodDate.getMonth(),
    siteConfig.platform.savings.contributionWindow.endDay
  ))

  return format(
    today <= currentMonthWindowEnd ? subMonths(periodDate, 1) : periodDate,
    "yyyy-MM"
  )
}

export function getContributionTrendPeriods(
  activePeriod: string,
  count = 6
): string[] {
  const activePeriodDate = parse(activePeriod, "yyyy-MM", new Date())
  const firstContributionDate = parse(FIRST_CONTRIBUTION_PERIOD, "yyyy-MM", new Date())
  const periods: string[] = []

  for (let i = count - 1; i >= 0; i--) {
    const periodDate = subMonths(activePeriodDate, i)
    const period = format(periodDate, "yyyy-MM")

    if (periodDate < firstContributionDate) continue
    periods.push(period)
  }

  if (periods.length === 0) {
    return [FIRST_CONTRIBUTION_PERIOD]
  }

  return periods
}
