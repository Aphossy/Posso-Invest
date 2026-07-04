#!/usr/bin/env tsx
import { db } from "@/db"
import { organization, member, session as sessionTable } from "@/db/schemas"
import { eq } from "drizzle-orm"

async function check() {
  try {
    // Manually query only the columns that exist
    const orgsRaw = await db.execute(`SELECT id, name, slug, logo, created_at, metadata FROM organization`)
    console.log("📋 Organizations:", JSON.stringify(orgsRaw, null, 2))

    const members = await db.select().from(member).execute()
    console.log("\n👥 Members:", JSON.stringify(members, null, 2))

    // Check new admin user sessions
    const newAdminId = "6927dde8-fd5f-4c66-885e-3c091114f098"
    const sessions = await db
      .select()
      .from(sessionTable)
      .where(eq(sessionTable.userId, newAdminId))
      .execute()
    console.log("\n🔐 Admin sessions:", JSON.stringify(sessions, null, 2))

    process.exit(0)
  } catch (err) {
    console.error("❌ Error:", err)
    process.exit(1)
  }
}

check()
