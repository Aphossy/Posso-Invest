"use client"

import { useState } from "react"
import {
  findFoundingMemberContact,
  foundingMemberEmails,
} from "@/constants/founding-members"
import { organisationEmail, organisationPhone } from "@/constants/organisation"
import {
  exportMemberCardPdfClassic,
  exportMemberCardPdfV2,
  previewMemberCardPdfClassic,
  previewMemberCardPdfV2,
} from "@/utils/member-card-export-utils"
import { format } from "date-fns"
import { Download, Eye } from "lucide-react"

import { useProfile } from "@/hooks/use-profile"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"

import { MemberCard3D } from "./member-card-3d"

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrator",
  president: "President",
  treasurer: "Treasurer",
  secretary: "Secretary",
  member: "Member",
}

type MotionProfileName = "light" | "balanced" | "heavy"
type MemberCardPdfFormat = "v2" | "classic"

const MOTION_PROFILE_OPTIONS: Array<{
  key: MotionProfileName
  label: string
  helper: string
}> = [
  { key: "light", label: "Light", helper: "Floaty" },
  { key: "balanced", label: "Balanced", helper: "Default" },
  { key: "heavy", label: "Heavy", helper: "Weighted" },
]

function formatMemberId(id: string) {
  return `TLG-${id.slice(0, 8).toUpperCase()}`
}

function formatJoinDate(date: Date | string | null | undefined) {
  if (!date) return "Jan 2026"
  try {
    return format(new Date(date), "MMM yyyy")
  } catch {
    return "Jan 2026"
  }
}

export function MemberCardPageContent() {
  const { profile, loading } = useProfile()
  const [motionProfile, setMotionProfile] = useState<MotionProfileName>("light")
  const [pdfFormat, setPdfFormat] = useState<MemberCardPdfFormat>("v2")
  const [isDownloadDialogOpen, setIsDownloadDialogOpen] = useState(false)

  if (loading) {
    return (
      <div className="space-y-7">
        <div className="space-y-3">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-4 w-full max-w-2xl" />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 rounded-lg" />
          ))}
        </div>

        <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/40 p-3 sm:p-4">
          <Skeleton
            className="w-full rounded-xl"
            style={{ height: "clamp(36rem, 74vh, 52rem)" }}
          />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>

        <Skeleton className="h-4 w-full max-w-3xl" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Could not load your profile. Please refresh the page.
      </div>
    )
  }

  const name = profile.name ?? "Member"
  const roleKey = (profile.role as string) ?? "member"
  const roleLabel = ROLE_LABELS[roleKey] ?? "Member"
  const memberId = formatMemberId(profile.id)
  const joinDate = formatJoinDate(profile.createdAt)
  const profileEmail = profile.email?.trim().toLowerCase() || ""
  const matchedMemberContact = findFoundingMemberContact({
    email: profile.email,
    name: profile.name,
    phone: profile.phone,
  })
  const contactEmail =
    profileEmail && foundingMemberEmails.has(profileEmail)
      ? profile.email
      : organisationEmail
  const contactPhone =
    matchedMemberContact?.phone || profile.phone || organisationPhone

  function handleDownloadPdf() {
    const payload = {
      name,
      role: roleLabel,
      memberId,
      joinDate,
      contactEmail,
      contactPhone,
    }

    if (pdfFormat === "classic") {
      exportMemberCardPdfClassic(payload)
      return
    }

    exportMemberCardPdfV2(payload)
  }

  function handlePreviewPdf() {
    const payload = {
      name,
      role: roleLabel,
      memberId,
      joinDate,
      contactEmail,
      contactPhone,
    }

    if (pdfFormat === "classic") {
      previewMemberCardPdfClassic(payload)
      return
    }

    previewMemberCardPdfV2(payload)
  }

  return (
    <div className="space-y-7">
      <div className="rounded-2xl border border-border/60 bg-card/70 p-4 shadow-sm backdrop-blur-sm sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2.5">
            <div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-[2.1rem]">
                My Member Card
              </h1>
              <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-[0.95rem]">
                Drag the lanyard card to inspect your digital identity from
                every angle.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 sm:justify-end">
            <Button
              variant="outline"
              size="sm"
              className="hidden h-9 gap-2 rounded-lg border-border/70 bg-background/70 px-3.5 md:inline-flex"
              onClick={handlePreviewPdf}>
              <Eye className="h-4 w-4" />
              Preview PDF
            </Button>
            <Button
              variant="default"
              size="sm"
              className="h-9 gap-2 rounded-lg  px-3.5"
              onClick={() => setIsDownloadDialogOpen(true)}>
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
          </div>
        </div>

        <div className="mt-3.5 hidden md:flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Motion Feel
          </span>
          <div className="inline-flex flex-wrap gap-2 rounded-lg border border-border/60 bg-background/60 p-1">
            {MOTION_PROFILE_OPTIONS.map((option) => {
              const isActive = motionProfile === option.key
              return (
                <Button
                  key={option.key}
                  type="button"
                  size="sm"
                  variant={isActive ? "default" : "ghost"}
                  className="h-8 rounded-md px-3 text-xs"
                  onClick={() => setMotionProfile(option.key)}>
                  {option.label}
                  <span className="ml-1 text-[10px] opacity-75">
                    {option.helper}
                  </span>
                </Button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="relative w-full overflow-hidden rounded-2xl border border-border/60 shadow-xl">
        <div
          className="absolute inset-0 z-0"
          style={{
            background:
              "radial-gradient(ellipse at 50% 22%, #1b3863 0%, #0b1f3a 55%, #050d1a 100%)",
          }}
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-linear-to-b from-white/12 to-transparent" />

        <div className="absolute left-4 top-4 z-20 sm:left-5 sm:top-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-black/35 px-3 py-1 text-xs font-medium text-white/85 backdrop-blur-sm">
            Drag, tilt, and explore your pass
          </div>
        </div>

        <div className="absolute right-4 top-4 z-20 sm:right-5 sm:top-5">
          <Badge
            variant="outline"
            className="border-white/25 bg-black/35 text-white/80 backdrop-blur-sm">
            Live Physics
          </Badge>
        </div>

        <div
          className="relative z-10 w-full"
          style={{ height: "clamp(36rem, 100vh, 52rem)" }}>
          <MemberCard3D
            name={name}
            role={roleLabel}
            memberId={memberId}
            joinDate={joinDate}
            motionProfile={motionProfile}
          />
        </div>
      </div>

      <Dialog
        open={isDownloadDialogOpen}
        onOpenChange={setIsDownloadDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Download Member Card PDF</DialogTitle>
            <DialogDescription>
              Choose the format to export. PDF v2 is selected by default.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <label
              htmlFor="member-card-pdf-format"
              className="text-sm font-medium">
              PDF format
            </label>
            <Select
              value={pdfFormat}
              onValueChange={(value) =>
                setPdfFormat(value as MemberCardPdfFormat)
              }>
              <SelectTrigger id="member-card-pdf-format" className="w-full">
                <SelectValue placeholder="Select PDF format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="v2">PDF v2 (Recommended)</SelectItem>
                <SelectItem value="classic">Classic</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDownloadDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                handleDownloadPdf()
                setIsDownloadDialogOpen(false)
              }}>
              <Download className="h-4 w-4" />
              Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
