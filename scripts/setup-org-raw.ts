import { db } from "../db/index"
import { organization, member } from "../db/schemas/auth-schema"
import { organisationName } from "@/constants/organisation"
import { eq } from "drizzle-orm"

async function setupOrg() {
  const orgId = "4e76a19c-b537-418c-9bbb-0704808ddc8c"
  const userId = "6927dde8-fd5f-4c66-885e-3c091114f098"

  try {
    // Delete existing org if it exists
    await db.delete(organization).where(eq(organization.id, orgId))
    console.log("Cleaned up existing org")

    // Create org - only include fields that exist in DB
    const now = new Date()
    const slug = `setup-${organisationName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`

    await db.insert(organization).values({
      id: orgId,
      name: organisationName,
      slug,
      logo: null,
      createdAt: now,
      metadata: JSON.stringify({ type: "ikimina" }),
    })
    console.log("✅ Organization created")

    // Add admin as member
    const memberId = crypto.randomUUID()
    await db.insert(member).values({
      id: memberId,
      organizationId: orgId,
      userId,
      role: "admin",
      createdAt: now,
    })
    console.log("✅ Admin added as member")

    console.log("\n🎉 Organization setup complete!")
    process.exit(0)
  } catch (error) {
    console.error("❌ Error:", error)
    process.exit(1)
  }
}

setupOrg()
