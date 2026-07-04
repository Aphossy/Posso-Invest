"use client"

import { useEffect, useState } from "react"
import type { MeetingMinutes } from "@/db/schemas/minutes-schema"
import { generateMinutesPDF } from "@/utils/minutes-export-utils"
import { Calendar, Download, FileText, Users } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  MinutesList,
  type EnrichedMinute,
} from "@/components/dashboard/minutes/minutes-list"

export default function MeetingsMinutesPage() {
  const [minutes, setMinutes] = useState<EnrichedMinute[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchMinutes = async () => {
      try {
        setLoading(true)
        const response = await fetch("/api/minutes?limit=100&status=published")
        if (!response.ok) {
          throw new Error("Failed to fetch minutes")
        }
        const data = await response.json()
        setMinutes(data.data || [])
      } catch (err) {
        console.error("Error fetching minutes:", err)
        // Fallback to sample data
        setMinutes(getInitialMinutes())
      } finally {
        setLoading(false)
      }
    }

    fetchMinutes()
  }, [])

  const handleDownloadPDF = async (minute: EnrichedMinute) => {
    try {
      // For the inaugural meeting, download from public/doc
      if (minute.id === "inaugural-jan-2026") {
        const link = document.createElement("a")
        link.href = "/doc/TrustLink%20Inaugural%20Minutes.pdf"
        link.download = `TrustLink-Minutes-${minute.meetingTitle || "Inaugural"}.pdf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        return
      }

      // For other minutes, generate PDF
      await generateMinutesPDF(
        minute,
        `TrustLink-Minutes-${minute.meetingTitle || new Date(minute.createdAt).toLocaleDateString("en-RW")}`
      )
    } catch (err) {
      console.error("Error downloading PDF:", err)
      alert("Failed to download PDF. Please try again.")
    }
  }

  if (loading) {
    return (
      <div className="flex-1 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Meeting Minutes</h1>
          <p className="text-sm text-muted-foreground">
            Loading minutes archive...
          </p>
        </div>
        <Card>
          <CardContent className="h-40 flex items-center justify-center text-muted-foreground">
            Loading...
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-2xl font-semibold">Meeting Minutes</h1>
          <p className="text-sm text-muted-foreground">
            Official records of TrustLink Group meetings. Download copies for
            your records.
          </p>
        </div>
        {minutes.length > 0 && (
          <Badge variant="outline" className="w-fit">
            {minutes.length} minute{minutes.length !== 1 ? "s" : ""} on record
          </Badge>
        )}
      </div>

      {/* Stats Cards */}
      {minutes.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Minutes
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{minutes.length}</div>
              <p className="text-xs text-muted-foreground">
                Meeting records available
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Published</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {minutes.filter((m) => m.status === "published").length}
              </div>
              <p className="text-xs text-muted-foreground">
                Approved and shared
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Latest</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-sm font-bold">
                {minutes[0]?.meetingTitle || "Pending"}
              </div>
              <p className="text-xs text-muted-foreground">
                Most recent meeting
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Minutes List */}
      <MinutesList minutes={minutes} onDownload={handleDownloadPDF} />
    </div>
  )
}

// Sample/fallback inaugural minute data
function getInitialMinutes(): EnrichedMinute[] {
  return [
    {
      id: "inaugural-jan-2026",
      meetingId: "meeting-inaugural-jan-2026",
      status: "published" as const,
      summary:
        "Official inaugural (constitutive) meeting of TrustLink Group - Ikimina Savings & Investment Group.",
      decisions: {
        items: [
          "Group officially named TRUSTLINK GROUP",
          "Vision, Mission, and Objectives adopted unanimously",
          "Membership criteria and obligations established",
          "Leadership committee elected (President, Secretary, Treasurer)",
          "Financial rules adopted (contributions 80,000-160,000 RWF, 5% loan interest, 4-month audits)",
          "Banking arrangement confirmed with Equity Bank Rwanda",
        ],
      },
      actionItems: {
        items: [
          {
            task: "Finalize Constitution draft for all member signatures",
            owner: "Leadership Committee",
            dueDate: "2026-02-28",
            status: "in-progress",
          },
          {
            task: "Sign legal documents before Notary (all members)",
            owner: "All Members",
            dueDate: "2026-03-15",
            status: "pending",
          },
          {
            task: "Open official Equity Bank Rwanda group account",
            owner: "President & Treasurer",
            dueDate: "2026-03-31",
            status: "pending",
          },
          {
            task: "First monthly contribution (80,000–160,000 RWF)",
            owner: "All Members",
            dueDate: "2026-04-06",
            status: "pending",
          },
        ],
      },
      attendance: {
        presentIds: [
          "hirwa-wiclif",
          "hirwa-yvan",
          "iradukunda-irene",
          "ishimwe-jean-baptiste",
          "maniriho-jean-paul",
          "ngendahimana-fidele",
          "nizayo-alain-victor",
        ],
        absentIds: ["musabyimana-vincent"],
      },
      recordedBy: null,
      approvedBy: null,
      publishedAt: new Date("2026-01-10"),
      createdAt: new Date("2026-01-10"),
      updatedAt: new Date("2026-01-10"),
      meetingTitle: "Inaugural (Constitutive) Meeting",
      meetingDate: "2026-01-10",
    },
  ]
}
