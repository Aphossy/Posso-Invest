"use client"

import { useEffect, useRef, useState } from "react"
import { Camera, Eye, Trash2 } from "lucide-react"

import { useFileUpload } from "@/hooks/use-file-upload"
import { useProfilePictureUpload } from "@/hooks/use-profile-picture-upload"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import { ProfilePictureCropper } from "./profile-picture-cropper"

interface ProfilePictureUploadProps {
  currentAvatarUrl?: string
  name: string
  onAvatarUpdate: (avatarUrl: string) => Promise<void>
  size?: "sm" | "md" | "lg"
}

export function ProfilePictureUpload({
  currentAvatarUrl,
  name,
  onAvatarUpdate,
  size = "lg",
}: ProfilePictureUploadProps) {
  const [
    { files, isDragging },
    {
      handleDragEnter,
      handleDragLeave,
      handleDragOver,
      handleDrop,
      openFileDialog,
      removeFile,
      getInputProps,
    },
  ] = useFileUpload({
    accept: "image/*",
    maxFiles: 1,
  })

  const {
    uploadProfilePicture,
    deleteProfilePicture,
    isUploading,
    isDeleting,
  } = useProfilePictureUpload()

  const previewUrl = files[0]?.preview || null
  const fileId = files[0]?.id
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isOptionsDialogOpen, setIsOptionsDialogOpen] = useState(false)
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false)
  const [isDeleteConfirmDialogOpen, setIsDeleteConfirmDialogOpen] =
    useState(false)
  const previousFileIdRef = useRef<string | undefined | null>(null)

  const getInitials = (name: string) => {
    if (!name) return ""
    const parts = name.trim().split(" ")
    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase()
    }
    return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase()
  }

  const getSizeClasses = () => {
    switch (size) {
      case "sm":
        return "h-12 w-12"
      case "md":
        return "h-16 w-16"
      case "lg":
      default:
        return "h-20 w-20"
    }
  }

  const getButtonSize = () => {
    switch (size) {
      case "sm":
        return "h-6 w-6"
      case "md":
        return "h-7 w-7"
      case "lg":
      default:
        return "h-8 w-8"
    }
  }

  const handleCameraClick = () => {
    openFileDialog()
  }

  const handleCropComplete = async (croppedFile: File) => {
    try {
      // Upload the cropped image
      const uploadResult = await uploadProfilePicture(croppedFile)
      if (uploadResult?.url) {
        // Update the profile with new avatar URL
        // Use the main URL for the profile, but you could also use thumbnailUrl for smaller displays
        await onAvatarUpdate(uploadResult.url)

        // Clean up
        if (fileId) {
          removeFile(fileId)
        }

        // Close the dialog
        setIsDialogOpen(false)
      }
    } catch (error) {
      console.error("Error uploading cropped image:", error)
    }
  }

  const handleDeleteImage = async () => {
    const success = await deleteProfilePicture()
    if (success) {
      await onAvatarUpdate("")
      setIsPreviewDialogOpen(false)
      setIsOptionsDialogOpen(false)
      setIsDeleteConfirmDialogOpen(false)
    }
  }

  const handleAvatarClick = () => {
    if (!currentAvatarUrl || isUploading || isDeleting) {
      return
    }
    setIsOptionsDialogOpen(true)
  }

  const handleOpenPreview = () => {
    setIsOptionsDialogOpen(false)
    setIsPreviewDialogOpen(true)
  }

  const handleOpenDeleteConfirmation = () => {
    setIsOptionsDialogOpen(false)
    setIsDeleteConfirmDialogOpen(true)
  }

  // Effect to open dialog when a new file is ready
  useEffect(() => {
    if (fileId && fileId !== previousFileIdRef.current) {
      setIsDialogOpen(true)
    }
    previousFileIdRef.current = fileId
  }, [fileId])

  return (
    <>
      <div className="relative">
        <button
          type="button"
          onClick={handleAvatarClick}
          disabled={!currentAvatarUrl || isDeleting || isUploading}
          className="rounded-full disabled:cursor-not-allowed"
          aria-label={
            currentAvatarUrl
              ? "Open profile picture options"
              : "No profile picture available"
          }>
          <Avatar
            className={`${getSizeClasses()} border-4 border-white shadow-lg`}>
            <AvatarImage
              src={currentAvatarUrl || ""}
              alt={`${name}'s Avatar`}
            />
            <AvatarFallback className="bg-white text-2xl font-bold text-gray-800">
              {getInitials(name)}
            </AvatarFallback>
          </Avatar>
        </button>

        <Button
          size="sm"
          onClick={handleCameraClick}
          disabled={isUploading || isDeleting}
          className={`absolute -right-2 -bottom-2 ${getButtonSize()} rounded-full bg-white p-0 text-gray-800 hover:bg-gray-100 disabled:opacity-50 shadow-md`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          data-dragging={isDragging || undefined}>
          <Camera className="h-4 w-4" />
        </Button>
        <input
          {...getInputProps()}
          className="sr-only"
          aria-label="Upload profile picture"
          tabIndex={-1}
        />
      </div>

      {/* Cropper Dialog */}
      <ProfilePictureCropper
        dialogOpen={isDialogOpen}
        setDialogOpen={setIsDialogOpen}
        imageUrl={previewUrl}
        onCropComplete={handleCropComplete}
        name={name}
        isUploading={isUploading}
      />

      <Dialog open={isOptionsDialogOpen} onOpenChange={setIsOptionsDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Profile picture options</DialogTitle>
            <DialogDescription>
              Choose what you want to do with your current profile picture.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={handleOpenPreview}
              disabled={!currentAvatarUrl || isDeleting || isUploading}>
              <Eye className="mr-2 h-4 w-4" />
              Preview
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleOpenDeleteConfirmation}
              disabled={!currentAvatarUrl || isDeleting || isUploading}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Profile picture preview</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center py-2">
            <Avatar className="h-72 w-72 max-h-[70dvh] max-w-[70dvh] border shadow-md">
              <AvatarImage
                src={currentAvatarUrl || ""}
                alt={`${name}'s Avatar`}
              />
              <AvatarFallback className="bg-white text-5xl font-bold text-gray-800">
                {getInitials(name)}
              </AvatarFallback>
            </Avatar>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isDeleteConfirmDialogOpen}
        onOpenChange={setIsDeleteConfirmDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete profile picture?</DialogTitle>
            <DialogDescription>
              This action removes your current profile picture. You can upload a
              new one anytime.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteConfirmDialogOpen(false)}
              disabled={isDeleting || isUploading}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteImage}
              disabled={!currentAvatarUrl || isDeleting || isUploading}>
              <Trash2 className="mr-2 h-4 w-4" />
              {isDeleting ? "Deleting..." : "Yes, delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
