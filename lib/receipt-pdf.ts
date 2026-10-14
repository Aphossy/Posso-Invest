import {
  COMPANY_INFO,
  organisationEmail,
  organisationName,
  organisationPhone,
  organisationSlogan,
  organisationWebsite,
} from "@/constants/organisation"
import type { Receipt } from "@/db/schemas/receipt-schema"
import jsPDF from "jspdf"

export interface ReceiptPdfData extends Receipt {
  memberName: string
  issuedByName?: string | null
}

const receiptTypeLabels: Record<string, string> = {
  contribution: "Contribution",
  loan_repayment: "Loan repayment",
  penalty_payment: "Penalty payment",
  registration_fee: "Registration fee",
  other: "Payment",
}

const paymentMethodLabels: Record<string, string> = {
  cash: "Cash",
  bank_transfer: "Bank transfer",
  mobile_money: "Mobile money",
  check: "Cheque",
  other: "Other",
}

function formatMoney(amount: string, currency: string) {
  return `${currency} ${Number(amount).toLocaleString("en-RW", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`
}

function formatIssuedDate(date: Date) {
  return new Intl.DateTimeFormat("en-RW", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Africa/Kigali",
  }).format(date)
}

export function generateReceiptPdf(data: ReceiptPdfData): Uint8Array {
  const pdf = new jsPDF({ unit: "mm", format: "a5", orientation: "portrait" })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const margin = 14
  const right = pageWidth - margin

  pdf.setFillColor(18, 61, 48)
  pdf.rect(0, 0, pageWidth, 47, "F")
  pdf.setFillColor(216, 170, 76)
  pdf.rect(0, 47, pageWidth, 2, "F")

  pdf.setTextColor(255, 255, 255)
  pdf.setFont("helvetica", "bold")
  pdf.setFontSize(17)
  pdf.text(organisationName, margin, 17)
  pdf.setFont("helvetica", "normal")
  pdf.setFontSize(8)
  pdf.text(organisationSlogan, margin, 23)
  pdf.text(COMPANY_INFO.address, margin, 30)
  pdf.text(`${organisationPhone} | ${organisationEmail}`, margin, 35)

  pdf.setFont("helvetica", "bold")
  pdf.setFontSize(14)
  pdf.text("PAYMENT RECEIPT", right, 17, { align: "right" })
  pdf.setFont("helvetica", "normal")
  pdf.setFontSize(8)
  pdf.text(data.receiptNumber ?? "Receipt", right, 23, { align: "right" })
  pdf.text(formatIssuedDate(data.issuedAt), right, 30, { align: "right" })
  pdf.setTextColor(0, 0, 0)

  const receiptType = receiptTypeLabels[data.receiptType] ?? "Payment"
  const status = data.status === "issued" ? "ISSUED" : data.status.toUpperCase()
  pdf.setFillColor(
    data.status === "issued" ? 230 : 250,
    data.status === "issued" ? 244 : 235,
    data.status === "issued" ? 237 : 235
  )
  pdf.roundedRect(margin, 58, pageWidth - margin * 2, 43, 3, 3, "F")
  pdf.setTextColor(75, 85, 82)
  pdf.setFont("helvetica", "bold")
  pdf.setFontSize(8)
  pdf.text(`${receiptType.toUpperCase()} | ${status}`, margin + 6, 67)
  pdf.setTextColor(18, 61, 48)
  pdf.setFontSize(23)
  pdf.text(formatMoney(data.amount, data.currency), margin + 6, 83)
  pdf.setTextColor(75, 85, 82)
  pdf.setFont("helvetica", "normal")
  pdf.setFontSize(8)
  pdf.text("Amount received", margin + 6, 92)

  let y = 115
  const addRow = (label: string, value: string) => {
    pdf.setDrawColor(224, 229, 226)
    pdf.line(margin, y - 4, right, y - 4)
    pdf.setTextColor(105, 113, 109)
    pdf.setFont("helvetica", "normal")
    pdf.setFontSize(9)
    pdf.text(label, margin, y)
    pdf.setTextColor(32, 41, 37)
    pdf.setFont("helvetica", "bold")
    pdf.text(value || "-", right, y, { align: "right", maxWidth: 87 })
    y += 12
  }

  addRow("Received from", data.memberName)
  addRow(
    "Payment method",
    paymentMethodLabels[data.paymentMethod ?? "other"] ?? "Other"
  )
  addRow("Receipt type", receiptType)
  if (data.period) addRow("Period", data.period)
  if (data.issuedByName) addRow("Recorded by", data.issuedByName)

  const footerY = Math.max(y + 9, 184)
  pdf.setDrawColor(216, 170, 76)
  pdf.setLineWidth(0.6)
  pdf.line(margin, footerY, right, footerY)
  pdf.setTextColor(75, 85, 82)
  pdf.setFont("helvetica", "normal")
  pdf.setFontSize(8)
  pdf.text(
    "Thank you. Please keep this receipt for your records.",
    margin,
    footerY + 7
  )
  pdf.setFontSize(7)
  pdf.text(
    `${organisationWebsite} | ${organisationEmail} | ${organisationPhone}`,
    margin,
    footerY + 13
  )
  pdf.setTextColor(18, 61, 48)
  pdf.setFont("helvetica", "bold")
  pdf.text(COMPANY_INFO.name, right, footerY + 7, { align: "right" })

  return new Uint8Array(pdf.output("arraybuffer"))
}
