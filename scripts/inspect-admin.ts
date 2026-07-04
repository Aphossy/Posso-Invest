#!/usr/bin/env tsx
import { db } from "@/db"
import { user, account, session as sessionTable } from "@/db/schemas"
import { eq } from "drizzle-orm"

async function inspect() {
  const email = "hakuzweaphossy@gmail.com"
  try {
    const users = await db.select().from(user).where(eq(user.email, email)).execute()
    console.log('Users:', JSON.stringify(users, null, 2))

    if (users.length === 0) {
      console.log('No user found for email')
      process.exit(0)
    }

    const u = users[0]
    const accs = await db.select().from(account).where(eq(account.userId, u.id)).execute()
    console.log('\nAccounts for user:', JSON.stringify(accs, null, 2))

    const sessions = await db.select().from(sessionTable).where(eq(sessionTable.userId, u.id)).execute()
    console.log('\nSessions for user:', JSON.stringify(sessions, null, 2))

    process.exit(0)
  } catch (err) {
    console.error('Error inspecting admin:', err)
    process.exit(1)
  }
}

inspect()
