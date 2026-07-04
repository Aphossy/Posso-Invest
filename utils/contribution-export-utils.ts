import { COMPANY_INFO } from "@/constants/organisation"
import type { Contribution } from "@/db/schemas/contribution-schema"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import * as XLSX from "xlsx"

export interface ContributionExportable extends Contribution {
  memberName?: string | null
  memberEmail?: string | null
  recordedByName?: string | null
  updatedByName?: string | null
  lastUpdatedAt?: string | null
}

export interface ExportOptions {
  format: "csv" | "excel" | "pdf"
  includeFields: string[]
  filename?: string
}

interface PdfSummaryItem {
  label: string
  value: string
}

const formatRwfAmount = (value?: string | number | null) => {
  if (value === null || value === undefined || value === "") {
    return `0 RWF`
  }

  const numericValue =
    typeof value === "number" ? value : Number.parseFloat(value)

  if (!Number.isFinite(numericValue)) {
    return `${value} RWF`
  }

  return `${new Intl.NumberFormat("en-RW", {
    maximumFractionDigits: 0,
  }).format(Math.round(numericValue))} RWF`
}

export const exportContributions = async (
  contributions: ContributionExportable[],
  options: ExportOptions
) => {
  const { format, includeFields, filename } = options
  const timestamp = new Date().toISOString().split("T")[0]
  const defaultFilename = `${COMPANY_INFO.name.toLowerCase().replace(/\s+/g, "-")}-contributions-${timestamp}-report`

  const sorted = [...contributions].sort((a, b) => {
    const periodDiff = b.period.localeCompare(a.period)
    if (periodDiff !== 0) return periodDiff
    const aTime = a.paidAt ? new Date(a.paidAt).getTime() : 0
    const bTime = b.paidAt ? new Date(b.paidAt).getTime() : 0
    return bTime - aTime
  })

  const filteredData = sorted.map((item) => {
    const filtered: Record<string, string> = {}
    includeFields.forEach((field) => {
      switch (field) {
        case "memberName":
          filtered["Member Name"] = item.memberName || "N/A"
          break
        case "memberEmail":
          filtered["Member Email"] = item.memberEmail || "N/A"
          break
        case "period":
          filtered["Period"] = item.period
          break
        case "amount":
          filtered["Amount"] = formatRwfAmount(item.amount)
          break
        case "penaltyAmount":
          filtered["Penalty"] = formatRwfAmount(item.penaltyAmount)
          break
        case "status":
          filtered["Status"] = item.status
          break
        case "paidAt":
          filtered["Paid At"] = item.paidAt
            ? new Date(item.paidAt).toLocaleDateString("en-RW")
            : "N/A"
          break
        case "receiptNumber":
          filtered["Receipt Number"] = item.receiptNumber || "N/A"
          break
        case "recordedByName":
          filtered["Recorded By"] = item.recordedByName || "N/A"
          break
        case "createdAt":
          filtered["Created Date"] = new Date(item.createdAt).toLocaleString(
            "en-RW"
          )
          break
      }
    })
    return filtered
  })

  const totalContributions = sorted.length
  const totalAmount = sorted.reduce(
    (sum, item) => sum + Number.parseFloat(item.amount || "0"),
    0
  )
  const totalPenaltyAmount = sorted.reduce(
    (sum, item) => sum + Number.parseFloat(item.penaltyAmount || "0"),
    0
  )
  const pdfSummary: PdfSummaryItem[] = [
    { label: "Total Records", value: String(totalContributions) },
    { label: "Total Penalty", value: formatRwfAmount(totalPenaltyAmount) },
    { label: "Total Amount", value: formatRwfAmount(totalAmount) },
  ]

  switch (format) {
    case "csv":
      exportToCSV(filteredData, filename || defaultFilename)
      break
    case "excel":
      exportToExcel(filteredData, sorted, filename || defaultFilename)
      break
    case "pdf":
      await exportToPDF(filteredData, filename || defaultFilename, pdfSummary)
      break
  }
}

const exportToCSV = (data: Record<string, string>[], filename: string) => {
  if (data.length === 0) return

  const headers = Object.keys(data[0])
  const headerComments = [
    `# ${COMPANY_INFO.name} - ${COMPANY_INFO.slogan}`,
    `# Contact: ${COMPANY_INFO.contact} | Email: ${COMPANY_INFO.email}`,
    `# Address: ${COMPANY_INFO.address} | Website: ${COMPANY_INFO.website}`,
    `# Generated on: ${new Date().toLocaleString("en-RW")}`,
    `# Total Records: ${data.length}`,
    "",
  ]
  const csvContent = [
    ...headerComments,
    headers.join(","),
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header] || ""
          return typeof value === "string" &&
            (value.includes(",") || value.includes('"'))
            ? `"${value.replace(/"/g, '""')}"`
            : value
        })
        .join(",")
    ),
  ].join("\n")

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const link = document.createElement("a")
  const url = URL.createObjectURL(blob)
  link.setAttribute("href", url)
  link.setAttribute("download", `${filename}.csv`)
  link.style.visibility = "hidden"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

const exportToExcel = (
  data: Record<string, string>[],
  contributions: ContributionExportable[],
  filename: string
) => {
  const workbook = XLSX.utils.book_new()

  const companySheetData = [
    { Key: "Company Name", Value: COMPANY_INFO.name },
    { Key: "Slogan", Value: COMPANY_INFO.slogan },
    { Key: "Contact", Value: COMPANY_INFO.contact },
    { Key: "Email", Value: COMPANY_INFO.email },
    { Key: "Address", Value: COMPANY_INFO.address },
    { Key: "Website", Value: COMPANY_INFO.website },
    { Key: "Report Generated On", Value: new Date().toLocaleString("en-RW") },
  ]
  const companySheet = XLSX.utils.json_to_sheet(companySheetData)
  XLSX.utils.book_append_sheet(workbook, companySheet, "Company Info")

  const totalContributions = contributions.length
  const totalAmount = contributions.reduce(
    (sum, item) => sum + Number.parseFloat(item.amount || "0"),
    0
  )
  const totalPenaltyAmount = contributions.reduce(
    (sum, item) => sum + Number.parseFloat(item.penaltyAmount || "0"),
    0
  )

  const summaryData = [
    { Metric: "Total Contributions", Value: totalContributions },
    {
      Metric: "Total Penalty Amount (RWF)",
      Value: formatRwfAmount(totalPenaltyAmount),
    },
    { Metric: "Total Amount (RWF)", Value: formatRwfAmount(totalAmount) },
  ]
  const summarySheet = XLSX.utils.json_to_sheet(summaryData)
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary")

  const worksheet = XLSX.utils.json_to_sheet(data)
  XLSX.utils.book_append_sheet(workbook, worksheet, "Contributions")

  const colWidths = Object.keys(data[0] || {}).map((key) => ({
    wch:
      Math.max(
        key.length,
        ...data.map((row) => String(row[key] || "").length)
      ) + 2,
  }))
  worksheet["!cols"] = colWidths

  XLSX.writeFile(workbook, `${filename}.xlsx`)
}

const exportToPDF = async (
  data: Record<string, string>[],
  filename: string,
  summaryItems: PdfSummaryItem[]
) => {
  if (data.length === 0) return

  const doc = new jsPDF()
  const logo = await loadImage(COMPANY_INFO.logoUrl)

  if (logo) {
    doc.addImage(logo, "PNG", 14, 11, 22, 22)
  }

  doc.setFontSize(17)
  doc.setFont("helvetica", "bold")
  doc.text(COMPANY_INFO.name, 40, 19)
  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  doc.text(COMPANY_INFO.slogan, 40, 27)

  doc.setDrawColor(25, 110, 82)
  doc.setLineWidth(0.5)
  doc.line(14, 38, 196, 38)

  doc.setFontSize(14)
  doc.setFont("helvetica", "bold")
  doc.text("Contributions Report", 14, 48)
  const summaryTop = 54
  const summaryHeight = 20
  const summaryWidth = 182
  const summaryX = 14

  doc.setDrawColor(229, 231, 235)
  doc.setFillColor(250, 250, 250)
  doc.roundedRect(summaryX, summaryTop, summaryWidth, summaryHeight, 3, 3, "FD")

  const summaryColumns = summaryItems.length + 1
  const columnWidth = summaryWidth / summaryColumns
  const generatedOnLabelX = summaryX + 6
  const generatedOnValueX = generatedOnLabelX
  const generatedOnValueY = summaryTop + 13

  doc.setFontSize(8)
  doc.setTextColor(107, 114, 128)
  doc.setFont("helvetica", "normal")
  doc.text("Generated on", generatedOnLabelX, summaryTop + 7)
  doc.setFontSize(10)
  doc.setTextColor(17, 24, 39)
  doc.setFont("helvetica", "bold")
  doc.text(
    new Date().toLocaleString("en-RW"),
    generatedOnValueX,
    generatedOnValueY
  )

  summaryItems.forEach((item, index) => {
    const baseX = summaryX + columnWidth * (index + 1)
    const labelX = baseX + 6
    doc.setFontSize(8)
    doc.setTextColor(107, 114, 128)
    doc.setFont("helvetica", "normal")
    doc.text(item.label, labelX, summaryTop + 7)
    doc.setFontSize(10)
    doc.setTextColor(17, 24, 39)
    doc.setFont("helvetica", "bold")
    doc.text(item.value, labelX, generatedOnValueY)
  })

  const footerText = `Contact: Email: ${COMPANY_INFO.email} | Website: ${COMPANY_INFO.website}`

  const headers = Object.keys(data[0])
  const rows = data.map((row) => headers.map((header) => row[header] || ""))

  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: 70,
    styles: {
      fontSize: 8,
      cellPadding: 3,
      lineColor: [200, 200, 200],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [25, 110, 82],
      textColor: 255,
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    margin: { top: 78, bottom: 20 },
    didDrawPage: (data) => {
      const pageCount = doc.getNumberOfPages()
      doc.setFontSize(8)
      doc.setTextColor(150)
      doc.text(
        footerText,
        data.settings.margin.left,
        doc.internal.pageSize.height - 10,
        { maxWidth: 170, align: "left" }
      )
      doc.text(
        `Page ${data.pageNumber} of ${pageCount}`,
        doc.internal.pageSize.width - data.settings.margin.right,
        doc.internal.pageSize.height - 10,
        { align: "right" }
      )
    },
  })

  doc.save(`${filename}.pdf`)
}

const loadImage = (url: string): Promise<string | null> => {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.src = url
    img.onload = () => {
      const canvas = document.createElement("canvas")
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext("2d")
      if (ctx) {
        ctx.drawImage(img, 0, 0)
        resolve(canvas.toDataURL("image/png"))
      } else {
        resolve(null)
      }
    }
    img.onerror = () => resolve(null)
  })
}
