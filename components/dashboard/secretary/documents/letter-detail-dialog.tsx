"use client"

import { format } from "date-fns"
import {
  Calendar,
  CalendarClock,
  Download,
  Edit2,
  Eye,
  FileText,
  Hash,
  Info,
  Lock,
  Mail,
  StickyNote,
  User,
} from "lucide-react"

import { cn } from "@/lib/utils"
import type { LetterEnriched } from "@/hooks/api/use-letters"
import { useMediaQuery } from "@/hooks/use-media-query"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"

// ─── Colour maps ────────────────────────────────────────────────────────────

const LETTER_TYPE_LABELS: Record<string, string> = {
  approval_request: "Approval Request",
  official_notice: "Official Notice",
  legal_notice: "Legal Notice",
  meeting_notice: "Meeting Notice",
  member_communication: "Member Communication",
  general_correspondence: "General Correspondence",
}

const LETTER_TYPE_COLORS: Record<string, string> = {
  approval_request:
    "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  official_notice:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  legal_notice: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  meeting_notice:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  member_communication:
    "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  general_correspondence:
    "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
}

const LETTER_STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  sent: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  acknowledged:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  approved:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  archived:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
}

const VISIBILITY_LABELS: Record<string, string> = {
  public: "Public",
  authenticated: "All Members",
  committee: "Committee Only",
  private: "Private",
}

// ─── MetaRow helper ─────────────────────────────────────────────────────────

function MetaRow({
  icon: Icon,
  label,
  value,
  mono = false,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: React.ReactNode
  mono?: boolean
}) {
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={cn("mt-0.5 text-sm font-medium", mono && "font-mono")}>
          {value || "-"}
        </p>
      </div>
    </div>
  )
}

// ─── Props ──────────────────────────────────────────────────────────────────

interface LetterDetailDialogProps {
  letter: LetterEnriched | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit?: (letter: LetterEnriched) => void
  onDownload?: (letter: LetterEnriched) => void | Promise<void>
}

// ─── Component ──────────────────────────────────────────────────────────────

export function LetterDetailDialog({
  letter,
  open,
  onOpenChange,
  onEdit,
  onDownload,
}: LetterDetailDialogProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)")

  if (!letter) return null

  const typeLabel = LETTER_TYPE_LABELS[letter.letterType] ?? "Letter"
  const typeColor = LETTER_TYPE_COLORS[letter.letterType] ?? ""
  const statusColor = LETTER_STATUS_COLORS[letter.status] ?? ""

  const handleDownload = () => {
    if (!letter.fileUrl) return

    if (onDownload) {
      void onDownload(letter)
      return
    }

    window.open(letter.fileUrl, "_blank")
  }

  const content = (
    <div className="space-y-4">
      {/* ── Header card ── */}
      <div className="rounded-lg border bg-muted/30 p-4">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            <Badge className={cn("text-xs", typeColor)}>{typeLabel}</Badge>
            <Badge className={cn("text-xs", statusColor)}>
              {letter.status}
            </Badge>
          </div>
          {letter.refNumber && (
            <span className="font-mono text-xs text-muted-foreground">
              {letter.refNumber}
            </span>
          )}
        </div>

        <h2 className="text-lg font-semibold leading-snug">{letter.subject}</h2>

        {letter.description && (
          <p className="mt-2 text-sm text-muted-foreground">
            {letter.description}
          </p>
        )}
      </div>

      {/* ── Metadata grid ── */}
      <div className="divide-y rounded-lg border">
        <MetaRow icon={User} label="Recipient" value={letter.recipient} />
        <MetaRow icon={User} label="Issued By" value={letter.issuedByName} />
        <MetaRow
          icon={Eye}
          label="Visibility"
          value={
            VISIBILITY_LABELS[letter.visibility ?? "committee"] ??
            letter.visibility
          }
        />
        {letter.issuedAt && (
          <MetaRow
            icon={Calendar}
            label="Issued On"
            value={format(new Date(letter.issuedAt), "PPP")}
          />
        )}
        {letter.dueDate && (
          <MetaRow
            icon={CalendarClock}
            label="Due Date"
            value={format(new Date(letter.dueDate), "PPP")}
          />
        )}
        <MetaRow
          icon={Calendar}
          label="Created"
          value={format(new Date(letter.createdAt), "PPP · p")}
        />
        {letter.updatedAt && letter.updatedAt !== letter.createdAt && (
          <MetaRow
            icon={Calendar}
            label="Last Updated"
            value={format(new Date(letter.updatedAt), "PPP · p")}
          />
        )}
      </div>

      {/* ── Notes ── */}
      {letter.notes && (
        <>
          <Separator />
          <div className="space-y-1.5 rounded-lg border bg-amber-50/50 p-3 dark:bg-amber-900/10">
            <p className="flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400">
              <StickyNote className="h-3.5 w-3.5" />
              Internal Notes
            </p>
            <p className="text-sm text-muted-foreground">{letter.notes}</p>
          </div>
        </>
      )}

      {/* ── Attachment ── */}
      {letter.fileUrl && (
        <>
          <Separator />
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Attached Document</p>
              {letter.fileSize && (
                <p className="text-xs text-muted-foreground">
                  {(letter.fileSize / 1024).toFixed(1)} KB
                  {letter.fileType && ` · ${letter.fileType}`}
                </p>
              )}
            </div>
            <Button size="sm" variant="outline" onClick={handleDownload}>
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Download
            </Button>
          </div>
        </>
      )}

      {/* ── Visibility note ── */}
      {letter.visibility === "private" && (
        <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          <Lock className="h-3.5 w-3.5 shrink-0" />
          This letter is private and only visible to you
        </div>
      )}
    </div>
  )

  const actions = (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      {letter.fileUrl && (
        <Button variant="outline" onClick={handleDownload}>
          <Download className="mr-2 h-4 w-4" />
          Download
        </Button>
      )}
      {onEdit && (
        <Button
          variant="outline"
          onClick={() => {
            onOpenChange(false)
            onEdit(letter)
          }}>
          <Edit2 className="mr-2 h-4 w-4" />
          Edit
        </Button>
      )}
      <Button onClick={() => onOpenChange(false)}>Close</Button>
    </div>
  )

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Letter Details
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[calc(90vh-180px)] pr-1">
            {content}
          </ScrollArea>

          <DialogFooter>{actions}</DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="flex max-h-[92vh] flex-col overflow-hidden p-0">
        <DrawerHeader className="border-b bg-muted/40 px-4 py-4 text-left">
          <DrawerTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Letter Details
          </DrawerTitle>
        </DrawerHeader>

        <ScrollArea className="min-h-0 flex-1 px-4 py-4">
          <div className="pr-4">{content}</div>
        </ScrollArea>

        <DrawerFooter className="border-t bg-background pb-6">
          {actions}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
