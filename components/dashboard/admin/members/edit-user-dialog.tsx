"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { AnimatePresence, motion } from "framer-motion"
import { useForm } from "react-hook-form"
import { z } from "zod"

import type { AdminUser } from "@/types/admin-users"
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

const updateUserSchema = z.object({
  email: z.string().email("Invalid email address").min(1, "Email is required"),
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name is too long"),
})

type UpdateUserForm = z.infer<typeof updateUserSchema>

interface EditUserDialogProps {
  user: AdminUser
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: (userId: string, updates: Partial<AdminUser>) => Promise<void>
}

export function EditUserDialog({
  user,
  open,
  onOpenChange,
  onUpdate,
}: EditUserDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<UpdateUserForm>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: {
      email: user.email,
      name: user.name,
    },
  })

  const handleSubmit = async (data: UpdateUserForm) => {
    setIsSubmitting(true)
    setError(null)

    try {
      await onUpdate(user.id, {
        email: data.email,
        name: data.name,
      })
      form.reset(data)
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update user")
    } finally {
      setIsSubmitting(false)
    }
  }

  const formBody = (
    <Form {...form}>
      <form
        id="edit-user-form"
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
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="email"
                  placeholder="user@example.com…"
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="text"
                  placeholder="John Doe…"
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
      <Button type="submit" form="edit-user-form" disabled={isSubmitting}>
        {isSubmitting && <Loader className="mr-2 h-4 w-4" />}
        Update User
      </Button>
    </>
  )

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title="Edit User"
      description={`Update details for ${user.name} (${user.email})`}
      footer={footer}>
      {formBody}
    </ResponsiveModal>
  )
}
