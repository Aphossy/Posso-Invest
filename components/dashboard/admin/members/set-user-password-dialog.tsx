"use client"

import { useMemo, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { AnimatePresence, motion } from "framer-motion"
import { Eye, EyeOff } from "lucide-react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import type { AdminUser } from "@/types/admin-users"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { ResponsiveModal } from "@/components/ui/responsive-modal"
import { Loader } from "@/components/common/loader"

// Zod schema for password validation
const passwordSchema = z.object({
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(
      /[^A-Za-z0-9]/,
      "Password must contain at least one special character"
    ),
})

type PasswordForm = z.infer<typeof passwordSchema>

interface SetUserPasswordDialogProps {
  user: AdminUser
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SetUserPasswordDialog({
  user,
  open,
  onOpenChange,
}: SetUserPasswordDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  // Initialize React Hook Form with Zod resolver
  const form = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      newPassword: "",
    },
  })

  // Password strength calculation
  const passwordStrength = useMemo(() => {
    const password = form.watch("newPassword")
    if (!password) return { score: 0, label: "Weak" }

    let score = 0
    if (password.length >= 8) score++
    if (/[A-Z]/.test(password)) score++
    if (/[a-z]/.test(password)) score++
    if (/[0-9]/.test(password)) score++
    if (/[^A-Za-z0-9]/.test(password)) score++

    const labels = ["Weak", "Weak", "Fair", "Good", "Strong"]
    return {
      score,
      label: labels[score],
      color:
        score <= 2
          ? "bg-red-500"
          : score === 3
            ? "bg-yellow-500"
            : "bg-green-500",
    }
  }, [form.watch("newPassword")])

  const handleSubmit = async (data: PasswordForm) => {
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await authClient.admin.setUserPassword({
        userId: user.id,
        newPassword: data.newPassword,
      })

      if (response.error) {
        throw new Error(response.error.message || "Failed to set user password")
      }

      toast.success("User password updated successfully")
      form.reset()
      onOpenChange(false)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to set user password"
      )
      toast.error("Failed to set user password")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title="Change User Password"
      description={`Set a new password for ${user.name} (${user.email})`}
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="set-user-password-form"
            disabled={isSubmitting}
            className="relative">
            {isSubmitting && <Loader className="mr-2 h-4 w-4" />}
            Set Password
          </Button>
        </>
      }
      className="sm:max-w-106.25">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}>
        <Form {...form}>
          <form
            id="set-user-password-form"
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6 py-2">
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-sm text-red-500">
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        {...field}
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter new password"
                        className="pr-10 transition-all duration-200 focus:ring-2 focus:ring-primary"
                        disabled={isSubmitting}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 -translate-y-1/2"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={isSubmitting}>
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-full rounded bg-gray-200">
                        <div
                          className={`h-full rounded transition-all duration-300 ${passwordStrength.color}`}
                          style={{
                            width: `${(passwordStrength.score / 5) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {passwordStrength.label}
                      </span>
                    </div>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
      </motion.div>
    </ResponsiveModal>
  )
}
