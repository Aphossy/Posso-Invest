"use client"

import { useState } from "react"
import { organisationName } from "@/constants/organisation"
import type { Contribution } from "@/db/schemas/contribution-schema"
import {
  exportContributions,
  type ContributionExportable,
  type ExportOptions,
} from "@/utils/contribution-export-utils"
import { Download, FileImage, FileSpreadsheet, FileText } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader } from "@/components/common/loader"

interface ExportContributionsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contributions: ContributionExportable[]
  selectedContributions?: ContributionExportable[]
}

const exportFields = [
  { id: "memberName", label: "Member Name", default: true },
  { id: "memberEmail", label: "Member Email", default: false },
  { id: "period", label: "Period", default: true },
  { id: "amount", label: "Amount", default: true },
  { id: "status", label: "Status", default: true },
  { id: "paidAt", label: "Paid At", default: true },
  { id: "penaltyAmount", label: "Penalty Amount", default: true },
  { id: "receiptNumber", label: "Receipt Number", default: false },
  { id: "recordedByName", label: "Recorded By", default: false },
  { id: "createdAt", label: "Created Date", default: false },
]

export function ExportContributionsDialog({
  open,
  onOpenChange,
  contributions,
  selectedContributions,
}: ExportContributionsDialogProps) {
  const [format, setFormat] = useState<"csv" | "excel" | "pdf">("pdf")
  const [filename, setFilename] = useState("")
  const [includeFields, setIncludeFields] = useState<string[]>(
    exportFields.filter((field) => field.default).map((field) => field.id)
  )
  const [exporting, setExporting] = useState(false)

  const dataToExport =
    selectedContributions && selectedContributions.length > 0
      ? selectedContributions
      : contributions
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

        exportContributions(dataToExport, options)
        resolve()
      } catch (error) {
        reject(error)
      }
    })

    toast.promise(exportPromise, {
      loading: `Exporting ${exportCount} contributions as ${format.toUpperCase()}...`,
      success: `Successfully exported ${exportCount} contributions as ${format.toUpperCase()}`,
      error: "Failed to export contributions",
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Contributions
          </DialogTitle>
          <DialogDescription>
            Export {exportCount} contribution{exportCount !== 1 ? "s" : ""} in
            your preferred format
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
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
              onChange={(event) => setFilename(event.target.value)}
              placeholder={`${organisationName.toLowerCase().replace(/\s+/g, "-")}-contributions-${new Date().toISOString().split("T")[0]}`}
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

        <DialogFooter>
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
