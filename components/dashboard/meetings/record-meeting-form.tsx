"use client"

import { useEffect, useMemo, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { format } from "date-fns"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { ApiErrorException } from "@/types/api"
import {
  useCreateMeetingMutation,
  useUpdateMeetingMutation,
  type MeetingRecord,
} from "@/hooks/api/use-meetings"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Loader } from "@/components/common/loader"

interface RecordMeetingFormProps {
  onSuccess?: () => void
  formId?: string
  hideActions?: boolean
  onSubmittingChange?: (isSubmitting: boolean) => void
  meeting?: MeetingRecord
  mode?: "create" | "edit"
}

const meetingSchema = z.object({
  title: z.string().trim().min(3, "Meeting title is required."),
  scheduledAt: z.string().min(1, "Meeting date and time are required."),
  location: z.string().optional(),
  agenda: z.string().optional(),
  status: z.enum(["scheduled", "completed", "cancelled"]),
  hostContribution: z
    .string()
    .optional()
    .refine((value) => !value || /^\d+(\.\d{1,2})?$/.test(value), {
      message: "Host contribution must be a valid number.",
    }),
})

type RecordMeetingFormValues = z.infer<typeof meetingSchema>

export function RecordMeetingForm({
  onSuccess,
  formId,
  hideActions = false,
  onSubmittingChange,
  meeting,
  mode = "create",
}: RecordMeetingFormProps) {
  const [submitError, setSubmitError] = useState<string | null>(null)
  const createMeeting = useCreateMeetingMutation()
  const updateMeeting = useUpdateMeetingMutation()

  const isEditMode = mode === "edit" && Boolean(meeting?.id)

  const defaultValues = useMemo(
    () => ({
      title: meeting?.title ?? "",
      scheduledAt: meeting?.scheduledAt
        ? new Date(meeting.scheduledAt).toISOString().slice(0, 16)
        : "",
      location: meeting?.location ?? "",
      agenda: meeting?.agenda ?? "",
      status: meeting?.status ?? "scheduled",
      hostContribution: meeting?.hostContribution ?? "10000",
    }),
    [meeting]
  )

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RecordMeetingFormValues>({
    resolver: zodResolver(meetingSchema),
    defaultValues,
  })

  useEffect(() => {
    reset(defaultValues)
  }, [defaultValues, reset])

  useEffect(() => {
    onSubmittingChange?.(
      isSubmitting || createMeeting.isPending || updateMeeting.isPending
    )
  }, [
    isSubmitting,
    createMeeting.isPending,
    updateMeeting.isPending,
    onSubmittingChange,
  ])

  const onSubmit = async (values: RecordMeetingFormValues) => {
    setSubmitError(null)

    try {
      const payload = {
        title: values.title.trim(),
        scheduledAt: new Date(values.scheduledAt).toISOString(),
        location: values.location?.trim() || undefined,
        agenda: values.agenda?.trim() || undefined,
        status: values.status,
        hostContribution: values.hostContribution?.trim() || undefined,
      }

      const result = isEditMode
        ? await updateMeeting.mutateAsync({ id: meeting!.id, ...payload })
        : await createMeeting.mutateAsync(payload)

      const meetingData = result?.data?.meeting
      const savedDate = meetingData?.scheduledAt
        ? format(new Date(meetingData.scheduledAt), "PPp")
        : null

      toast.success(
        savedDate
          ? `${isEditMode ? "Meeting updated" : "Meeting created"} for ${savedDate}`
          : isEditMode
            ? "Meeting updated successfully"
            : "Meeting created successfully"
      )

      if (!isEditMode) {
        reset({
          title: "",
          scheduledAt: "",
          location: "",
          agenda: "",
          status: "scheduled",
          hostContribution: "10000",
        })
      }

      onSuccess?.()
    } catch (error) {
      console.error(error)
      const message =
        error instanceof ApiErrorException
          ? error.help || error.message
          : error instanceof Error
            ? error.message
            : isEditMode
              ? "Unable to update meeting"
              : "Unable to create meeting"
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
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="title">Meeting Title</Label>
          <Input
            id="title"
            {...register("title")}
            placeholder="Monthly Savings & Planning Meeting"
            autoComplete="off"
          />
          {errors.title?.message && (
            <p className="text-xs text-destructive" aria-live="polite">
              {errors.title.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="scheduledAt">Date & Time</Label>
          <Input
            id="scheduledAt"
            type="datetime-local"
            {...register("scheduledAt")}
          />
          {errors.scheduledAt?.message && (
            <p className="text-xs text-destructive" aria-live="polite">
              {errors.scheduledAt.message}
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
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            {...register("location")}
            placeholder="Nyamata Sector"
            autoComplete="off"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="hostContribution">Host Contribution (RWF)</Label>
          <Input
            id="hostContribution"
            inputMode="decimal"
            {...register("hostContribution")}
            placeholder="10000"
          />
          {errors.hostContribution?.message && (
            <p className="text-xs text-destructive" aria-live="polite">
              {errors.hostContribution.message}
            </p>
          )}
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="agenda">Agenda</Label>
          <Textarea
            id="agenda"
            rows={4}
            {...register("agenda")}
            placeholder="Discuss monthly contributions, review loans, and assign action items..."
          />
        </div>
      </div>

      {!hideActions && (
        <Button
          type="submit"
          disabled={
            isSubmitting || createMeeting.isPending || updateMeeting.isPending
          }>
          {isSubmitting ||
          createMeeting.isPending ||
          updateMeeting.isPending ? (
            <>
              <Loader className="mr-2 h-4 w-4" />
              {isEditMode ? "Updating..." : "Creating..."}
            </>
          ) : isEditMode ? (
            "Update Meeting"
          ) : (
            "Create Meeting"
          )}
        </Button>
      )}
    </form>
  )
}
