import { Metadata } from "next"
import { headers } from "next/headers"
import type { AttendanceExportable } from "@/utils/attendance-export-utils"
import { CalendarCheck, Users } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AttendanceForm } from "@/components/dashboard/attendance/attendance-form"
import { AttendanceTable } from "@/components/dashboard/attendance/attendance-table"

export const metadata: Metadata = {
  title: "Attendance Overview",
  description: "Monitor attendance records for TrustLink Group meetings.",
}

type ApiListResponse<T> = { data: T[]; total?: number }

async function fetchWithAuth<T>(url: string): Promise<T | null> {
  const headersList = await headers()
  const cookie = headersList.get("cookie")
  const host = headersList.get("host") ?? "localhost:3000"
  const protocol = headersList.get("x-forwarded-proto") ?? "http"
  const absoluteUrl = url.startsWith("http")
    ? url
    : `${protocol}://${host}${url}`
  const res = await fetch(absoluteUrl, {
    cache: "no-store",
    headers: cookie ? { cookie } : undefined,
  })
  if (!res.ok) return null
  return res.json()
}

export default async function AdminAttendancePage() {
  const attendanceRes = await fetchWithAuth<
    ApiListResponse<AttendanceExportable>
  >("/api/attendance?limit=300")
  const records = attendanceRes?.data ?? []
  const presentCount = records.filter(
    (item) => item.status === "present"
  ).length
  const absentCount = records.filter((item) => item.status === "absent").length

  return (
    <div className="flex-1 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Attendance Overview</h1>
        <p className="text-sm text-muted-foreground">
          Track meeting participation and compliance across the group.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Present</CardTitle>
            <Users className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{presentCount}</div>
            <p className="text-xs text-muted-foreground">
              Recorded present marks
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Absent</CardTitle>
            <CalendarCheck className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{absentCount}</div>
            <p className="text-xs text-muted-foreground">Registered absences</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Record Attendance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AttendanceForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Attendance Records
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AttendanceTable initialData={records} />
        </CardContent>
      </Card>
    </div>
  )
}
