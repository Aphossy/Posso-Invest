#!/usr/bin/env tsx
import argon2 from "argon2"
import { db } from "@/db"
import { user, account } from "@/db/schemas"
import { eq } from "drizzle-orm"

async function run() {
  const email = "hakuzweaphossy@gmail.com"
  const passwordAttempt = "e%d3iGOUe6aax%"
  try {
    const users = await db.select().from(user).where(eq(user.email, email)).execute()
    if (users.length === 0) {
      console.log('No user found')
      process.exit(1)
    }
    const u = users[0]
    const accs = await db.select().from(account).where(eq(account.userId, u.id)).execute()
    if (accs.length === 0) {
      console.log('No account for user')
      process.exit(1)
    }
    const hash = accs[0].password
    console.log('Stored hash:', hash)
    const ok = await argon2.verify(hash, passwordAttempt)
    console.log('Password matches?:', ok)
    process.exit(0)
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
}

run()
