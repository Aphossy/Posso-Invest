"use client"

import { useEffect, useMemo, useState } from "react"
import {
  POSSO_MESSAGE_SERVICE_LABELS,
  POSSO_MESSAGE_SERVICE_OPTIONS,
} from "@/constants/message-services"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  CheckCircle2,
  ChevronRight,
  HelpCircle,
  Loader2,
  Mail,
  MessageSquare,
  Phone,
  Plus,
  RefreshCcw,
  Send,
} from "lucide-react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { useSession } from "@/lib/auth-client"
import {
  createMessageApiSchema,
  type CreateMessageApiInput,
} from "@/lib/validators/message-validators"
import { useMessages } from "@/hooks/api/use-messages"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Loader } from "@/components/common/loader"

// ─── Service label mapping ────────────────────────────────────────────────────
export const SERVICE_LABELS: Record<string, string> =
  POSSO_MESSAGE_SERVICE_LABELS

const SERVICE_OPTIONS = POSSO_MESSAGE_SERVICE_OPTIONS

// ─── Status helpers ───────────────────────────────────────────────────────────
const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  new: { label: "New", className: "bg-blue-100 text-blue-700" },
  read: { label: "Received", className: "bg-slate-100 text-slate-600" },
  "in-progress": {
    label: "In Progress",
    className: "bg-amber-100 text-amber-700",
  },
  resolved: {
    label: "Resolved",
    className: "bg-emerald-100 text-emerald-700",
  },
  archived: { label: "Archived", className: "bg-slate-100 text-slate-500" },
}

function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_BADGE[status] ?? STATUS_BADGE.new
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.className}`}>
      {cfg.label}
    </span>
  )
}

function formatDate(val?: string | Date | null) {
  if (!val) return "-"
  const d = val instanceof Date ? val : new Date(val)
  return d.toLocaleDateString("en-RW", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface Ticket {
  id: string
  messageCode?: string | null
  name: string
  email: string
  service: string
  subject: string
  message: string
  status: string
  priority?: string | null
  responseCount?: string | null
  createdAt: string | Date
  updatedAt: string | Date
}

interface AdminResponse {
  id: string
  content: string
  isInternal?: boolean | null
  responderName?: string | null
  createdAt: string | Date
}

// ─── Ticket Detail Sheet ──────────────────────────────────────────────────────
function TicketDetailDialog({
  ticket,
  onClose,
}: {
  ticket: Ticket | null
  onClose: () => void
}) {
  const [responses, setResponses] = useState<AdminResponse[]>([])
  const [loadingResponses, setLoadingResponses] = useState(false)

  useEffect(() => {
    if (!ticket) return
    setLoadingResponses(true)
    fetch(`/api/message/${ticket.id}/responses`)
      .then((r) => r.json())
      .then((data) => setResponses(data?.data?.responses ?? []))
      .catch(() => {})
      .finally(() => setLoadingResponses(false))
  }, [ticket])

  if (!ticket) return null

  return (
    <Dialog open={Boolean(ticket)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <StatusPill status={ticket.status} />
            {ticket.messageCode ? (
              <span className="font-mono text-xs text-muted-foreground">
                {ticket.messageCode}
              </span>
            ) : null}
          </div>
          <DialogTitle className="text-lg leading-snug">
            {ticket.subject}
          </DialogTitle>
          <DialogDescription>
            {SERVICE_LABELS[ticket.service] ?? ticket.service} ·{" "}
            {formatDate(ticket.createdAt)}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-1 px-1">
          <div className="space-y-4 pb-2">
            {/* Original message */}
            <div className="rounded-md bg-muted/50 p-4 text-sm whitespace-pre-wrap">
              {ticket.message}
            </div>

            {/* Admin responses */}
            {loadingResponses ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader className="h-3 w-3" />
                Loading responses…
              </div>
            ) : responses.length > 0 ? (
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Responses from Support
                </p>
                {responses.map((r) => (
                  <div
                    key={r.id}
                    className="rounded-md border-l-2 border-primary bg-primary/5 p-3 text-sm">
                    <p className="whitespace-pre-wrap">{r.content}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {r.responderName ?? "Support"} · {formatDate(r.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            ) : ticket.status !== "new" && ticket.status !== "read" ? null : (
              <p className="text-xs text-muted-foreground">
                No responses yet. Our team will get back to you soon.
              </p>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

// ─── New Ticket Dialog ────────────────────────────────────────────────────────
function NewTicketDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSuccess: () => void
}) {
  const { data: session } = useSession()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<CreateMessageApiInput>({
    resolver: zodResolver(createMessageApiSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      service: "other",
      subject: "",
      message: "",
    },
  })

  useEffect(() => {
    if (!open) return

    form.reset({
      name: session?.user?.name ?? "",
      email: session?.user?.email ?? "",
      phone: "",
      service: "other",
      subject: "",
      message: "",
    })
    setError(null)
  }, [open, session?.user?.email, session?.user?.name, form])

  const handleSubmit = async (values: CreateMessageApiInput) => {
    setError(null)
    setSubmitting(true)

    try {
      const res = await fetch("/api/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })
      const payload = await res.json()

      if (!res.ok) {
        const validationErrors = payload?.error?.validationErrors
        if (Array.isArray(validationErrors) && validationErrors.length > 0) {
          for (const issue of validationErrors) {
            const key = issue?.path as keyof CreateMessageApiInput | undefined
            if (key) {
              form.setError(key, {
                type: "server",
                message: issue.message,
              })
            }
          }
        }

        const msg =
          payload?.error?.message ||
          payload?.message ||
          "Failed to submit ticket"

        if (payload?.error?.code === "TOO_MANY_REQUESTS") {
          const mins = payload.error.details?.retryAfter
            ? Math.ceil(payload.error.details.retryAfter / 60)
            : 0
          setError(
            `Rate limit reached. ${mins > 0 ? `Try again in ${mins} minute${mins > 1 ? "s" : ""}.` : "Please wait before submitting again."}`
          )
        } else {
          setError(msg)
        }

        return
      }

      const code = payload?.data?.message?.messageCode
      toast.success(`Ticket submitted!${code ? ` Reference: ${code}` : ""}`, {
        duration: 6000,
      })
      onSuccess()
      onOpenChange(false)
    } catch (err: any) {
      setError(err?.message ?? "Failed to submit ticket")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Support Ticket</DialogTitle>
          <DialogDescription>
            Describe your issue and you will get response within 24 hours.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
            noValidate>
            {error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={submitting} required />
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
                        disabled
                        readOnly
                        required
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <PhoneInput
                        defaultCountry="RW"
                        international
                        value={field.value}
                        onChange={(v) => field.onChange(v ?? "")}
                        disabled={submitting}
                        className="w-full"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="service"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={submitting}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SERVICE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                      placeholder="Brief description of your issue"
                      disabled={submitting}
                      required
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
                      placeholder="Describe your issue in detail…"
                      rows={5}
                      disabled={submitting}
                      required
                      className="resize-none"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Submit Ticket
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

// ─── FAQ ──────────────────────────────────────────────────────────────────────
const FAQ_ITEMS = [
  {
    category: "Contributions & Savings",
    items: [
      {
        q: "What is the monthly contribution amount?",
        a: "Each member contributes 80,000 RWF per month. Payments are accepted between the 25th of the current month and the 6th of the following month.",
      },
      {
        q: "What happens if I pay late?",
        a: "Late payments attract a 10% penalty on the contribution amount. A one-month grace period may be granted with a valid reason and prior notification.",
      },
      {
        q: "Can I lose membership for missed contributions?",
        a: "Yes. A member may be dismissed if they go three consecutive months without saving.",
      },
    ],
  },
  {
    category: "Loans & Repayments",
    items: [
      {
        q: "How much can I borrow?",
        a: "Members can request a loan up to the total amount they have saved in the group.",
      },
      {
        q: "What is the loan interest rate?",
        a: "Loans are repaid with a 5% interest rate.",
      },
      {
        q: "How fast are loans disbursed?",
        a: "Approved loans are disbursed within three business days.",
      },
      {
        q: "What if a loan is not repaid on time?",
        a: "A member who fails to repay over three months without a known reason may be dismissed and the loan recovered from their savings.",
      },
    ],
  },
  {
    category: "Meetings & Governance",
    items: [
      {
        q: "How often are meetings held?",
        a: "Regular meetings are held monthly, rotating across member locations.",
      },
      {
        q: "Is there a contribution for meetings?",
        a: "Yes. Each member contributes 10,000 RWF per meeting to cover hosting and planning costs.",
      },
      {
        q: "How often are finances audited?",
        a: "Financial activities and reports are reviewed every four months.",
      },
    ],
  },
  {
    category: "Account & Access",
    items: [
      {
        q: "How do I update my profile?",
        a: "Go to Settings from your dashboard and update your name, email, or phone number. Save changes before leaving.",
      },
      {
        q: "How do I reset my password?",
        a: "Click 'Forgot Password' on the login page, enter your email, and follow the reset link sent to your inbox.",
      },
    ],
  },
]

function FAQTab() {
  return (
    <div className="space-y-6">
      {FAQ_ITEMS.map((cat) => (
        <div key={cat.category} className="space-y-2">
          <h3 className="font-semibold text-sm">{cat.category}</h3>
          <Accordion type="single" collapsible className="w-full">
            {cat.items.map((item, i) => (
              <AccordionItem key={i} value={`${cat.category}-${i}`}>
                <AccordionTrigger className="text-left text-sm hover:no-underline">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      ))}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Still have questions?</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p>
            <span className="font-medium">Email:</span>{" "}
            trustlinkgrouprw@gmail.com
          </p>
          <p>
            <span className="font-medium">Phone:</span> +250 788 000 000
          </p>
          <p>
            <span className="font-medium">Response time:</span> Within 24 hours
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Main view ────────────────────────────────────────────────────────────────
export function UserSupportView() {
  const { data: session } = useSession()
  const { data, isPending, error, refetch, isRefetching } = useMessages({
    limit: 100,
  })

  const [newOpen, setNewOpen] = useState(false)
  const [selected, setSelected] = useState<Ticket | null>(null)

  const allMessages = useMemo(() => data?.data.messages ?? [], [data])
  const myTickets = useMemo(
    () =>
      allMessages.filter((m) => m.email === session?.user?.email) as Ticket[],
    [allMessages, session?.user?.email]
  )

  const counts = useMemo(
    () => ({
      total: myTickets.length,
      open: myTickets.filter((t) =>
        ["new", "read", "in-progress"].includes(t.status)
      ).length,
      resolved: myTickets.filter((t) => t.status === "resolved").length,
    }),
    [myTickets]
  )

  return (
    <div className="flex-1 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Support Center</h1>
          <p className="text-sm text-muted-foreground">
            Submit a ticket or browse answers to common questions.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refetch()}
            disabled={isRefetching}>
            <RefreshCcw className="h-4 w-4" />
            {isRefetching ? "Refreshing…" : "Refresh"}
          </Button>
          <Button size="sm" onClick={() => setNewOpen(true)}>
            <Plus className="h-4 w-4" />
            New Ticket
          </Button>
        </div>
      </div>

      {/* Contact quick-links */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Email Support</CardTitle>
            <Mail className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">trustlinkgrouprw@gmail.com</p>
            <p className="text-xs text-muted-foreground">Response within 24h</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Phone</CardTitle>
            <Phone className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">+250 788 000 000</p>
            <p className="text-xs text-muted-foreground">
              Mon–Fri, 8 AM – 6 PM
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">My Tickets</CardTitle>
            <MessageSquare className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">
              {isPending ? <Loader className="h-5 w-5" /> : counts.open}
            </p>
            <p className="text-xs text-muted-foreground">
              {counts.open === 1 ? "Open ticket" : "Open tickets"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="tickets">
        <TabsList>
          <TabsTrigger value="tickets">
            <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
            My Tickets
            {counts.open > 0 ? (
              <span className="ml-1.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                {counts.open}
              </span>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="faq">
            <HelpCircle className="mr-1.5 h-3.5 w-3.5" />
            FAQ
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tickets" className="mt-4">
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>
                {error.message || "Failed to load tickets."}
              </AlertDescription>
            </Alert>
          ) : isPending ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-8">
              <Loader className="h-4 w-4" />
              Loading your tickets…
            </div>
          ) : myTickets.length === 0 ? (
            <div className="rounded-md border border-dashed p-10 text-center">
              <MessageSquare className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm font-medium">No tickets yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Submit a ticket and our support team will respond within 24
                hours.
              </p>
              <Button
                size="sm"
                className="mt-4"
                onClick={() => setNewOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create First Ticket
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {myTickets.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelected(t)}
                  className="w-full rounded-lg border p-4 text-left transition hover:bg-muted/50">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium truncate">
                          {t.subject}
                        </p>
                        <StatusPill status={t.status} />
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {SERVICE_LABELS[t.service] ?? t.service} ·{" "}
                        {formatDate(t.createdAt)}
                        {t.messageCode ? ` · ${t.messageCode}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      {Number(t.responseCount ?? 0) > 0 ? (
                        <span className="flex items-center gap-1 text-xs text-emerald-600">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {t.responseCount}{" "}
                          {Number(t.responseCount) === 1 ? "reply" : "replies"}
                        </span>
                      ) : null}
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="faq" className="mt-4">
          <FAQTab />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <NewTicketDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        onSuccess={() => void refetch()}
      />
      <TicketDetailDialog ticket={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
