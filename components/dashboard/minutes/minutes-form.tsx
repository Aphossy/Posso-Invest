"use client"

import { useEffect, useMemo, useState } from "react"
import { normalizeRoleValue } from "@/utils/role-utils"
import { zodResolver } from "@hookform/resolvers/zod"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { ApiErrorException } from "@/types/api"
import { organizationClient } from "@/lib/organization-client"
import { cn } from "@/lib/utils"
import { useMeetings, type MeetingRecord } from "@/hooks/api/use-meetings"
import { useCreateMinuteMutation } from "@/hooks/api/use-minutes"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Loader } from "@/components/common/loader"
import { FileUploadComponent } from "@/components/file-upload-component"

interface MinutesFormProps {
  onSuccess?: () => void
  formId?: string
  hideActions?: boolean
  onSubmittingChange?: (isSubmitting: boolean) => void
}

type MemberOption = {
  id: string
  name: string
  email: string
  image?: string | null
}

type MinutesAttachment = {
  id: string
  name: string
  url: string
  signedUrl?: string
  size: number
  type: string
  key?: string
  dbId?: string
  storageProvider?: string
}

const statusOptions = [
  { value: "draft", label: "Draft" },
  { value: "finalized", label: "Finalized" },
  { value: "published", label: "Published" },
] as const

const minutesSchema = z
  .object({
    meetingId: z.string().min(1, "Please select a meeting."),
    status: z.enum(["draft", "finalized", "published"]),
    summary: z.string().optional(),
    decisionsText: z.string().optional(),
    actionItemsText: z.string().optional(),
    presentMemberIds: z.array(z.string()),
    absentMemberIds: z.array(z.string()),
    guests: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    const presentSet = new Set(values.presentMemberIds)
    const overlap = values.absentMemberIds.filter((id) => presentSet.has(id))
    if (overlap.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["absentMemberIds"],
        message: "A member cannot be both present and absent.",
      })
    }
  })

type MinutesFormValues = z.infer<typeof minutesSchema>

const hasStrictMemberRole = (rawRole: unknown): boolean => {
  if (Array.isArray(rawRole)) {
    const normalized = rawRole
      .map((value) =>
        typeof value === "string" ? normalizeRoleValue(value) : null
      )
      .filter((value): value is string => Boolean(value))

    return normalized.length === 1 && normalized[0] === "member"
  }

  if (typeof rawRole === "string") {
    const parts = rawRole
      .split(",")
      .map((part) => normalizeRoleValue(part))
      .filter((value): value is string => Boolean(value))

    return parts.length === 1 && parts[0] === "member"
  }

  return false
}

const parseList = (value: string) =>
  value
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean)

const parseActionItems = (value: string) =>
  value
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [task, owner, dueDate, status] = line
        .split("|")
        .map((item) => item.trim())
      return {
        task,
        owner: owner || undefined,
        dueDate: dueDate || undefined,
        status: status || undefined,
      }
    })

export function MinutesForm({
  onSuccess,
  formId,
  hideActions = false,
  onSubmittingChange,
}: MinutesFormProps) {
  const [members, setMembers] = useState<MemberOption[]>([])
  const [isLoadingMembers, setIsLoadingMembers] = useState(true)
  const [memberLoadError, setMemberLoadError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isUploadingAttachments, setIsUploadingAttachments] = useState(false)
  const [attachmentUploadKey, setAttachmentUploadKey] = useState(0)
  const [attachments, setAttachments] = useState<MinutesAttachment[]>([])
  const createMinute = useCreateMinuteMutation()
  const {
    data: meetingsData,
    isPending: isLoadingMeetings,
    error: meetingsError,
  } = useMeetings({ limit: 200 })

  const {
    control,
    register,
    handleSubmit,
    setValue,
    getValues,
    reset,
    formState: { errors, isSubmitting: isFormSubmitting },
  } = useForm<MinutesFormValues>({
    resolver: zodResolver(minutesSchema),
    defaultValues: {
      meetingId: "",
      status: "draft",
      summary: "",
      decisionsText: "",
      actionItemsText: "",
      presentMemberIds: [],
      absentMemberIds: [],
      guests: "",
    },
  })

  useEffect(() => {
    onSubmittingChange?.(
      isFormSubmitting || createMinute.isPending || isUploadingAttachments
    )
  }, [
    isFormSubmitting,
    createMinute.isPending,
    isUploadingAttachments,
    onSubmittingChange,
  ])

  const meetings = useMemo(() => {
    const records = meetingsData?.data ?? []
    return [...records].sort(
      (a, b) =>
        new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()
    ) as MeetingRecord[]
  }, [meetingsData?.data])

  const meetingLoadError =
    meetingsError instanceof ApiErrorException
      ? meetingsError.help || meetingsError.message
      : null

  useEffect(() => {
    if (meetings.length > 0 && !getValues("meetingId")) {
      setValue("meetingId", meetings[0].id, { shouldValidate: true })
    }
  }, [meetings, getValues, setValue])

  useEffect(() => {
    let isActive = true

    const fetchMembers = async () => {
      setIsLoadingMembers(true)
      setMemberLoadError(null)

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
          if (!hasStrictMemberRole(membership?.role)) {
            return
          }

          const id = membership?.user?.id ?? membership?.userId ?? ""
          if (!id || mapById.has(id)) {
            return
          }

          mapById.set(id, {
            id,
            name: membership?.user?.name ?? "Unnamed member",
            email: membership?.user?.email ?? "",
          })
        })

        const next = [...mapById.values()].sort((a, b) =>
          a.name.localeCompare(b.name)
        )

        if (isActive) setMembers(next)
      } catch (error) {
        console.error(error)
        if (isActive) {
          setMemberLoadError("Unable to load members. Please try again.")
          setMembers([])
        }
      } finally {
        if (isActive) setIsLoadingMembers(false)
      }
    }

    void fetchMembers()

    return () => {
      isActive = false
    }
  }, [])

  const onSubmit = async (values: MinutesFormValues) => {
    setSubmitError(null)

    try {
      await createMinute.mutateAsync({
        meetingId: values.meetingId,
        status: values.status,
        summary: values.summary?.trim() || undefined,
        decisions: {
          items: parseList(values.decisionsText || ""),
        },
        actionItems: {
          items: parseActionItems(values.actionItemsText || ""),
        },
        attendance: {
          presentIds: values.presentMemberIds,
          absentIds: values.absentMemberIds,
          guests: parseList(values.guests || ""),
        },
      })

      const selectedMeetingId = values.meetingId
      reset({
        meetingId: selectedMeetingId,
        status: "draft",
        summary: "",
        decisionsText: "",
        actionItemsText: "",
        presentMemberIds: [],
        absentMemberIds: [],
        guests: "",
      })
      setAttachments([])
      setAttachmentUploadKey((prev) => prev + 1)

      if (attachments.length > 0) {
        toast.success(
          `Minutes created successfully. ${attachments.length} document${
            attachments.length === 1 ? "" : "s"
          } uploaded separately.`
        )
      } else {
        toast.success("Minutes created successfully")
      }

      onSuccess?.()
    } catch (error) {
      console.error(error)
      const message =
        error instanceof ApiErrorException
          ? error.help || error.message
          : error instanceof Error
            ? error.message
            : "Unable to create minutes"
      setSubmitError(message)
      toast.error(message)
    }
  }

  return (
    <form id={formId} onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {submitError && (
        <Alert variant="destructive">
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="meetingId">Meeting</Label>
          <Controller
            control={control}
            name="meetingId"
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={field.onChange}
                disabled={isLoadingMeetings || meetings.length === 0}>
                <SelectTrigger
                  id="meetingId"
                  aria-invalid={Boolean(errors.meetingId)}>
                  <SelectValue
                    placeholder={
                      isLoadingMeetings
                        ? "Loading meetings..."
                        : meetings.length === 0
                          ? "No meetings available"
                          : "Select meeting"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {meetings.length > 0 ? (
                    meetings.map((meeting) => (
                      <SelectItem key={meeting.id} value={meeting.id}>
                        {meeting.title} -{" "}
                        {format(new Date(meeting.scheduledAt), "PP")}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="__none" disabled>
                      No meetings found
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            )}
          />
          <p className="text-xs text-muted-foreground">
            Meeting reference is auto-managed from this selection.
          </p>
          {meetingLoadError && (
            <p className="text-xs text-destructive" aria-live="polite">
              {meetingLoadError}
            </p>
          )}
          {errors.meetingId?.message && (
            <p className="text-xs text-destructive" aria-live="polite">
              {errors.meetingId.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Status</Label>
          <Controller
            control={control}
            name="status"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="summary">Summary</Label>
          <Textarea
            id="summary"
            rows={3}
            {...register("summary")}
            placeholder="Short recap of the meeting..."
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="decisionsText">Decisions (one per line)</Label>
          <Textarea
            id="decisionsText"
            rows={3}
            {...register("decisionsText")}
            placeholder="Adopt constitution draft..."
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="actionItemsText">
            Action Items (task | owner | due | status)
          </Label>
          <Textarea
            id="actionItemsText"
            rows={3}
            {...register("actionItemsText")}
            placeholder="Finalize constitution | Committee | 2026-01-25 | in-progress"
          />
        </div>

        <Controller
          control={control}
          name="presentMemberIds"
          render={({ field }) => (
            <div className="space-y-2 md:col-span-2">
              <Label>Present Members</Label>
              <div className="grid max-h-44 gap-2 overflow-y-auto rounded-md border p-3 sm:grid-cols-2">
                {members.map((member) => {
                  const checked = field.value.includes(member.id)
                  return (
                    <label
                      key={member.id}
                      className="flex items-start gap-2 rounded px-1 py-1 hover:bg-muted/50">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(isChecked) => {
                          if (isChecked) {
                            field.onChange([...field.value, member.id])
                            const absent = getValues("absentMemberIds")
                            if (absent.includes(member.id)) {
                              setValue(
                                "absentMemberIds",
                                absent.filter((id) => id !== member.id),
                                { shouldValidate: true }
                              )
                            }
                            return
                          }
                          field.onChange(
                            field.value.filter((id) => id !== member.id)
                          )
                        }}
                      />
                      <span className="text-sm">
                        {member.name}
                        {member.email ? (
                          <span className="block text-xs text-muted-foreground">
                            {member.email}
                          </span>
                        ) : null}
                      </span>
                    </label>
                  )
                })}
                {members.length === 0 && !isLoadingMembers && (
                  <p className="text-sm text-muted-foreground">
                    No members available.
                  </p>
                )}
              </div>
              {memberLoadError && (
                <p className="text-xs text-destructive" aria-live="polite">
                  {memberLoadError}
                </p>
              )}
            </div>
          )}
        />

        <Controller
          control={control}
          name="absentMemberIds"
          render={({ field }) => (
            <div className="space-y-2 md:col-span-2">
              <Label>Absent Members</Label>
              <div className="grid max-h-44 gap-2 overflow-y-auto rounded-md border p-3 sm:grid-cols-2">
                {members.map((member) => {
                  const checked = field.value.includes(member.id)
                  return (
                    <label
                      key={member.id}
                      className="flex items-start gap-2 rounded px-1 py-1 hover:bg-muted/50">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(isChecked) => {
                          if (isChecked) {
                            field.onChange([...field.value, member.id])
                            const present = getValues("presentMemberIds")
                            if (present.includes(member.id)) {
                              setValue(
                                "presentMemberIds",
                                present.filter((id) => id !== member.id),
                                { shouldValidate: true }
                              )
                            }
                            return
                          }
                          field.onChange(
                            field.value.filter((id) => id !== member.id)
                          )
                        }}
                      />
                      <span className="text-sm">
                        {member.name}
                        {member.email ? (
                          <span className="block text-xs text-muted-foreground">
                            {member.email}
                          </span>
                        ) : null}
                      </span>
                    </label>
                  )
                })}
                {members.length === 0 && !isLoadingMembers && (
                  <p className="text-sm text-muted-foreground">
                    No members available.
                  </p>
                )}
              </div>
              {errors.absentMemberIds?.message && (
                <p className="text-xs text-destructive" aria-live="polite">
                  {errors.absentMemberIds.message}
                </p>
              )}
            </div>
          )}
        />

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="guests">Guests</Label>
          <Input
            id="guests"
            {...register("guests")}
            placeholder="Guest names separated by commas"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label>Supporting Documents (Optional)</Label>
          <FileUploadComponent
            key={attachmentUploadKey}
            category="minutes"
            acceptedTypes="documents"
            maxFiles={8}
            multiple
            onUploadingChange={setIsUploadingAttachments}
            onUploadComplete={(uploadedFiles) => {
              setAttachments((prev) => {
                const next = [...prev]
                uploadedFiles.forEach((file) => {
                  if (!next.some((existing) => existing.id === file.id)) {
                    next.push(file)
                  }
                })
                return next
              })
            }}
          />
          {attachments.length > 0 ? (
            <p className="text-xs text-muted-foreground">
              {attachments.length} document{attachments.length === 1 ? "" : "s"}{" "}
              uploaded.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Uploaded files are stored and can be referenced in meeting notes.
            </p>
          )}
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="meetingPreviewDate">Meeting Date (read-only)</Label>
          <Controller
            control={control}
            name="meetingId"
            render={({ field }) => {
              const selectedMeeting = meetings.find(
                (item) => item.id === field.value
              )
              const selectedDate = selectedMeeting
                ? new Date(selectedMeeting.scheduledAt)
                : undefined

              return (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !selectedDate && "text-muted-foreground"
                      )}
                      disabled>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate
                        ? format(selectedDate, "PPP")
                        : "Select a meeting first"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={() => undefined}
                      disabled
                    />
                  </PopoverContent>
                </Popover>
              )
            }}
          />
        </div>
      </div>

      {!hideActions && (
        <Button
          type="submit"
          disabled={
            isFormSubmitting || createMinute.isPending || isUploadingAttachments
          }>
          {isFormSubmitting ||
          createMinute.isPending ||
          isUploadingAttachments ? (
            <>
              <Loader className="mr-2 h-4 w-4" />
              {isUploadingAttachments
                ? "Uploading attachments..."
                : "Creating..."}
            </>
          ) : (
            "Create Minutes"
          )}
        </Button>
      )}
    </form>
  )
}
