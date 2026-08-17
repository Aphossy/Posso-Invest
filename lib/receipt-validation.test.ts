import { describe, expect, it } from "bun:test"

import {
  isValidReceiptReferenceId,
  normalizeReceiptReferenceId,
} from "./receipt-validation"

describe("receipt reference validation", () => {
  it("cleans blank and non-uuid values", () => {
    expect(normalizeReceiptReferenceId("   ")).toBeUndefined()
    expect(normalizeReceiptReferenceId("01")).toBeUndefined()
    expect(
      normalizeReceiptReferenceId("  123e4567-e89b-12d3-a456-426614174000  ")
    ).toBe("123e4567-e89b-12d3-a456-426614174000")
  })

  it("accepts only valid UUID-shaped IDs", () => {
    expect(isValidReceiptReferenceId("123e4567-e89b-12d3-a456-426614174000")).toBe(true)
    expect(isValidReceiptReferenceId("01")).toBe(false)
    expect(isValidReceiptReferenceId("")).toBe(false)
  })
})
