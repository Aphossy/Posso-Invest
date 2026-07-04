import { v4 as uuidv4 } from "uuid"

export function generateId(): string {
  const timestamp = Date.now().toString(36)
  const randomStr = Math.random().toString(36).substring(2, 8)
  return `${timestamp}-${randomStr}`
}

export function generateShortId(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

export function generateUUID(): string {
  return uuidv4()
}

export function generateAlphaNumericId(length = 8): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  let result = ""

  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }

  return result
}

export function generateNumericId(length = 6): string {
  const chars = "0123456789"
  let result = ""

  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }

  return result
}

export async function generateIPHash(ip: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(ip)
  )
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}
