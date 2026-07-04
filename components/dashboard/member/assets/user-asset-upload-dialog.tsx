// C:\Users\user\OneDrive\Desktop\posso-website\components\dashboard\assets\user-asset-upload-dialog.tsx
"use client"

import { useState } from "react"
import { determineAssetType } from "@/utils/asset-utils"
import { zodResolver } from "@hookform/resolvers/zod"
import { CheckCircle2, FileText, ImageIcon, X } from "lucide-react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import * as z from "zod"

import { useAssetOperations } from "@/hooks/api/use-client-assets"
import { useMediaQuery } from "@/hooks/use-media-query"
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
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Loader } from "@/components/common/loader"
import { FileUploadComponent } from "@/components/file-upload-component"

const formSchema = z.object({
  name: z.string().trim().optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  tags: z.string().optional(),
  projectId: z.string().optional(),
  visibility: z
    .enum(["private", "committee", "authenticated", "public"])
    .default("private"),
  alt: z.string().optional(),
  caption: z.string().optional(),
})

interface UserAssetUploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

interface UploadedAssetFile {
  id: string
  name: string
  url: string
  size: number
  type: string
  key?: string
  storageProvider?: string
  publicId?: string
  width?: number
  height?: number
  format?: string
  thumbnailUrl?: string
  mediumUrl?: string
}

export function UserAssetUploadDialog({
  open,
  onOpenChange,
  onSuccess,
}: UserAssetUploadDialogProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)")
  const [uploading, setUploading] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedAssetFile[]>([])
  const { createAsset } = useAssetOperations()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      name: "",
      description: "",
      category: "",
      tags: "",
      alt: "",
      caption: "",
    },
  })

  const handleUploadComplete = (files: any[]) => {
    setUploadedFiles(files)
    // Auto-fill name and alt text when metadata is available.
    if (files.length > 0 && !form.getValues("name")) {
      form.setValue("name", files[0].name)
    }
    if (
      files.length > 0 &&
      determineAssetType(files[0].type) === "image" &&
      !form.getValues("alt")
    ) {
      form.setValue("alt", files[0].name)
    }
  }

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      form.reset({
        name: "",
        description: "",
        category: "",
        tags: "",

        visibility: "private",
        alt: "",
        caption: "",
      })
      setUploadedFiles([])
    }
    onOpenChange(nextOpen)
  }

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (uploadedFiles.length === 0) {
      toast.error("Please upload at least one file")
      return
    }

    setUploading(true)

    try {
      const tags = values.tags
        ? values.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : []

      // Create asset record for each uploaded file
      for (const file of uploadedFiles) {
        const assetData: any = {
          name: values.name || file.name,
          description: values.description,
          fileUrl: file.url,
          fileKey: file.key,
          fileType: file.type,
          fileSize: file.size,
          assetType: determineAssetType(file.type),
          storageProvider: file.storageProvider || "r2",
          category: values.category,
          tags,

          visibility: values.visibility,
          alt: values.alt,
          caption: values.caption,
        }

        // Add Cloudinary-specific metadata
        if (file.storageProvider === "cloudinary") {
          assetData.thumbnailUrl = file.thumbnailUrl
          assetData.previewUrl = file.mediumUrl
          if (file.width && file.height) {
            assetData.dimensions = {
              width: file.width,
              height: file.height,
            }
          }
          assetData.metadata = {
            publicId: file.publicId,
            format: file.format,
          }
        }

        await createAsset.mutateAsync(assetData)
      }

      toast.success(
        `${uploadedFiles.length} file${uploadedFiles.length > 1 ? "s" : ""} uploaded successfully`
      )
      form.reset()
      setUploadedFiles([])
      onSuccess?.()
      handleDialogOpenChange(false)
    } catch (error: any) {
      toast.error(error.message || "Failed to upload file")
    } finally {
      setUploading(false)
    }
  }

  const firstFile = uploadedFiles[0]
  const firstFileAssetType = firstFile
    ? determineAssetType(firstFile.type)
    : null
  const isImageFile = firstFileAssetType === "image"
  const previewImageUrl =
    firstFile?.thumbnailUrl || firstFile?.mediumUrl || firstFile?.url
  const canSubmit =
    !uploading &&
    uploadedFiles.length > 0 &&
    (!isImageFile || !!form.watch("alt")?.trim())

  const formatFileSize = (bytes: number) => {
    if (!bytes) return "0 Bytes"
    const units = ["Bytes", "KB", "MB", "GB"]
    const base = 1024
    const power = Math.min(
      Math.floor(Math.log(bytes) / Math.log(base)),
      units.length - 1
    )
    const value = bytes / Math.pow(base, power)
    return `${Number.parseFloat(value.toFixed(2))} ${units[power]}`
  }

  const formBody = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* File Upload */}
        <div className="space-y-2">
          <FileUploadComponent
            onUploadComplete={handleUploadComplete}
            multiple={false}
            acceptedTypes="all"
            showPreview={false}
          />
        </div>

        {firstFile && (
          <div className="rounded-lg border bg-muted/20 p-3">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium">Selected file</p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-muted-foreground"
                onClick={() => setUploadedFiles([])}>
                <X className="mr-1 h-3.5 w-3.5" />
                Remove
              </Button>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-md border bg-background">
                {isImageFile && previewImageUrl ? (
                  <img
                    src={previewImageUrl}
                    alt={firstFile.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                    {firstFileAssetType === "document" ? (
                      <FileText className="h-6 w-6" />
                    ) : (
                      <ImageIcon className="h-6 w-6" />
                    )}
                  </div>
                )}
              </div>
              <div className="min-w-0 space-y-1">
                <p className="truncate text-sm font-medium">{firstFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {firstFile.type || "Unknown type"} •{" "}
                  {formatFileSize(firstFile.size || 0)}
                </p>
                {firstFile.width && firstFile.height && (
                  <p className="text-xs text-muted-foreground">
                    {firstFile.width} x {firstFile.height}px
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Asset Name */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>File Name</FormLabel>
              <FormControl>
                <Input placeholder="My File" {...field} />
              </FormControl>
              <FormDescription>Leave empty to use the filename</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Description */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Describe this file..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Category */}
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="minutes">Meeting Minutes</SelectItem>
                    <SelectItem value="constitution">
                      Constitution & Governance
                    </SelectItem>
                    <SelectItem value="financial">Financial Reports</SelectItem>
                    <SelectItem value="contribution">
                      Contribution Records
                    </SelectItem>
                    <SelectItem value="loan">Loan Documents</SelectItem>
                    <SelectItem value="correspondence">
                      Letters & Correspondence
                    </SelectItem>
                    <SelectItem value="legal">Legal Documents</SelectItem>
                    <SelectItem value="media">Photos & Media</SelectItem>
                    <SelectItem value="other">General</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Visibility */}
          <FormField
            control={form.control}
            name="visibility"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Visibility</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select visibility" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="private">Private (Only Me)</SelectItem>
                    <SelectItem value="committee">Committee Only</SelectItem>
                    <SelectItem value="authenticated">All Members</SelectItem>
                    <SelectItem value="public">Public</SelectItem>
                  </SelectContent>
                </Select>

                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Tags */}
        <FormField
          control={form.control}
          name="tags"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tags</FormLabel>
              <FormControl>
                <Input
                  placeholder="loan, 2025, receipt, contribution (comma-separated)"
                  {...field}
                />
              </FormControl>
              <FormDescription>Separate tags with commas</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Alt Text (for images) */}
        <FormField
          control={form.control}
          name="alt"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Alt Text (for images)</FormLabel>
              <FormControl>
                <Input
                  placeholder="Describe the image for accessibility"
                  {...field}
                />
              </FormControl>
              {isImageFile && (
                <FormDescription>
                  Required for image assets to improve accessibility.
                </FormDescription>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Caption */}
        <FormField
          control={form.control}
          name="caption"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Caption</FormLabel>
              <FormControl>
                <Input placeholder="Add a caption..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleDialogOpenChange(false)}
            disabled={uploading}>
            Cancel
          </Button>
          <Button type="submit" disabled={!canSubmit}>
            {uploading ? (
              <>
                <Loader className="h-4 w-4" />
                Uploading...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Upload File
              </>
            )}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  )

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="max-h-[90vh] w-[95vw] overflow-y-auto p-0 sm:max-w-2xl">
          <div className="p-4 md:p-6">
            <DialogHeader>
              <DialogTitle>Upload File</DialogTitle>
              <DialogDescription>
                Upload files and add metadata
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4">{formBody}</div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Drawer open={open} onOpenChange={handleDialogOpenChange}>
      <DrawerContent className="max-h-[92vh]">
        <DrawerHeader className="text-left">
          <DrawerTitle>Upload File</DrawerTitle>
          <DrawerDescription>Upload files and add metadata</DrawerDescription>
        </DrawerHeader>
        <div className="overflow-y-auto px-4 pb-4">{formBody}</div>
      </DrawerContent>
    </Drawer>
  )
}
