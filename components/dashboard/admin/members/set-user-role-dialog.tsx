"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { AnimatePresence, motion } from "framer-motion"
import { AlertCircle } from "lucide-react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import type { AdminUser } from "@/types/admin-users"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { ResponsiveModal } from "@/components/ui/responsive-modal"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader } from "@/components/common/loader"

// Zod schema for role validation
const roleSchema = z.object({
  role: z.enum(
    ["member", "treasurer", "secretary", "admin", "president"] as const,
    {
      message: "Role is required",
    }
  ),
})

type RoleForm = z.infer<typeof roleSchema>

interface SetUserRoleDialogProps {
  user: AdminUser
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: (userId: string, updates: Partial<AdminUser>) => Promise<void>
}

export function SetUserRoleDialog({
  user,
  open,
  onOpenChange,
  onUpdate,
}: SetUserRoleDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialize React Hook Form with Zod resolver
  const form = useForm<RoleForm>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      role:
        (user.role as
          | "member"
          | "treasurer"
          | "secretary"
          | "admin"
          | "president") || "member",
    },
  })

  const handleSubmit = async (data: RoleForm) => {
    setIsSubmitting(true)
    setError(null)

    try {
      await onUpdate(user.id, { role: data.role })

      toast.success("User role updated successfully")
      form.reset()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set user role")
      toast.error("Failed to set user role")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title="Set User Role"
      description={`Change the role for ${user.name} (${user.email})`}
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
            form="set-user-role-form"
            disabled={isSubmitting}
            className="relative">
            {isSubmitting && <Loader className="mr-2 h-4 w-4" />}
            Set Role
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
            id="set-user-role-form"
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
              name="role"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel>Role</FormLabel>
                  <FormControl>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={isSubmitting}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="member">Member</SelectItem>
                        <SelectItem value="treasurer">Treasurer</SelectItem>
                        <SelectItem value="secretary">Secretary</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="president">President</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                  <AnimatePresence>
                    {field.value === "admin" && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}>
                        <Alert variant="warning" className="mt-2">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            Admin role grants full access to all features and
                            settings.
                          </AlertDescription>
                        </Alert>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </FormItem>
              )}
            />
          </form>
        </Form>
      </motion.div>
    </ResponsiveModal>
  )
}
