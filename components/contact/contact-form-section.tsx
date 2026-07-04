"use client"

import { useState } from "react"
import { POSSO_MESSAGE_SERVICE_OPTIONS } from "@/constants/message-services"
import { motion } from "framer-motion"
import { AlertCircle, CheckCircle, Send } from "lucide-react"

import { apiClient } from "@/lib/api-client"
import { validateContactForm } from "@/lib/validators/message-validators"
import type { ContactFormData } from "@/lib/validators/message-validators"
import type { SubmitContactFormResponse } from "@/hooks/api/use-contact-form"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PhoneInput } from "@/components/ui/phone-input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

import { Loader } from "../common/loader"

interface FormError {
  [key: string]: string
}

interface ContactFormSectionProps {
  initialService?: ContactFormData["service"]
  initialSubject?: string
  initialMessage?: string
  variant?: "default" | "contact"
  embedded?: boolean
  showIntro?: boolean
}

export function ContactFormSection({
  initialService,
  initialSubject,
  initialMessage,
  variant = "default",
  embedded = false,
  showIntro = true,
}: ContactFormSectionProps) {
  const isContactVariant = variant === "contact"

  const [formData, setFormData] = useState<ContactFormData>({
    name: "",
    email: "",
    phone: "",
    service: initialService ?? "other",
    subject: initialSubject ?? "",
    message: initialMessage ?? "",
  })

  const [formErrors, setFormErrors] = useState<FormError>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<{
    type: "success" | "error" | null
    message: string
  }>({
    type: null,
    message: "",
  })
  const [messageCode, setMessageCode] = useState<string>("")

  const handleInputChange = (field: keyof ContactFormData, value: string) => {
    setFormData({ ...formData, [field]: value })
    // Clear error for this field when user starts typing
    if (formErrors[field]) {
      setFormErrors({ ...formErrors, [field]: "" })
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmitStatus({ type: null, message: "" })
    setFormErrors({})

    // Validate form
    const validation = validateContactForm(formData)

    if (!validation.success) {
      const errors: FormError = {}
      validation.errors?.forEach((error) => {
        errors[error.field] = error.message
      })
      setFormErrors(errors)
      return
    }

    setIsSubmitting(true)

    try {
      const response = await apiClient.post<SubmitContactFormResponse>(
        "/api/message",
        formData
      )

      if (response.success && response.data?.message?.messageCode) {
        // Success
        setMessageCode(response.data.message.messageCode)
        setSubmitStatus({
          type: "success",
          message:
            response.message ||
            "Message sent successfully! We'll get back to you within 24 hours.",
        })

        // Reset form
        setFormData({
          name: "",
          email: "",
          phone: "",
          service: "other",
          subject: "",
          message: "",
        })

        // Clear success message after 5 seconds
        setTimeout(() => {
          setSubmitStatus({ type: null, message: "" })
        }, 5000)
      } else {
        setSubmitStatus({
          type: "error",
          message:
            (response as any)?.message ||
            "Failed to send message. Please try again later.",
        })
      }
    } catch (error) {
      const errorMessage =
        (error as any)?.response?.data?.message ||
        (error as any)?.message ||
        "An error occurred while sending your message. Please try again."

      setSubmitStatus({
        type: "error",
        message: errorMessage,
      })

      console.error("Form submission error:", error as unknown)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section
      className={
        embedded
          ? "py-0 bg-transparent"
          : isContactVariant
            ? "py-0 bg-transparent"
            : "py-20 bg-background"
      }>
      <div
        className={
          embedded ? "w-full" : "container mx-auto px-4 sm:px-6 lg:px-8"
        }>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className={embedded ? "w-full" : "max-w-3xl mx-auto"}>
          {showIntro && (
            <div className="text-center mb-12">
              <h2
                className={`text-3xl sm:text-4xl font-bold mb-4 ${
                  isContactVariant ? "text-[#FFFFFF]" : "text-foreground"
                }`}>
                Send Us a Message
              </h2>
              <p
                className={`text-lg ${
                  isContactVariant
                    ? "text-[#F7F3EC]/72"
                    : "text-muted-foreground"
                }`}>
                Fill out the form below and we'll get back to you within 24
                hours
              </p>
            </div>
          )}

          <div
            className={`rounded-2xl p-8 ${
              isContactVariant
                ? "border border-[#FFFFFF]/12 bg-[#FFFFFF]/6 backdrop-blur-sm"
                : "bg-card border border-border"
            }`}>
            {/* Success Alert */}
            {submitStatus.type === "success" && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-6">
                <Alert
                  className={
                    isContactVariant
                      ? "border-emerald-300/40 bg-emerald-300/10 text-emerald-50"
                      : "border-green-200 bg-green-50"
                  }>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <AlertDescription
                    className={
                      isContactVariant ? "text-emerald-50" : "text-green-800"
                    }>
                    <div className="font-semibold">{submitStatus.message}</div>
                    {messageCode && (
                      <div className="text-sm mt-2">
                        Your message code:{" "}
                        <span className="font-mono font-bold">
                          {messageCode}
                        </span>
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              </motion.div>
            )}

            {/* Error Alert */}
            {submitStatus.type === "error" && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-6">
                <Alert
                  className={
                    isContactVariant
                      ? "border-red-300/40 bg-red-300/10 text-red-50"
                      : "border-red-200 bg-red-50"
                  }>
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <AlertDescription
                    className={
                      isContactVariant ? "text-red-100" : "text-red-800"
                    }>
                    {submitStatus.message}
                  </AlertDescription>
                </Alert>
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6" noValidate>
              {/* Name and Email Row */}
              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <Label
                    htmlFor="name"
                    className={`flex items-center ${
                      isContactVariant ? "text-[#F7F3EC]/88" : ""
                    }`}>
                    Full Name
                    <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    disabled={isSubmitting}
                    className={`mt-2 ${
                      isContactVariant
                        ? "border-[#FFFFFF]/20 bg-[#0B1F3A]/45 text-[#F7F3EC] placeholder:text-[#F7F3EC]/45"
                        : ""
                    } ${
                      formErrors.name
                        ? "border-red-500 focus-visible:ring-red-500"
                        : ""
                    }`}
                    aria-invalid={!!formErrors.name}
                    aria-describedby={
                      formErrors.name ? "name-error" : undefined
                    }
                  />
                  {formErrors.name && (
                    <p id="name-error" className="text-red-500 text-xs mt-1">
                      {formErrors.name}
                    </p>
                  )}
                </div>

                <div>
                  <Label
                    htmlFor="email"
                    className={`flex items-center ${
                      isContactVariant ? "text-[#F7F3EC]/88" : ""
                    }`}>
                    Email Address
                    <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@example.com"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    disabled={isSubmitting}
                    className={`mt-2 ${
                      isContactVariant
                        ? "border-[#FFFFFF]/20 bg-[#0B1F3A]/45 text-[#F7F3EC] placeholder:text-[#F7F3EC]/45"
                        : ""
                    } ${
                      formErrors.email
                        ? "border-red-500 focus-visible:ring-red-500"
                        : ""
                    }`}
                    aria-invalid={!!formErrors.email}
                    aria-describedby={
                      formErrors.email ? "email-error" : undefined
                    }
                  />
                  {formErrors.email && (
                    <p id="email-error" className="text-red-500 text-xs mt-1">
                      {formErrors.email}
                    </p>
                  )}
                </div>
              </div>

              {/* Phone and Service Row */}
              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <Label
                    htmlFor="phone"
                    className={`flex items-center ${
                      isContactVariant ? "text-[#F7F3EC]/88" : ""
                    }`}>
                    Phone Number
                    <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <PhoneInput
                    id="phone"
                    defaultCountry="RW"
                    international
                    value={formData.phone || ""}
                    onChange={(value) =>
                      handleInputChange("phone", value || "")
                    }
                    placeholder="+250 786 123 456"
                    disabled={isSubmitting}
                    className={`mt-2 w-full text-sm sm:text-base ${
                      isContactVariant
                        ? "border-[#FFFFFF]/20 bg-[#0B1F3A]/45 text-[#F7F3EC] placeholder:text-[#F7F3EC]/45"
                        : ""
                    } ${
                      formErrors.phone
                        ? "border-red-500 focus-visible:ring-red-500"
                        : ""
                    }`}
                    aria-invalid={!!formErrors.phone}
                    aria-describedby={
                      formErrors.phone ? "phone-error" : undefined
                    }
                  />
                  {formErrors.phone && (
                    <p id="phone-error" className="text-red-500 text-xs mt-1">
                      {formErrors.phone}
                    </p>
                  )}
                </div>

                <div>
                  <Label
                    htmlFor="service"
                    className={`flex items-center ${
                      isContactVariant ? "text-[#F7F3EC]/88" : ""
                    }`}>
                    Service
                    <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Select
                    value={formData.service}
                    onValueChange={(value) =>
                      handleInputChange("service", value)
                    }
                    disabled={isSubmitting}>
                    <SelectTrigger
                      id="service"
                      className={`mt-2 ${
                        isContactVariant
                          ? "border-[#FFFFFF]/20 bg-[#0B1F3A]/45 text-[#F7F3EC]"
                          : ""
                      } ${
                        formErrors.service
                          ? "border-red-500 focus-visible:ring-red-500"
                          : ""
                      }`}
                      aria-invalid={!!formErrors.service}
                      aria-describedby={
                        formErrors.service ? "service-error" : undefined
                      }>
                      <SelectValue placeholder="Select a service" />
                    </SelectTrigger>
                    <SelectContent
                      className={
                        isContactVariant
                          ? "border-[#FFFFFF]/20 bg-[#132949] text-[#F7F3EC]"
                          : ""
                      }>
                      {POSSO_MESSAGE_SERVICE_OPTIONS.map((service) => (
                        <SelectItem key={service.value} value={service.value}>
                          {service.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formErrors.service && (
                    <p id="service-error" className="text-red-500 text-xs mt-1">
                      {formErrors.service}
                    </p>
                  )}
                </div>
              </div>

              {/* Subject */}
              <div>
                <Label
                  htmlFor="subject"
                  className={`flex items-center ${
                    isContactVariant ? "text-[#F7F3EC]/88" : ""
                  }`}>
                  Subject
                  <span className="text-red-500 ml-1">*</span>
                </Label>
                <Input
                  id="subject"
                  type="text"
                  placeholder="How can we help?"
                  value={formData.subject}
                  onChange={(e) => handleInputChange("subject", e.target.value)}
                  disabled={isSubmitting}
                  className={`mt-2 text-sm sm:text-base ${
                    isContactVariant
                      ? "border-[#FFFFFF]/20 bg-[#0B1F3A]/45 text-[#F7F3EC] placeholder:text-[#F7F3EC]/45"
                      : ""
                  } ${
                    formErrors.subject
                      ? "border-red-500 focus-visible:ring-red-500"
                      : ""
                  }`}
                  aria-invalid={!!formErrors.subject}
                  aria-describedby={
                    formErrors.subject ? "subject-error" : undefined
                  }
                />
                {formErrors.subject && (
                  <p id="subject-error" className="text-red-500 text-xs mt-1">
                    {formErrors.subject}
                  </p>
                )}
              </div>

              {/* Message */}
              <div>
                <Label
                  htmlFor="message"
                  className={`flex items-center ${
                    isContactVariant ? "text-[#F7F3EC]/88" : ""
                  }`}>
                  Message
                  <span className="text-red-500 ml-1">*</span>
                </Label>
                <Textarea
                  id="message"
                  placeholder="Tell us more about your inquiry..."
                  rows={6}
                  value={formData.message}
                  onChange={(e) => handleInputChange("message", e.target.value)}
                  disabled={isSubmitting}
                  className={`mt-2 text-sm sm:text-base ${
                    isContactVariant
                      ? "border-[#FFFFFF]/20 bg-[#0B1F3A]/45 text-[#F7F3EC] placeholder:text-[#F7F3EC]/45"
                      : ""
                  } ${
                    formErrors.message
                      ? "border-red-500 focus-visible:ring-red-500"
                      : ""
                  }`}
                  aria-invalid={!!formErrors.message}
                  aria-describedby={
                    formErrors.message ? "message-error" : undefined
                  }
                />
                {formErrors.message && (
                  <p id="message-error" className="text-red-500 text-xs mt-1">
                    {formErrors.message}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                size="lg"
                disabled={isSubmitting}
                className={`w-full disabled:opacity-50 disabled:cursor-not-allowed group ${
                  isContactVariant
                    ? "bg-[#FFFFFF] text-primary hover:bg-[#E6E6E6]"
                    : "bg-primary hover:bg-primary/80"
                }`}>
                {isSubmitting ? (
                  <>
                    <Loader className="mr-2 h-5 w-5" />
                    Sending...
                  </>
                ) : (
                  <>
                    Send Message
                    <Send className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>

              <p
                className={`text-sm text-center ${
                  isContactVariant
                    ? "text-[#F7F3EC]/62"
                    : "text-muted-foreground"
                }`}>
                We typically respond within 24 hours during business days.
              </p>
            </form>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
