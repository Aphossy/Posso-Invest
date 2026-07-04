"use server"

import { headers } from "next/headers"
import { db } from "@/db"
import { invitation } from "@/db/schemas"
import { eq } from "drizzle-orm"

import { auth } from "@/lib/auth"

interface ActionResult {
  success: boolean
  error?: string
}

/**
 * Hard-delete an invitation record from the database.
 * Only admins / owners may do this. The invitation must already be
 * canceled, accepted, or rejected - pending invitations should be
 * canceled first via the organization client.
 */
export async function deleteInvitationAction(
  invitationId: string
): Promise<ActionResult> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session) {
      return { success: false, error: "Unauthenticated" }
    }

    // Only admins can delete invitations
    const role = (session.user as any).role as string | undefined
    if (role !== "admin") {
      return { success: false, error: "Insufficient permissions" }
    }

    await db.delete(invitation).where(eq(invitation.id, invitationId))

    return { success: true }
  } catch (err) {
    console.error("deleteInvitationAction error:", err)
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to delete invitation",
    }
  }
}
