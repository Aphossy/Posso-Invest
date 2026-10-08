import { siteConfig } from "@/constants/site-config"
import { addMonths, endOfDay, format, parse, subMonths } from "date-fns"

export const FIRST_CONTRIBUTION_PERIOD = "2026-09"
const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000
const CONTRIBUTION_TIME_ZONE = "Africa/Kigali"

function getKigaliCalendarDate(date: Date) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: CONTRIBUTION_TIME_ZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(date)
  const getPart = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value)

  return {
    year: getPart("year"),
    month: getPart("month"),
    day: getPart("day"),
  }
}

function getContributionPeriodDate(now: Date) {
  const { startDay, endDay } = siteConfig.platform.savings.contributionWindow
  const { year, month, day } = getKigaliCalendarDate(now)
  const currentPeriod = new Date(year, month - 1, 1)
  const isOpen = day >= startDay || day <= endDay
  const periodStart =
    day >= startDay
      ? currentPeriod
      : day <= endDay
        ? subMonths(currentPeriod, 1)
        : currentPeriod

  return { day, year, month, periodStart, isOpen }
}

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
 * Each contribution period opens on the 25th and closes on the 5th of the
 * following month, using the calendar date in Kigali.
 */
export function getContributionWindow(now: Date): ContributionWindow {
  const { startDay, endDay } = siteConfig.platform.savings.contributionWindow
  const { day, year, month, periodStart, isOpen } =
    getContributionPeriodDate(now)
  const windowStart = new Date(
    periodStart.getFullYear(),
    periodStart.getMonth(),
    startDay
  )
  const followingPeriod = addMonths(periodStart, 1)
  const windowEnd = endOfDay(
    new Date(followingPeriod.getFullYear(), followingPeriod.getMonth(), endDay)
  )

  const label = `${windowStart.toLocaleString("en", { month: "short" })} ${windowStart.getDate()} – ${windowEnd.toLocaleString("en", { month: "short" })} ${windowEnd.getDate()}`

  const period = `${periodStart.getFullYear()}-${String(periodStart.getMonth() + 1).padStart(2, "0")}`

  const today = Date.UTC(year, month - 1, day)
  const start = Date.UTC(
    periodStart.getFullYear(),
    periodStart.getMonth(),
    startDay
  )
  const end = Date.UTC(
    followingPeriod.getFullYear(),
    followingPeriod.getMonth(),
    endDay
  )
  const daysRemaining = isOpen
    ? Math.max(0, Math.floor((end - today) / DAY_IN_MILLISECONDS) + 1)
    : 0
  const daysUntilNext = isOpen
    ? 0
    : Math.max(0, Math.floor((start - today) / DAY_IN_MILLISECONDS))

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
export function getActivePeriod(now: Date = new Date()): string {
  return format(getContributionPeriodDate(now).periodStart, "yyyy-MM")
}

export function getContributionTrendPeriods(
  activePeriod: string,
  count = 6
): string[] {
  const activePeriodDate = parse(activePeriod, "yyyy-MM", new Date())
  const firstContributionDate = parse(
    FIRST_CONTRIBUTION_PERIOD,
    "yyyy-MM",
    new Date()
  )
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
