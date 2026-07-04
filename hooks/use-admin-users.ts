"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import type { AdminUser } from "@/types/admin-users"
import { authClient } from "@/lib/auth-client"
import { organizationClient } from "@/lib/organization-client"
import { useActiveRole } from "@/hooks/use-active-role"

export interface UsersFilters {
  page?: number
  limit?: number
  search?: string
  role?: string
  status?: "unbanned" | "banned" | "all"
  sortBy?: "createdAt" | "email" | "name"
  sortOrder?: "asc" | "desc"
}

export interface AdminUsersResponse {
  users: AdminUser[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

interface UseAdminUsersReturn {
  users: AdminUser[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  loading: boolean
  error: string | null
  fetchUsers: (filters?: UsersFilters) => Promise<void>
  deleteUser: (userId: string) => Promise<boolean>
  getUserDetails: (userId: string) => Promise<any>
  refetch: () => Promise<void>
  updateUser: (
    userId: string,
    updates: Partial<AdminUser>
  ) => Promise<AdminUser>
}

export function useAdminUsers(
  initialFilters: UsersFilters = {}
): UseAdminUsersReturn {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    data: session,
    isPending,
    error: sessionError,
  } = authClient.useSession()
  const { role: activeRole } = useActiveRole()
  const user = session?.user

  // Refs for stable references
  const userRef = useRef(user)
  const roleRef = useRef(activeRole)
  const hasFetchedRef = useRef(false)
  const isFetchingRef = useRef(false)
  const initialFiltersRef = useRef(initialFilters)
  const usersRef = useRef<AdminUser[]>([])

  // Update refs
  useEffect(() => {
    userRef.current = user
  }, [user])

  useEffect(() => {
    roleRef.current = activeRole
  }, [activeRole])

  useEffect(() => {
    usersRef.current = users
  }, [users])

  useEffect(() => {
    initialFiltersRef.current = initialFilters
  }, [initialFilters])

  const fetchUsers = useCallback(
    async (newFilters: UsersFilters = {}) => {
      const currentUser = userRef.current
      if (!currentUser || roleRef.current !== "admin") {
        setError("Insufficient permissions")
        return
      }

      // Prevent multiple simultaneous calls
      if (isFetchingRef.current) {
        console.log("Fetch already in progress, skipping")
        return
      }

      console.log("Fetching users with filters:", newFilters)

      setLoading(true)
      setError(null)
      isFetchingRef.current = true

      try {
        const mergedFilters = { ...initialFiltersRef.current, ...newFilters }
        const limit = mergedFilters.limit || 20
        const page = mergedFilters.page || 1
        const offset = (page - 1) * limit

        const [{ data: memberData, error: memberError }, adminResponse] =
          await Promise.all([
            organizationClient.listMembers({
              query: {
                limit: 500,
                offset: 0,
              },
            }),
            authClient.admin.listUsers({
              query: {
                limit: 500,
                offset: 0,
              },
            }),
          ])

        if (memberError) {
          throw new Error(
            memberError.message || "Failed to fetch organization members"
          )
        }

        if (adminResponse?.error) {
          console.error(
            "Failed to fetch admin users:",
            adminResponse.error.message
          )
        }

        const adminUsers = adminResponse?.data?.users || []
        const adminMap = new Map(
          adminUsers.map((adminUser: any) => [adminUser.id, adminUser])
        )

        const members = memberData?.members || []
        const mappedUsers: AdminUser[] = members.map((member: any) => {
          const memberUser = member.user || {}
          const createdAt = member.createdAt ? new Date(member.createdAt) : null
          const adminUser = adminMap.get(member.userId ?? memberUser.id)
          return {
            id: adminUser?.id ?? memberUser.id ?? member.userId ?? "",
            name: adminUser?.name ?? memberUser.name ?? "",
            email: adminUser?.email ?? memberUser.email ?? "",
            emailVerified: adminUser?.emailVerified ?? false,
            emailVerifiedAt: adminUser?.emailVerifiedAt
              ? new Date(adminUser.emailVerifiedAt)
              : null,
            twoFactorEnabledAt: adminUser?.twoFactorEnabledAt
              ? new Date(adminUser.twoFactorEnabledAt)
              : null,
            image: adminUser?.image ?? memberUser.image ?? null,
            createdAt: createdAt ?? new Date(),
            updatedAt: adminUser?.updatedAt
              ? new Date(adminUser.updatedAt)
              : (createdAt ?? new Date()),
            twoFactorEnabled:
              typeof adminUser?.twoFactorEnabled === "boolean"
                ? adminUser.twoFactorEnabled
                : null,
            phone: adminUser?.phone ?? null,
            dateOfBirth: adminUser?.dateOfBirth ?? null,
            bio: adminUser?.bio ?? null,
            address: adminUser?.address ?? null,
            city: adminUser?.city ?? null,
            state: adminUser?.state ?? null,
            country: adminUser?.country ?? null,
            role: member.role ?? "member",
            memberId: member.id ?? null,
            memberRole: member.role ?? null,
            lastLoginAt: adminUser?.lastLoginAt
              ? new Date(adminUser.lastLoginAt)
              : null,
            failedLoginAttempts:
              typeof adminUser?.failedLoginAttempts === "string"
                ? adminUser.failedLoginAttempts
                : "0",
            lockoutUntil: adminUser?.lockoutUntil
              ? new Date(adminUser.lockoutUntil)
              : null,
            lastLoginMethod: adminUser?.lastLoginMethod ?? null,
            banned:
              typeof adminUser?.banned === "boolean" ? adminUser.banned : false,
            banReason: adminUser?.banReason ?? null,
            banExpires: adminUser?.banExpires
              ? new Date(adminUser.banExpires)
              : null,
            preferences: adminUser?.preferences ?? {},
            metadata: adminUser?.metadata ?? {},
            passwordLastChanged: adminUser?.passwordLastChanged
              ? new Date(adminUser.passwordLastChanged)
              : null,
          }
        })

        const searchValue = mergedFilters.search?.toLowerCase().trim()
        const filteredUsers = mappedUsers.filter((u: AdminUser) => {
          const matchesRole = mergedFilters.role
            ? u.role === mergedFilters.role
            : true
          if (!searchValue) return matchesRole
          const name = u.name?.toLowerCase() || ""
          const email = u.email?.toLowerCase() || ""
          return (
            matchesRole &&
            (name.includes(searchValue) || email.includes(searchValue))
          )
        })

        const totalForPagination = filteredUsers.length
        const totalPages = Math.ceil(totalForPagination / limit) || 1

        setUsers(filteredUsers)
        setPagination({
          page,
          limit,
          total: totalForPagination,
          totalPages,
        })
        hasFetchedRef.current = true
      } catch (err: any) {
        const errorMessage = err.message || "Failed to fetch users"
        setError(errorMessage)
        console.error("Fetch users error:", err)
      } finally {
        setLoading(false)
        isFetchingRef.current = false
      }
    },
    [] // Empty deps - using refs for all dynamic values
  )

  const updateUser = useCallback(
    async (userId: string, updates: Partial<AdminUser>) => {
      const currentUser = userRef.current
      if (!currentUser || roleRef.current !== "admin") {
        throw new Error("Insufficient permissions")
      }

      try {
        const targetUser = usersRef.current.find((u) => u.id === userId)
        if (!targetUser) {
          throw new Error("User not found")
        }

        let didUpdate = false

        if (updates.role) {
          if (!targetUser.memberId) {
            throw new Error("User is not a member of the active organization")
          }

          const { data, error } = await organizationClient.updateMemberRole({
            memberId: targetUser.memberId,
            role: updates.role,
          })

          if (error) {
            throw new Error(
              error.message || "Failed to update organization role"
            )
          }

          didUpdate = Boolean(data)
        }

        const adminUpdates = { ...updates } as Partial<AdminUser>
        delete (adminUpdates as Partial<AdminUser>).role
        delete (adminUpdates as Partial<AdminUser>).memberId
        delete (adminUpdates as Partial<AdminUser>).memberRole

        if (Object.keys(adminUpdates).length > 0) {
          const { error: updateError } = await authClient.admin.updateUser({
            userId,
            data: adminUpdates,
          })

          if (updateError) {
            throw new Error(updateError.message || "Failed to update user")
          }

          didUpdate = true
        }

        if (didUpdate) {
          await fetchUsers()
          toast.success("User updated successfully")
          return { ...targetUser, ...updates }
        }

        throw new Error("No updates were applied")
      } catch (err: any) {
        const errorMessage = err.message || "Failed to update user"
        toast.error(errorMessage)
        throw new Error(errorMessage)
      }
    },
    [fetchUsers] // Stable dep
  )

  const deleteUser = useCallback(
    async (userId: string) => {
      const currentUser = userRef.current
      if (!currentUser || roleRef.current !== "admin") {
        throw new Error("Insufficient permissions")
      }

      try {
        const targetUser = usersRef.current.find((u) => u.id === userId)
        const memberIdOrEmail = targetUser?.memberId || targetUser?.email

        if (!memberIdOrEmail) {
          throw new Error("Missing member information for removal")
        }

        const { data, error: deleteError } =
          await organizationClient.removeMember({
            memberIdOrEmail,
          })

        if (data && !deleteError) {
          hasFetchedRef.current = false
          await fetchUsers()
          toast.success("Member removed successfully")
          return true
        }

        const errorMessage = deleteError?.message || "Failed to remove member"
        throw new Error(errorMessage)
      } catch (err: any) {
        const errorMessage = err.message || "Failed to delete user"
        toast.error(errorMessage)
        throw new Error(errorMessage)
      }
    },
    [fetchUsers]
  )

  const getUserDetails = useCallback(async (userId: string) => {
    const currentUser = userRef.current
    if (!currentUser || roleRef.current !== "admin") {
      throw new Error("Insufficient permissions")
    }

    try {
      const existingUser = usersRef.current.find((u) => u.id === userId)
      if (existingUser) {
        return existingUser
      }

      const { data, error: detailsError } =
        await organizationClient.listMembers({
          query: {
            limit: 500,
            offset: 0,
          },
        })

      if (detailsError) {
        throw new Error(detailsError?.message || "Failed to get user details")
      }

      const members = data?.members || []
      const match = members.find((member: any) => member.userId === userId)
      if (!match) {
        throw new Error("User not found in active organization")
      }

      return match
    } catch (err: any) {
      const errorMessage = err.message || "Failed to get user details"
      throw new Error(errorMessage)
    }
  }, [])

  const refetch = useCallback(async () => {
    hasFetchedRef.current = false
    await fetchUsers()
  }, [fetchUsers])

  // Initialize users data only once when user becomes admin
  useEffect(() => {
    const currentUser = userRef.current

    if (!currentUser) {
      // Reset state when no user
      if (users.length > 0 || error) {
        console.log("Resetting: no user")
        setUsers([])
        setPagination({ page: 1, limit: 20, total: 0, totalPages: 0 })
        setError(null)
        hasFetchedRef.current = false
      }
      return
    }

    if (roleRef.current !== "admin") {
      // Reset state for non-admin users
      if (users.length > 0 || error !== "Insufficient permissions") {
        console.log("Resetting: non-admin user")
        setUsers([])
        setPagination({ page: 1, limit: 20, total: 0, totalPages: 0 })
        setError("Insufficient permissions")
        hasFetchedRef.current = false
      }
      return
    }

    // Fetch data for admin user (only once)
    if (!hasFetchedRef.current && !isFetchingRef.current) {
      console.log("Initial fetch for admin user:", currentUser.id)
      fetchUsers()
    }
  }, [user?.id, activeRole, fetchUsers, users.length, error]) // Depend on primitive values only

  // Handle session errors
  useEffect(() => {
    if (sessionError) {
      setError(sessionError.message || "Session error")
    }
  }, [sessionError])

  // Handle initial pending state
  useEffect(() => {
    if (isPending) {
      setLoading(true)
    } else {
      setLoading(false)
    }
  }, [isPending])

  return {
    users,
    pagination,
    loading,
    error,
    fetchUsers,
    deleteUser,
    getUserDetails,
    updateUser,
    refetch,
  }
}
