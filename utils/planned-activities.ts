export interface PlannedActivityItem {
  id: string
  title: string
  scheduledAt: string
  status: string
  location?: string | null
  agenda?: string | null
  description?: string | null
}

export function filterUpcomingActivities(
  activities: PlannedActivityItem[],
  now: Date = new Date()
) {
  return activities.filter((activity) => {
    if (activity.status === "completed" || activity.status === "cancelled") {
      return false
    }

    return new Date(activity.scheduledAt).getTime() >= now.getTime()
  })
}

export function groupActivitiesByDate(activities: PlannedActivityItem[]) {
  return activities.reduce<Record<string, PlannedActivityItem[]>>(
    (acc, activity) => {
      const dayKey = new Date(activity.scheduledAt).toISOString().slice(0, 10)
      if (!acc[dayKey]) {
        acc[dayKey] = []
      }
      acc[dayKey].push(activity)
      return acc
    },
    {}
  )
}
