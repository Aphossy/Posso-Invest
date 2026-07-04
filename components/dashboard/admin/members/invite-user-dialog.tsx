"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { AlertCircle } from "lucide-react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { authClient } from "@/lib/auth-client"
import { organizationClient } from "@/lib/organization-client"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader } from "@/components/common/loader"

const inviteSchema = z.object({
  email: z.string().email("Email is invalid"),
  role: z.enum(
    ["member", "treasurer", "secretary", "admin", "president"] as const,
    {
      message: "Role is required",
    }
  ),
  resend: z.boolean().optional(),
})

type InviteForm = z.infer<typeof inviteSchema>

interface InviteUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export default function InviteUserDialog({
  open,
  onOpenChange,
  onSuccess,
}: InviteUserDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { data: activeOrganization } = authClient.useActiveOrganization()

  const form = useForm<InviteForm>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: "",
      role: "member",
      resend: false,
    },
  })

  const handleSubmit = async (data: InviteForm) => {
    setIsSubmitting(true)
    setError(null)

    try {
      let organizationId = activeOrganization?.id
      if (!organizationId) {
        const orgResponse = await organizationClient.list()
        const organizations = orgResponse.data || []
        if (organizations.length > 0) {
          organizationId = organizations[0].id
          await organizationClient.setActive({ organizationId })
        }
      }

      if (!organizationId) {
        throw new Error(
          "No active organization found. Please refresh and try again."
        )
      }

      const response = await organizationClient.inviteMember({
        email: data.email,
        role: data.role,
        resend: data.resend,
        organizationId,
      })

      if (response.error) {
        throw new Error(response.error.message || "Failed to send invitation")
      }

      toast.success("Invitation sent successfully")
      form.reset()
      onSuccess?.()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send invitation")
      toast.error("Failed to send invitation")
    } finally {
      setIsSubmitting(false)
    }
  }

  const formBody = (
    <Form {...form}>
      <form
        id="invite-form"
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-4 py-2">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

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
                  name="email"
                  autoComplete="email"
                  spellCheck={false}
                  placeholder="member@example.com…"
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
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
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="resend"
          render={({ field }) => (
            <FormItem className="flex items-center gap-2">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={(value) => field.onChange(Boolean(value))}
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormLabel className="text-sm font-normal">
                Resend if this email already has a pending invite.
              </FormLabel>
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
      <Button type="submit" form="invite-form" disabled={isSubmitting}>
        {isSubmitting && <Loader className="mr-2 h-4 w-4" />}
        Send Invitation
      </Button>
    </>
  )

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title="Invite Member"
      description="Send a secure invitation with the right Posso Venture role."
      footer={footer}>
      {formBody}
    </ResponsiveModal>
  )
}
