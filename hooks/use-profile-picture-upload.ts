"use client"

import { useState } from "react"
import { toast } from "sonner"

interface UploadResponse {
  success: boolean
  data: {
    originalName: string
    url: string
    publicId: string
    width: number
    height: number
    format: string
    size: number
    thumbnailUrl?: string
    mediumUrl?: string
    uploadedAt: string
  }
  message?: string
  error?: any
  metadata?: any
}

export function useProfilePictureUpload() {
  const [isUploading, setIsUploading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const deleteProfilePicture = async (): Promise<boolean> => {
    setIsDeleting(true)

    try {
      // For now, we just return true to indicate the UI should clear the image
      // The actual image URL will be set to empty/null by the calling component
      // If you want to delete from Cloudinary, you can add that logic here
      await new Promise((resolve) => setTimeout(resolve, 300)) // Small delay for UX
      toast.success("Profile picture removed successfully!")
      return true
    } catch (error) {
      console.error("Profile picture delete error:", error)
      toast.error("Failed to remove profile picture")
      return false
    } finally {
      setIsDeleting(false)
    }
  }

  const uploadProfilePicture = async (
    file: File
  ): Promise<{
    url: string
    thumbnailUrl?: string
    mediumUrl?: string
  } | null> => {
    if (!file) {
      toast.error("No file provided")
      return null
    }

    setIsUploading(true)

    const formData = new FormData()
    formData.append("file", file)

    const uploadPromise = new Promise<{
      url: string
      thumbnailUrl?: string
      mediumUrl?: string
    }>(async (resolve, reject) => {
      try {
        // Use native fetch instead of apiService for FormData
        const response = await fetch("/api/upload/cloudinary", {
          method: "POST",
          body: formData, // Don't set Content-Type header, let browser set it
        })

        const result: UploadResponse = await response.json()

        if (result.success && result.data?.url) {
          resolve({
            url: result.data.url,
            thumbnailUrl: result.data.thumbnailUrl,
            mediumUrl: result.data.mediumUrl,
          })
        } else {
          const errorMessage =
            result.error?.message || result.message || "Failed to upload image"
          reject(new Error(errorMessage))
        }
      } catch (err: any) {
        const errorMessage = err.message || "Failed to upload image"
        reject(new Error(errorMessage))
      } finally {
        setIsUploading(false)
      }
    })

    try {
      const toastResult = await toast.promise(uploadPromise, {
        loading: "Uploading profile picture...",
        success: "Profile picture uploaded successfully!",
        error: (err: Error) =>
          err.message || "Failed to upload profile picture",
      })

      // If toast.promise returns an object with unwrap, use it to get the actual result
      const uploadResult =
        typeof toastResult === "object" &&
        toastResult !== null &&
        typeof (toastResult as any).unwrap === "function"
          ? await (toastResult as any).unwrap()
          : toastResult

      if (
        uploadResult &&
        typeof uploadResult === "object" &&
        typeof uploadResult.url === "string"
      ) {
        return uploadResult as {
          url: string
          thumbnailUrl?: string
          mediumUrl?: string
        }
      }
      return null
    } catch (error) {
      console.error("Profile picture upload error:", error)
      return null
    }
  }

  return {
    uploadProfilePicture,
    deleteProfilePicture,
    isUploading,
    isDeleting,
  }
}
