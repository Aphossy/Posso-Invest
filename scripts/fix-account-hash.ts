#!/usr/bin/env tsx
import { db } from "@/db"
import { account } from "@/db/schemas/auth-schema"
import { eq } from "drizzle-orm"
import { hashPassword } from "@better-auth/utils/password"

async function run() {
  const userId = "6927dde8-fd5f-4c66-885e-3c091114f098"
  const plain = "e%d3iGOUe6aax%"
  try {
    const newHash = await hashPassword(plain)
    console.log('New BetterAuth hash:', newHash)
    const res = await db.update(account).set({ password: newHash }).where(eq(account.userId, userId))
    console.log('DB update result:', res)
    process.exit(0)
  } catch (err) {
    console.error('Error rehashing/updating account:', err)
    process.exit(1)
  }
}

run()
