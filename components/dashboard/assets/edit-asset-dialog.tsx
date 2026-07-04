"use client"

import { useEffect, useMemo, useState } from "react"
import type { Asset } from "@/db/schemas/asset-schema"
import { Check, Pencil } from "lucide-react"
import { toast } from "sonner"

import { useAssetOperations } from "@/hooks/api/use-assets"
import { useMediaQuery } from "@/hooks/use-media-query"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Loader } from "@/components/common/loader"

interface EditAssetDialogProps {
  asset: Asset | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function EditAssetDialog({
  asset,
  open,
  onOpenChange,
  onSuccess,
}: EditAssetDialogProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)")
  const { updateAsset } = useAssetOperations()
  const [isSaving, setIsSaving] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("")
  const [tags, setTags] = useState("")
  const [visibility, setVisibility] = useState<
    "public" | "authenticated" | "committee" | "admin" | "private"
  >("committee")
  const [alt, setAlt] = useState("")
  const [caption, setCaption] = useState("")

  useEffect(() => {
    if (!open || !asset) return

    setName(asset.name || "")
    setDescription(asset.description || "")
    setCategory(asset.category || "")
    setTags(asset.tags?.join(", ") || "")
    setVisibility(asset.visibility || "committee")
    setAlt(asset.alt || "")
    setCaption(asset.caption || "")
  }, [open, asset])

  const canSubmit = useMemo(() => name.trim().length > 0, [name])

  const handleSubmit = async () => {
    if (!asset || !canSubmit || isSaving) return

    setIsSaving(true)
    try {
      await updateAsset(asset.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        category: category || undefined,
        tags: tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        visibility,
        alt: alt.trim() || undefined,
        caption: caption.trim() || undefined,
      })

      toast.success("File updated")
      onSuccess?.()
      onOpenChange(false)
    } catch (error: any) {
      toast.error(error?.message || "Failed to update file")
    } finally {
      setIsSaving(false)
    }
  }

  if (!asset) return null

  const formBody = (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="asset-name">File Name</Label>
        <Input
          id="asset-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="File name"
          maxLength={180}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="asset-description">Description</Label>
        <Textarea
          id="asset-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Describe this file"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="asset-category">Category</Label>
          <Select
            value={category || "none"}
            onValueChange={(value) =>
              setCategory(value === "none" ? "" : value)
            }>
            <SelectTrigger id="asset-category">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Category</SelectItem>
              <SelectItem value="minutes">Meeting Minutes</SelectItem>
              <SelectItem value="constitution">
                Constitution & Governance
              </SelectItem>
              <SelectItem value="financial">Financial Reports</SelectItem>
              <SelectItem value="contribution">Contribution Records</SelectItem>
              <SelectItem value="loan">Loan Documents</SelectItem>
              <SelectItem value="correspondence">
                Letters & Correspondence
              </SelectItem>
              <SelectItem value="legal">Legal Documents</SelectItem>
              <SelectItem value="media">Photos & Media</SelectItem>
              <SelectItem value="other">General</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="asset-visibility">Visibility</Label>
          <Select
            value={visibility}
            onValueChange={(value) =>
              setVisibility(
                value as
                  | "public"
                  | "authenticated"
                  | "committee"
                  | "admin"
                  | "private"
              )
            }>
            <SelectTrigger id="asset-visibility">
              <SelectValue placeholder="Select visibility" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="public">Public</SelectItem>
              <SelectItem value="authenticated">All Members</SelectItem>
              <SelectItem value="committee">Committee Only</SelectItem>
              <SelectItem value="admin">Admin Only</SelectItem>
              <SelectItem value="private">Private (Only Me)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="asset-tags">Tags</Label>
        <Input
          id="asset-tags"
          value={tags}
          onChange={(event) => setTags(event.target.value)}
          placeholder="2025, q2, approved, minutes (comma-separated)"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="asset-alt">Alt Text</Label>
        <Input
          id="asset-alt"
          value={alt}
          onChange={(event) => setAlt(event.target.value)}
          placeholder="Accessibility text for image assets"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="asset-caption">Caption</Label>
        <Input
          id="asset-caption"
          value={caption}
          onChange={(event) => setCaption(event.target.value)}
          placeholder="Short caption"
        />
      </div>

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <Button
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={isSaving}
          className="w-full sm:w-auto">
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit || isSaving}
          className="w-full sm:w-auto">
          {isSaving ? (
            <>
              <Loader className="mr-2 h-4 w-4" />
              Saving...
            </>
          ) : (
            <>
              <Check className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  )

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] w-[95vw] overflow-y-auto p-0 sm:max-w-2xl">
          <div className="p-4 md:p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Pencil className="h-4 w-4" />
                Edit File
              </DialogTitle>
              <DialogDescription>
                Update file details and metadata.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4">{formBody}</div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[92vh]">
        <DrawerHeader className="text-left">
          <DrawerTitle>Edit File</DrawerTitle>
          <DrawerDescription>
            Update file details and metadata.
          </DrawerDescription>
        </DrawerHeader>
        <div className="overflow-y-auto px-4 pb-4">{formBody}</div>
      </DrawerContent>
    </Drawer>
  )
}
