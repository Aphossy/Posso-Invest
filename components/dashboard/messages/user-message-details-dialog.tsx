"use client"

import { POSSO_MESSAGE_SERVICE_LABELS } from "@/constants/message-services"
import type { Message } from "@/db/schemas/message-schema"
import { format } from "date-fns"
import { Calendar, Mail, MessageSquare, Phone, Tag } from "lucide-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"

interface UserMessageDetailsDialogProps {
  message: Message | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const getStatusBadgeColor = (status: string) => {
  const colors: Record<string, string> = {
    new: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    read: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
    "in-progress":
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    resolved:
      "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    archived: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
  }
  return colors[status] || colors.new
}

const getPriorityBadgeColor = (priority: string) => {
  const colors: Record<string, string> = {
    low: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
    medium: "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300",
    high: "bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-300",
    urgent: "bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300",
  }
  return colors[priority] || colors.medium
}

const serviceLabels: Record<string, string> = POSSO_MESSAGE_SERVICE_LABELS

export function UserMessageDetailsDialog({
  message,
  open,
  onOpenChange,
}: UserMessageDetailsDialogProps) {
  if (!message) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <DialogTitle className="text-xl">{message.subject}</DialogTitle>
              <DialogDescription className="mt-1">
                Message Code: {message.messageCode}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                className={cn(
                  "capitalize",
                  getStatusBadgeColor(message.status)
                )}>
                {message.status}
              </Badge>
              <Badge
                className={cn(
                  "capitalize",
                  getPriorityBadgeColor(message.priority || "medium")
                )}>
                {message.priority || "medium"}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {/* Contact Information */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Contact Information
              </h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Email:</span>
                  <span>{message.email}</span>
                </div>
                {message.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Phone:</span>
                    <span>{message.phone}</span>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Service & Dates */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Details
              </h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Service:</span>
                  <Badge variant="outline">
                    {serviceLabels[message.service] || message.service}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Submitted:</span>
                  <span>
                    {format(new Date(message.createdAt), "PPP 'at' p")}
                  </span>
                </div>
                {message.updatedAt &&
                  message.updatedAt !== message.createdAt && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        Last Updated:
                      </span>
                      <span>
                        {format(new Date(message.updatedAt), "PPP 'at' p")}
                      </span>
                    </div>
                  )}
              </div>
            </div>

            <Separator />

            {/* Message Content */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Message
              </h3>
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {message.message}
                </p>
              </div>
            </div>

            {/* Status Information */}
            {(message.status === "resolved" ||
              message.status === "archived") && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                    Status Updates
                  </h3>
                  {message.resolvedAt && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Resolved:</span>
                      <span>
                        {format(new Date(message.resolvedAt), "PPP 'at' p")}
                      </span>
                    </div>
                  )}
                  {message.responseCount &&
                    parseInt(message.responseCount) > 0 && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">
                          Responses:
                        </span>
                        <span>{message.responseCount}</span>
                      </div>
                    )}
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
