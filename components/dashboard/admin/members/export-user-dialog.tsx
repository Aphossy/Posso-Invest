// C:\Users\user\OneDrive\Desktop\trustlink-group\components\dashboard\admin\users\export-user-dialog.tsx
"use client"

import { useState } from "react"
import { exportUsers, type ExportOptions } from "@/utils/user-export-utils"
import { FileImage, FileSpreadsheet, FileText } from "lucide-react"
import { toast } from "sonner"

import type { AdminUser } from "@/types/admin-users"
import { DownloadIcon } from "@/components/ui/animated-icons/DownloadIcon"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ResponsiveModal } from "@/components/ui/responsive-modal"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader } from "@/components/common/loader"

interface ExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  users: AdminUser[]
  selectedUsers?: AdminUser[]
}

const exportFields = [
  { id: "name", label: "Full Name", default: true },
  { id: "email", label: "Email Address", default: true },
  { id: "role", label: "Role", default: true },
  { id: "emailVerified", label: "Verification Status", default: false },
  { id: "createdAt", label: "Created Date", default: true },
  { id: "updatedAt", label: "Last Updated", default: false },
  { id: "banned", label: "Ban Status", default: false },
  { id: "banReason", label: "Ban Reason", default: false },
  { id: "lastLoginMethod", label: "Last Login Method", default: false },
  {
    id: "twoFactorEnabled",
    label: "Two-Factor Authentication",
    default: false,
  },
]

export function ExportDialog({
  open,
  onOpenChange,
  users,
  selectedUsers,
}: ExportDialogProps) {
  const [format, setFormat] = useState<"csv" | "excel" | "pdf">("csv")
  const [filename, setFilename] = useState("")
  const [includeFields, setIncludeFields] = useState<string[]>(
    exportFields.filter((field) => field.default).map((field) => field.id)
  )
  const [exporting, setExporting] = useState(false)

  const dataToExport =
    selectedUsers && selectedUsers.length > 0 ? selectedUsers : users
  const exportCount = dataToExport.length

  const handleFieldChange = (fieldId: string, checked: boolean) => {
    if (checked) {
      setIncludeFields((prev) => [...prev, fieldId])
    } else {
      setIncludeFields((prev) => prev.filter((id) => id !== fieldId))
    }
  }

  const handleExport = async () => {
    if (includeFields.length === 0) {
      toast.error("Please select at least one field to export")
      return
    }

    setExporting(true)

    const exportPromise = new Promise<void>((resolve, reject) => {
      try {
        const options: ExportOptions = {
          format,
          includeFields,
          filename: filename.trim() || undefined,
        }

        exportUsers(dataToExport, options)
        resolve()
      } catch (error) {
        reject(error)
      }
    })

    toast.promise(exportPromise, {
      loading: `Exporting ${exportCount} users as ${format.toUpperCase()}...`,
      success: `Successfully exported ${exportCount} users as ${format.toUpperCase()}`,
      error: "Failed to export users",
    })

    try {
      await exportPromise
      onOpenChange(false)
    } catch (error) {
      console.error("Export error:", error)
    } finally {
      setExporting(false)
    }
  }

  const getFormatIcon = () => {
    switch (format) {
      case "csv":
        return <FileText className="h-4 w-4" />
      case "excel":
        return <FileSpreadsheet className="h-4 w-4" />
      case "pdf":
        return <FileImage className="h-4 w-4" />
    }
  }

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title={
        <span className="flex items-center gap-2">
          <DownloadIcon className="h-5 w-5" />
          Export Users
        </span>
      }
      description={`Export ${exportCount} user${exportCount !== 1 ? "s" : ""} in your preferred format`}
      footer={
        <>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={exporting}>
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={exporting || includeFields.length === 0}>
            {exporting ? (
              <>
                <Loader className="mr-2 h-4 w-4" />
                Exporting...
              </>
            ) : (
              <>
                {getFormatIcon()}
                <span className="ml-2">Export {format.toUpperCase()}</span>
              </>
            )}
          </Button>
        </>
      }
      className="max-w-md">
      <div className="space-y-6 py-2">
        <div className="space-y-2">
          <Label>Export Format</Label>
          <Select
            value={format}
            onValueChange={(value: "csv" | "excel" | "pdf") =>
              setFormat(value)
            }>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="csv">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  CSV File
                </div>
              </SelectItem>
              <SelectItem value="excel">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  Excel File
                </div>
              </SelectItem>
              <SelectItem value="pdf">
                <div className="flex items-center gap-2">
                  <FileImage className="h-4 w-4" />
                  PDF Document
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="filename">Filename (optional)</Label>
          <Input
            id="filename"
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
            placeholder={`users-export-${new Date().toISOString().split("T")[0]}`}
          />
        </div>

        <div className="space-y-3">
          <Label>Fields to Include</Label>
          <div className="grid max-h-48 grid-cols-1 gap-3 overflow-y-auto">
            {exportFields.map((field) => (
              <div key={field.id} className="flex items-center space-x-2">
                <Checkbox
                  id={field.id}
                  checked={includeFields.includes(field.id)}
                  onCheckedChange={(checked) =>
                    handleFieldChange(field.id, !!checked)
                  }
                />
                <Label htmlFor={field.id} className="text-sm font-normal">
                  {field.label}
                </Label>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ResponsiveModal>
  )
}
