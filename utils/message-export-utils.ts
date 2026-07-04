import { COMPANY_INFO } from "@/constants/organisation"
import { type Message } from "@/db/schemas/message-schema"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import * as XLSX from "xlsx"

export interface ExportOptions {
  format: "csv" | "excel" | "pdf"
  includeFields: string[]
  filename?: string
}

const serviceLabels: Record<string, string> = {
  "full-stack": "Full-Stack Development",
  "ui-ux": "UI/UX Design",
  website: "Website Development",
  graphic: "Graphic Design",
  api: "API Development",
  seo: "SEO",
  consultation: "Consultation",
  other: "Other",
}

export const exportMessages = async (
  messages: Message[],
  options: ExportOptions
) => {
  const { format, includeFields, filename } = options
  const timestamp = new Date().toISOString().split("T")[0]
  const defaultFilename = `messages-export-${timestamp}`

  // Filter data based on selected fields
  const filteredData = messages.map((message) => {
    const filtered: any = {}
    includeFields.forEach((field) => {
      switch (field) {
        case "messageCode":
          filtered["Message Code"] = message.messageCode || "N/A"
          break
        case "name":
          filtered["Name"] = message.name || "N/A"
          break
        case "email":
          filtered["Email"] = message.email || "N/A"
          break
        case "phone":
          filtered["Phone"] = message.phone || "N/A"
          break
        case "service":
          filtered["Service"] =
            serviceLabels[message.service] || message.service
          break
        case "subject":
          filtered["Subject"] = message.subject || "N/A"
          break
        case "message":
          filtered["Message"] = message.message || "N/A"
          break
        case "status":
          filtered["Status"] = message.status || "N/A"
          break
        case "priority":
          filtered["Priority"] = message.priority || "medium"
          break
        case "isRead":
          filtered["Read"] = message.isRead ? "Yes" : "No"
          break
        case "isStarred":
          filtered["Starred"] = message.isStarred ? "Yes" : "No"
          break
        case "createdAt":
          filtered["Received"] = message.createdAt
            ? new Date(message.createdAt).toLocaleString()
            : "N/A"
          break
        case "updatedAt":
          filtered["Last Updated"] = message.updatedAt
            ? new Date(message.updatedAt).toLocaleString()
            : "N/A"
          break
        case "ipAddress":
          filtered["IP Address"] = message.ipAddress || "N/A"
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
      exportToExcel(filteredData, messages, filename || defaultFilename)
      break
    case "pdf":
      await exportToPDF(filteredData, filename || defaultFilename)
      break
  }
}

const exportToCSV = (data: any[], filename: string) => {
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

const exportToExcel = (data: any[], messages: Message[], filename: string) => {
  const workbook = XLSX.utils.book_new()

  // Company Info Sheet
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

  // Summary sheet
  const totalMessages = messages.length
  const newMessages = messages.filter((m) => m.status === "new").length
  const inProgressMessages = messages.filter(
    (m) => m.status === "in-progress"
  ).length
  const resolvedMessages = messages.filter(
    (m) => m.status === "resolved"
  ).length
  const unreadMessages = messages.filter((m) => !m.isRead).length
  const starredMessages = messages.filter((m) => m.isStarred).length

  const summaryData = [
    { Metric: "Total Messages", Value: totalMessages },
    { Metric: "New Messages", Value: newMessages },
    { Metric: "In Progress", Value: inProgressMessages },
    { Metric: "Resolved", Value: resolvedMessages },
    { Metric: "Unread Messages", Value: unreadMessages },
    { Metric: "Starred Messages", Value: starredMessages },
  ]

  const summarySheet = XLSX.utils.json_to_sheet(summaryData)
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary")

  // Main data sheet
  const worksheet = XLSX.utils.json_to_sheet(data)
  XLSX.utils.book_append_sheet(workbook, worksheet, "Messages")

  // Auto-size columns
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

const exportToPDF = async (data: any[], filename: string) => {
  if (data.length === 0) return

  const doc = new jsPDF()

  // Load logo image
  const logo = await loadImage(COMPANY_INFO.logoUrl)

  // Add logo to header
  if (logo) {
    doc.addImage(logo, "PNG", 14, 10, 30, 30)
  }

  // Add company name and slogan
  doc.setFontSize(18)
  doc.setFont("helvetica", "bold")
  doc.text(COMPANY_INFO.name, 50, 20)
  doc.setFontSize(12)
  doc.setFont("helvetica", "normal")
  doc.text(COMPANY_INFO.slogan, 50, 30)

  // Add report title
  doc.setFontSize(14)
  doc.text("Messages Export Report", 14, 45)
  doc.setFontSize(10)
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 55)
  doc.text(`Total Records: ${data.length}`, 14, 62)

  const footerText = `Contact: ${COMPANY_INFO.contact} | Email: ${COMPANY_INFO.email} | Address: ${COMPANY_INFO.address} | Website: ${COMPANY_INFO.website}`

  const headers = Object.keys(data[0])
  const rows = data.map((row) => headers.map((header) => row[header] || ""))

  // Add table
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
      fillColor: [66, 139, 202],
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

// Helper to load image as base64
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
