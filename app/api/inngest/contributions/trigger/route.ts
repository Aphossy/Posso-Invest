import { userOperations } from "@/db/operations/user-operations"
import { inngest } from "@/inngest/client"
import { z } from "zod"

import { getAuthSession } from "@/lib/auth-helpers"

const triggerSchema = z.object({
  kind: z.enum(["opened", "reminder", "last-day", "deadline-passed"]),
  testRunId: z.string().trim().min(1).max(80).optional(),
})

const eventNames = {
  opened: "ikimina/contributions.window-opened.requested",
  reminder: "ikimina/contributions.reminder.requested",
  "last-day": "ikimina/contributions.last-day.requested",
  "deadline-passed": "ikimina/contributions.deadline-passed.requested",
} as const

function getTriggerSecret(request: Request) {
  const authorization = request.headers.get("authorization")
  if (authorization?.startsWith("Bearer ")) {
    return authorization.slice(7).trim()
  }
  return request.headers.get("x-trigger-secret")?.trim() || null
}

export async function POST(request: Request) {
  const configuredSecret = process.env.INNGEST_MANUAL_TRIGGER_SECRET?.trim()
  const requestSecret = getTriggerSecret(request)
  const secretAuthorized = Boolean(configuredSecret) && requestSecret === configuredSecret

  if (!secretAuthorized) {
    const session = await getAuthSession()
    if (!session?.user?.id) {
      return Response.json({ success: false, message: "Authentication required" }, { status: 401 })
    }

    const profile = await userOperations.getProfileByUserId(session.user.id)
    if (!profile || profile.role !== "admin") {
      return Response.json({ success: false, message: "Admin access required" }, { status: 403 })
    }
  }

  const parsed = triggerSchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) {
    return Response.json(
      { success: false, message: "kind must be opened, reminder, last-day, or deadline-passed" },
      { status: 400 }
    )
  }

  const { kind, testRunId } = parsed.data
  const eventId = `manual-contribution-${kind}-${Date.now()}`
  await inngest.send({
    id: eventId,
    name: eventNames[kind],
    data: { testRunId },
  })

  return Response.json({ success: true, eventId, kind })
}