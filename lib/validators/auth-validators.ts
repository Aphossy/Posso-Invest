import { isValidPhoneNumber, parsePhoneNumber } from "libphonenumber-js"
import * as z from "zod"

export const passwordFormSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(1, "Password is required")
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain an uppercase letter")
      .regex(/[a-z]/, "Password must contain a lowercase letter")
      .regex(/\d/, "Password must contain a number")
      .regex(/[^a-zA-Z0-9]/, "Password must contain a special character")
      .max(16, "Password must be at most 16 characters"),
    confirmPassword: z
      .string()
      .min(8, "Password must be at least 8 characters"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "New password cannot be the same as the current password",
    path: ["newPassword"],
  })

export const setPasswordFormSchema = z.object({
  password: z
    .string()
    .min(1, "Password is required")
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[a-z]/, "Password must contain a lowercase letter")
    .regex(/\d/, "Password must contain a number")
    .regex(/[^a-zA-Z0-9]/, "Password must contain a special character")
    .max(20, "Password must be at most 20 characters"),
})

export const signupSchema = z
  .object({
    fullName: z
      .string()
      .min(1, "Full name is required")
      .min(4, { message: "Full names are short" })
      .max(200, { message: "Full name must be at most 200 characters" }),

    email: z
      .email("Email is invalid")
      .max(254, { message: "Email must be at most 254 characters" }),
    phone: z
      .string()
      .min(1, { message: "Phone number is required" })
      .refine(
        (value) => {
          try {
            return isValidPhoneNumber(value)
          } catch {
            return false
          }
        },
        { message: "Please enter a valid phone number" }
      )
      .transform((value) => {
        try {
          const phoneNumber = parsePhoneNumber(value)
          return phoneNumber ? phoneNumber.format("E.164") : value
        } catch {
          return value
        }
      }),
    acceptTerms: z.boolean().refine((val) => val === true, {
      message: "You must accept the terms and conditions",
    }),

    password: z
      .string()
      .min(1, "Password is required")
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain an uppercase letter")
      .regex(/[a-z]/, "Password must contain a lowercase letter")
      .regex(/\d/, "Password must contain a number")
      .regex(/[^a-zA-Z0-9]/, "Password must contain a special character")
      .max(16, "Password must be at most 16 characters"),
    confirmPassword: z
      .string()
      .min(8, "Password must be at least 8 characters"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  })

export const emailSchema = z.object({
  email: z.email("Email is invalid"),
})

export type EmailFormData = z.infer<typeof emailSchema>
export type SignupFormData = z.infer<typeof signupSchema>
export type PasswordFormData = z.infer<typeof passwordFormSchema>

export const SignInValidation = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(8, "Password must be 8+ characters")
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[a-z]/, "Password must contain a lowercase letter")
    .regex(/\d/, "Password must contain a number")
    .regex(/[^a-zA-Z0-9]/, "Password must contain a special character")
    .max(16, "Password must be at most 16 characters"),

  code: z.optional(z.string()),
})

export type SignInData = z.infer<typeof SignInValidation>

export const SignUpValidation = z
  .object({
    name: z
      .string()
      .min(1, "Username is required")
      .max(50, "Username must be less than 50 characters"),
    email: z.string().min(1, "Email is required").email("Invalid email"),
    password: z
      .string()
      .min(1, "Password is required")
      .min(8, "Password must be 8+ characters"),
    confirmPassword: z.string().min(1, "Password confirmation is required"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Password do not match",
  })

export const ResetPasswordValidation = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email"),
})

export const NewPasswordValidation = z
  .object({
    newPassword: z
      .string()
      .min(1, "Password is required")
      .min(8, "Password must be 8+ characters"),
    confirmPassword: z.string().min(1, "Password confirmation is required"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Password do not match",
  })

const validatePassword = z
  .string()
  .refine((val) => val === "" || val.length >= 8, {
    message: "Password must be 8+ characters if provided",
  })

export const SettingsValidation = z
  .object({
    name: z.optional(z.string()),
    email: z.optional(z.string().email("Invalid email")),
    password: z.optional(validatePassword),
    newPassword: z.optional(validatePassword),
    role: z.enum(["member", "treasurer", "secretary", "admin"]).optional(),
    isTwoFactorEnabled: z.optional(z.boolean()),
  })
  .refine(
    (data) => {
      if (data.newPassword && !data.password) {
        return false
      }
      return true
    },
    {
      path: ["password"],
      message: "To change password, enter current one.",
    }
  )
  .refine(
    (data) => {
      if (data.password && !data.newPassword) {
        return false
      }
      return true
    },
    {
      path: ["newPassword"],
      message: "To change password, enter new password.",
    }
  )
