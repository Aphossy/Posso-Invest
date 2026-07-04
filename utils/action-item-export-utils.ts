import { COMPANY_INFO } from "@/constants/organisation"
import type { ActionItem } from "@/db/schemas/action-item-schema"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import * as XLSX from "xlsx"

export interface ActionItemExportable extends ActionItem {
  ownerName?: string | null
  ownerEmail?: string | null
  createdByName?: string | null
  meetingTitle?: string | null
}

export interface ExportOptions {
  format: "csv" | "excel" | "pdf"
  includeFields: string[]
  filename?: string
}

export const exportActionItems = async (
  actionItems: ActionItemExportable[],
  options: ExportOptions
) => {
  const { format, includeFields, filename } = options
  const timestamp = new Date().toISOString().split("T")[0]
  const defaultFilename = `action-items-export-${timestamp}`

  const filteredData = actionItems.map((item) => {
    const filtered: Record<string, string> = {}
    includeFields.forEach((field) => {
      switch (field) {
        case "title":
          filtered["Title"] = item.title
          break
        case "status":
          filtered["Status"] = item.status.replace("_", " ")
          break
        case "priority":
          filtered["Priority"] = item.priority
          break
        case "ownerName":
          filtered["Owner"] = item.ownerName || "N/A"
          break
        case "ownerEmail":
          filtered["Owner Email"] = item.ownerEmail || "N/A"
          break
        case "meetingTitle":
          filtered["Meeting"] = item.meetingTitle || "N/A"
          break
        case "dueDate":
          filtered["Due Date"] = item.dueDate
            ? new Date(item.dueDate).toLocaleDateString("en-RW")
            : "N/A"
          break
        case "createdAt":
          filtered["Created Date"] = new Date(item.createdAt).toLocaleString()
          break
      }
    })
    return filtered
  })

  switch (format) {
    case "csv":
      exportToCSV(filteredData, filename || defaultFilename)
      break
    case "excel":
      exportToExcel(filteredData, actionItems, filename || defaultFilename)
      break
    case "pdf":
      await exportToPDF(filteredData, filename || defaultFilename)
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
    `# Generated on: ${new Date().toLocaleString()}`,
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
  actionItems: ActionItemExportable[],
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
    { Key: "Report Generated On", Value: new Date().toLocaleString() },
  ]
  const companySheet = XLSX.utils.json_to_sheet(companySheetData)
  XLSX.utils.book_append_sheet(workbook, companySheet, "Company Info")

  const totalItems = actionItems.length
  const openItems = actionItems.filter((item) => item.status === "open").length
  const doneItems = actionItems.filter((item) => item.status === "done").length

  const summaryData = [
    { Metric: "Total Action Items", Value: totalItems },
    { Metric: "Open Items", Value: openItems },
    { Metric: "Completed Items", Value: doneItems },
  ]
  const summarySheet = XLSX.utils.json_to_sheet(summaryData)
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary")

  const worksheet = XLSX.utils.json_to_sheet(data)
  XLSX.utils.book_append_sheet(workbook, worksheet, "Action Items")

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
  filename: string
) => {
  if (data.length === 0) return

  const doc = new jsPDF()
  const logo = await loadImage(COMPANY_INFO.logoUrl)

  if (logo) {
    doc.addImage(logo, "PNG", 14, 10, 30, 30)
  }

  doc.setFontSize(18)
  doc.setFont("helvetica", "bold")
  doc.text(COMPANY_INFO.name, 50, 20)
  doc.setFontSize(12)
  doc.setFont("helvetica", "normal")
  doc.text(COMPANY_INFO.slogan, 50, 30)

  doc.setFontSize(14)
  doc.text("Action Items Export", 14, 45)
  doc.setFontSize(10)
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 55)
  doc.text(`Total Records: ${data.length}`, 14, 62)

  const footerText = `Contact: ${COMPANY_INFO.contact} | Email: ${COMPANY_INFO.email} | Address: ${COMPANY_INFO.address} | Website: ${COMPANY_INFO.website}`

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
    margin: { top: 70, bottom: 20 },
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
