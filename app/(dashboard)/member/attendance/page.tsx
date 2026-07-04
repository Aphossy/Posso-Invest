import { Metadata } from "next"

import { MemberAttendanceView } from "@/components/dashboard/attendance/member-attendance-view"

export const metadata: Metadata = {
  title: "My Attendance",
  description: "Review your attendance history across all Ikimina meetings.",
}

export default function UserAttendancePage() {
  return <MemberAttendanceView />
}
