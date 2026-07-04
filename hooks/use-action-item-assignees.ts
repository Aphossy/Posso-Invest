"use client"

import { useEffect, useMemo, useState } from "react"
import { getRoleDisplayName, normalizeRoleValue } from "@/utils/role-utils"
import { toast } from "sonner"

import { organizationClient } from "@/lib/organization-client"

type AssignableRole = "member" | "secretary" | "treasurer" | "president"

const ASSIGNABLE_ROLES = new Set<AssignableRole>([
  "member",
  "secretary",
  "treasurer",
  "president",
])

const isAssignableRole = (role: string): role is AssignableRole =>
  ASSIGNABLE_ROLES.has(role as AssignableRole)

export type ActionItemAssignee = {
  id: string
  name: string
  email: string
  role: AssignableRole
  label: string
}

export function useActionItemAssignees() {
  const [assignees, setAssignees] = useState<ActionItemAssignee[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let active = true

    const loadAssignees = async () => {
      setIsLoading(true)

      try {
        const { data, error } = await organizationClient.listMembers({
          query: {
            limit: 500,
            offset: 0,
          },
        })

        if (error) {
          throw new Error(error.message || "Failed to load members")
        }

        const memberMap = new Map<string, ActionItemAssignee>()

        ;(data?.members ?? []).forEach((membership: any) => {
          const normalizedRole = normalizeRoleValue(
            membership?.role ?? membership?.user?.role
          )
          if (!normalizedRole || !isAssignableRole(normalizedRole)) return

          const role = normalizedRole

          const id = membership?.user?.id ?? membership?.userId ?? ""
          if (!id || memberMap.has(id)) return

          const name = membership?.user?.name ?? "Unnamed member"
          const email = membership?.user?.email ?? ""
          const roleLabel = getRoleDisplayName(role)

          memberMap.set(id, {
            id,
            name,
            email,
            role,
            label: `${roleLabel} • ${name}${email ? ` · ${email}` : ""}`,
          })
        })

        if (active) {
          setAssignees(
            [...memberMap.values()].sort((left, right) => {
              const roleRank = {
                president: 0,
                secretary: 1,
                treasurer: 2,
                member: 3,
              } as const
              const leftRank =
                roleRank[left.role as keyof typeof roleRank] ?? 99
              const rightRank =
                roleRank[right.role as keyof typeof roleRank] ?? 99

              if (leftRank !== rightRank) {
                return leftRank - rightRank
              }

              return left.name.localeCompare(right.name)
            })
          )
        }
      } catch (error) {
        if (active) {
          setAssignees([])
          toast.error(
            error instanceof Error ? error.message : "Unable to load members"
          )
        }
      } finally {
        if (active) {
          setIsLoading(false)
        }
      }
    }

    void loadAssignees()

    return () => {
      active = false
    }
  }, [])

  const assigneeOptions = useMemo(
    () =>
      assignees.map((assignee) => ({
        value: assignee.id,
        label: assignee.label,
      })),
    [assignees]
  )

  const getAssigneeLabel = (assigneeId?: string | null) =>
    assignees.find((assignee) => assignee.id === assigneeId)?.label ??
    "No member assigned"

  return {
    assignees,
    assigneeOptions,
    isLoading,
    getAssigneeLabel,
  }
}
