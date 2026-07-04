"use client"

import { useEffect, useMemo, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { format } from "date-fns"
import { Loader2, Search, Users } from "lucide-react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { ApiErrorException } from "@/types/api"
import { organizationClient } from "@/lib/organization-client"
import { cn } from "@/lib/utils"
import {
  useAttendance,
  useCreateAttendanceMutation,
  useUpdateAttendanceMutation,
} from "@/hooks/api/use-attendance"
import { useMeetings } from "@/hooks/api/use-meetings"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { MemberAvatar } from "@/components/common/member-avatar"

type AttendanceStatus = "present" | "absent" | "late" | "excused"

type MemberOption = {
  id: string
  name: string
  email: string
  image?: string | null
}

const attendanceFormSchema = z.object({
  meetingId: z.string().min(1, "Please select a meeting"),
})

type AttendanceFormValues = z.infer<typeof attendanceFormSchema>
type AttendanceDraft = {
  existingId?: string
  status: AttendanceStatus
}

interface AttendanceFormProps {
  formId?: string
  hideActions?: boolean
  onSuccess?: () => void
  onSubmittingChange?: (isSubmitting: boolean) => void
}

const hasStrictMemberRole = (rawRole: unknown): boolean => {
  if (Array.isArray(rawRole)) {
    const normalized = rawRole
      .map((value) =>
        typeof value === "string" ? value.trim().toLowerCase() : null
      )
      .filter((value): value is string => Boolean(value))

    return normalized.length === 1 && normalized[0] === "member"
  }

  if (typeof rawRole === "string") {
    const parts = rawRole
      .split(",")
      .map((part) => part.trim().toLowerCase())
      .filter(Boolean)

    return parts.length === 1 && parts[0] === "member"
  }

  return false
}

export function AttendanceForm({
  formId,
  hideActions = false,
  onSuccess,
  onSubmittingChange,
}: AttendanceFormProps) {
  const [members, setMembers] = useState<MemberOption[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [saveOnlyChanged, setSaveOnlyChanged] = useState(true)
  const [attendanceDrafts, setAttendanceDrafts] = useState<
    Record<string, AttendanceDraft>
  >({})
  const [touchedMemberIds, setTouchedMemberIds] = useState<Set<string>>(
    new Set()
  )
  const [isLoadingMembers, setIsLoadingMembers] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const createAttendance = useCreateAttendanceMutation()
  const updateAttendance = useUpdateAttendanceMutation()

  const { data: meetingsResponse, isPending: meetingsLoading } = useMeetings({
    limit: 200,
  })

  const form = useForm<AttendanceFormValues>({
    resolver: zodResolver(attendanceFormSchema),
    defaultValues: {
      meetingId: "",
    },
  })

  const selectedMeetingId = form.watch("meetingId")

  const {
    data: existingAttendanceResponse,
    isPending: isLoadingExistingAttendance,
  } = useAttendance(
    {
      meetingId: selectedMeetingId || undefined,
      limit: 500,
    },
    {
      enabled: Boolean(selectedMeetingId),
    }
  )

  useEffect(() => {
    let active = true

    const loadMembers = async () => {
      setIsLoadingMembers(true)
      try {
        const { data, error } = await organizationClient.listMembers({
          query: {
            limit: 500,
            offset: 0,
            role: "member",
          },
        })

        if (error) {
          throw new Error(error.message || "Failed to load members")
        }

        const mapById = new Map<string, MemberOption>()
        ;(data?.members ?? []).forEach((membership: any) => {
          if (!hasStrictMemberRole(membership?.role)) return

          const id = membership?.user?.id ?? membership?.userId ?? ""
          if (!id || mapById.has(id)) return

          mapById.set(id, {
            id,
            name: membership?.user?.name ?? "Unnamed member",
            email: membership?.user?.email ?? "",
            image: membership?.user?.image ?? null,
          })
        })

        if (active) {
          setMembers(
            [...mapById.values()].sort((a, b) => a.name.localeCompare(b.name))
          )
        }
      } catch {
        if (active) {
          setMembers([])
          toast.error("Unable to load members")
        }
      } finally {
        if (active) setIsLoadingMembers(false)
      }
    }

    void loadMembers()

    return () => {
      active = false
    }
  }, [])

  const meetings = useMemo(
    () => meetingsResponse?.data ?? [],
    [meetingsResponse?.data]
  )
  const isBusy =
    isSaving || createAttendance.isPending || updateAttendance.isPending
  const isDataLoading =
    meetingsLoading || isLoadingMembers || isLoadingExistingAttendance

  useEffect(() => {
    if (meetings.length > 0 && !form.getValues("meetingId")) {
      form.setValue("meetingId", meetings[0].id, { shouldValidate: true })
    }
  }, [form, meetings])

  useEffect(() => {
    onSubmittingChange?.(isBusy)
  }, [isBusy, onSubmittingChange])

  const existingAttendanceByMember = useMemo(() => {
    const map = new Map<
      string,
      {
        id: string
        status: AttendanceStatus
      }
    >()

    ;(existingAttendanceResponse?.data ?? []).forEach((record) => {
      map.set(record.memberId, {
        id: record.id,
        status: record.status,
      })
    })

    return map
  }, [existingAttendanceResponse?.data])

  useEffect(() => {
    if (!selectedMeetingId || members.length === 0) {
      setAttendanceDrafts({})
      setTouchedMemberIds(new Set())
      return
    }

    setAttendanceDrafts(() => {
      const next: Record<string, AttendanceDraft> = {}
      members.forEach((member) => {
        const existing = existingAttendanceByMember.get(member.id)
        next[member.id] = {
          existingId: existing?.id,
          status: existing?.status ?? "absent",
        }
      })
      return next
    })
    setTouchedMemberIds(new Set())
  }, [members, selectedMeetingId, existingAttendanceByMember])

  const meetingOptions = useMemo(
    () =>
      meetings.map((meeting) => ({
        value: meeting.id,
        label: `${meeting.title} (${format(new Date(meeting.scheduledAt), "PP")})`,
      })),
    [meetings]
  )

  const filteredMembers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return members

    return members.filter((member) =>
      `${member.name} ${member.email}`.toLowerCase().includes(query)
    )
  }, [members, searchQuery])

  const counts = useMemo(() => {
    return members.reduce(
      (acc, member) => {
        const status = attendanceDrafts[member.id]?.status
        if (!status) return acc
        acc[status] += 1
        return acc
      },
      { present: 0, absent: 0, late: 0, excused: 0 }
    )
  }, [attendanceDrafts, members])

  const setMemberStatus = (memberId: string, status: AttendanceStatus) => {
    setAttendanceDrafts((prev) => ({
      ...prev,
      [memberId]: {
        ...prev[memberId],
        status,
      },
    }))
    setTouchedMemberIds((prev) => {
      const next = new Set(prev)
      next.add(memberId)
      return next
    })
  }

  const applyBatchStatus = (status: AttendanceStatus) => {
    setAttendanceDrafts((prev) => {
      const next = { ...prev }
      members.forEach((member) => {
        next[member.id] = {
          ...next[member.id],
          status,
        }
      })
      return next
    })
    setTouchedMemberIds(new Set(members.map((member) => member.id)))
  }

  const handleSubmit = async (values: AttendanceFormValues) => {
    if (members.length === 0) {
      toast.error("No members available to record attendance")
      return
    }

    if (saveOnlyChanged && touchedMemberIds.size === 0) {
      toast.error("No changed members selected to save")
      return
    }

    const membersToPersist = saveOnlyChanged
      ? members.filter((member) => touchedMemberIds.has(member.id))
      : members

    setIsSaving(true)
    try {
      const updateJobs: Promise<unknown>[] = []
      const createJobs: Promise<unknown>[] = []

      membersToPersist.forEach((member) => {
        const draft = attendanceDrafts[member.id]
        if (!draft) return

        if (draft.existingId) {
          const existing = existingAttendanceByMember.get(member.id)
          if (!existing || existing.status !== draft.status) {
            updateJobs.push(
              updateAttendance.mutateAsync({
                id: draft.existingId,
                status: draft.status,
              })
            )
          }
          return
        }

        createJobs.push(
          createAttendance.mutateAsync({
            meetingId: values.meetingId,
            memberId: member.id,
            status: draft.status,
          })
        )
      })

      await Promise.all([...updateJobs, ...createJobs])

      const touchedCount = updateJobs.length + createJobs.length
      toast.success(
        touchedCount > 0
          ? `Attendance saved for ${touchedCount} member${touchedCount === 1 ? "" : "s"}`
          : "No attendance changes to save"
      )
      if (touchedCount > 0) {
        setTouchedMemberIds(new Set())
      }
      onSuccess?.()
    } catch (error) {
      const message =
        error instanceof ApiErrorException
          ? error.help || error.message
          : "Failed to record attendance"
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Form {...form}>
      <form
        id={formId}
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-4">
        <FormField
          control={form.control}
          name="meetingId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Meeting Session</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value}
                disabled={isDataLoading || isBusy}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a meeting" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {meetingOptions.length === 0 ? (
                    <SelectItem value="__empty" disabled>
                      No meetings found
                    </SelectItem>
                  ) : (
                    meetingOptions.map((meeting) => (
                      <SelectItem key={meeting.value} value={meeting.value}>
                        {meeting.label}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="rounded-lg border">
          <div className="flex flex-col gap-3 border-b p-3 md:flex-row md:items-center md:justify-between">
            <div>
              <Label className="text-sm">Member Attendance Register</Label>
              <p className="text-xs text-muted-foreground">
                Review all members and assign one attendance status per member.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">Touched: {touchedMemberIds.size}</Badge>
              <Badge variant="default">Present: {counts.present}</Badge>
              <Badge variant="secondary">Late: {counts.late}</Badge>
              <Badge variant="outline">Absent: {counts.absent}</Badge>
              <Badge variant="outline">Excused: {counts.excused}</Badge>
            </div>
          </div>

          <div className="flex flex-col gap-3 p-3 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search member by name or email"
                className="pl-9"
                disabled={isBusy}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 rounded-md border px-2 py-1.5 text-xs">
                <Checkbox
                  checked={saveOnlyChanged}
                  onCheckedChange={(value) =>
                    setSaveOnlyChanged(Boolean(value))
                  }
                  disabled={isBusy}
                />
                Save only changed members
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => applyBatchStatus("present")}
                disabled={isBusy || members.length === 0}>
                Mark all present
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => applyBatchStatus("absent")}
                disabled={isBusy || members.length === 0}>
                Mark all absent
              </Button>
            </div>
          </div>

          <div className="max-h-80 space-y-2 overflow-y-auto border-t p-3">
            {isDataLoading && (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton key={index} className="h-16 w-full rounded-md" />
                ))}
              </div>
            )}

            {!isDataLoading && filteredMembers.length === 0 && (
              <div className="rounded-md border border-dashed p-5 text-center text-sm text-muted-foreground">
                No members match your search.
              </div>
            )}

            {!isDataLoading &&
              filteredMembers.map((member) => {
                const draft = attendanceDrafts[member.id]
                if (!draft) return null

                return (
                  <div
                    key={member.id}
                    className="rounded-md border bg-card p-3 shadow-xs">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div className="flex items-center gap-3">
                        <MemberAvatar
                          name={member.name}
                          email={member.email}
                          image={member.image}
                          size="md"
                        />
                        <div>
                          <p className="text-sm font-medium">{member.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {member.email || "No email"}
                          </p>
                        </div>
                      </div>

                      <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4 md:w-auto">
                        {(
                          [
                            { value: "present", label: "Present" },
                            { value: "absent", label: "Absent" },
                            { value: "late", label: "Late" },
                            { value: "excused", label: "Excused" },
                          ] as const
                        ).map((option) => (
                          <Button
                            key={option.value}
                            type="button"
                            size="sm"
                            variant={
                              draft.status === option.value
                                ? "default"
                                : "outline"
                            }
                            className={cn(
                              "h-8",
                              draft.status === option.value &&
                                option.value === "absent" &&
                                "bg-amber-600 hover:bg-amber-600/90"
                            )}
                            onClick={() =>
                              setMemberStatus(member.id, option.value)
                            }
                            disabled={isBusy}>
                            {option.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              })}
          </div>
          <div className="flex items-center gap-2 border-t px-3 py-2 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            {members.length} members loaded for this organization.
          </div>
        </div>

        {!hideActions && (
          <Button
            type="submit"
            className="w-full"
            disabled={isBusy || isDataLoading}>
            {isBusy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving attendance...
              </>
            ) : (
              "Save attendance"
            )}
          </Button>
        )}
      </form>
    </Form>
  )
}
