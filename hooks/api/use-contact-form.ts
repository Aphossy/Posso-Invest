// hooks/api/use-contact-form.ts
import type { Message } from "@/db/schemas/message-schema"
import { useMutation, useQueryClient } from "@tanstack/react-query"

import { ApiErrorException } from "@/types/api"
import { apiClient } from "@/lib/api-client"
import type { ContactFormData } from "@/lib/validators/message-validators"

export interface SubmitContactFormResponse {
  success: true
  data: {
    message: Message
  }
  message: string
}

export interface SubmitContactFormError {
  success: false
  message: string
  validationErrors?: Array<{
    path: string
    message: string
  }>
}

/**
 * Hook for submitting contact form messages
 * Handles form submission with proper error handling and cache invalidation
 */
export function useContactForm() {
  const queryClient = useQueryClient()

  const submitContactForm = useMutation<
    SubmitContactFormResponse,
    ApiErrorException,
    ContactFormData
  >({
    mutationFn: async (formData) => {
      const response = await apiClient.post<SubmitContactFormResponse>(
        "/api/message",
        formData
      )
      return response
    },
    onSuccess: (data) => {
      // Invalidate messages query to reflect the new message
      queryClient.invalidateQueries({ queryKey: ["messages"] })

      // Optionally store the last submitted message code for reference
      if (data.data.message.messageCode) {
        sessionStorage.setItem("lastMessageCode", data.data.message.messageCode)
      }
    },
    onError: (error) => {
      // Error is handled by the component/caller
      console.error("Contact form submission error:", error)
    },
  })

  return {
    submitContactForm: submitContactForm.mutate,
    submitContactFormAsync: submitContactForm.mutateAsync,
    isPending: submitContactForm.isPending,
    isError: submitContactForm.isError,
    error: submitContactForm.error,
    data: submitContactForm.data,
    reset: submitContactForm.reset,
  }
}

/**
 * Hook to retrieve the last submitted message code
 */
export function useLastMessageCode() {
  return sessionStorage.getItem("lastMessageCode")
}
