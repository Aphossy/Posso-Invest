import { COMPANY_INFO } from "@/constants/organisation"
import type { MeetingMinutes } from "@/db/schemas/minutes-schema"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import * as XLSX from "xlsx"

export interface MinutesExportable extends MeetingMinutes {
  meetingTitle?: string | null
  recordedByName?: string | null
  approvedByName?: string | null
}

export interface ExportOptions {
  format: "csv" | "excel" | "pdf"
  includeFields: string[]
  filename?: string
}

export const exportMinutes = async (
  minutes: MinutesExportable[],
  options: ExportOptions
) => {
  const { format, includeFields, filename } = options
  const timestamp = new Date().toISOString().split("T")[0]
  const defaultFilename = `minutes-export-${timestamp}`

  const filteredData = minutes.map((item) => {
    const filtered: Record<string, string> = {}
    includeFields.forEach((field) => {
      switch (field) {
        case "meetingTitle":
          filtered["Meeting Title"] = item.meetingTitle || "N/A"
          break
        case "status":
          filtered["Status"] = item.status
          break
        case "summary":
          filtered["Summary"] = item.summary || "N/A"
          break
        case "decisions":
          filtered["Decisions"] = item.decisions?.items?.join("; ") || "N/A"
          break
        case "actionItems":
          filtered["Action Items"] =
            item.actionItems?.items?.map((action) => action.task).join("; ") ||
            "N/A"
          break
        case "recordedByName":
          filtered["Recorded By"] = item.recordedByName || "N/A"
          break
        case "approvedByName":
          filtered["Approved By"] = item.approvedByName || "N/A"
          break
        case "publishedAt":
          filtered["Published At"] = item.publishedAt
            ? new Date(item.publishedAt).toLocaleDateString("en-RW")
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
      exportToExcel(filteredData, minutes, filename || defaultFilename)
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
  minutes: MinutesExportable[],
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

  const totalMinutes = minutes.length
  const publishedMinutes = minutes.filter(
    (item) => item.status === "published"
  ).length

  const summaryData = [
    { Metric: "Total Minutes", Value: totalMinutes },
    { Metric: "Published Minutes", Value: publishedMinutes },
  ]
  const summarySheet = XLSX.utils.json_to_sheet(summaryData)
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary")

  const worksheet = XLSX.utils.json_to_sheet(data)
  XLSX.utils.book_append_sheet(workbook, worksheet, "Minutes")

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
  doc.text("Meeting Minutes Export", 14, 45)
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
      fillColor: [13, 148, 136],
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

/**
 * Generate a detailed PDF for a single meeting minute
 * Includes meeting details, decisions, action items, and attendance
 */
export const generateMinutesPDF = async (
  minute: MinutesExportable,
  filename?: string
): Promise<void> => {
  const timestamp = new Date().toISOString().split("T")[0]
  const defaultFilename = `TrustLink-Minutes-${minute.meetingTitle || timestamp}`

  try {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 15
    let yPosition = margin

    // Header
    doc.setFontSize(14)
    doc.setTextColor(20, 20, 20)
    doc.text(COMPANY_INFO.name, pageWidth / 2, yPosition, { align: "center" })

    yPosition += 5
    doc.setFontSize(10)
    doc.setTextColor(90, 90, 90)
    doc.text(COMPANY_INFO.slogan, pageWidth / 2, yPosition, { align: "center" })

    yPosition += 8
    doc.setDrawColor(100, 100, 100)
    doc.line(margin, yPosition, pageWidth - margin, yPosition)

    // Title
    yPosition += 8
    doc.setFontSize(13)
    doc.setTextColor(20, 20, 20)
    doc.setFont("helvetica", "bold")
    doc.text(
      minute.meetingTitle || "Meeting Minutes",
      pageWidth / 2,
      yPosition,
      { align: "center" }
    )

    // Meeting Info
    yPosition += 12
    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(50, 50, 50)

    const scheduleData = [
      [
        "Date:",
        minute.createdAt
          ? new Date(minute.createdAt).toLocaleDateString("en-RW")
          : "N/A",
      ],
      [
        "Attendance:",
        minute.attendance?.presentIds
          ? `${minute.attendance.presentIds.length} present${
              minute.attendance.absentIds?.length
                ? `, ${minute.attendance.absentIds.length} absent`
                : ""
            }`
          : "N/A",
      ],
      [
        "Status:",
        minute.status.charAt(0).toUpperCase() + minute.status.slice(1),
      ],
      [
        "Last Updated:",
        minute.updatedAt
          ? new Date(minute.updatedAt).toLocaleDateString("en-RW")
          : "N/A",
      ],
    ]

    scheduleData.forEach((row) => {
      doc.setFont("helvetica", "bold")
      doc.text(row[0], margin, yPosition)
      doc.setFont("helvetica", "normal")
      doc.text(row[1], margin + 35, yPosition)
      yPosition += 6
    })

    // Summary
    if (minute.summary) {
      yPosition += 3
      doc.setFont("helvetica", "bold")
      doc.setFontSize(10)
      doc.text("Summary:", margin, yPosition)
      yPosition += 5
      doc.setFont("helvetica", "normal")
      doc.setFontSize(9)
      const summaryLines = doc.splitTextToSize(
        minute.summary,
        pageWidth - margin * 2
      )
      doc.text(summaryLines, margin, yPosition)
      yPosition += summaryLines.length * 4 + 3
    }

    // Key Decisions
    if (minute.decisions?.items && minute.decisions.items.length > 0) {
      yPosition += 3
      if (yPosition > pageHeight - 40) {
        doc.addPage()
        yPosition = margin
      }
      doc.setFont("helvetica", "bold")
      doc.setFontSize(10)
      doc.text("Key Decisions:", margin, yPosition)
      yPosition += 5
      doc.setFont("helvetica", "normal")
      doc.setFontSize(9)

      minute.decisions.items.forEach((decision, idx) => {
        if (yPosition > pageHeight - 20) {
          doc.addPage()
          yPosition = margin
        }
        const lines = doc.splitTextToSize(
          `${idx + 1}. ${decision}`,
          pageWidth - margin * 2 - 5
        )
        doc.text(lines, margin + 5, yPosition)
        yPosition += lines.length * 4
      })
    }

    // Action Items
    if (minute.actionItems?.items && minute.actionItems.items.length > 0) {
      yPosition += 3
      if (yPosition > pageHeight - 60) {
        doc.addPage()
        yPosition = margin
      }
      doc.setFont("helvetica", "bold")
      doc.setFontSize(10)
      doc.text("Action Items:", margin, yPosition)
      yPosition += 5
      doc.setFont("helvetica", "normal")
      doc.setFontSize(9)

      const tableData = minute.actionItems.items.map((item, idx) => [
        String(idx + 1),
        item.task,
        item.owner || "N/A",
        item.dueDate
          ? new Date(item.dueDate).toLocaleDateString("en-RW")
          : "N/A",
        item.status || "Pending",
      ])

      autoTable(doc, {
        head: [["#", "Task", "Owner", "Due Date", "Status"]],
        body: tableData,
        startY: yPosition,
        margin: margin,
        styles: {
          fontSize: 8,
          cellPadding: 3,
        },
        headStyles: {
          fillColor: [41, 128, 185],
          textColor: 255,
          fontStyle: "bold",
        },
      })

      yPosition = (doc as any).lastAutoTable.finalY + 5
    }

    // Footer
    const pageCount = doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setTextColor(150, 150, 150)
      doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 10, {
        align: "center",
      })
      doc.text(
        `Generated on ${new Date().toLocaleString()}`,
        pageWidth / 2,
        pageHeight - 5,
        { align: "center" }
      )
    }

    // Save
    doc.save(`${filename || defaultFilename}.pdf`)
  } catch (error) {
    console.error("Error generating PDF:", error)
    throw error
  }
}
