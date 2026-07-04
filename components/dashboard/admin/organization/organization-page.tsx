"use client"

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react"
import Image from "next/image"
import Link from "next/link"
import {
  organisationLogo,
  organisationName,
  organisationSlogan,
} from "@/constants/organisation"
import { Building2, MailPlus, RefreshCw, Sparkles, Users } from "lucide-react"
import { toast } from "sonner"

import { authClient } from "@/lib/auth-client"
import { organizationClient } from "@/lib/organization-client"
import { useAdminUsers } from "@/hooks/use-admin-users"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { InvitationsTable } from "@/components/dashboard/admin/members/invitations-table"
import InviteUserDialog from "@/components/dashboard/admin/members/invite-user-dialog"
import { UserStatsCards } from "@/components/dashboard/admin/members/user-stats-cards"
import UsersTable from "@/components/dashboard/admin/members/users-table"
import { OrganizationLogoUpload } from "@/components/dashboard/admin/organization/organization-logo-upload"

type OrgFormState = {
  name: string
  slug: string
  logo: string
  metadata: string
}

type OrgFormErrors = Partial<Record<keyof OrgFormState, string>>

const emptyForm: OrgFormState = {
  name: "",
  slug: "",
  logo: "",
  metadata: "",
}

const toSlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const normalizeMetadataObject = (
  value: unknown
): Record<string, unknown> | undefined => {
  if (!value) return undefined

  if (typeof value === "string") {
    const trimmed = value.trim()
    if (!trimmed) return undefined

    try {
      const parsed = JSON.parse(trimmed)
      return isRecord(parsed) ? parsed : undefined
    } catch {
      return undefined
    }
  }

  return isRecord(value) ? value : undefined
}

const serializeMetadataValue = (value: unknown) => {
  const normalized = normalizeMetadataObject(value)
  return normalized ? JSON.stringify(normalized, null, 2) : ""
}

const parseMetadata = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) return undefined

  const parsed = JSON.parse(trimmed)
  if (!isRecord(parsed)) {
    throw new Error("Metadata must be a JSON object.")
  }

  return parsed
}

const buildOrgFormState = (
  organization?: any,
  metadataValue = ""
): OrgFormState => ({
  name: organization?.name ?? "",
  slug: organization?.slug ?? "",
  logo: organization?.logo ?? "",
  metadata: metadataValue,
})

const formatMetadataPreview = (value: unknown) => {
  const normalized = normalizeMetadataObject(value)
  if (!normalized) return null

  return JSON.stringify(normalized, null, 2)
}

const formatDate = (value?: string | Date | null) =>
  value ? new Date(value).toLocaleString() : "-"

export default function OrganizationPage() {
  const { data: activeOrganization } = authClient.useActiveOrganization()
  const [organizations, setOrganizations] = useState<any[]>([])
  const [organizationsLoading, setOrganizationsLoading] = useState(true)
  const [organizationsError, setOrganizationsError] = useState<string | null>(
    null
  )
  const [selectedOrgId, setSelectedOrgId] = useState<string | undefined>(
    undefined
  )
  const [activeUpdate, setActiveUpdate] = useState(false)
  const [activeCreate, setActiveCreate] = useState(false)
  const [activeSwitch, setActiveSwitch] = useState(false)
  const [updateForm, setUpdateForm] = useState<OrgFormState>(emptyForm)
  const [createForm, setCreateForm] = useState<OrgFormState>(emptyForm)
  const [updateErrors, setUpdateErrors] = useState<OrgFormErrors>({})
  const [createErrors, setCreateErrors] = useState<OrgFormErrors>({})
  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const updateNameRef = useRef<HTMLInputElement | null>(null)
  const updateSlugRef = useRef<HTMLInputElement | null>(null)
  const updateMetadataRef = useRef<HTMLTextAreaElement | null>(null)
  const createNameRef = useRef<HTMLInputElement | null>(null)
  const createSlugRef = useRef<HTMLInputElement | null>(null)
  const createMetadataRef = useRef<HTMLTextAreaElement | null>(null)

  const {
    users,
    loading: membersLoading,
    error: membersError,
    refetch: refreshMembers,
    updateUser,
    deleteUser,
  } = useAdminUsers()
  const [refreshingMembers, setRefreshingMembers] = useState(false)

  const membersCount = activeOrganization?.members?.length ?? 0
  const invitationsCount = activeOrganization?.invitations?.length ?? 0

  const metadataPreview = useMemo(() => {
    return formatMetadataPreview(activeOrganization?.metadata)
  }, [activeOrganization?.metadata])

  const activeOrganizationName = activeOrganization?.name ?? organisationName
  const activeOrganizationSlug = activeOrganization?.slug ?? "-"
  const activeOrganizationLogo = activeOrganization?.logo || organisationLogo

  const loadOrganizations = async () => {
    setOrganizationsLoading(true)
    setOrganizationsError(null)
    try {
      const response = await organizationClient.list()
      if (response.error) {
        throw new Error(
          response.error.message || "Failed to load organizations"
        )
      }
      setOrganizations(response.data || [])
    } catch {
      setOrganizationsError("Failed to load organizations")
    } finally {
      setOrganizationsLoading(false)
    }
  }

  useEffect(() => {
    loadOrganizations()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOrganization?.id])

  useEffect(() => {
    setUpdateForm(
      buildOrgFormState(
        {
          name: activeOrganization?.name,
          slug: activeOrganization?.slug,
          logo: activeOrganization?.logo,
        },
        serializeMetadataValue(activeOrganization?.metadata)
      )
    )
    setSelectedOrgId(activeOrganization?.id)
  }, [
    activeOrganization?.id,
    activeOrganization?.logo,
    activeOrganization?.name,
    activeOrganization?.slug,
    activeOrganization?.metadata,
    metadataPreview,
  ])

  const handleSwitchOrganization = async () => {
    if (!selectedOrgId || selectedOrgId === activeOrganization?.id) {
      return
    }
    setActiveSwitch(true)
    try {
      const response = await organizationClient.setActive({
        organizationId: selectedOrgId,
      })
      if (response.error) {
        throw new Error(
          response.error.message || "Failed to set active organization"
        )
      }
      toast.success("Active organization updated")
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to set active organization"
      )
    } finally {
      setActiveSwitch(false)
    }
  }

  const handleUpdateSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setUpdateErrors({})
    const errors: OrgFormErrors = {}

    if (!activeOrganization?.id) {
      errors.name = "No active organization selected."
      setUpdateErrors(errors)
      updateNameRef.current?.focus()
      return
    }

    let metadataValue: Record<string, unknown> | undefined
    try {
      metadataValue = parseMetadata(updateForm.metadata)
    } catch {
      errors.metadata =
        'Metadata must be a JSON object, for example {"type":"Venture"}.'
      setUpdateErrors(errors)
      updateMetadataRef.current?.focus()
      return
    }

    const name = updateForm.name.trim()
    const slug = updateForm.slug.trim()
    const logo = updateForm.logo.trim()
    const data: Record<string, unknown> = {}

    if (name) data.name = name
    if (slug) data.slug = slug
    if (logo || activeOrganization?.logo) data.logo = logo
    if (metadataValue) data.metadata = metadataValue

    if (Object.keys(data).length === 0) {
      setUpdateErrors({ name: "Enter at least one value to update." })
      updateNameRef.current?.focus()
      return
    }

    setActiveUpdate(true)
    try {
      const response = await organizationClient.update({
        organizationId: activeOrganization.id,
        data,
      })
      if (response?.error) {
        throw new Error(
          response.error.message || "Failed to update organization"
        )
      }
      toast.success("Organization updated")
      await loadOrganizations()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update organization"
      )
    } finally {
      setActiveUpdate(false)
    }
  }

  const handleCreateSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setCreateErrors({})
    const errors: OrgFormErrors = {}
    const name = createForm.name.trim()
    const slug = createForm.slug.trim() || toSlug(name)
    const logo = createForm.logo.trim()

    if (!name) {
      errors.name = "Organization name is required."
    }

    if (!slug) {
      errors.slug = "Provide a slug or name."
    }

    let metadataValue: Record<string, unknown> | undefined
    try {
      metadataValue = parseMetadata(createForm.metadata)
    } catch {
      errors.metadata =
        'Metadata must be a JSON object, for example {"type":"venture"}.'
    }

    if (Object.keys(errors).length > 0) {
      setCreateErrors(errors)
      if (errors.name) {
        createNameRef.current?.focus()
      } else if (errors.slug) {
        createSlugRef.current?.focus()
      } else if (errors.metadata) {
        createMetadataRef.current?.focus()
      }
      return
    }

    setActiveCreate(true)
    try {
      const response = await organizationClient.create({
        name,
        slug,
        logo: logo || undefined,
        metadata: metadataValue,
      })

      if (response.error) {
        throw new Error(
          response.error.message || "Failed to create organization"
        )
      }

      setCreateForm(emptyForm)
      toast.success("Organization created")
      await loadOrganizations()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create organization"
      )
    } finally {
      setActiveCreate(false)
    }
  }

  const handleRefreshMembers = async () => {
    setRefreshingMembers(true)
    try {
      await refreshMembers()
      toast.success("Members refreshed")
    } catch {
      toast.error("Failed to refresh members")
    } finally {
      setRefreshingMembers(false)
    }
  }

  return (
    <div className="container mx-auto max-w-7xl space-y-8 px-2 py-5">
      <Card className="relative overflow-hidden border-border/70 shadow-sm">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(15,23,42,0.12),transparent_38%),linear-gradient(135deg,rgba(255,255,255,0.9),rgba(244,244,245,0.82))] dark:bg-[radial-gradient(circle_at_top_right,rgba(148,163,184,0.18),transparent_38%),linear-gradient(135deg,rgba(9,9,11,0.92),rgba(24,24,27,0.88))]" />
        <CardContent className="relative space-y-6 p-6 sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border bg-background/85 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
                <Sparkles className="size-3.5 text-amber-500" />
                Organization control center
              </div>
              <div className="space-y-3">
                <h1 className="max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">
                  Manage the active organization from one branded workspace.
                </h1>
                <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                  Update identity, logo, metadata, and membership from a single
                  admin surface without bouncing between pages.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="rounded-full px-3 py-1 text-xs font-medium">
                  Active organization
                </Badge>
                <Badge
                  variant="outline"
                  className="rounded-full px-3 py-1 text-xs">
                  <Building2 className="mr-1.5 size-3.5" />
                  {activeOrganizationName}
                </Badge>
                <Badge
                  variant="outline"
                  className="rounded-full px-3 py-1 text-xs">
                  <Users className="mr-1.5 size-3.5" />
                  {membersCount} members
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-3 lg:pt-1">
              <Button
                variant="outline"
                onClick={loadOrganizations}
                disabled={organizationsLoading}>
                <RefreshCw
                  className={`mr-2 h-4 w-4 ${organizationsLoading ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
            <div className="rounded-3xl border bg-background/90 p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
                    Live snapshot
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                    {activeOrganizationName}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {organisationSlogan}
                  </p>
                </div>
                <div className="relative flex size-20 items-center justify-center overflow-hidden rounded-2xl border bg-muted/40 shadow-inner">
                  <Image
                    src={activeOrganizationLogo}
                    alt={`${activeOrganizationName} logo`}
                    fill
                    unoptimized
                    sizes="80px"
                    className="object-contain p-2"
                  />
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border bg-muted/30 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Slug
                  </p>
                  <p className="mt-1 truncate text-sm font-medium">
                    {activeOrganizationSlug}
                  </p>
                </div>
                <div className="rounded-2xl border bg-muted/30 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Members
                  </p>
                  <p className="mt-1 text-sm font-medium tabular-nums">
                    {membersCount}
                  </p>
                </div>
                <div className="rounded-2xl border bg-muted/30 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Invitations
                  </p>
                  <p className="mt-1 text-sm font-medium tabular-nums">
                    {invitationsCount}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <Card className="border-border/70 shadow-sm">
                <CardHeader className="space-y-1 pb-3">
                  <CardDescription>Identity</CardDescription>
                  <CardTitle className="text-base font-semibold">
                    {activeOrganizationName}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs text-muted-foreground">
                  <div>ID: {activeOrganization?.id ?? "-"}</div>
                  <div>Slug: {activeOrganizationSlug}</div>
                  <div>
                    Created: {formatDate(activeOrganization?.createdAt)}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/70 shadow-sm">
                <CardHeader className="space-y-1 pb-3">
                  <CardDescription>Brand status</CardDescription>
                  <CardTitle className="text-base font-semibold">
                    Logo + metadata ready
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs text-muted-foreground">
                  <div>
                    Logo: {activeOrganization?.logo ? "Uploaded" : "Not set"}
                  </div>
                  <div>
                    Metadata:{" "}
                    {activeOrganization?.metadata ? "Available" : "Empty"}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="update">Update Info</TabsTrigger>
          <TabsTrigger value="create">Create Org</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardDescription>Active organization</CardDescription>
                <CardTitle className="text-base font-semibold">
                  {activeOrganization?.name ?? "No active organization"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs text-muted-foreground">
                <div>ID: {activeOrganization?.id ?? "-"}</div>
                <div>Slug: {activeOrganization?.slug ?? "-"}</div>
                <div>Logo: {activeOrganization?.logo ?? "-"}</div>
                <div>
                  Created:{" "}
                  {activeOrganization?.createdAt
                    ? new Date(activeOrganization.createdAt).toLocaleString()
                    : "-"}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Members</CardDescription>
                <CardTitle className="text-base font-semibold tabular-nums">
                  {membersCount}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                Active members in this organization.
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Invitations</CardDescription>
                <CardTitle className="text-base font-semibold tabular-nums">
                  {invitationsCount}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                Pending invitations in this organization.
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">
                  Switch organization
                </CardTitle>
                <CardDescription>
                  Choose a different active organization.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {organizationsError ? (
                  <div className="text-sm text-destructive">
                    {organizationsError}
                  </div>
                ) : null}
                <div className="space-y-2">
                  <Label htmlFor="active-organization">Organization</Label>
                  <Select
                    value={selectedOrgId}
                    onValueChange={setSelectedOrgId}
                    disabled={organizationsLoading}>
                    <SelectTrigger id="active-organization" className="w-full">
                      <SelectValue placeholder="Select organization…" />
                    </SelectTrigger>
                    <SelectContent>
                      {organizations.map((org) => (
                        <SelectItem key={org.id} value={org.id}>
                          {org.name} ({org.slug})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handleSwitchOrganization}
                  disabled={
                    activeSwitch ||
                    !selectedOrgId ||
                    selectedOrgId === activeOrganization?.id
                  }>
                  {activeSwitch ? <Loader className="mr-2 h-4 w-4" /> : null}
                  Set Active
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">
                  Organization metadata
                </CardTitle>
                <CardDescription>
                  Additional fields from Better Auth organization schema.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {metadataPreview ? (
                  <pre className="max-h-64 overflow-auto rounded-md border border-border bg-muted/50 p-3 text-xs">
                    {metadataPreview}
                  </pre>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    No metadata available.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="update" className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
            <Card className="border-border/70 shadow-sm">
              <CardHeader className="space-y-1 border-b bg-muted/20 pb-4">
                <CardTitle className="text-base font-semibold">
                  Update organization info
                </CardTitle>
                <CardDescription>
                  Tune the active organization identity and refresh the live
                  logo.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <form className="space-y-6" onSubmit={handleUpdateSubmit}>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="update-name">Organization name</Label>
                      <Input
                        id="update-name"
                        name="update-name"
                        ref={updateNameRef}
                        value={updateForm.name}
                        onChange={(event) =>
                          setUpdateForm((prev) => ({
                            ...prev,
                            name: event.target.value,
                          }))
                        }
                        placeholder="TrustLink Group…"
                        autoComplete="organization"
                      />
                      {updateErrors.name ? (
                        <p className="text-xs text-destructive">
                          {updateErrors.name}
                        </p>
                      ) : null}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="update-slug">Slug</Label>
                      <Input
                        id="update-slug"
                        name="update-slug"
                        ref={updateSlugRef}
                        value={updateForm.slug}
                        onChange={(event) =>
                          setUpdateForm((prev) => ({
                            ...prev,
                            slug: event.target.value,
                          }))
                        }
                        placeholder="trustlink-group…"
                        spellCheck={false}
                      />
                      {updateErrors.slug ? (
                        <p className="text-xs text-destructive">
                          {updateErrors.slug}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <OrganizationLogoUpload
                    value={updateForm.logo}
                    organizationName={updateForm.name || activeOrganizationName}
                    onChange={(logo) =>
                      setUpdateForm((prev) => ({
                        ...prev,
                        logo,
                      }))
                    }
                    disabled={activeUpdate}
                  />

                  <div className="space-y-2">
                    <Label htmlFor="update-metadata">Metadata (JSON)</Label>
                    <Textarea
                      id="update-metadata"
                      name="update-metadata"
                      ref={updateMetadataRef}
                      value={updateForm.metadata}
                      onChange={(event) =>
                        setUpdateForm((prev) => ({
                          ...prev,
                          metadata: event.target.value,
                        }))
                      }
                      placeholder='{"type":"Venture"}…'
                      rows={5}
                    />
                    {updateErrors.metadata ? (
                      <p className="text-xs text-destructive">
                        {updateErrors.metadata}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <Button type="submit" disabled={activeUpdate}>
                      {activeUpdate ? (
                        <Loader className="mr-2 h-4 w-4" />
                      ) : null}
                      Update Organization
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() =>
                        setUpdateForm(
                          buildOrgFormState(
                            activeOrganization,
                            metadataPreview ?? ""
                          )
                        )
                      }>
                      Reset
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="border-border/70 shadow-sm">
                <CardHeader className="space-y-1 border-b bg-muted/20 pb-4">
                  <CardTitle className="text-base font-semibold">
                    Live preview
                  </CardTitle>
                  <CardDescription>
                    See what the current update draft will look like.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                  <div className="flex items-start justify-between gap-4 rounded-2xl border bg-background p-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                        Organization
                      </p>
                      <p className="mt-2 text-lg font-semibold">
                        {updateForm.name || activeOrganizationName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {updateForm.slug || activeOrganizationSlug}
                      </p>
                    </div>
                    <div className="relative flex size-16 items-center justify-center overflow-hidden rounded-2xl border bg-muted/40">
                      <Image
                        src={updateForm.logo || activeOrganizationLogo}
                        alt={`${updateForm.name || activeOrganizationName} logo`}
                        fill
                        unoptimized
                        sizes="64px"
                        className="object-contain p-2"
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                    <div className="rounded-2xl border bg-muted/25 p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Identity check
                      </p>
                      <p className="mt-1 text-sm font-medium">
                        {updateForm.name
                          ? "Ready to save"
                          : "Add a name to continue"}
                      </p>
                    </div>
                    <div className="rounded-2xl border bg-muted/25 p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Metadata state
                      </p>
                      <p className="mt-1 text-sm font-medium">
                        {updateForm.metadata.trim()
                          ? "Custom metadata included"
                          : "No metadata changes"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/70 shadow-sm">
                <CardHeader className="space-y-1 border-b bg-muted/20 pb-4">
                  <CardTitle className="text-base font-semibold">
                    Update checklist
                  </CardTitle>
                  <CardDescription>
                    Small details that keep the brand surface consistent.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 pt-6 text-sm text-muted-foreground">
                  <div className="rounded-xl border bg-background p-3">
                    Use a square logo with enough padding around the mark.
                  </div>
                  <div className="rounded-xl border bg-background p-3">
                    Keep metadata valid JSON so the schema update succeeds.
                  </div>
                  <div className="rounded-xl border bg-background p-3">
                    Reset will restore the active organization values.
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="create" className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
            <Card className="border-border/70 shadow-sm">
              <CardHeader className="space-y-1 border-b bg-muted/20 pb-4">
                <CardTitle className="text-base font-semibold">
                  Create a new organization
                </CardTitle>
                <CardDescription>
                  Use Better Auth to create a new organization record.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <form className="space-y-6" onSubmit={handleCreateSubmit}>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="create-name">Organization name</Label>
                      <Input
                        id="create-name"
                        name="create-name"
                        ref={createNameRef}
                        value={createForm.name}
                        onChange={(event) =>
                          setCreateForm((prev) => ({
                            ...prev,
                            name: event.target.value,
                          }))
                        }
                        placeholder="Venture Kigali…"
                        autoComplete="organization"
                      />
                      {createErrors.name ? (
                        <p className="text-xs text-destructive">
                          {createErrors.name}
                        </p>
                      ) : null}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="create-slug">Slug</Label>
                      <Input
                        id="create-slug"
                        name="create-slug"
                        ref={createSlugRef}
                        value={createForm.slug}
                        onChange={(event) =>
                          setCreateForm((prev) => ({
                            ...prev,
                            slug: event.target.value,
                          }))
                        }
                        placeholder="Venture-kigali…"
                        spellCheck={false}
                      />
                      {createErrors.slug ? (
                        <p className="text-xs text-destructive">
                          {createErrors.slug}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <OrganizationLogoUpload
                    value={createForm.logo}
                    organizationName={createForm.name || organisationName}
                    onChange={(logo) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        logo,
                      }))
                    }
                    disabled={activeCreate}
                    label="Brand logo"
                    helperText="Upload the logo now so the new organization is ready for dashboards, invites, and emails."
                  />

                  <div className="space-y-2">
                    <Label htmlFor="create-metadata">Metadata (JSON)</Label>
                    <Textarea
                      id="create-metadata"
                      name="create-metadata"
                      ref={createMetadataRef}
                      value={createForm.metadata}
                      onChange={(event) =>
                        setCreateForm((prev) => ({
                          ...prev,
                          metadata: event.target.value,
                        }))
                      }
                      placeholder='{"type":"Venture"}…'
                      rows={5}
                    />
                    {createErrors.metadata ? (
                      <p className="text-xs text-destructive">
                        {createErrors.metadata}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <Button type="submit" disabled={activeCreate}>
                      {activeCreate ? (
                        <Loader className="mr-2 h-4 w-4" />
                      ) : null}
                      Create Organization
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setCreateForm(emptyForm)}>
                      Clear
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="border-border/70 shadow-sm">
                <CardHeader className="space-y-1 border-b bg-muted/20 pb-4">
                  <CardTitle className="text-base font-semibold">
                    Draft preview
                  </CardTitle>
                  <CardDescription>
                    This is what the new organization will feel like once saved.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                  <div className="flex items-start justify-between gap-4 rounded-2xl border bg-background p-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                        Organization
                      </p>
                      <p className="mt-2 text-lg font-semibold">
                        {createForm.name || "Untitled organization"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {createForm.slug ||
                          toSlug(createForm.name) ||
                          "slug-preview"}
                      </p>
                    </div>
                    <div className="relative flex size-16 items-center justify-center overflow-hidden rounded-2xl border bg-muted/40">
                      <Image
                        src={createForm.logo || organisationLogo}
                        alt={`${createForm.name || organisationName} logo`}
                        fill
                        unoptimized
                        sizes="64px"
                        className="object-contain p-2"
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                    <div className="rounded-2xl border bg-muted/25 p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Slug fallback
                      </p>
                      <p className="mt-1 text-sm font-medium">
                        {createForm.slug ||
                          toSlug(createForm.name) ||
                          "Generated automatically"}
                      </p>
                    </div>
                    <div className="rounded-2xl border bg-muted/25 p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Logo state
                      </p>
                      <p className="mt-1 text-sm font-medium">
                        {createForm.logo
                          ? "Logo attached"
                          : "Upload a brand logo"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/70 shadow-sm">
                <CardHeader className="space-y-1 border-b bg-muted/20 pb-4">
                  <CardTitle className="text-base font-semibold">
                    Creation tips
                  </CardTitle>
                  <CardDescription>
                    Keep the first pass clean so the new org is useful
                    immediately.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 pt-6 text-sm text-muted-foreground">
                  <div className="rounded-xl border bg-background p-3">
                    The slug can be generated automatically from the name.
                  </div>
                  <div className="rounded-xl border bg-background p-3">
                    A logo helps invitations and admin panels feel complete.
                  </div>
                  <div className="rounded-xl border bg-background p-3">
                    Add metadata only when the schema needs extra context.
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="members" className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Members</h2>
              <p className="text-sm text-muted-foreground">
                Manage membership in the active organization.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                onClick={handleRefreshMembers}
                disabled={refreshingMembers}>
                <RefreshCw
                  className={`mr-2 h-4 w-4 ${refreshingMembers ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
              <Button variant="default" onClick={() => setIsInviteOpen(true)}>
                <MailPlus className="mr-2 h-4 w-4" />
                Invite Member
              </Button>
              <Button variant="ghost" asChild>
                <Link href="/admin/members">Open Full Management</Link>
              </Button>
            </div>
          </div>

          <UserStatsCards users={users} loading={membersLoading} />

          <Card>
            <CardHeader>
              <CardTitle>All Members</CardTitle>
              <CardDescription>
                Organization members synced from Better Auth.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 py-0">
              <UsersTable
                users={users}
                loading={membersLoading}
                error={membersError}
                onUpdateUser={updateUser}
                onDeleteUser={deleteUser}
                onRefetch={refreshMembers}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Invitations</CardTitle>
              <CardDescription>
                Track pending and accepted invitations for TrustLink Group.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <InvitationsTable />
            </CardContent>
          </Card>

          <InviteUserDialog
            open={isInviteOpen}
            onOpenChange={setIsInviteOpen}
            onSuccess={refreshMembers}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
