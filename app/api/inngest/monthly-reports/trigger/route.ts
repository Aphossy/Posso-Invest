import { userOperations } from "@/db/operations/user-operations"
import { inngest } from "@/inngest/client"
import { z } from "zod"

import { getAuthSession } from "@/lib/auth-helpers"

const triggerSchema = z.object({
  testRunId: z.string().trim().min(1).max(80).optional(),
})

const getTriggerSecretFromRequest = (request: Request) => {
  const authHeader = request.headers.get("authorization")
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7).trim()
  }

  return request.headers.get("x-trigger-secret")?.trim() || null
}

export async function POST(request: Request) {
  const configuredTriggerSecret =
    process.env.INNGEST_MANUAL_TRIGGER_SECRET?.trim() || null
  const requestTriggerSecret = getTriggerSecretFromRequest(request)
  const isSecretAuthorized =
    Boolean(configuredTriggerSecret) &&
    requestTriggerSecret === configuredTriggerSecret

  if (!isSecretAuthorized) {
    const session = await getAuthSession()
    if (!session?.user?.id) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Authentication required",
          help: "Sign in as admin or send x-trigger-secret / Authorization: Bearer <INNGEST_MANUAL_TRIGGER_SECRET>",
        }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      )
    }

    const user = await userOperations.getProfileByUserId(session.user.id)
    if (!user || user.role !== "admin") {
      return new Response(
        JSON.stringify({ success: false, message: "Admin access required" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      )
    }
  }

  const payload = await request.json().catch(() => ({}))
  const parsed = triggerSchema.safeParse(payload)
  if (!parsed.success) {
    return new Response(
      JSON.stringify({
        success: false,
        message: "Invalid payload",
        errors: parsed.error.flatten(),
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    )
  }

  const eventId = `manual-monthly-report-dispatch-${Date.now()}`
  await inngest.send({
    id: eventId,
    name: "ikimina/reports.monthly.dispatch.requested",
    data: {
      testRunId: parsed.data.testRunId,
    },
  })

  return new Response(
    JSON.stringify({
      success: true,
      message: "Monthly report manual dispatch requested",
      eventId,
      testRunId: parsed.data.testRunId ?? null,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  )
}
