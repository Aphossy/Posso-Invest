"use client"

import type { MeetingMinutes } from "@/db/schemas/minutes-schema"
import { Calendar, Clock, Download, FileText, Users } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export interface EnrichedMinute extends MeetingMinutes {
  meetingTitle?: string
  meetingDate?: string
}

interface MinutesListProps {
  minutes: EnrichedMinute[]
  onDownload: (minute: EnrichedMinute) => Promise<void>
}

export function MinutesList({ minutes, onDownload }: MinutesListProps) {
  const getStatusBadgeVariant = (
    status: string
  ): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "published":
        return "default"
      case "finalized":
        return "secondary"
      case "draft":
        return "outline"
      default:
        return "default"
    }
  }

  if (minutes.length === 0) {
    return (
      <Card>
        <CardContent className="flex h-40 flex-col items-center justify-center gap-2 text-muted-foreground">
          <FileText className="h-8 w-8 opacity-50" />
          <p className="text-sm">No meeting minutes available yet.</p>
          <p className="text-xs">
            Minutes will be published here after meetings are held.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {minutes.map((minute) => (
        <Card key={minute.id} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <CardTitle className="text-base font-semibold">
                    {minute.meetingTitle || `Meeting Minutes - ${minute.id}`}
                  </CardTitle>
                  <Badge variant={getStatusBadgeVariant(minute.status)}>
                    {minute.status.charAt(0).toUpperCase() +
                      minute.status.slice(1)}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {minute.summary || "Meeting minutes record"}
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Meeting details grid */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {minute.meetingDate && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Date</p>
                    <p className="font-medium">
                      {new Date(minute.meetingDate).toLocaleDateString("en-RW")}
                    </p>
                  </div>
                </div>
              )}

              {minute.attendance?.presentIds && (
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Attendance</p>
                    <p className="font-medium">
                      {minute.attendance.presentIds.length} present
                    </p>
                  </div>
                </div>
              )}

              {minute.updatedAt && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Updated</p>
                    <p className="font-medium">
                      {new Date(minute.updatedAt).toLocaleDateString("en-RW")}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Decisions/Key Resolutions */}
            {minute.decisions?.items && minute.decisions.items.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                  Key Decisions
                </p>
                <ul className="space-y-1 text-sm">
                  {minute.decisions.items.slice(0, 3).map((decision, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-muted-foreground">•</span>
                      <span className="text-muted-foreground">{decision}</span>
                    </li>
                  ))}
                  {minute.decisions.items.length > 3 && (
                    <li className="text-xs text-muted-foreground italic">
                      +{minute.decisions.items.length - 3} more decisions
                    </li>
                  )}
                </ul>
              </div>
            )}

            {/* Action Items */}
            {minute.actionItems?.items &&
              minute.actionItems.items.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                    Action Items
                  </p>
                  <ul className="space-y-1 text-sm">
                    {minute.actionItems.items.slice(0, 2).map((action, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-muted-foreground">→</span>
                        <div className="text-muted-foreground">
                          <p>{action.task}</p>
                          {action.owner && (
                            <p className="text-xs text-muted-foreground/70">
                              Owner: {action.owner}
                            </p>
                          )}
                        </div>
                      </li>
                    ))}
                    {minute.actionItems.items.length > 2 && (
                      <li className="text-xs text-muted-foreground italic">
                        +{minute.actionItems.items.length - 2} more action items
                      </li>
                    )}
                  </ul>
                </div>
              )}

            {/* Download Button */}
            <div className="flex gap-2 pt-2">
              <Button
                size="sm"
                variant="outline"
                className="gap-2"
                onClick={() => onDownload(minute)}>
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
