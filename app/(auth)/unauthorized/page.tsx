"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Lock, LogOut, Mail, ShieldCheck, Video } from "lucide-react"
import { toast } from "sonner"

import { authClient } from "@/lib/auth-client"
import { useMediaQuery } from "@/hooks/use-media-query"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader } from "@/components/common/loader"

const TUTORIAL_URL = "https://youtu.be/Lrf3ECWCfDM"

const invitationSteps = [
  {
    title: "Check your invitation email",
    description:
      "You should have received an invitation link by email. If you don't see it in your inbox, check your Spam or Junk folder - it sometimes ends up there.",
  },
  {
    title: "Login with Google",
    description:
      'Use the same email address the invitation was sent to. On the login page, click "Login with Google" to sign in.',
  },
  {
    title: "Accept the invitation",
    description:
      'After logging in, go back to your email and click the "Accept Invitation" link. You\'ll be granted access automatically.',
  },
]

function InvitationGuide({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="space-y-5">
      <ol className="space-y-4">
        {invitationSteps.map((step, i) => (
          <li key={i} className="flex gap-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#165598]/10 text-[#165598] font-bold text-sm">
              {i + 1}
            </div>
            <div className="space-y-0.5">
              <p className="font-semibold text-sm">{step.title}</p>
              <p className="text-sm text-muted-foreground">
                {step.description}
              </p>
            </div>
          </li>
        ))}
      </ol>

      <div className="rounded-lg border border-[#165598]/20 bg-[#165598]/5 p-4 flex items-start gap-3">
        <Video className="mt-0.5 h-4 w-4 shrink-0 text-[#165598]" />
        <div className="space-y-1">
          <p className="text-sm font-medium">Need a visual walkthrough?</p>
          <a
            href={TUTORIAL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-[#165598] underline underline-offset-4 hover:text-[#165598]/80">
            Watch the tutorial video →
          </a>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Button variant="secondary" className="w-full" onClick={onContinue}>
          I don't have an invitation - contact support
        </Button>
      </div>
    </div>
  )
}

const reasonCopy: Record<string, { title: string; description: string }> = {
  "no-organization": {
    title: "Access not ready",
    description:
      "We couldn’t find an active organization for your account. Ask an admin to invite you, then sign in again.",
  },
  "no-role": {
    title: "Access pending",
    description:
      "Your membership is missing a role. Please contact an admin to assign one.",
  },
  "role-unavailable": {
    title: "Access unavailable",
    description:
      "We couldn’t confirm your organization role right now. Please try again or contact support.",
  },
}

export default function UnauthorizedPage() {
  const router = useRouter()
  const isDesktop = useMediaQuery("(min-width: 768px)")
  const searchParams = useSearchParams()
  const reason = searchParams.get("reason") || "no-organization"
  const copy = reasonCopy[reason] ?? reasonCopy["no-organization"]
  const { data: session } = authClient.useSession()
  const user = session?.user

  const nameRef = useRef<HTMLInputElement | null>(null)
  const emailRef = useRef<HTMLInputElement | null>(null)
  const subjectRef = useRef<HTMLInputElement | null>(null)
  const messageRef = useRef<HTMLTextAreaElement | null>(null)

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  })
  const [errors, setErrors] = useState<Partial<typeof formData>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isGuideOpen, setIsGuideOpen] = useState(false)

  useEffect(() => {
    if (!user) return
    setFormData((prev) => ({
      ...prev,
      name: prev.name || user.name || "",
      email: prev.email || user.email || "",
    }))
  }, [user])

  const updateField = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  const validateForm = () => {
    const nextErrors: Partial<typeof formData> = {}
    const nameValue = formData.name.trim()
    const emailValue = formData.email.trim()
    const subjectValue = formData.subject.trim()
    const messageValue = formData.message.trim()

    if (!nameValue) {
      nextErrors.name = "Name is required."
    }
    if (!emailValue) {
      nextErrors.email = "Email is required."
    } else if (!/^\S+@\S+\.\S+$/.test(emailValue)) {
      nextErrors.email = "Please enter a valid email address."
    }
    if (!subjectValue) {
      nextErrors.subject = "Subject must be at least 5 characters."
    } else if (subjectValue.length < 5) {
      nextErrors.subject = "Subject must be at least 5 characters."
    }
    if (!messageValue) {
      nextErrors.message = "Message must be at least 10 characters."
    } else if (messageValue.length < 10) {
      nextErrors.message = "Message must be at least 10 characters."
    }

    setErrors(nextErrors)

    const firstErrorField = Object.keys(nextErrors)[0]
    if (firstErrorField) {
      const fieldMap: Record<string, React.RefObject<any>> = {
        name: nameRef,
        email: emailRef,
        subject: subjectRef,
        message: messageRef,
      }
      fieldMap[firstErrorField]?.current?.focus()
    }

    return Object.keys(nextErrors).length === 0
  }

  const submitRequest = async () => {
    if (isSubmitting) return
    if (!validateForm()) return

    setIsSubmitting(true)

    try {
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        subject: formData.subject.trim(),
        message: formData.message.trim(),
        service: "access-technical",
      }

      const response = await fetch("/api/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        const errorMessage =
          data?.error?.message || data?.message || "Failed to send request."

        if (data?.error?.validationErrors) {
          const nextErrors: Partial<typeof formData> = {}
          for (const issue of data.error.validationErrors) {
            if (issue?.path && issue?.message) {
              nextErrors[issue.path as keyof typeof formData] = issue.message
            }
          }
          setErrors((prev) => ({ ...prev, ...nextErrors }))
          const firstField = Object.keys(nextErrors)[0]
          if (firstField) {
            const fieldMap: Record<string, React.RefObject<any>> = {
              name: nameRef,
              email: emailRef,
              subject: subjectRef,
              message: messageRef,
            }
            fieldMap[firstField]?.current?.focus()
          }
        }

        if (data?.error?.code === "TOO_MANY_REQUESTS") {
          const retryAfter = data?.error?.details?.retryAfter
          const retryLabel =
            typeof retryAfter === "number" || typeof retryAfter === "string"
              ? ` Please retry in ${retryAfter}s.`
              : ""
          throw new Error(`${errorMessage}${retryLabel}`)
        }

        if (data?.error?.help) {
          throw new Error(`${errorMessage} ${data.error.help}`)
        }

        throw new Error(errorMessage)
      }

      toast.success("Request sent. An admin will review your access.")
      setFormData((prev) => ({ ...prev, subject: "", message: "" }))
      setIsDialogOpen(false)
    } catch (error: any) {
      toast.error(error?.message || "Unable to send request.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    await submitRequest()
  }

  const handleLogout = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.replace("/login")
        },
      },
    })
  }

  const handleRequestAccessOpenChange = (open: boolean) => {
    setIsDialogOpen(open)
    if (open) {
      setErrors({})
    }
  }

  const requestAccessForm = (
    <form className="space-y-3" onSubmit={handleSubmit}>
      <div className="space-y-1">
        <Label htmlFor="name">Full name</Label>
        <Input
          ref={nameRef}
          id="name"
          name="name"
          autoComplete="name"
          value={formData.name}
          onChange={(event) => updateField("name", event.target.value)}
          placeholder="Jane Doe…"
        />
        {errors.name && (
          <p className="text-xs text-destructive">{errors.name}</p>
        )}
      </div>

      <div className="space-y-1">
        <Label htmlFor="email">Email</Label>
        <Input
          ref={emailRef}
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          spellCheck={false}
          value={formData.email}
          onChange={(event) => updateField("email", event.target.value)}
          placeholder="jane@example.com…"
        />
        {errors.email && (
          <p className="text-xs text-destructive">{errors.email}</p>
        )}
      </div>

      <div className="space-y-1">
        <Label htmlFor="subject">Subject</Label>
        <Input
          ref={subjectRef}
          id="subject"
          name="subject"
          value={formData.subject}
          onChange={(event) => updateField("subject", event.target.value)}
          placeholder="Request access to Posso Ventures…"
        />
        {errors.subject && (
          <p className="text-xs text-destructive">{errors.subject}</p>
        )}
      </div>

      <div className="space-y-1">
        <Label htmlFor="message">Request details</Label>
        <Textarea
          ref={messageRef}
          id="message"
          name="message"
          value={formData.message}
          onChange={(event) => updateField("message", event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
              event.preventDefault()
              void submitRequest()
            }
          }}
          placeholder="I was invited as treasurer for TrustLink Group…"
          rows={5}
        />
        {errors.message && (
          <p className="text-xs text-destructive">{errors.message}</p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <span className="inline-flex items-center gap-2">
            <Loader className="h-4 w-4" />
            Send request
          </span>
        ) : (
          "Send request"
        )}
      </Button>
    </form>
  )

  return (
    <div className="mx-auto flex min-h-screen max-w-xl items-center px-4 py-12">
      <Card className="w-full">
        <CardHeader className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <Lock className="h-4 w-4" />
            Posso Ventures Access
          </div>
          <CardTitle className="text-2xl">{copy.title}</CardTitle>
          <CardDescription>{copy.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            {/* Request access button - opens guide first */}
            <Button
              type="button"
              className="w-full"
              onClick={() => setIsGuideOpen(true)}>
              <span className="inline-flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Request access…
              </span>
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleLogout}>
              <span className="inline-flex items-center gap-2">
                <LogOut className="h-4 w-4" />
                Log out
              </span>
            </Button>

            <Button asChild variant="outline" className="w-full">
              <Link href="/">
                <span className="inline-flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  Back to home
                </span>
              </Link>
            </Button>
          </div>

          {/* Guide dialog/drawer - opens first */}
          {isDesktop ? (
            <Dialog open={isGuideOpen} onOpenChange={setIsGuideOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>How to get access</DialogTitle>
                  <DialogDescription>
                    Follow these steps to accept your invitation and join.
                  </DialogDescription>
                </DialogHeader>
                <InvitationGuide
                  onContinue={() => {
                    setIsGuideOpen(false)
                    handleRequestAccessOpenChange(true)
                  }}
                />
              </DialogContent>
            </Dialog>
          ) : (
            <Drawer open={isGuideOpen} onOpenChange={setIsGuideOpen}>
              <DrawerContent className="max-h-[92vh]">
                <DrawerHeader className="text-left">
                  <DrawerTitle>How to get access</DrawerTitle>
                  <DrawerDescription>
                    Follow these steps to accept your invitation and join.
                  </DrawerDescription>
                </DrawerHeader>
                <div className="overflow-y-auto px-4 pb-6">
                  <InvitationGuide
                    onContinue={() => {
                      setIsGuideOpen(false)
                      handleRequestAccessOpenChange(true)
                    }}
                  />
                </div>
              </DrawerContent>
            </Drawer>
          )}

          {/* Request access form dialog/drawer - opens after guide */}
          {isDesktop ? (
            <Dialog
              open={isDialogOpen}
              onOpenChange={handleRequestAccessOpenChange}>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Request access</DialogTitle>
                  <DialogDescription>
                    Send your details and we’ll notify the committee.
                  </DialogDescription>
                </DialogHeader>
                {requestAccessForm}
              </DialogContent>
            </Dialog>
          ) : (
            <Drawer
              open={isDialogOpen}
              onOpenChange={handleRequestAccessOpenChange}>
              <DrawerContent className="max-h-[92vh]">
                <DrawerHeader className="text-left">
                  <DrawerTitle>Request access</DrawerTitle>
                  <DrawerDescription>
                    Send your details and we’ll notify the committee.
                  </DrawerDescription>
                </DrawerHeader>
                <div className="overflow-y-auto px-4 pb-4">
                  {requestAccessForm}
                </div>
              </DrawerContent>
            </Drawer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
