import assert from "node:assert/strict"
import test from "node:test"

import {
  getContributionWindow,
  getWindowForPeriod,
} from "@/lib/contribution-window"

test("contribution window runs from the period month through the 5th", () => {
  const window = getWindowForPeriod("2026-09")

  assert.equal(window.windowStart.getFullYear(), 2026)
  assert.equal(window.windowStart.getMonth(), 8)
  assert.equal(window.windowStart.getDate(), 1)
  assert.equal(window.windowEnd.getFullYear(), 2026)
  assert.equal(window.windowEnd.getMonth(), 9)
  assert.equal(window.windowEnd.getDate(), 5)
  assert.equal(window.windowEnd.getHours(), 23)
  assert.equal(window.windowEnd.getMinutes(), 59)
})

test("the 5th remains open and the 6th starts the next period", () => {
  const onFifth = getContributionWindow(new Date(2026, 9, 5, 12))
  const afterWindow = getContributionWindow(new Date(2026, 9, 6, 0))

  assert.equal(onFifth.isOpen, true)
  assert.equal(onFifth.period, "2026-09")
  assert.equal(afterWindow.isOpen, true)
  assert.equal(afterWindow.period, "2026-10")
})