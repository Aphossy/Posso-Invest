const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isValidReceiptReferenceId(value: unknown): boolean {
  if (typeof value !== "string") return false
  return UUID_REGEX.test(value.trim())
}

export function normalizeReceiptReferenceId(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined

  const trimmed = value.trim()
  if (!trimmed) return undefined

  return isValidReceiptReferenceId(trimmed) ? trimmed : undefined
}
