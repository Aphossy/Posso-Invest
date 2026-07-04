import { Metadata } from "next"

import { PresidentAttendanceView } from "@/components/dashboard/attendance/president-attendance-view"

export const metadata: Metadata = {
  title: "Attendance Overview | President",
  description: "Quorum tracking and member attendance records.",
}

export default function PresidentAttendancePage() {
  return <PresidentAttendanceView />
}
