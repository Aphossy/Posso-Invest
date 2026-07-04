import { headers } from "next/headers"
import { NextResponse } from "next/server"
import { db } from "@/db/connection"
import {
  invitation,
  member,
  organization,
  session as sessionTable,
} from "@/db/schemas"
import { inngest } from "@/inngest/client"
import { and, eq } from "drizzle-orm"

import { auth } from "@/lib/auth"
import { organisationName } from "@/constants/organisation"

type InvitationAcceptedPayload = {
  invitationId?: string
}

export async function POST(request: Request) {
  try {
    const headersList = await headers()
    const session = await auth.api.getSession({ headers: headersList })

    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = (await request
      .json()
      .catch(() => ({}))) as InvitationAcceptedPayload
    if (!body.invitationId) {
      return NextResponse.json(
        { error: "Missing invitation id" },
        { status: 400 }
      )
    }

    const [invitationRecord] = await db
      .select({ organizationId: invitation.organizationId })
      .from(invitation)
      .where(
        and(
          eq(invitation.id, body.invitationId),
          eq(invitation.email, session.user.email)
        )
      )
      .limit(1)

    if (!invitationRecord) {
      return NextResponse.json(
        { error: "Invitation not found for current user" },
        { status: 404 }
      )
    }

    const activeOrganizationId = invitationRecord.organizationId

    const currentSessionId = session.session?.id
    if (currentSessionId) {
      await db
        .update(sessionTable)
        .set({ activeOrganizationId })
        .where(eq(sessionTable.id, currentSessionId))
    }

    const [memberRecord] = await db
      .select({ role: member.role })
      .from(member)
      .where(
        and(
          eq(member.organizationId, activeOrganizationId),
          eq(member.userId, session.user.id)
        )
      )
      .limit(1)

    if (!memberRecord) {
      return NextResponse.json(
        { error: "Membership not found for active organization" },
        { status: 404 }
      )
    }

    const [orgRecord] = await db
      .select({ name: organization.name })
      .from(organization)
      .where(eq(organization.id, activeOrganizationId))
      .limit(1)

    const eventId = body.invitationId
      ? `Posso Venture-member-joined-${body.invitationId}`
      : `Posso Venture-member-joined-${activeOrganizationId}-${session.user.id}`

    await inngest.send({
      id: eventId,
      name: "Posso Venture/organization.member.joined",
      data: {
        organizationId: activeOrganizationId,
        organizationName: orgRecord?.name ?? organisationName,
        memberId: session.user.id,
        memberName: session.user.name ?? "Member",
        memberEmail: session.user.email,
        role: memberRecord.role,
        joinedAt: new Date().toISOString(),
        invitationId: body.invitationId,
      },
    })

    return NextResponse.json({
      success: true,
      organizationId: activeOrganizationId,
      role: memberRecord.role,
    })
  } catch (error) {
    console.error("Failed to emit invitation accepted event", error)
    return NextResponse.json(
      { error: "Failed to process invitation acceptance" },
      { status: 500 }
    )
  }
}
