"use client"

import { useState } from "react"
import {
  exportLoans,
  type ExportOptions,
  type LoanExportable,
} from "@/utils/loan-export-utils"
import { Download, FileImage, FileSpreadsheet, FileText } from "lucide-react"
import { toast } from "sonner"

import { useMediaQuery } from "@/hooks/use-media-query"
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
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
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

interface ExportLoansDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  loans: LoanExportable[]
  selectedLoans?: LoanExportable[]
}

const exportFields = [
  { id: "memberName", label: "Member Name", default: true },
  { id: "memberEmail", label: "Member Email", default: false },
  { id: "requestedAmount", label: "Requested Amount", default: true },
  { id: "approvedAmount", label: "Approved Amount", default: false },
  { id: "amountToRepay", label: "Amount to Repay", default: true },
  { id: "termMonths", label: "Term (Months)", default: true },
  { id: "status", label: "Status", default: true },
  { id: "requestedAt", label: "Requested At", default: true },
  { id: "dueDate", label: "Due Date", default: false },
  { id: "approvedByName", label: "Approved By", default: false },
  { id: "disbursedByName", label: "Disbursed By", default: false },
  { id: "createdAt", label: "Created Date", default: false },
]

export function ExportLoansDialog({
  open,
  onOpenChange,
  loans,
  selectedLoans,
}: ExportLoansDialogProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)")
  const [format, setFormat] = useState<"csv" | "excel" | "pdf">("pdf")
  const [filename, setFilename] = useState("")
  const [includeFields, setIncludeFields] = useState<string[]>(
    exportFields.filter((field) => field.default).map((field) => field.id)
  )
  const [exporting, setExporting] = useState(false)

  const dataToExport =
    selectedLoans && selectedLoans.length > 0 ? selectedLoans : loans
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

        exportLoans(dataToExport, options)
        resolve()
      } catch (error) {
        reject(error)
      }
    })

    toast.promise(exportPromise, {
      loading: `Exporting ${exportCount} loans as ${format.toUpperCase()}...`,
      success: `Successfully exported ${exportCount} loans as ${format.toUpperCase()}`,
      error: "Failed to export loans",
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

  const bodyContent = (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Export Format</Label>
        <Select
          value={format}
          onValueChange={(value: "csv" | "excel" | "pdf") => setFormat(value)}>
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
          placeholder={`loans-export-${new Date().toISOString().split("T")[0]}`}
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
  )

  const actionButtons = (
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
  )

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Export Loans
            </DialogTitle>
            <DialogDescription>
              Export {exportCount} loan{exportCount !== 1 ? "s" : ""} in your
              preferred format
            </DialogDescription>
          </DialogHeader>

          {bodyContent}

          <DialogFooter>{actionButtons}</DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="flex max-h-[92vh] flex-col overflow-hidden p-0">
        <DrawerHeader className="border-b bg-muted/40 px-4 py-4 text-left">
          <DrawerTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Loans
          </DrawerTitle>
          <DrawerDescription>
            Export {exportCount} loan{exportCount !== 1 ? "s" : ""} in your
            preferred format
          </DrawerDescription>
        </DrawerHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {bodyContent}
        </div>

        <DrawerFooter className="border-t bg-background pb-6">
          {actionButtons}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
