"use client"

import { useEffect, useMemo } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { ApiErrorException } from "@/types/api"
import { useCreateActionItemMutation } from "@/hooks/api/use-action-items"
import { useMeetings } from "@/hooks/api/use-meetings"
import { useMinutes } from "@/hooks/api/use-minutes"
import { useActionItemAssignees } from "@/hooks/use-action-item-assignees"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

interface ActionItemFormProps {
  onSuccess?: () => void
  formId?: string
  hideActions?: boolean
  onSubmittingChange?: (isSubmitting: boolean) => void
}

const EMPTY_MEETINGS: never[] = []
const EMPTY_MINUTES: never[] = []

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  meetingId: z.string().optional(),
  minutesId: z.string().optional(),
  ownerId: z.string().optional(),
  dueDate: z.string().optional(),
  status: z.enum(["open", "in_progress", "blocked", "done", "cancelled"]),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

export function ActionItemForm({
  onSuccess,
  formId,
  hideActions = false,
  onSubmittingChange,
}: ActionItemFormProps) {
  const createActionItem = useCreateActionItemMutation()
  const { assigneeOptions, isLoading: isLoadingMembers } =
    useActionItemAssignees()
  const { data: meetingsData, isPending: meetingsLoading } = useMeetings({
    limit: 200,
  })
  const { data: minutesData, isPending: minutesLoading } = useMinutes({
    limit: 200,
  })

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      meetingId: "",
      minutesId: "",
      ownerId: "",
      dueDate: "",
      status: "open",
      priority: "medium",
      notes: "",
    },
  })

  const meetings = meetingsData?.data ?? EMPTY_MEETINGS
  const minutes = minutesData?.data ?? EMPTY_MINUTES

  const isBusy = createActionItem.isPending
  const isDataLoading = meetingsLoading || minutesLoading || isLoadingMembers

  useEffect(() => {
    onSubmittingChange?.(isBusy)
  }, [isBusy, onSubmittingChange])

  const meetingOptions = useMemo(
    () =>
      meetings.map((meeting) => ({
        value: meeting.id,
        label: `${meeting.title} (${new Date(meeting.scheduledAt).toLocaleDateString("en-RW")})`,
      })),
    [meetings]
  )

  const minutesOptions = useMemo(
    () =>
      minutes.map((minute) => ({
        value: minute.id,
        label: `${minute.meetingTitle || "Minutes"} (${minute.status})`,
      })),
    [minutes]
  )

  const handleSubmit = async (values: FormValues) => {
    onSubmittingChange?.(true)

    try {
      await createActionItem.mutateAsync({
        title: values.title.trim(),
        description: values.description?.trim() || undefined,
        meetingId:
          values.meetingId && values.meetingId !== "none"
            ? values.meetingId
            : undefined,
        minutesId:
          values.minutesId && values.minutesId !== "none"
            ? values.minutesId
            : undefined,
        ownerId:
          values.ownerId && values.ownerId !== "unassigned"
            ? values.ownerId
            : undefined,
        dueDate: values.dueDate
          ? new Date(values.dueDate).toISOString()
          : undefined,
        status: values.status,
        priority: values.priority,
        notes: values.notes?.trim() || undefined,
      })

      toast.success("Action item created")
      form.reset({
        title: "",
        description: "",
        meetingId: "",
        minutesId: "",
        ownerId: "",
        dueDate: "",
        status: "open",
        priority: "medium",
        notes: "",
      })

      onSuccess?.()
    } catch (error) {
      const message =
        error instanceof ApiErrorException
          ? error.help || error.message
          : "Unable to create action item"
      toast.error(message)
    } finally {
      onSubmittingChange?.(false)
    }
  }

  return (
    <Form {...form}>
      <form
        id={formId}
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Title</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Finalize constitution draft..."
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    rows={3}
                    placeholder="Clarify scope, dependencies, or notes..."
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  disabled={isBusy}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="blocked">Blocked</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Priority</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  disabled={isBusy}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="dueDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Due Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="ownerId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Assigned member</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  disabled={isDataLoading || isBusy}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a member or leader" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="unassigned">
                      No member assigned
                    </SelectItem>
                    {assigneeOptions.map((member) => (
                      <SelectItem key={member.value} value={member.value}>
                        {member.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
                <p className="text-xs text-muted-foreground">
                  Choose from the full leadership and member list.
                </p>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="meetingId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Meeting</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  disabled={isDataLoading || isBusy}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select meeting" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">No meeting</SelectItem>
                    {meetingOptions.map((meeting) => (
                      <SelectItem key={meeting.value} value={meeting.value}>
                        {meeting.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="minutesId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Minutes</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  disabled={isDataLoading || isBusy}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select minutes" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">No minutes</SelectItem>
                    {minutesOptions.map((minute) => (
                      <SelectItem key={minute.value} value={minute.value}>
                        {minute.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea
                    rows={3}
                    placeholder="Add any follow-up details..."
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {!hideActions && (
          <Button type="submit" disabled={isBusy || isDataLoading}>
            {isBusy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Create Action Item
              </>
            ) : (
              "Create Action Item"
            )}
          </Button>
        )}
      </form>
    </Form>
  )
}
