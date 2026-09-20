import assert from "node:assert/strict"
import test from "node:test"

import { siteConfig } from "@/constants/site-config"
import { getRoleDisplayName } from "@/utils/role-utils"

test("statute-defined governance values are enforced", () => {
  assert.equal(siteConfig.platform.savings.monthlyContributionRwf, 100000)
  assert.equal(siteConfig.platform.savings.contributionWindow.startDay, 1)
  assert.equal(siteConfig.platform.savings.contributionWindow.endDay, 5)
  assert.equal(siteConfig.platform.governance.membershipCount, 10)
  assert.equal(siteConfig.platform.governance.leadershipTermMonths, 36)
  assert.equal(siteConfig.platform.governance.quorumRatio, 0.67)
})

test("advisor role is supported as a statutory leadership role", () => {
  assert.equal(getRoleDisplayName("advisor" as any), "Advisor")
})
