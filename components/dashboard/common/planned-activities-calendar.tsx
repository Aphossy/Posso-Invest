"use client"

import { useEffect, useMemo, useState, type ComponentProps } from "react"
import { format } from "date-fns"
import { CalendarDays, Pencil, RefreshCcw, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { useMediaQuery } from "@/hooks/use-media-query"
import {
  useCancelMeetingMutation,
  useMeetings,
  type MeetingRecord,
} from "@/hooks/api/use-meetings"
import {
  filterUpcomingActivities,
  groupActivitiesByDate,
} from "@/utils/planned-activities"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, CalendarDayButton } from "@/components/ui/calendar"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { RecordMeetingForm } from "@/components/dashboard/meetings/record-meeting-form"
import { RecordMeetingTrigger } from "@/components/dashboard/meetings/record-meeting-trigger"

interface PlannedActivitiesCalendarProps {
  canManage?: boolean
  title?: string
  description?: string
}

function formatActivityTime(value: string) {
  return new Date(value).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  })
}

function CalendarDayButtonWithTooltip({
  day,
  modifiers,
  className,
  dayActivities,
  ...props
}: ComponentProps<typeof CalendarDayButton> & {
  dayActivities?: Array<{
    id: string
    title: string
    scheduledAt: string
    location: string | null
  }>
}) {
  const activities = dayActivities ?? []

  if (activities.length === 0) {
    return <CalendarDayButton day={day} modifiers={modifiers} className={className} {...props} />
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <CalendarDayButton day={day} modifiers={modifiers} className={className} {...props} />
      </TooltipTrigger>
      <TooltipContent
        side="top"
        sideOffset={8}
        className="max-w-56 border border-border bg-white p-3 text-sm shadow-lg dark:bg-background"
      >
        <div className="space-y-2 text-xs">
          <p className="font-semibold text-primary">{format(day.date, "MMM d")}</p>
          {activities.slice(0, 3).map((activity) => (
            <div key={activity.id} className="space-y-0.5">
              <p className="font-medium text-foreground">{activity.title}</p>
              <p className="text-muted-foreground">
                {formatActivityTime(activity.scheduledAt)}
                {activity.location ? ` • ${activity.location}` : ""}
              </p>
            </div>
          ))}
          {activities.length > 3 && (
            <p className="text-muted-foreground">+{activities.length - 3} more</p>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  )
}

export function PlannedActivitiesCalendar({
  canManage = false,
  title = "Planned activities",
  description = "Upcoming activities scheduled by the secretary for the whole team to see.",
}: PlannedActivitiesCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [editingActivity, setEditingActivity] = useState<MeetingRecord | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isEditingSubmitting, setIsEditingSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("")
  const [deleteTarget, setDeleteTarget] = useState<MeetingRecord | null>(null)
  const isDesktop = useMediaQuery("(min-width: 768px)")
  const cancelMeeting = useCancelMeetingMutation()
  const { data, isPending, error, refetch } = useMeetings({
    status: "scheduled",
    limit: 200,
  })

  const meetings = (data?.data ?? []) as MeetingRecord[]

  const activities = useMemo(() => {
    return filterUpcomingActivities(
      meetings.map((meeting) => ({
        id: meeting.id,
        title: meeting.title,
        scheduledAt: meeting.scheduledAt,
        status: meeting.status,
        location: meeting.location ?? null,
        agenda: meeting.agenda ?? null,
      }))
    )
  }, [meetings])

  const groupedByDate = useMemo(() => groupActivitiesByDate(activities), [activities])
  const activitiesByDateKey = useMemo(() => {
    const entries = Object.entries(groupedByDate)
    return entries.reduce<Record<string, Array<{ id: string; title: string; scheduledAt: string; location: string | null }>>>(
      (acc, [dayKey, dayActivities]) => {
        acc[dayKey] = dayActivities.map((activity) => ({
          id: activity.id,
          title: activity.title,
          scheduledAt: activity.scheduledAt,
          location: activity.location ?? null,
        }))
        return acc
      },
      {}
    )
  }, [groupedByDate])

  useEffect(() => {
    if (activities.length === 0) return

    const firstActivityDate = new Date(activities[0].scheduledAt)
    const selectedDayKey = selectedDate ? format(selectedDate, "yyyy-MM-dd") : null
    const firstDayKey = format(firstActivityDate, "yyyy-MM-dd")

    if (!selectedDate || !groupedByDate[selectedDayKey ?? firstDayKey]) {
      setSelectedDate(firstActivityDate)
    }
  }, [activities, groupedByDate, selectedDate])

  const selectedDayKey = selectedDate ? format(selectedDate, "yyyy-MM-dd") : null
  const selectedActivities = selectedDayKey ? groupedByDate[selectedDayKey] ?? [] : []

  const calendarDatesWithActivities = useMemo(() => {
    return Object.keys(activitiesByDateKey).map((dayKey) => new Date(`${dayKey}T00:00:00`))
  }, [activitiesByDateKey])

  const handleDelete = async (activityId: string) => {
    setDeletingId(activityId)
    try {
      await cancelMeeting.mutateAsync({ id: activityId })
      toast.success("Planned activity removed")
      setDeleteConfirmationText("")
      setDeleteTarget(null)
      await refetch()
    } catch (error) {
      console.error(error)
      toast.error("Unable to remove this planned activity")
    } finally {
      setDeletingId(null)
    }
  }

  const handleEditOpen = (activity: MeetingRecord) => {
    setEditingActivity(activity)
    setIsEditDialogOpen(true)
  }

  const handleEditClose = () => {
    setIsEditDialogOpen(false)
    setEditingActivity(null)
    setIsEditingSubmitting(false)
  }

  const handleEditSuccess = async () => {
    handleEditClose()
    await refetch()
  }

  const editContent = editingActivity ? (
    <div className="space-y-4">
      <RecordMeetingForm
        formId="edit-planned-activity-form"
        hideActions
        meeting={editingActivity}
        mode="edit"
        onSuccess={handleEditSuccess}
        onSubmittingChange={setIsEditingSubmitting}
      />
    </div>
  ) : null

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="h-4 w-4 text-cyan-500" />
            {title}
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canManage && (
            <RecordMeetingTrigger
              onSuccess={() => void refetch()}
              buttonLabel="Add planned activity"
              dialogTitle="Add planned activity"
              dialogDescription="Schedule a future activity so leadership and members can see it on the calendar."
              submitLabel="Save activity"
            />
          )}
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isPending ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : error ? (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
            Unable to load planned activities right now.
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)]">
            <div className="rounded-xl border bg-background/70 p-2">
              <TooltipProvider delayDuration={100}>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => setSelectedDate(date ?? new Date())}
                  fromDate={new Date()}
                  className="mx-auto"
                  modifiers={{ hasActivity: calendarDatesWithActivities }}
                  modifiersClassNames={{
                    hasActivity: "bg-primary text-primary-foreground rounded-full hover:bg-primary/90",
                  }}
                  components={{
                    DayButton: (dayButtonProps) => (
                      <CalendarDayButtonWithTooltip
                        {...dayButtonProps}
                        dayActivities={dayButtonProps.day ? activitiesByDateKey[format(dayButtonProps.day.date, "yyyy-MM-dd")] : []}
                      />
                    ),
                  }}
                />
              </TooltipProvider>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  {selectedDate ? format(selectedDate, "EEE, MMM d") : "Upcoming"}
                </p>
                <Badge variant="outline">
                  {selectedActivities.length} {selectedActivities.length === 1 ? "item" : "items"}
                </Badge>
              </div>

              {selectedActivities.length === 0 ? (
                <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  No planned activities for this date yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedActivities.map((activity) => (
                    <div key={activity.id} className="rounded-lg border bg-background p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold">{activity.title}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {formatActivityTime(activity.scheduledAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          {canManage && (
                            <>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditOpen(meetings.find((meeting) => meeting.id === activity.id) ?? ({ id: activity.id, title: activity.title, scheduledAt: activity.scheduledAt, location: activity.location ?? null, agenda: activity.agenda ?? null, status: "scheduled" } as MeetingRecord))}
                                disabled={deletingId === activity.id}
                                aria-label="Edit planned activity"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <AlertDialog
                                open={deleteTarget?.id === activity.id}
                                onOpenChange={(open) => {
                                  if (!open) {
                                    setDeleteTarget(null)
                                    setDeleteConfirmationText("")
                                  }
                                }}
                              >
                                <AlertDialogTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      const existingMeeting = meetings.find((meeting) => meeting.id === activity.id)
                                      if (existingMeeting) {
                                        setDeleteTarget(existingMeeting)
                                      } else {
                                        setDeleteTarget({
                                          id: activity.id,
                                          title: activity.title,
                                          scheduledAt: activity.scheduledAt,
                                          location: activity.location ?? null,
                                          agenda: activity.agenda ?? null,
                                          status: "scheduled",
                                        } as MeetingRecord)
                                      }
                                    }}
                                    disabled={deletingId === activity.id}
                                    aria-label="Delete planned activity"
                                  >
                                    {deletingId === activity.id ? (
                                      <span className="text-xs">…</span>
                                    ) : (
                                      <Trash2 className="h-4 w-4" />
                                    )}
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete planned activity?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will remove {deleteTarget?.title ?? activity.title} from the calendar. Type the exact title below to confirm.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <div className="space-y-2">
                                    <label htmlFor={`delete-planned-activity-${activity.id}`} className="text-sm font-medium">
                                      Confirmation text
                                    </label>
                                    <input
                                      id={`delete-planned-activity-${activity.id}`}
                                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                      value={deleteConfirmationText}
                                      onChange={(event) => setDeleteConfirmationText(event.target.value)}
                                      placeholder={deleteTarget?.title ?? activity.title}
                                    />
                                  </div>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel disabled={deletingId === activity.id}>Cancel</AlertDialogCancel>
                                    <AlertDialogAction asChild>
                                      <Button
                                        variant="destructive"
                                        onClick={() => {
                                          if (deleteConfirmationText.trim() !== (deleteTarget?.title ?? activity.title).trim()) return
                                          void handleDelete(activity.id)
                                        }}
                                        disabled={deletingId === activity.id || deleteConfirmationText.trim() !== (deleteTarget?.title ?? activity.title).trim()}
                                      >
                                        {deletingId === activity.id ? "Deleting..." : "Delete activity"}
                                      </Button>
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </>
                          )}
                          <Badge variant="secondary">Scheduled</Badge>
                        </div>
                      </div>
                      {activity.location && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Location: {activity.location}
                        </p>
                      )}
                      {activity.agenda && (
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                          {activity.agenda}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
                <p className="font-medium text-foreground">How it works</p>
                <p className="mt-1">
                  Click a highlighted date for quick details, and use the edit or delete buttons to manage scheduled activities.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>

      {isDesktop ? (
        <Dialog open={isEditDialogOpen} onOpenChange={(open) => (open ? setIsEditDialogOpen(true) : handleEditClose())}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Edit planned activity</DialogTitle>
              <DialogDescription>Adjust the title, time, location, or agenda for this activity.</DialogDescription>
            </DialogHeader>
            {editContent}
            <DialogFooter>
              <Button variant="outline" onClick={handleEditClose} disabled={isEditingSubmitting}>
                Cancel
              </Button>
              <Button type="submit" form="edit-planned-activity-form" disabled={isEditingSubmitting}>
                {isEditingSubmitting ? "Saving..." : "Save changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : (
        <Drawer open={isEditDialogOpen} onOpenChange={(open) => (open ? setIsEditDialogOpen(true) : handleEditClose())}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Edit planned activity</DrawerTitle>
              <DrawerDescription>Adjust the title, time, location, or agenda for this activity.</DrawerDescription>
            </DrawerHeader>
            <div className="px-4 pb-4">{editContent}</div>
            <DrawerFooter>
              <Button type="submit" form="edit-planned-activity-form" disabled={isEditingSubmitting}>
                {isEditingSubmitting ? "Saving..." : "Save changes"}
              </Button>
              <Button variant="outline" onClick={handleEditClose} disabled={isEditingSubmitting}>
                Cancel
              </Button>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      )}
    </Card>
  )
}
