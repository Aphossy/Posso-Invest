import { db } from "@/db/connection"
import { invitation, verification } from "@/db/schemas"
import { and, eq, lte } from "drizzle-orm"

import { sessionOperations } from "./session-operations"

export const cleanupOperations = {
  async cleanupExpiredData(): Promise<{
    sessions: number
    verificationTokens: number
    expiredInvitations: number
  }> {
    const now = new Date()

    const [sessions, verifications, invitations] = await Promise.all([
      sessionOperations.deleteExpiredSessions(),
      db.delete(verification).where(lte(verification.expiresAt, now)),
      db
        .update(invitation)
        .set({ status: "expired" })
        .where(
          and(eq(invitation.status, "pending"), lte(invitation.expiresAt, now))
        ),
    ])

    return {
      sessions,
      verificationTokens: verifications.rowCount ?? 0,
      expiredInvitations: invitations.rowCount ?? 0,
    }
  },
}
