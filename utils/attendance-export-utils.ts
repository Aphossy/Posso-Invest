import { COMPANY_INFO } from "@/constants/organisation"
import type { Attendance } from "@/db/schemas/attendance-schema"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import * as XLSX from "xlsx"

export interface AttendanceExportable extends Attendance {
  memberName?: string | null
  memberEmail?: string | null
  meetingTitle?: string | null
  recordedByName?: string | null
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

export const exportAttendance = async (
  attendance: AttendanceExportable[],
  options: ExportOptions
) => {
  const { format, includeFields, filename } = options
  const timestamp = new Date().toISOString().split("T")[0]
  const defaultFilename = `attendance-export-${timestamp}`

  const filteredData = attendance.map((item) => {
    const filtered: Record<string, string> = {}
    includeFields.forEach((field) => {
      switch (field) {
        case "meetingTitle":
          filtered["Meeting"] = item.meetingTitle || "N/A"
          break
        case "memberName":
          filtered["Member"] = item.memberName || "N/A"
          break
        case "memberEmail":
          filtered["Member Email"] = item.memberEmail || "N/A"
          break
        case "status":
          filtered["Status"] = item.status
          break
        case "checkedInAt":
          filtered["Checked In"] = item.checkedInAt
            ? new Date(item.checkedInAt).toLocaleString("en-RW")
            : "N/A"
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

  const totalRecords = attendance.length
  const presentRecords = attendance.filter(
    (item) => item.status === "present"
  ).length
  const summaryData: PdfSummaryItem[] = [
    { label: "Total Records", value: String(totalRecords) },
    { label: "Present Records", value: String(presentRecords) },
  ]

  switch (format) {
    case "csv":
      exportToCSV(filteredData, filename || defaultFilename)
      break
    case "excel":
      exportToExcel(filteredData, attendance, filename || defaultFilename)
      break
    case "pdf":
      await exportToPDF(filteredData, filename || defaultFilename, summaryData)
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
  attendance: AttendanceExportable[],
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

  const totalRecords = attendance.length
  const presentRecords = attendance.filter(
    (item) => item.status === "present"
  ).length

  const summaryData: PdfSummaryItem[] = [
    { label: "Total Records", value: String(totalRecords) },
    { label: "Present Records", value: String(presentRecords) },
  ]
  const summarySheet = XLSX.utils.json_to_sheet(summaryData)
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary")

  const worksheet = XLSX.utils.json_to_sheet(data)
  XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance")

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
  doc.setFontSize(11)
  doc.setFont("helvetica", "normal")
  doc.text(COMPANY_INFO.slogan, 40, 27)

  doc.setDrawColor(13, 148, 136)
  doc.setLineWidth(0.5)
  doc.line(14, 38, 196, 38)

  doc.setFontSize(14)
  doc.setFont("helvetica", "bold")
  doc.text("Attendance Export", 14, 48)

  const summaryTop = 54
  const summaryHeight = 20
  const summaryWidth = 182
  const summaryX = 14

  doc.setDrawColor(229, 231, 235)
  doc.setFillColor(250, 250, 250)
  doc.roundedRect(summaryX, summaryTop, summaryWidth, summaryHeight, 3, 3, "FD")

  const summaryColumns = summaryItems.length + 1
  const columnWidth = summaryWidth / summaryColumns
  const baseLabelX = summaryX + 6
  const baseValueY = summaryTop + 13

  doc.setFontSize(8)
  doc.setTextColor(107, 114, 128)
  doc.setFont("helvetica", "normal")
  doc.text("Generated on", baseLabelX, summaryTop + 7)
  doc.setFontSize(10)
  doc.setTextColor(17, 24, 39)
  doc.setFont("helvetica", "bold")
  doc.text(new Date().toLocaleString("en-RW"), baseLabelX, baseValueY)

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
    doc.text(item.value, labelX, baseValueY)
  })

  const footerText = `Contact: ${COMPANY_INFO.contact} | Email: ${COMPANY_INFO.email} | Address: ${COMPANY_INFO.address} | Website: ${COMPANY_INFO.website}`

  const headers = Object.keys(data[0])
  const rows = data.map((row) => headers.map((header) => row[header] || ""))

  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: 78,
    styles: {
      fontSize: 8,
      cellPadding: 3,
      lineColor: [200, 200, 200],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [13, 148, 136],
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
