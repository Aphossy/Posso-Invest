"use client"

import { useState } from "react"
import Image from "next/image"
import { ImageIcon, Trash2, Upload } from "lucide-react"
import { toast } from "sonner"

import { useFileUpload } from "@/hooks/use-file-upload"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

interface OrganizationLogoUploadProps {
  value?: string
  organizationName: string
  onChange: (url: string) => void
  disabled?: boolean
  label?: string
  helperText?: string
}

interface UploadResponse {
  success: boolean
  data?: {
    url?: string
    secure_url?: string
  }
  error?: {
    message?: string
  }
  message?: string
}

const maxLogoSizeMB = 5
const maxLogoSize = maxLogoSizeMB * 1024 * 1024

export function OrganizationLogoUpload({
  value,
  organizationName,
  onChange,
  disabled = false,
  label = "Organization logo",
  helperText = "Upload a square image so the brand mark stays crisp across cards and headers.",
}: OrganizationLogoUploadProps) {
  const [uploading, setUploading] = useState(false)

  const [uploadState, uploadActions] = useFileUpload({
    accept: "image/svg+xml,image/png,image/jpeg,image/jpg,image/webp",
    maxSize: maxLogoSize,
    multiple: false,
    maxFiles: 1,
    onFilesAdded: async (newFiles) => {
      if (newFiles.length > 0 && !disabled) {
        await uploadLogo(newFiles[0].file as File, newFiles[0].id)
      }
    },
  })

  const { files, isDragging, errors: uploadErrors } = uploadState
  const {
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    openFileDialog,
    removeFile,
    getInputProps,
  } = uploadActions

  const uploadLogo = async (file: File, fileId: string) => {
    setUploading(true)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/upload/cloudinary", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(
          errorData.error?.message ||
            errorData.message ||
            `Upload failed with status ${response.status}`
        )
      }

      const result: UploadResponse = await response.json()
      const logoUrl = result.data?.url || result.data?.secure_url

      if (result.success && logoUrl) {
        onChange(logoUrl)
        toast.success(`${file.name} uploaded successfully`)
        removeFile(fileId)
        return
      }

      throw new Error(
        result.error?.message || result.message || "Failed to upload logo"
      )
    } catch (error: any) {
      console.error("Logo upload error:", error)
      toast.error(`Failed to upload ${file.name}: ${error.message}`)
      removeFile(fileId)
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = () => {
    if (disabled) return

    onChange("")
    if (files[0]) {
      removeFile(files[0].id)
    }
    toast.success("Logo cleared")
  }

  const previewUrl = value || files[0]?.preview || null
  const initials = organizationName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("")

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="overflow-hidden rounded-3xl border border-dashed border-border/70 bg-linear-to-br from-background via-background to-muted/50 p-4 shadow-sm transition-colors data-[dragging=true]:border-primary/60 data-[dragging=true]:bg-primary/5">
        <div
          role="button"
          tabIndex={disabled || uploading ? -1 : 0}
          onClick={disabled || uploading ? undefined : openFileDialog}
          onKeyDown={(event) => {
            if (disabled || uploading) return
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault()
              openFileDialog()
            }
          }}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          data-dragging={isDragging || undefined}
          className="grid gap-4 lg:grid-cols-[minmax(0,240px)_minmax(0,1fr)]">
          <input
            {...getInputProps()}
            className="sr-only"
            aria-label="Upload organization logo"
            disabled={disabled || uploading}
          />

          <div className="relative flex min-h-56 items-center justify-center overflow-hidden rounded-2xl border bg-background/90 p-4 transition-all duration-200 hover:border-primary/30">
            {previewUrl ? (
              <>
                <Image
                  src={previewUrl}
                  alt={`${organizationName} logo preview`}
                  fill
                  unoptimized
                  sizes="240px"
                  className="object-contain p-4"
                />
                <div className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-2 rounded-xl border bg-background/90 px-3 py-2 text-xs backdrop-blur">
                  <span className="truncate font-medium">
                    {uploading ? "Uploading logo..." : "Logo ready"}
                  </span>
                  <span className="text-muted-foreground">PNG, SVG, WebP</span>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-3 px-4 py-6 text-center">
                <div className="flex size-16 items-center justify-center rounded-2xl border bg-muted/40 text-muted-foreground shadow-inner">
                  <ImageIcon className="size-7" />
                </div>
                <div>
                  <p className="text-sm font-semibold">
                    {uploading ? "Uploading..." : "Drop or browse a logo"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Best with a transparent or solid-background square image.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  className="rounded-full"
                  disabled={disabled || uploading}>
                  <Upload className="mr-2 size-4" />
                  {uploading ? "Uploading" : "Choose file"}
                </Button>
              </div>
            )}

            {previewUrl && !uploading ? (
              <div className="absolute right-3 top-3 flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="rounded-full shadow-sm"
                  onClick={(event) => {
                    event.stopPropagation()
                    openFileDialog()
                  }}
                  disabled={disabled}>
                  <Upload className="mr-1.5 size-3.5" />
                  Replace
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="rounded-full shadow-sm"
                  onClick={(event) => {
                    event.stopPropagation()
                    handleRemove()
                  }}
                  disabled={disabled}>
                  <Trash2 className="mr-1.5 size-3.5" />
                  Clear
                </Button>
              </div>
            ) : null}
          </div>

          <div className="space-y-4 rounded-2xl border bg-muted/30 p-4">
            <div>
              <p className="text-sm font-semibold">Brand guidance</p>
              <p className="mt-1 text-sm text-muted-foreground">{helperText}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <div className="rounded-xl border bg-background/90 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Recommended
                </p>
                <p className="mt-1 text-sm font-medium">1:1 aspect ratio</p>
                <p className="text-xs text-muted-foreground">
                  Center the mark and keep generous padding around it.
                </p>
              </div>
              <div className="rounded-xl border bg-background/90 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Limits
                </p>
                <p className="mt-1 text-sm font-medium">
                  Up to {maxLogoSizeMB}MB
                </p>
                <p className="text-xs text-muted-foreground">
                  PNG, JPG, SVG, or WebP.
                </p>
              </div>
            </div>

            <div className="rounded-xl border bg-background/90 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Preview label
              </p>
              <p className="mt-1 truncate text-sm font-medium">
                {organizationName || initials || "Organization"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {previewUrl
                  ? "This logo will be stored and used across organization surfaces."
                  : "Upload a file to generate the live preview and save a logo URL."}
              </p>
            </div>

            {previewUrl ? (
              <div className="rounded-xl border bg-background/90 p-3 text-xs text-muted-foreground">
                <span className="block font-medium text-foreground">
                  Stored URL
                </span>
                <span className="mt-1 block break-all">{value}</span>
              </div>
            ) : null}
          </div>
        </div>

        {uploadErrors.length > 0 ? (
          <div
            className="mt-3 flex items-center gap-1 text-xs text-destructive"
            role="alert">
            <span>{uploadErrors[0]}</span>
          </div>
        ) : null}
      </div>
    </div>
  )
}
