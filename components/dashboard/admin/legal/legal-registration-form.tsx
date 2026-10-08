"use client"

import { useEffect, useState, type FormEvent } from "react"
import {
  Building2,
  ExternalLink,
  FileText,
  LoaderCircle,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"

import { authClient } from "@/lib/auth-client"
import { organizationClient } from "@/lib/organization-client"
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
import { FileUploadComponent } from "@/components/file-upload-component"

type RegistrationDetails = {
  registeredName: string
  registrationNumber: string
  registrationDate: string
  certificate: CertificateFile | null
}

type CertificateFile = {
  name: string
  key: string
  size: number
}

const emptyDetails: RegistrationDetails = {
  registeredName: "",
  registrationNumber: "",
  registrationDate: "",
  certificate: null,
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

function parseOrganizationMetadata(value: unknown) {
  if (value == null || value === "") return {}
  if (isRecord(value)) return value
  if (typeof value !== "string") return null

  try {
    const parsed: unknown = JSON.parse(value)
    return isRecord(parsed) ? parsed : null
  } catch {
    return null
  }
}

function readRegistrationDetails(metadata: Record<string, unknown>) {
  const value = metadata.legalRegistration
  if (!isRecord(value)) return emptyDetails

  return {
    registeredName:
      typeof value.registeredName === "string" ? value.registeredName : "",
    registrationNumber:
      typeof value.registrationNumber === "string"
        ? value.registrationNumber
        : "",
    registrationDate:
      typeof value.registrationDate === "string" ? value.registrationDate : "",
    certificate:
      isRecord(value.certificate) &&
      typeof value.certificate.name === "string" &&
      typeof value.certificate.key === "string" &&
      typeof value.certificate.size === "number"
        ? {
            name: value.certificate.name,
            key: value.certificate.key,
            size: value.certificate.size,
          }
        : null,
  }
}

export function LegalRegistrationForm() {
  const { data: activeOrganization } = authClient.useActiveOrganization()
  const [details, setDetails] = useState(emptyDetails)
  const [isSaving, setIsSaving] = useState(false)
  const [metadataError, setMetadataError] = useState<string | null>(null)
  const [isOpeningCertificate, setIsOpeningCertificate] = useState(false)

  useEffect(() => {
    const metadata = parseOrganizationMetadata(activeOrganization?.metadata)
    if (!metadata) {
      setMetadataError(
        "Organization metadata is not a valid JSON object. Update it in Organization settings before saving."
      )
      return
    }

    setMetadataError(null)
    setDetails(readRegistrationDetails(metadata))
  }, [activeOrganization?.id, activeOrganization?.metadata])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!activeOrganization?.id) {
      toast.error("Select an active organization before saving.")
      return
    }

    const metadata = parseOrganizationMetadata(activeOrganization.metadata)
    if (!metadata) {
      setMetadataError(
        "Organization metadata is not a valid JSON object. Update it in Organization settings before saving."
      )
      return
    }

    const registeredName = details.registeredName.trim()
    const registrationNumber = details.registrationNumber.trim()

    if (!registeredName || !registrationNumber) {
      toast.error("Enter the registered name and RDB registration number.")
      return
    }

    setIsSaving(true)
    try {
      const response = await organizationClient.update({
        organizationId: activeOrganization.id,
        data: {
          metadata: {
            ...metadata,
            legalRegistration: {
              registeredName,
              registrationNumber,
              registrationDate: details.registrationDate,
              issuingAuthority: "Rwanda Development Board",
              certificate: details.certificate,
            },
          },
        },
      })

      if (response?.error) {
        throw new Error(
          response.error.message || "Failed to save registration details."
        )
      }

      setDetails((current) => ({
        ...current,
        registeredName,
        registrationNumber,
      }))
      toast.success("RDB registration details saved.")
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to save RDB registration details."
      )
    } finally {
      setIsSaving(false)
    }
  }

  const handleOpenCertificate = async () => {
    const certificate = details.certificate
    if (!certificate?.key) return

    const certificateWindow = window.open("about:blank", "_blank")
    if (!certificateWindow) {
      toast.error("Allow pop-ups to open the certificate.")
      return
    }

    setIsOpeningCertificate(true)
    try {
      const response = await fetch("/api/upload/r2/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: certificate.key }),
      })
      const result = await response.json()
      const signedUrl = result.data?.signedUrl

      if (!response.ok || !result.success || typeof signedUrl !== "string") {
        throw new Error(
          result.error?.message ||
            "Could not create a certificate download link."
        )
      }

      certificateWindow.location.href = signedUrl
    } catch (error) {
      certificateWindow.close()
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not open the RDB certificate."
      )
    } finally {
      setIsOpeningCertificate(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <Building2 className="size-5" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <CardTitle>RDB registration details</CardTitle>
            <CardDescription>
              Enter the organization information exactly as it appears on the
              Rwanda Development Board registration certificate.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="rdb-registered-name">
                Registered organization name
              </Label>
              <Input
                id="rdb-registered-name"
                autoComplete="organization"
                maxLength={200}
                required
                value={details.registeredName}
                onChange={(event) =>
                  setDetails((current) => ({
                    ...current,
                    registeredName: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rdb-registration-number">
                RDB registration number
              </Label>
              <Input
                id="rdb-registration-number"
                maxLength={120}
                required
                value={details.registrationNumber}
                onChange={(event) =>
                  setDetails((current) => ({
                    ...current,
                    registrationNumber: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rdb-registration-date">Registration date</Label>
              <Input
                id="rdb-registration-date"
                type="date"
                value={details.registrationDate}
                onChange={(event) =>
                  setDetails((current) => ({
                    ...current,
                    registrationDate: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="rdb-issuing-authority">Issuing authority</Label>
              <Input
                id="rdb-issuing-authority"
                readOnly
                value="Rwanda Development Board (RDB)"
              />
            </div>
            <div className="space-y-3 sm:col-span-2">
              <div className="space-y-1">
                <Label>RDB registration certificate</Label>
                <p className="text-sm text-muted-foreground">
                  Upload the certificate as a PDF (maximum 50 MB), then save the
                  registration details to attach it to this organization.
                </p>
              </div>
              <FileUploadComponent
                category="documentation"
                acceptedTypes="pdf"
                multiple={false}
                maxFiles={1}
                showPreview={false}
                disabled={!activeOrganization?.id || isSaving}
                onUploadComplete={(files) => {
                  const file = files[0]
                  const key = file?.key
                  if (!file || !key) {
                    toast.error("Upload completed without a file key.")
                    return
                  }
                  setDetails((current) => ({
                    ...current,
                    certificate: {
                      name: file.name,
                      key,
                      size: file.size,
                    },
                  }))
                }}
              />
              {details.certificate ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/30 p-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <FileText
                      className="size-5 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {details.certificate.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(details.certificate.size / (1024 * 1024)).toFixed(2)}{" "}
                        MB
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isOpeningCertificate}
                      onClick={handleOpenCertificate}>
                      {isOpeningCertificate ? (
                        <LoaderCircle
                          className="mr-2 size-4 animate-spin"
                          aria-hidden="true"
                        />
                      ) : (
                        <ExternalLink
                          className="mr-2 size-4"
                          aria-hidden="true"
                        />
                      )}
                      Open
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Remove RDB certificate"
                      disabled={isSaving}
                      onClick={() =>
                        setDetails((current) => ({
                          ...current,
                          certificate: null,
                        }))
                      }>
                      <Trash2 className="size-4" aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {metadataError ? (
            <p className="text-sm text-destructive" role="alert">
              {metadataError}
            </p>
          ) : null}

          {!activeOrganization?.id ? (
            <p className="text-sm text-muted-foreground" role="status">
              Select an active organization to manage its registration details.
            </p>
          ) : null}

          <Button
            type="submit"
            disabled={
              isSaving || !activeOrganization?.id || Boolean(metadataError)
            }>
            {isSaving ? (
              <LoaderCircle
                className="mr-2 size-4 animate-spin"
                aria-hidden="true"
              />
            ) : null}
            {isSaving ? "Saving..." : "Save registration details"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
