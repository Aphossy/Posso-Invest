import { siteConfig } from "@/constants/site-config"

export function isLateContributionPenaltyExempt(period: string): boolean {
  return siteConfig.platform.savings.latePenaltyExemptPeriods.some(
    (exemptPeriod) => exemptPeriod === period
  )
}
