"use client"

import { useState } from "react"
import { type User } from "@/db"
import { zodResolver } from "@hookform/resolvers/zod"
import { AlertTriangle, Eye, Mail, Send, Sparkles } from "lucide-react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { sendDirectUserEmail } from "@/lib/email-actions"
import { Badge } from "@/components/ui/badge"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Loader } from "@/components/common/loader"

const emailSchema = z.string().email("Please provide a valid email address")

const csvEmailSchema = z.string().refine((value) => {
  if (!value.trim()) return true
  const emails = value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)

  return emails.every((email) => emailSchema.safeParse(email).success)
}, "Use valid comma-separated email addresses")

const sendEmailSchema = z.object({
  subject: z
    .string()
    .trim()
    .min(3, "Subject must be at least 3 characters")
    .max(120, "Subject must be at most 120 characters"),
  message: z
    .string()
    .trim()
    .min(10, "Message must be at least 10 characters")
    .max(5000, "Message must be at most 5000 characters"),
  cc: csvEmailSchema,
  bcc: csvEmailSchema,
})

type SendEmailForm = z.infer<typeof sendEmailSchema>

const QUICK_TEMPLATES = {
  welcome: {
    label: "Welcome",
    icon: Sparkles,
    subject: "Welcome to TrustLink Group!",
    message: `Hi {{name}},

Welcome to TrustLink Group. We are glad to have you with us.

If you need help with bookings, profile setup, or account settings, just reply to this email and our team will assist you.

Warm regards,
TrustLink Group Team`,
  },
  followUp: {
    label: "Follow-up",
    icon: Mail,
    subject: "Quick follow-up from TrustLink Group",
    message: `Hi {{name}},

We wanted to follow up regarding your account and make sure everything is going smoothly.

If there is anything you need help with, please let us know and we will support you.

Best,
TrustLink Group`,
  },
  warning: {
    label: "Warning",
    icon: AlertTriangle,
    subject: "Important account notice",
    message: `Hi {{name}},

This is an important notice about your account activity.

Please review your recent actions and contact support if you have any questions. Continued policy violations may result in account restrictions.

Regards,
TrustLink Group`,
  },
} as const

interface SendUserEmailDialogProps {
  user: User
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SendUserEmailDialog({
  user,
  open,
  onOpenChange,
}: SendUserEmailDialogProps) {
  const [isSending, setIsSending] = useState(false)
  const [activeTab, setActiveTab] = useState("compose")

  const form = useForm<SendEmailForm>({
    resolver: zodResolver(sendEmailSchema),
    defaultValues: {
      subject: "",
      message: "",
      cc: "",
      bcc: "",
    },
  })

  const subject = form.watch("subject")
  const message = form.watch("message")
  const cc = form.watch("cc")
  const bcc = form.watch("bcc")

  const applyTemplate = (
    template: (typeof QUICK_TEMPLATES)[keyof typeof QUICK_TEMPLATES]
  ) => {
    const personalizedMessage = template.message.replaceAll(
      "{{name}}",
      user.name
    )

    form.setValue("subject", template.subject, { shouldValidate: true })
    form.setValue("message", personalizedMessage, { shouldValidate: true })
    setActiveTab("compose")
  }

  const parseCsvEmails = (value?: string) =>
    (value || "")
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)

  const handleSendEmail = async (values: SendEmailForm) => {
    setIsSending(true)

    try {
      const emailPromise = sendDirectUserEmail({
        userName: user.name,
        userEmail: user.email,
        subject: values.subject,
        message: values.message,
        cc: parseCsvEmails(values.cc),
        bcc: parseCsvEmails(values.bcc),
      })

      toast.promise(emailPromise, {
        loading: "Sending email...",
        success: "Email sent successfully",
        error: "Failed to send email",
      })

      const result = await emailPromise

      if (!result.success) {
        toast.error(result.error || "Failed to send email")
        return
      }

      form.reset()
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to send direct user email:", error)
      toast.error("Failed to send email")
    } finally {
      setIsSending(false)
    }
  }

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title="Send Email"
      description={`Send a custom email to ${user.name} (${user.email})`}
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSending}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="send-user-email-form"
            disabled={isSending}>
            {isSending && <Loader className="mr-2 h-4 w-4" />}
            Send Email
          </Button>
        </>
      }
      className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
      <Form {...form}>
        <form
          id="send-user-email-form"
          onSubmit={form.handleSubmit(handleSendEmail)}
          className="space-y-4 py-2">
          <div className="space-y-3">
            <p className="text-sm font-medium">Quick templates</p>
            <div className="flex flex-wrap gap-2">
              {Object.values(QUICK_TEMPLATES).map((template) => {
                const Icon = template.icon

                return (
                  <Button
                    key={template.label}
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isSending}
                    onClick={() => applyTemplate(template)}>
                    <Icon className="mr-2 h-4 w-4" />
                    {template.label}
                  </Button>
                )
              })}
            </div>
          </div>

          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="compose" className="flex-1">
                <Send className="mr-2 h-4 w-4" />
                Compose
              </TabsTrigger>
              <TabsTrigger value="preview" className="flex-1">
                <Eye className="mr-2 h-4 w-4" />
                Preview
              </TabsTrigger>
            </TabsList>

            <TabsContent value="compose" className="mt-4 space-y-4">
              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Enter email subject"
                        disabled={isSending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cc"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CC (optional)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="audit@company.com, manager@company.com"
                        disabled={isSending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bcc"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>BCC (optional)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="audit-archive@company.com"
                        disabled={isSending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Message</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        rows={8}
                        placeholder="Write your message to the user..."
                        disabled={isSending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </TabsContent>

            <TabsContent value="preview" className="mt-4">
              <div className="space-y-4 rounded-md border p-4">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    To
                  </p>
                  <p className="text-sm">{user.email}</p>
                </div>

                {cc?.trim() && (
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">
                      CC
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {parseCsvEmails(cc).map((email) => (
                        <Badge key={`cc-${email}`} variant="outline">
                          {email}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {bcc?.trim() && (
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">
                      BCC
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {parseCsvEmails(bcc).map((email) => (
                        <Badge key={`bcc-${email}`} variant="outline">
                          {email}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    Subject
                  </p>
                  <p className="text-sm font-medium">
                    {subject?.trim() || "(No subject)"}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    Message preview
                  </p>
                  <div className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded-md bg-muted/30 p-3 text-sm">
                    {message?.trim() || "(No message)"}
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </form>
      </Form>
    </ResponsiveModal>
  )
}
