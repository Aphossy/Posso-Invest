"use client"

import { useState } from "react"
import {
  AlertCircleIcon,
  CheckCircleIcon,
  FileArchiveIcon,
  FileIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  FileUpIcon,
  HeadphonesIcon,
  ImageIcon,
  VideoIcon,
  XIcon,
} from "lucide-react"
import { toast } from "sonner"

import { getStorageProvider, validateFile } from "@/lib/file-config"
import {
  formatBytes,
  useFileUpload,
  type FileWithPreview,
} from "@/hooks/use-file-upload"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"

import { Loader } from "./common/loader"

interface FileUploadComponentProps {
  projectId?: string
  category?: string
  onUploadComplete?: (files: UploadedFile[]) => void
  onUploadError?: (error: string) => void
  onUploadingChange?: (isUploading: boolean) => void
  disabled?: boolean
  multiple?: boolean
  maxFiles?: number
  acceptedTypes?: "all" | "images" | "documents" | "media" | "archives"
  showPreview?: boolean
}

interface UploadedFile {
  id: string
  name: string
  url: string
  signedUrl?: string
  size: number
  type: string
  key?: string
  dbId?: string
  storageProvider?: string
  publicId?: string
  width?: number
  height?: number
  format?: string
  thumbnailUrl?: string
  mediumUrl?: string
}

const getFileIcon = (file: FileWithPreview) => {
  const fileType = file.file instanceof File ? file.file.type : file.file.type
  const fileName = file.file instanceof File ? file.file.name : file.file.name

  if (fileType.startsWith("image/")) {
    return <ImageIcon className="size-4 opacity-60" />
  } else if (
    fileType.includes("pdf") ||
    fileType.includes("word") ||
    fileName.endsWith(".doc") ||
    fileName.endsWith(".docx")
  ) {
    return <FileTextIcon className="size-4 opacity-60" />
  } else if (
    fileType.includes("zip") ||
    fileType.includes("archive") ||
    fileName.endsWith(".zip") ||
    fileName.endsWith(".rar")
  ) {
    return <FileArchiveIcon className="size-4 opacity-60" />
  } else if (
    fileType.includes("excel") ||
    fileType.includes("spreadsheet") ||
    fileName.endsWith(".xls") ||
    fileName.endsWith(".xlsx") ||
    fileName.endsWith(".csv")
  ) {
    return <FileSpreadsheetIcon className="size-4 opacity-60" />
  } else if (fileType.startsWith("video/")) {
    return <VideoIcon className="size-4 opacity-60" />
  } else if (fileType.startsWith("audio/")) {
    return <HeadphonesIcon className="size-4 opacity-60" />
  }
  return <FileIcon className="size-4 opacity-60" />
}

const getAcceptString = (acceptedTypes: string) => {
  switch (acceptedTypes) {
    case "images":
      return "image/jpeg,image/jpg,image/png,image/webp,image/gif,image/svg+xml"
    case "documents":
      return "application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain,text/csv"
    case "media":
      return "video/mp4,video/mpeg,video/quicktime,audio/mpeg,audio/mp3,audio/wav"
    case "archives":
      return "application/zip,application/x-zip-compressed,application/x-rar-compressed,application/x-tar,application/gzip"
    default:
      return "*"
  }
}

export function FileUploadComponent({
  projectId,
  category = "other",
  onUploadComplete,
  onUploadError,
  onUploadingChange,
  disabled = false,
  multiple = true,
  maxFiles = 10,
  acceptedTypes = "all",
  showPreview = true,
}: FileUploadComponentProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>(
    {}
  )
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])

  const maxSize = 100 * 1024 * 1024 // 100MB default

  const [
    { files, isDragging, errors: uploadErrors },
    {
      handleDragEnter,
      handleDragLeave,
      handleDragOver,
      handleDrop,
      openFileDialog,
      removeFile,
      clearFiles,
      getInputProps,
    },
  ] = useFileUpload({
    accept: getAcceptString(acceptedTypes),
    maxSize,
    multiple,
    maxFiles,
    onFilesAdded: async (newFiles) => {
      if (!disabled) {
        await uploadFiles(newFiles)
      }
    },
  })

  const uploadFiles = async (filesToUpload: FileWithPreview[]) => {
    setUploading(true)
    onUploadingChange?.(true)
    const results: UploadedFile[] = []
    const errors: string[] = []

    for (const fileWithPreview of filesToUpload) {
      const file = fileWithPreview.file as File
      const fileId = fileWithPreview.id

      try {
        // Validate file
        const validation = validateFile({
          name: file.name,
          size: file.size,
          type: file.type,
        })

        if (!validation.valid) {
          errors.push(`${file.name}: ${validation.error}`)
          removeFile(fileId)
          continue
        }

        // Determine storage provider
        const storageProvider = getStorageProvider(file.type)

        setUploadProgress((prev) => ({ ...prev, [fileId]: 0 }))

        // Upload based on storage provider
        if (storageProvider === "cloudinary") {
          // Upload to Cloudinary (for images)
          const formData = new FormData()
          formData.append("file", file)

          const response = await fetch("/api/upload/cloudinary", {
            method: "POST",
            body: formData,
          })

          if (!response.ok) {
            throw new Error(`Upload failed: ${response.statusText}`)
          }

          const result = await response.json()

          if (result.success && result.data) {
            results.push({
              id: fileId,
              name: result.data.originalName || file.name,
              url: result.data.url || result.data.secure_url,
              size: result.data.size || file.size,
              type: file.type,
              storageProvider: "cloudinary",
              publicId: result.data.publicId,
              width: result.data.width,
              height: result.data.height,
              format: result.data.format,
              thumbnailUrl: result.data.thumbnailUrl,
              mediumUrl: result.data.mediumUrl,
            })
          } else {
            throw new Error(result.error?.message || "Upload failed")
          }
        } else {
          // Upload to R2 (for documents and other files)
          const formData = new FormData()
          formData.append("file", file)
          if (projectId) formData.append("projectId", projectId)
          formData.append("category", category)

          const response = await fetch("/api/upload/r2", {
            method: "POST",
            body: formData,
          })

          if (!response.ok) {
            throw new Error(`Upload failed: ${response.statusText}`)
          }

          const result = await response.json()

          if (result.success && result.data) {
            results.push({
              id: fileId,
              name: result.data.originalName || file.name,
              url: result.data.url,
              signedUrl: result.data.signedUrl,
              size: result.data.size || file.size,
              type: result.data.contentType || file.type,
              key: result.data.key,
              dbId: result.data.dbId,
              storageProvider: "r2",
            })
          } else {
            throw new Error(result.error?.message || "Upload failed")
          }
        }

        setUploadProgress((prev) => ({ ...prev, [fileId]: 100 }))
        toast.success(`${file.name} uploaded successfully`)
      } catch (error: any) {
        console.error("Upload error:", error)
        errors.push(`${file.name}: ${error.message}`)
        toast.error(`Failed to upload ${file.name}`)
        removeFile(fileId)
      }
    }

    setUploading(false)
    onUploadingChange?.(false)
    setUploadProgress({})

    if (results.length > 0) {
      setUploadedFiles((prev) => [...prev, ...results])
      onUploadComplete?.(results)
    }

    if (errors.length > 0) {
      onUploadError?.(errors.join("; "))
    }

    // Clear the file input after upload
    clearFiles()
  }

  const handleRemoveUploaded = (fileId: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== fileId))
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Upload Area */}
      <div className="flex flex-col gap-2">
        {/* <Label>Upload Files</Label> */}
        <div
          role="button"
          onClick={disabled || uploading ? undefined : openFileDialog}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          data-dragging={isDragging || undefined}
          className="flex min-h-40 flex-col items-center justify-center rounded-xl border border-dashed border-input p-4 transition-colors hover:bg-accent/50 has-disabled:pointer-events-none has-disabled:opacity-50 has-[input:focus]:border-ring has-[input:focus]:ring-[3px] has-[input:focus]:ring-ring/50 data-[dragging=true]:bg-accent/50">
          <input
            {...getInputProps()}
            className="sr-only"
            aria-label="Upload files"
            disabled={disabled || uploading}
          />

          <div className="flex flex-col items-center justify-center text-center">
            <div
              className="mb-2 flex size-11 shrink-0 items-center justify-center rounded-full border bg-background"
              aria-hidden="true">
              {uploading ? (
                <Loader className="size-4 opacity-60" />
              ) : (
                <FileUpIcon className="size-4 opacity-60" />
              )}
            </div>
            <p className="mb-1.5 text-sm font-medium">
              {uploading ? "Uploading..." : "Upload files"}
            </p>
            <p className="mb-2 text-xs text-muted-foreground">
              Drag & drop or click to browse
            </p>
            <div className="flex flex-wrap justify-center gap-1 text-xs text-muted-foreground/70">
              <span>
                {acceptedTypes === "all"
                  ? "All files"
                  : acceptedTypes.charAt(0).toUpperCase() +
                    acceptedTypes.slice(1)}
              </span>
              {multiple && (
                <>
                  <span>∙</span>
                  <span>Max {maxFiles} files</span>
                </>
              )}
              <span>∙</span>
              <span>Up to {formatBytes(maxSize)}</span>
            </div>
          </div>
        </div>

        {uploadErrors.length > 0 && (
          <div
            className="flex items-center gap-1 text-xs text-destructive"
            role="alert">
            <AlertCircleIcon className="size-3 shrink-0" />
            <span>{uploadErrors[0]}</span>
          </div>
        )}
      </div>

      {/* Files being uploaded */}
      {files.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">
            Uploading files...
          </Label>
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between gap-2 rounded-lg border bg-background p-2 pe-3">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="flex aspect-square size-10 shrink-0 items-center justify-center rounded border">
                  {getFileIcon(file)}
                </div>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <p className="truncate text-[13px] font-medium">
                    {file.file instanceof File
                      ? file.file.name
                      : file.file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(
                      file.file instanceof File
                        ? file.file.size
                        : file.file.size
                    )}
                  </p>
                  {uploadProgress[file.id] !== undefined && (
                    <Progress
                      value={uploadProgress[file.id]}
                      className="h-1 w-full"
                    />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Uploaded Files */}
      {uploadedFiles.length > 0 && showPreview && (
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">
            Uploaded Files ({uploadedFiles.length})
          </Label>
          {uploadedFiles.map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-green-200 bg-green-50/50 p-2 pe-3 dark:border-green-900 dark:bg-green-950/20">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="flex aspect-square size-10 shrink-0 items-center justify-center rounded border bg-background">
                  <CheckCircleIcon className="size-4 text-green-600 dark:text-green-500" />
                </div>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <p className="truncate text-[13px] font-medium">
                    {file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(file.size)} • Uploaded
                  </p>
                </div>
              </div>

              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="-me-2 size-8 text-muted-foreground/80 hover:bg-transparent hover:text-foreground"
                onClick={() => handleRemoveUploaded(file.id)}
                aria-label="Remove file">
                <XIcon className="size-4" aria-hidden="true" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
