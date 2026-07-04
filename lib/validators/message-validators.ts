import { POSSO_MESSAGE_SERVICE_VALUES } from "@/constants/message-services"
import { isValidPhoneNumber, parsePhoneNumber } from "libphonenumber-js"
import { z } from "zod"

// Shared schema for creating support tickets/messages.
// Keep this aligned with the API POST /api/message validation rules.
export const createMessageApiSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().optional(),
  service: z.enum(POSSO_MESSAGE_SERVICE_VALUES).default("other"),
  subject: z.string().min(5, "Subject must be at least 5 characters"),
  message: z.string().min(10, "Message must be at least 10 characters"),
})

export type CreateMessageApiInput = z.input<typeof createMessageApiSchema>
export type CreateMessageApiData = z.infer<typeof createMessageApiSchema>

// Enhanced Zod schema for message validation with transformations
export const messageSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .min(2, "Name must be at least 2 characters")
    .max(255, "Name is too long")
    .trim()
    .refine((name) => name.length > 0, "Name cannot be empty or whitespace"),
  email: z
    .string()
    .min(1, "Email is required")
    .email("Invalid email address")
    .max(255, "Email is too long")
    .trim()
    .toLowerCase(),
  phone: z
    .string()
    .min(1, "Phone number is required")
    .refine((phone) => {
      if (!phone || phone.trim() === "") return false
      try {
        return isValidPhoneNumber(phone)
      } catch {
        return false
      }
    }, "Please enter a valid phone number")
    .transform((phone) => {
      if (!phone || phone.trim() === "") return phone
      try {
        const parsed = parsePhoneNumber(phone)
        return parsed?.format("E.164") || phone
      } catch {
        return phone
      }
    }),
  service: z.enum(POSSO_MESSAGE_SERVICE_VALUES).default("other"),
  subject: z
    .string()
    .min(1, "Subject is required")
    .min(5, "Subject must be at least 5 characters")
    .max(500, "Subject is too long")
    .trim()
    .refine(
      (subject) => subject.length > 0,
      "Subject cannot be empty or whitespace"
    ),
  message: z
    .string()
    .min(1, "Message is required")
    .min(10, "Message must be at least 10 characters")
    .max(2000, "Message is too long")
    .trim()
    .refine((msg) => msg.length > 0, "Message cannot be empty or whitespace"),
})

export type MessageForm = z.infer<typeof messageSchema>

// Frontend validation schema (with better UX messaging)
export const contactFormSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(255, "Name is too long"),
  email: z.string().email("Please enter a valid email address"),
  phone: z
    .string()
    .min(1, "Phone number is required")
    .refine((phone) => {
      if (!phone || phone.trim() === "") return false
      try {
        return isValidPhoneNumber(phone)
      } catch {
        return false
      }
    }, "Please enter a valid phone number"),
  service: z.enum(POSSO_MESSAGE_SERVICE_VALUES).optional(),
  subject: z
    .string()
    .min(5, "Subject must be at least 5 characters")
    .max(500, "Subject is too long"),
  message: z
    .string()
    .min(10, "Message must be at least 10 characters")
    .max(2000, "Message is too long"),
})

export type ContactFormData = z.infer<typeof contactFormSchema>

// Validation error type
export interface ValidationError {
  field: string
  message: string
}

// Safe parse helper
export function validateContactForm(data: unknown): {
  success: boolean
  data?: ContactFormData
  errors?: ValidationError[]
} {
  const result = contactFormSchema.safeParse(data)

  if (!result.success) {
    const errors = result.error.issues.map((issue) => ({
      field: issue.path.join(".") || "form",
      message: issue.message,
    }))
    return { success: false, errors }
  }

  return { success: true, data: result.data }
}

// export const messageSchema = z.object({
//   name: z
//     .string()
//     .min(1, "Name is required")
//     .max(100, "Name is too long")
//     .trim(),
//   email: z
//     .string()
//     .min(1, "Email is required")
//     .email("Invalid email address")
//     .max(100, "Email is too long")
//     .trim()
//     .toLowerCase(),
//   phone: z
//     .string()
//     .min(10, { message: "Please enter a valid phone number" })
//     .max(15, { message: "Phone number must not exceed 15 characters" })
//     .optional(),
//   subject: z
//     .string()
//     .min(3, { message: "Subject must be at least 3 characters" })
//     .max(100, { message: "Subject must not exceed 100 characters" })
//     .optional(),
//   service: z.string().min(2, { message: "Please select a service" }).optional(),
//   message: z
//     .string()
//     .min(5, { message: "Message must be at least 5 characters" })
//     .max(1000, { message: "Message is too long" }),
// })

// export type MessageFormData = z.infer<typeof messageSchema>
// export type MessageInput = z.input<typeof messageSchema>

// export const messageSchema = z.object({
//   name: z
//     .string()
//     .min(1, { message: "Names are required" })
//     .min(2, { message: "Names are too short" }),

//   email: z
//     .email({ message: "Please enter a valid email address" })
//     .max(254, { message: "Email must not exceed 254 characters" }),

//   phone: z
//     .string()
//     .min(1, { message: "Phone number is required" })
//     .refine(
//       (value) => {
//         try {
//           return isValidPhoneNumber(value)
//         } catch {
//           return false
//         }
//       },
//       { message: "Please enter a valid phone number" }
//     )
//     .transform((value) => {
//       try {
//         const phoneNumber = parsePhoneNumber(value)
//         return phoneNumber.format("E.164")
//       } catch {
//         return value
//       }
//     }),
//   subject: z.string().optional(),
//   message: z
//     .string()
//     .min(1, { message: "Message is required" })
//     .min(3, { message: "Message must be at least 3 characters long" })
//     .max(1000, { message: "Message must not exceed 1000 characters" })
//     .refine((value) => value.trim().length > 0, {
//       message: "Message cannot be only whitespace",
//     }),
// })

// export type MessageFormData = z.infer<typeof messageSchema>
