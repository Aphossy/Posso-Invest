// C:\Users\user\OneDrive\Desktop\trustlink-group\components\dashboard\user\messages\create-message-dialog.tsx
"use client"

import { useEffect, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { AnimatePresence, motion } from "framer-motion"
import { Send } from "lucide-react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { useSession } from "@/lib/auth-client"
import {
  ContactFormData,
  contactFormSchema,
} from "@/lib/validators/message-validators"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { PhoneInput } from "@/components/ui/phone-input"
import { Textarea } from "@/components/ui/textarea"
import { Loader } from "@/components/common/loader"

interface CreateMessageDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function CreateMessageDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateMessageDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { data: session } = useSession()

  const form = useForm<ContactFormData>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      service: "other",
      subject: "",
      message: "",
    },
  })

  // Pre-fill form with user session data when dialog opens
  useEffect(() => {
    if (open && session?.user) {
      form.setValue("name", session.user.name || "")
      form.setValue("email", session.user.email || "")
    }
  }, [open, session, form])

  const handleSubmit = async (data: ContactFormData) => {
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch("/api/message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        // Handle rate limit error specifically
        if (result.error?.code === "TOO_MANY_REQUESTS") {
          const retryAfter = result.error.details?.retryAfter
          const minutes = retryAfter ? Math.ceil(retryAfter / 60) : 0
          const errorMsg = `${result.error.message}${minutes > 0 ? ` Please try again in ${minutes} minute${minutes > 1 ? "s" : ""}.` : ""}`
          setError(errorMsg)
          toast.error(errorMsg, {
            description: result.error.help,
            duration: 5000,
          })
        } else {
          throw new Error(
            result.error?.message || result.message || "Failed to send message"
          )
        }
        return
      }

      toast.success("Message sent successfully!")
      form.reset()
      onSuccess?.()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message")
      toast.error("Failed to send message")
    } finally {
      setIsSubmitting(false)
    }
  }

  const messageLength = form.watch("message")?.length || 0
  const maxMessageLength = 2000

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}>
          <DialogHeader>
            <DialogTitle>Send New Message</DialogTitle>
            <DialogDescription>
              Submit a new message or inquiry. We&apos;ll get back to you as
              soon as possible.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-4 mt-4">
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-red-500 text-sm bg-red-50 dark:bg-red-900/10 p-3 rounded-md border border-red-200 dark:border-red-800">
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                          placeholder="Your name"
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                          placeholder="your@email.com"
                          disabled
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center">
                        Phone
                        <span className="text-red-500 ml-1">*</span>
                      </FormLabel>
                      <FormControl>
                        <PhoneInput
                          defaultCountry="RW"
                          international
                          value={field.value || ""}
                          onChange={field.onChange}
                          placeholder="+250 786 123 456"
                          disabled={isSubmitting}
                          className="w-full"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="text"
                        placeholder="Brief description of your inquiry"
                        disabled={isSubmitting}
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
                        placeholder="Describe your needs or inquiry in detail..."
                        disabled={isSubmitting}
                        rows={6}
                        className="resize-none"
                      />
                    </FormControl>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <FormMessage />
                      <span
                        className={
                          messageLength > maxMessageLength ? "text-red-500" : ""
                        }>
                        {messageLength} / {maxMessageLength}
                      </span>
                    </div>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader className="mr-2 h-4 w-4" />}
                  {!isSubmitting && <Send className="mr-2 h-4 w-4" />}
                  Send Message
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </motion.div>
      </DialogContent>
    </Dialog>
  )
}
