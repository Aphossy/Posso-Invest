import { COMPANY_INFO, organisationName } from "@/constants/organisation"
import type { IkiminaProfileMetadata } from "@/db/schemas"
import type { Loan } from "@/db/schemas/loan-schema"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import * as XLSX from "xlsx"

export interface LoanExportable extends Loan {
  memberName?: string | null
  memberEmail?: string | null
  approvedByName?: string | null
  disbursedByName?: string | null
  memberIkiminaProfile?: IkiminaProfileMetadata | null
  totalRepaid?: number | null
  outstandingBalance?: number | null
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

const formatRwfAmount = (value?: string | number | null, fallback = "N/A") => {
  if (value === null || value === undefined || value === "") {
    return fallback
  }

  const numericValue =
    typeof value === "number" ? value : Number.parseFloat(value)

  if (!Number.isFinite(numericValue)) {
    return fallback
  }

  return `${new Intl.NumberFormat("en-RW", {
    maximumFractionDigits: 0,
  }).format(Math.round(numericValue))} RWF`
}

export const exportLoans = async (
  loans: LoanExportable[],
  options: ExportOptions
) => {
  const { format, includeFields, filename } = options
  const timestamp = new Date().toISOString().split("T")[0]
  const defaultFilename = `${COMPANY_INFO.name.toLowerCase().replace(/\s+/g, "-")}-loans-${timestamp}`

  const filteredData = loans.map((item) => {
    const filtered: Record<string, string> = {}
    includeFields.forEach((field) => {
      switch (field) {
        case "memberName":
          filtered["Member Name"] = item.memberName || "N/A"
          break
        case "memberEmail":
          filtered["Member Email"] = item.memberEmail || "N/A"
          break
        case "requestedAmount":
          filtered["Requested Amount"] = formatRwfAmount(item.requestedAmount)
          break
        case "approvedAmount":
          filtered["Approved Amount"] = formatRwfAmount(item.approvedAmount)
          break
        case "amountToRepay": {
          const principal = Number.parseFloat(
            item.approvedAmount || item.requestedAmount || "0"
          )
          filtered["Amount to Repay"] =
            principal > 0 ? formatRwfAmount(principal * 1.05) : "N/A"
          break
        }
        case "termMonths":
          filtered["Term (Months)"] = item.termMonths?.toString() || "N/A"
          break
        case "status":
          filtered["Status"] = item.status
          break
        case "requestedAt":
          filtered["Requested At"] = new Date(
            item.requestedAt
          ).toLocaleDateString("en-RW")
          break
        case "dueDate":
          filtered["Due Date"] = item.dueDate
            ? new Date(item.dueDate).toLocaleDateString("en-RW")
            : "N/A"
          break
        case "approvedByName":
          filtered["Approved By"] = item.approvedByName || "N/A"
          break
        case "disbursedByName":
          filtered["Disbursed By"] = item.disbursedByName || "N/A"
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

  const totalLoans = loans.length
  const activeLoans = loans.filter((item) =>
    ["approved", "disbursed", "repaying", "overdue"].includes(item.status)
  ).length
  const totalRequested = loans.reduce(
    (sum, item) => sum + Number.parseFloat(item.requestedAmount || "0"),
    0
  )
  const totalApproved = loans.reduce(
    (sum, item) => sum + Number.parseFloat(item.approvedAmount || "0"),
    0
  )
  const totalAmountToRepay = loans.reduce((sum, item) => {
    const principal = Number.parseFloat(
      item.approvedAmount || item.requestedAmount || "0"
    )
    return sum + principal * 1.05
  }, 0)
  const summaryData: PdfSummaryItem[] = [
    { label: "Total Loans", value: String(totalLoans) },
    { label: "Active Loans", value: String(activeLoans) },
    { label: "Requested Amount", value: formatRwfAmount(totalRequested) },
    { label: "Approved Amount", value: formatRwfAmount(totalApproved) },
    {
      label: "Total Amount to Repay",
      value: formatRwfAmount(totalAmountToRepay),
    },
  ]

  switch (format) {
    case "csv":
      exportToCSV(filteredData, filename || defaultFilename)
      break
    case "excel":
      exportToExcel(filteredData, loans, filename || defaultFilename)
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
    `# Note: Amount to Repay = Approved Amount x 1.05 (5% fixed interest rate per constitution)`,
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
  loans: LoanExportable[],
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

  const totalLoans = loans.length
  const activeLoans = loans.filter((item) =>
    ["approved", "disbursed", "repaying", "overdue"].includes(item.status)
  ).length
  const totalRequested = loans.reduce(
    (sum, item) => sum + Number.parseFloat(item.requestedAmount || "0"),
    0
  )
  const totalApproved = loans.reduce(
    (sum, item) => sum + Number.parseFloat(item.approvedAmount || "0"),
    0
  )
  const totalAmountToRepayXlsx = loans.reduce((sum, item) => {
    const principal = Number.parseFloat(
      item.approvedAmount || item.requestedAmount || "0"
    )
    return sum + principal * 1.05
  }, 0)

  const summaryData: PdfSummaryItem[] = [
    { label: "Total Loans", value: String(totalLoans) },
    { label: "Active Loans", value: String(activeLoans) },
    { label: "Requested Amount", value: formatRwfAmount(totalRequested) },
    { label: "Approved Amount", value: formatRwfAmount(totalApproved) },
    {
      label: "Total Amount to Repay",
      value: formatRwfAmount(totalAmountToRepayXlsx),
    },
    {
      label: "Note",
      value:
        "Amount to Repay = Approved Amount x 1.05 (5% fixed interest rate per constitution)",
    },
  ]
  const summarySheet = XLSX.utils.json_to_sheet(summaryData)
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary")

  const worksheet = XLSX.utils.json_to_sheet(data)
  XLSX.utils.book_append_sheet(workbook, worksheet, "Loans")

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

  doc.setDrawColor(30, 64, 175)
  doc.setLineWidth(0.5)
  doc.line(14, 38, 196, 38)

  doc.setFontSize(14)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(17, 24, 39)
  doc.text("Loans Report", 14, 48)

  doc.setFontSize(8)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(107, 114, 128)
  doc.text(`Generated on: ${new Date().toLocaleString("en-RW")}`, 196, 48, {
    align: "right",
  })

  const summaryTop = 54
  const summaryHeight = 22
  const summaryWidth = 182
  const summaryX = 14

  doc.setDrawColor(229, 231, 235)
  doc.setFillColor(250, 250, 250)
  doc.roundedRect(summaryX, summaryTop, summaryWidth, summaryHeight, 3, 3, "FD")

  const summaryColumns = summaryItems.length
  const columnWidth = summaryWidth / summaryColumns
  const baseValueY = summaryTop + 15

  summaryItems.forEach((item, index) => {
    const labelX = summaryX + columnWidth * index + 5
    doc.setFontSize(7)
    doc.setTextColor(107, 114, 128)
    doc.setFont("helvetica", "normal")
    doc.text(item.label, labelX, summaryTop + 8, { maxWidth: columnWidth - 6 })
    doc.setFontSize(9.5)
    doc.setTextColor(17, 24, 39)
    doc.setFont("helvetica", "bold")
    doc.text(item.value, labelX, baseValueY)
  })

  const footerText = `Email: ${COMPANY_INFO.email} | Website: ${COMPANY_INFO.website}`

  doc.setFontSize(7.5)
  doc.setTextColor(107, 114, 128)
  doc.setFont("helvetica", "italic")
  doc.text(
    "* Amount to Repay = Approved Amount × 1.05 (5% fixed interest rate per constitution)",
    14,
    80
  )

  const headers = Object.keys(data[0])
  const rows = data.map((row) => headers.map((header) => row[header] || ""))

  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: 86,
    styles: {
      fontSize: 8,
      cellPadding: 3,
      lineColor: [200, 200, 200],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [30, 64, 175],
      textColor: 255,
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    margin: { top: 86, bottom: 20 },
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
