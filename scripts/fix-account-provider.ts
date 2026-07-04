#!/usr/bin/env tsx
/**
 * Script to fix account.providerId values created with the wrong provider id
 * Usage: bun scripts/fix-account-provider.ts
 */

import { db } from "@/db"
import { account } from "@/db/schemas"
import { eq } from "drizzle-orm"

async function fixProvider() {
  try {
    console.log('🔧 Fixing account providerId values...')
    const result = await db
      .update(account)
      .set({ providerId: 'credentials' })
      .where(eq(account.providerId, 'credential'))
      .returning()

    console.log(`✅ Updated ${result.length} account(s)`)
    result.forEach((r: any) => console.log(` - ${r.id} -> providerId=${r.providerId}`))
    process.exit(0)
  } catch (err) {
    console.error('❌ Failed to update accounts', err)
    process.exit(1)
  }
}

fixProvider()
