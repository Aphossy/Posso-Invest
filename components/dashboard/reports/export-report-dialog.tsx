"use client"

import { useState } from "react"
import type { ReportExportFormat } from "@/utils/report-export-utils"
import { Download, FileImage, FileSpreadsheet, FileText } from "lucide-react"
import { toast } from "sonner"

import { useMediaQuery } from "@/hooks/use-media-query"
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

interface ExportReportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  reportTitle: string
  defaultFilename: string
  onExport: (format: ReportExportFormat, filename?: string) => Promise<void>
}

export function ExportReportDialog({
  open,
  onOpenChange,
  reportTitle,
  defaultFilename,
  onExport,
}: ExportReportDialogProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)")
  const [format, setFormat] = useState<ReportExportFormat>("pdf")
  const [filename, setFilename] = useState("")
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    const exportPromise = onExport(format, filename.trim() || undefined)
    toast.promise(exportPromise, {
      loading: `Exporting ${reportTitle} as ${format.toUpperCase()}...`,
      success: `${reportTitle} exported successfully`,
      error: "Failed to export report",
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

  const formatIcon = {
    csv: <FileText className="h-4 w-4" />,
    excel: <FileSpreadsheet className="h-4 w-4" />,
    pdf: <FileImage className="h-4 w-4" />,
  }[format]

  const bodyContent = (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label>Export Format</Label>
        <Select
          value={format}
          onValueChange={(v: ReportExportFormat) => setFormat(v)}>
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
        <Label htmlFor="report-export-filename">Filename (optional)</Label>
        <Input
          id="report-export-filename"
          value={filename}
          onChange={(e) => setFilename(e.target.value)}
          placeholder={defaultFilename}
        />
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
      <Button onClick={handleExport} disabled={exporting}>
        {exporting ? (
          <>
            <Loader className="mr-2 h-4 w-4" />
            Exporting...
          </>
        ) : (
          <>
            {formatIcon}
            <span className="ml-2">Export {format.toUpperCase()}</span>
          </>
        )}
      </Button>
    </>
  )

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Export {reportTitle}
            </DialogTitle>
            <DialogDescription>
              Download this report in your preferred format.
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
            Export {reportTitle}
          </DrawerTitle>
          <DrawerDescription>
            Download this report in your preferred format.
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
