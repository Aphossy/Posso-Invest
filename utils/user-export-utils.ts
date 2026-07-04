// C:\Users\user\OneDrive\Desktop\trustlink-group\utils\user-export-utils.ts
import { COMPANY_INFO } from "@/constants/organisation"
import { type User } from "@/db"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import * as XLSX from "xlsx"

export interface ExportOptions {
  format: "csv" | "excel" | "pdf"
  includeFields: string[]
  filename?: string
}

interface PdfSummaryItem {
  label: string
  value: string
}

export const exportUsers = async (users: User[], options: ExportOptions) => {
  const { format, includeFields, filename } = options
  const timestamp = new Date().toISOString().split("T")[0]
  const defaultFilename = `trustlink-group-users-export-${timestamp}`

  // Filter data based on selected fields
  const filteredData = users.map((user) => {
    const filtered: any = {}
    includeFields.forEach((field) => {
      switch (field) {
        case "name":
          filtered["Full Name"] = user.name ?? "N/A"
          break
        case "email":
          filtered["Email Address"] = user.email ?? "N/A"
          break
        case "role":
          filtered["Role"] = user.role ?? "N/A"
          break
        case "emailVerified":
          filtered["Verification Status"] = user.emailVerified
            ? "Verified"
            : "Unverified"
          break
        case "createdAt":
          filtered["Created Date"] = user.createdAt
            ? new Date(user.createdAt).toLocaleString("en-RW")
            : "N/A"
          break
        case "updatedAt":
          filtered["Last Updated"] = user.updatedAt
            ? new Date(user.updatedAt).toLocaleString("en-RW")
            : "N/A"
          break
        case "banned":
          filtered["Ban Status"] = user.banned ? "Banned" : "Active"
          break
        case "banReason":
          filtered["Ban Reason"] = user.banned
            ? user.banReason || "Not specified"
            : "N/A"
          break
        case "lastLoginMethod":
          filtered["Last Login Method"] = user.lastLoginMethod ?? "N/A"
          break
        case "twoFactorEnabled":
          filtered["Two-Factor Authentication"] = user.twoFactorEnabled
            ? "Enabled"
            : "Disabled"
          break
      }
    })
    return filtered
  })

  const totalUsers = users.length
  const activeUsers = users.filter((u) => !u.banned).length
  const verifiedUsers = users.filter((u) => u.emailVerified).length
  const bannedUsers = users.filter((u) => u.banned).length
  const summaryData: PdfSummaryItem[] = [
    { label: "Total Users", value: String(totalUsers) },
    { label: "Active Users", value: String(activeUsers) },
    { label: "Verified Users", value: String(verifiedUsers) },
    { label: "Banned Users", value: String(bannedUsers) },
  ]

  switch (format) {
    case "csv":
      exportToCSV(filteredData, filename || defaultFilename)
      break
    case "excel":
      exportToExcel(filteredData, users, filename || defaultFilename)
      break
    case "pdf":
      await exportToPDF(filteredData, filename || defaultFilename, summaryData)
      break
  }
}

const exportToCSV = (data: any[], filename: string) => {
  if (data.length === 0) return

  const headers = Object.keys(data[0])
  // Add company info as commented header for professionalism (CSV doesn't support rich formatting)
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
          // Escape commas and quotes
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

const exportToExcel = (data: any[], users: User[], filename: string) => {
  const workbook = XLSX.utils.book_new()

  // Company Info Sheet for professionalism
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

  // Summary sheet with enhanced metrics
  const totalUsers = users.length
  const activeUsers = users.filter((u) => !u.banned).length
  const verifiedUsers = users.filter((u) => u.emailVerified).length
  const bannedUsers = users.filter((u) => u.banned).length

  const summaryData: PdfSummaryItem[] = [
    { label: "Total Users", value: String(totalUsers) },
    { label: "Active Users", value: String(activeUsers) },
    { label: "Verified Users", value: String(verifiedUsers) },
    { label: "Banned Users", value: String(bannedUsers) },
  ]

  const summarySheet = XLSX.utils.json_to_sheet(summaryData)
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary")

  // Main data sheet
  const worksheet = XLSX.utils.json_to_sheet(data)
  XLSX.utils.book_append_sheet(workbook, worksheet, "Users")

  // Auto-size columns for better readability
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
  data: any[],
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

  doc.setDrawColor(66, 139, 202)
  doc.setLineWidth(0.5)
  doc.line(14, 38, 196, 38)

  doc.setFontSize(14)
  doc.setFont("helvetica", "bold")
  doc.text("Users Export Report", 14, 48)

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
      fillColor: [66, 139, 202],
      textColor: 255,
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    columnStyles: {
      0: { cellWidth: "auto" },
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

// Helper to load image as base64 for jsPDF
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

export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (err) {
    console.error("Failed to copy text to clipboard:", err)
    // Fallback for older browsers
    const textArea = document.createElement("textarea")
    textArea.value = text
    textArea.style.position = "fixed"
    textArea.style.left = "-999999px"
    textArea.style.top = "-999999px"
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    const success = document.execCommand("copy")
    document.body.removeChild(textArea)
    return success
  }
}
