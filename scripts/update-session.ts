import { db } from "../db/index"
import { session } from "../db/schemas/auth-schema"
import { eq } from "drizzle-orm"

async function updateSession() {
  const newAdminId = "6927dde8-fd5f-4c66-885e-3c091114f098"
  const orgId = "4e76a19c-b537-418c-9bbb-0704808ddc8c"

  try {
    // Update any existing sessions to have the activeOrganizationId
    const result = await db
      .update(session)
      .set({ activeOrganizationId: orgId })
      .where(eq(session.userId, newAdminId))

    console.log("✅ Sessions updated with activeOrganizationId")
    process.exit(0)
  } catch (error) {
    console.error("❌ Error:", error)
    process.exit(1)
  }
}

updateSession()
