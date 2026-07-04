"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { AnimatePresence, motion } from "framer-motion"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import type { AdminUser } from "@/types/admin-users"
import { authClient } from "@/lib/auth-client"
import { sendBanNotificationEmail } from "@/lib/email-actions"
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

const banSchema = z.object({
  banReason: z
    .string()
    .min(1, "Ban reason is required")
    .max(200, "Ban reason is too long"),
  banExpiresInDays: z
    .string()
    .optional()
    .refine(
      (val) => !val || (!isNaN(Number(val)) && Number(val) >= 0),
      "Ban duration must be a positive number or empty for permanent ban"
    ),
})

type BanForm = z.infer<typeof banSchema>

interface BanUserDialogProps {
  user: AdminUser
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function BanUserDialog({
  user,
  open,
  onOpenChange,
  onSuccess,
}: BanUserDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<BanForm>({
    resolver: zodResolver(banSchema),
    defaultValues: {
      banReason: "",
      banExpiresInDays: "",
    },
  })

  const handleSubmit = async (data: BanForm) => {
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await authClient.admin.banUser({
        userId: user.id,
        banReason: data.banReason,
        banExpiresIn: data.banExpiresInDays
          ? Number(data.banExpiresInDays) * 24 * 60 * 60
          : undefined,
      })

      if (response.error) {
        throw new Error(response.error.message || "Failed to ban user")
      }

      toast.success("User banned successfully")

      try {
        const emailResult = await sendBanNotificationEmail({
          userName: user.name,
          userEmail: user.email,
          banType: data.banExpiresInDays ? "temporary" : "permanent",
          banExpiresInDays: data.banExpiresInDays,
          banReason: data.banReason,
        })

        if (!emailResult.success) {
          toast.info("User banned, but email notification failed to send")
        }
      } catch {
        // Email failure is non-fatal
      }

      form.reset()
      onSuccess()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to ban user")
      toast.error("Failed to ban user")
    } finally {
      setIsSubmitting(false)
    }
  }

  const formBody = (
    <Form {...form}>
      <form
        id="ban-user-form"
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-4 py-2">
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
          name="banReason"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ban Reason</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="Reason for banning the user"
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="banExpiresInDays"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ban Duration (days, optional)</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="number"
                  placeholder="Leave empty for permanent ban"
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  )

  const footer = (
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
        form="ban-user-form"
        variant="destructive"
        disabled={isSubmitting}>
        {isSubmitting && <Loader className="mr-2 h-4 w-4" />}
        Ban User
      </Button>
    </>
  )

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title="Ban User"
      description={`Ban ${user.name} (${user.email}) from the platform`}
      footer={footer}>
      {formBody}
    </ResponsiveModal>
  )
}
