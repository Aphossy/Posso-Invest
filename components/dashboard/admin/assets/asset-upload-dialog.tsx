// C:\Users\user\OneDrive\Desktop\trustlink-group\components\dashboard\assets\asset-upload-dialog.tsx
"use client"

import { useState } from "react"
import { determineAssetType } from "@/utils/asset-utils"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import * as z from "zod"

import { useAssetOperations } from "@/hooks/api/use-assets"
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
  name: z.string().min(1, "Name is required").optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  tags: z.string().optional(),
  projectId: z.string().optional(),
  visibility: z
    .enum(["public", "authenticated", "committee", "admin", "private"])
    .default("committee"),
  alt: z.string().optional(),
  caption: z.string().optional(),
})

interface AssetUploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  defaultProjectId?: string
}

export function AssetUploadDialog({
  open,
  onOpenChange,
  onSuccess,
  defaultProjectId,
}: AssetUploadDialogProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([])
  const { createAsset } = useAssetOperations()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      name: "",
      description: "",
      category: "",
      tags: "",
      projectId: defaultProjectId || undefined,
      visibility: "committee",
      alt: "",
      caption: "",
    },
  })

  const handleUploadComplete = (files: any[]) => {
    setUploadedFiles(files)
    // Auto-fill name if not set
    if (files.length > 0 && !form.getValues("name")) {
      form.setValue("name", files[0].name)
    }
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
          projectId: values.projectId || undefined,
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
        `${uploadedFiles.length} asset${uploadedFiles.length > 1 ? "s" : ""} created successfully`
      )
      form.reset()
      setUploadedFiles([])
      onSuccess?.()
      onOpenChange(false)
    } catch (error: any) {
      toast.error(error.message || "Failed to create asset")
    } finally {
      setUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload File</DialogTitle>
          <DialogDescription>
            Upload a document or file to the Posso Ventures document library
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* File Upload */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Files</label>
              <FileUploadComponent
                onUploadComplete={handleUploadComplete}
                multiple={false}
                acceptedTypes="all"
              />
            </div>

            {/* Asset Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Asset Name</FormLabel>
                  <FormControl>
                    <Input placeholder="My Asset" {...field} />
                  </FormControl>
                  <FormDescription>
                    Leave empty to use the filename
                  </FormDescription>
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
                    <Textarea placeholder="Describe this asset..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
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
                        <SelectItem value="financial">
                          Financial Reports
                        </SelectItem>
                        <SelectItem value="contribution">
                          Contribution Records
                        </SelectItem>
                        <SelectItem value="loan">Loan Documents</SelectItem>
                        <SelectItem value="correspondence">
                          Letters & Correspondence
                        </SelectItem>
                        <SelectItem value="legal">Legal Documents</SelectItem>
                        <SelectItem value="media">Photos & Media</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
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
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="public">Public</SelectItem>
                        <SelectItem value="authenticated">
                          All Members
                        </SelectItem>
                        <SelectItem value="committee">
                          Committee Only
                        </SelectItem>
                        <SelectItem value="admin">Admin Only</SelectItem>
                        <SelectItem value="private">
                          Private (Only Me)
                        </SelectItem>
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
                      placeholder="2025, q1, audit, approved (comma-separated)"
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
                onClick={() => onOpenChange(false)}
                disabled={uploading}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={uploading || uploadedFiles.length === 0}>
                {uploading ? (
                  <>
                    <Loader className="mr-2 h-4 w-4" />
                    Creating...
                  </>
                ) : (
                  "Upload File"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
