#!/usr/bin/env tsx
import { db } from "@/db"
import { user, account } from "@/db/schemas"
import { eq } from "drizzle-orm"

async function inspect() {
  const email = "hakuzweaphossy@gmail.com"
  const users = await db.select().from(user).where(eq(user.email, email))
  console.log('Users found:', users.length)
  for (const u of users) {
    console.log('User:', { id: u.id, email: u.email, name: u.name, role: u.role, emailVerified: u.emailVerified })
    const accounts = await db.select().from(account).where(eq(account.userId, u.id))
    console.log('Accounts found:', accounts.length)
    for (const a of accounts) {
      console.log('Account:', {
        id: a.id,
        accountId: a.accountId,
        providerId: a.providerId,
        passwordPreview: a.password?.slice(0,40) + (a.password && a.password.length>40 ? '...' : ''),
        passwordLength: a.password ? a.password.length : 0,
        passwordFull: a.password,
      })
    }
  }
  process.exit(0)
}

inspect()
