import { COMPANY_INFO } from "@/constants/organisation"
import { format } from "date-fns"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import * as XLSX from "xlsx"

export type ReportExportFormat = "csv" | "excel" | "pdf"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FundTrackerTotals {
  confirmedContributions: number
  totalPenalties: number
  totalIncome: number
  totalDisbursed: number
  totalOutstanding: number
  totalExpenses: number
  pendingExpenses: number
  expenseCount: number
  netBalance: number
}

export interface FundTrackerMonthRow {
  period: string
  label: string
  contributions: number
  penalties: number
  income: number
  disbursed: number
  expenses: number
  net: number
  cumulativeBalance: number
}

export interface MeetingEntry {
  id?: string
  title: string
  scheduledAt?: string | Date | null
  status: string
  location?: string | null
  hostContribution?: string | null
}

export interface LoanEntry {
  id?: string
  memberName?: string | null
  memberEmail?: string | null
  status: string
  requestedAmount?: string | null
  approvedAmount?: string | null
  requestedAt?: string | Date | null
  disbursedAt?: string | Date | null
}

export interface AuditFinancialSummary {
  totalCollected: number
  totalConfirmed: number
  totalPenalties: number
  confirmedCount: number
  lateCount: number
  penaltyCount: number
  pendingCount: number
  totalExpected: number
  complianceRate: number
  shortfall: number
}

export interface AuditLoansSummary {
  total: number
  disbursed: number
  disbursedTotal: number
  overdue: number
  repaid: number
  interestEarned: number
}

export interface MemberMatrixEntry {
  name: string
  email: string
  contributions: Map<string, string>
}

export interface ContributionEntry {
  id?: string
  memberName?: string | null
  memberEmail?: string | null
  status?: string | null
  amount?: string | null
  penaltyAmount?: string | null
  paidAt?: string | Date | null
  metadata?: { paymentMethod?: string } | null
}

export interface MonthlyContribSummary {
  collected: number
  confirmed: number
  penalties: number
  pendingCount: number
  lateCount: number
  penaltyCount: number
  waivedCount: number
  confirmedCount: number
  expected: number
  compliance: number
  total: number
}

// ── Shared helpers ─────────────────────────────────────────────────────────────

function fmtRwf(v?: number | string | null): string {
  if (v === undefined || v === null) return "N/A"
  const n = typeof v === "number" ? v : Number.parseFloat(String(v))
  if (!Number.isFinite(n)) return "N/A"
  return `${new Intl.NumberFormat("en-RW", { maximumFractionDigits: 0 }).format(Math.round(n))} RWF`
}

function fmtDate(v?: string | Date | null): string {
  if (!v) return "-"
  const d = v instanceof Date ? v : new Date(v)
  return isNaN(d.getTime()) ? "-" : format(d, "MMM d, yyyy")
}

function getTimestamp(): string {
  return new Date().toISOString().split("T")[0]
}

function paymentMethodLabel(m?: string | null): string {
  if (!m) return "-"
  return m === "momo"
    ? "Mobile Money"
    : m === "cash"
      ? "Cash"
      : m === "bank"
        ? "Bank Transfer"
        : m
}

function statusInitial(s?: string): string {
  switch (s) {
    case "confirmed":
      return "C"
    case "pending":
      return "P"
    case "late":
      return "L"
    case "waived":
      return "W"
    default:
      return "-"
  }
}

const loadImage = (url: string): Promise<string | null> =>
  new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.src = url
    img.onload = () => {
      const canvas = document.createElement("canvas")
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext("2d")
      ctx ? resolve(canvas.toDataURL("image/png")) : resolve(null)
    }
    img.onerror = () => resolve(null)
  })

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.style.visibility = "hidden"
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function csvRow(cells: (string | number | null | undefined)[]): string {
  return cells
    .map((c) => {
      const s = String(c ?? "")
      return s.includes(",") || s.includes('"') || s.includes("\n")
        ? `"${s.replace(/"/g, '""')}"`
        : s
    })
    .join(",")
}

function companyHeaderLines(): string[] {
  return [
    `# ${COMPANY_INFO.name} - ${COMPANY_INFO.slogan}`,
    `# Contact: ${COMPANY_INFO.contact} | Email: ${COMPANY_INFO.email}`,
    `# Address: ${COMPANY_INFO.address} | Website: ${COMPANY_INFO.website}`,
    `# Generated: ${new Date().toLocaleString("en-RW")}`,
    "",
  ]
}

function xlsxCompanySheet(): XLSX.WorkSheet {
  return XLSX.utils.json_to_sheet([
    { Key: "Company Name", Value: COMPANY_INFO.name },
    { Key: "Slogan", Value: COMPANY_INFO.slogan },
    { Key: "Contact", Value: COMPANY_INFO.contact },
    { Key: "Email", Value: COMPANY_INFO.email },
    { Key: "Address", Value: COMPANY_INFO.address },
    { Key: "Website", Value: COMPANY_INFO.website },
    { Key: "Generated On", Value: new Date().toLocaleString("en-RW") },
  ])
}

// ── PDF helpers ────────────────────────────────────────────────────────────────

function addPdfHeader(
  doc: jsPDF,
  logo: string | null,
  title: string,
  subtitle?: string
): number {
  if (logo) doc.addImage(logo, "PNG", 14, 11, 22, 22)
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
  doc.text(title, 14, 48)
  if (subtitle) {
    doc.setFontSize(9)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(107, 114, 128)
    doc.text(subtitle, 14, 55)
  }
  doc.setFontSize(8)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(107, 114, 128)
  doc.text(`Generated: ${new Date().toLocaleString("en-RW")}`, 196, 48, {
    align: "right",
  })
  return subtitle ? 63 : 55
}

function addSummaryBox(
  doc: jsPDF,
  items: { label: string; value: string }[],
  y: number
): number {
  const w = 182,
    h = 22,
    x = 14
  doc.setDrawColor(229, 231, 235)
  doc.setFillColor(250, 250, 250)
  doc.roundedRect(x, y, w, h, 3, 3, "FD")
  const cw = w / items.length
  for (let i = 0; i < items.length; i++) {
    const lx = x + cw * i + 5
    doc.setFontSize(7)
    doc.setTextColor(107, 114, 128)
    doc.setFont("helvetica", "normal")
    doc.text(items[i].label, lx, y + 8, { maxWidth: cw - 6 })
    doc.setFontSize(9)
    doc.setTextColor(17, 24, 39)
    doc.setFont("helvetica", "bold")
    doc.text(items[i].value, lx, y + 16, { maxWidth: cw - 6 })
  }
  return y + h + 6
}

function addSectionTitle(doc: jsPDF, title: string, y: number): void {
  doc.setFontSize(10)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(30, 64, 175)
  doc.text(title, 14, y)
}

function makeFooter(doc: jsPDF) {
  const footer = `${COMPANY_INFO.email} | ${COMPANY_INFO.website}`
  return (data: any) => {
    const pc = doc.getNumberOfPages()
    doc.setFontSize(7.5)
    doc.setTextColor(150)
    doc.setFont("helvetica", "normal")
    doc.text(footer, 14, doc.internal.pageSize.height - 10, { maxWidth: 170 })
    doc.text(
      `Page ${data.pageNumber} of ${pc}`,
      doc.internal.pageSize.width - 14,
      doc.internal.pageSize.height - 10,
      { align: "right" }
    )
  }
}

const baseTableStyles = {
  styles: {
    fontSize: 8,
    cellPadding: 3,
    lineColor: [200, 200, 200] as [number, number, number],
    lineWidth: 0.1,
  },
  headStyles: {
    fillColor: [30, 64, 175] as [number, number, number],
    textColor: 255,
    fontStyle: "bold" as const,
  },
  alternateRowStyles: {
    fillColor: [245, 245, 245] as [number, number, number],
  },
  margin: { left: 14, right: 14, bottom: 20 },
}

// ── Fund Tracker ───────────────────────────────────────────────────────────────

export async function exportFundTracker(
  totals: FundTrackerTotals,
  monthlyData: FundTrackerMonthRow[],
  loanCounts: {
    active: number
    overdue: number
    repaid: number
    total: number
  },
  fmt: ReportExportFormat,
  filename?: string
): Promise<void> {
  const name = filename || `fund-tracker-${getTimestamp()}`
  if (fmt === "csv") exportFundTrackerCSV(totals, monthlyData, loanCounts, name)
  else if (fmt === "excel")
    exportFundTrackerExcel(totals, monthlyData, loanCounts, name)
  else await exportFundTrackerPDF(totals, monthlyData, name)
}

function exportFundTrackerCSV(
  totals: FundTrackerTotals,
  monthlyData: FundTrackerMonthRow[],
  loanCounts: {
    active: number
    overdue: number
    repaid: number
    total: number
  },
  filename: string
) {
  const isDeficit = totals.netBalance < 0
  const lines: string[] = [
    ...companyHeaderLines(),
    "# FUND TRACKER REPORT",
    "",
    "# === FINANCIAL SUMMARY ===",
    csvRow(["Metric", "Value"]),
    csvRow([
      "Net Fund Balance",
      `${isDeficit ? "-" : ""}${fmtRwf(Math.abs(totals.netBalance))}`,
    ]),
    csvRow(["Total Income", fmtRwf(totals.totalIncome)]),
    csvRow(["Confirmed Contributions", fmtRwf(totals.confirmedContributions)]),
    csvRow(["Penalties Collected", fmtRwf(totals.totalPenalties)]),
    csvRow(["Loans Disbursed (all time)", fmtRwf(totals.totalDisbursed)]),
    csvRow(["Outstanding Loans", fmtRwf(totals.totalOutstanding)]),
    csvRow(["Approved Expenses", fmtRwf(totals.totalExpenses)]),
    csvRow(["Pending Expenses", fmtRwf(totals.pendingExpenses)]),
    csvRow(["Active Loans", String(loanCounts.active)]),
    csvRow(["Overdue Loans", String(loanCounts.overdue)]),
    csvRow(["Repaid Loans", String(loanCounts.repaid)]),
    "",
    "# === PERIOD-BY-PERIOD BREAKDOWN ===",
    csvRow([
      "Period",
      "Contributions",
      "Penalties",
      "Income",
      "Loans Out",
      "Expenses",
      "Net",
      "Cumulative Balance",
    ]),
    ...monthlyData.map((r) =>
      csvRow([
        r.label,
        fmtRwf(r.contributions),
        fmtRwf(r.penalties),
        fmtRwf(r.income),
        fmtRwf(r.disbursed),
        fmtRwf(r.expenses),
        fmtRwf(r.net),
        fmtRwf(r.cumulativeBalance),
      ])
    ),
  ]
  downloadBlob(
    new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" }),
    `${filename}.csv`
  )
}

function exportFundTrackerExcel(
  totals: FundTrackerTotals,
  monthlyData: FundTrackerMonthRow[],
  loanCounts: {
    active: number
    overdue: number
    repaid: number
    total: number
  },
  filename: string
) {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, xlsxCompanySheet(), "Company Info")

  const isDeficit = totals.netBalance < 0
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet([
      {
        Metric: "Net Fund Balance",
        Value: `${isDeficit ? "-" : ""}${fmtRwf(Math.abs(totals.netBalance))}`,
      },
      { Metric: "Total Income", Value: fmtRwf(totals.totalIncome) },
      {
        Metric: "Confirmed Contributions",
        Value: fmtRwf(totals.confirmedContributions),
      },
      { Metric: "Penalties Collected", Value: fmtRwf(totals.totalPenalties) },
      {
        Metric: "Loans Disbursed (all time)",
        Value: fmtRwf(totals.totalDisbursed),
      },
      { Metric: "Outstanding Loans", Value: fmtRwf(totals.totalOutstanding) },
      { Metric: "Approved Expenses", Value: fmtRwf(totals.totalExpenses) },
      { Metric: "Pending Expenses", Value: fmtRwf(totals.pendingExpenses) },
      { Metric: "Active Loans", Value: String(loanCounts.active) },
      { Metric: "Overdue Loans", Value: String(loanCounts.overdue) },
      { Metric: "Repaid Loans", Value: String(loanCounts.repaid) },
    ]),
    "Summary"
  )

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      monthlyData.map((r) => ({
        Period: r.label,
        Contributions: fmtRwf(r.contributions),
        Penalties: fmtRwf(r.penalties),
        Income: fmtRwf(r.income),
        "Loans Out": fmtRwf(r.disbursed),
        Expenses: fmtRwf(r.expenses),
        Net: fmtRwf(r.net),
        "Cumulative Balance": fmtRwf(r.cumulativeBalance),
      }))
    ),
    "Period Breakdown"
  )

  XLSX.writeFile(wb, `${filename}.xlsx`)
}

async function exportFundTrackerPDF(
  totals: FundTrackerTotals,
  monthlyData: FundTrackerMonthRow[],
  filename: string
) {
  const doc = new jsPDF()
  const logo = await loadImage(COMPANY_INFO.logoUrl)
  const footer = makeFooter(doc)
  const isDeficit = totals.netBalance < 0

  let y = addPdfHeader(doc, logo, "Fund Tracker Report")

  y = addSummaryBox(
    doc,
    [
      {
        label: "Net Balance",
        value: `${isDeficit ? "−" : ""}${fmtRwf(Math.abs(totals.netBalance))}`,
      },
      { label: "Total Income", value: fmtRwf(totals.totalIncome) },
      { label: "Loans Disbursed", value: fmtRwf(totals.totalDisbursed) },
      { label: "Op. Expenses", value: fmtRwf(totals.totalExpenses) },
      { label: "Outstanding", value: fmtRwf(totals.totalOutstanding) },
    ],
    y
  )

  if (monthlyData.length > 0) {
    addSectionTitle(doc, "Period-by-Period Breakdown", y)
    y += 6

    autoTable(doc, {
      ...baseTableStyles,
      head: [
        [
          "Period",
          "Contributions",
          "Penalties",
          "Income",
          "Loans Out",
          "Expenses",
          "Net",
          "Cumulative",
        ],
      ],
      body: monthlyData.map((r) => [
        r.label,
        fmtRwf(r.contributions),
        fmtRwf(r.penalties),
        fmtRwf(r.income),
        fmtRwf(r.disbursed),
        fmtRwf(r.expenses),
        `${r.net >= 0 ? "+" : "−"}${fmtRwf(Math.abs(r.net))}`,
        fmtRwf(r.cumulativeBalance),
      ]),
      startY: y,
      didDrawPage: footer,
    })
  }

  doc.save(`${filename}.pdf`)
}

// ── Audit Report ───────────────────────────────────────────────────────────────

export async function exportAuditReport(
  periodLabel: string,
  financialSummary: AuditFinancialSummary,
  loansSummary: AuditLoansSummary,
  memberMatrix: MemberMatrixEntry[],
  auditMonths: Date[],
  periodLoans: LoanEntry[],
  periodMeetings: MeetingEntry[],
  fmt: ReportExportFormat,
  filename?: string
): Promise<void> {
  const name = filename || `audit-report-${getTimestamp()}`
  if (fmt === "csv")
    exportAuditCSV(
      periodLabel,
      financialSummary,
      loansSummary,
      memberMatrix,
      auditMonths,
      periodLoans,
      periodMeetings,
      name
    )
  else if (fmt === "excel")
    exportAuditExcel(
      periodLabel,
      financialSummary,
      loansSummary,
      memberMatrix,
      auditMonths,
      periodLoans,
      periodMeetings,
      name
    )
  else
    await exportAuditPDF(
      periodLabel,
      financialSummary,
      loansSummary,
      memberMatrix,
      auditMonths,
      periodLoans,
      periodMeetings,
      name
    )
}

function exportAuditCSV(
  periodLabel: string,
  fs: AuditFinancialSummary,
  ls: AuditLoansSummary,
  matrix: MemberMatrixEntry[],
  auditMonths: Date[],
  loans: LoanEntry[],
  meetings: MeetingEntry[],
  filename: string
) {
  const monthKeys = auditMonths.map((m) => format(m, "yyyy-MM"))
  const monthHeaders = auditMonths.map((m) => format(m, "MMM yyyy"))

  const lines: string[] = [
    ...companyHeaderLines(),
    `# AUDIT REPORT - ${periodLabel}`,
    "",
    "# === FINANCIAL SUMMARY ===",
    csvRow(["Metric", "Value"]),
    csvRow(["Period", periodLabel]),
    csvRow(["Total Collected", fmtRwf(fs.totalCollected)]),
    csvRow(["Total Confirmed", fmtRwf(fs.totalConfirmed)]),
    csvRow(["Shortfall", fmtRwf(fs.shortfall)]),
    csvRow(["Penalties Collected", fmtRwf(fs.totalPenalties)]),
    csvRow(["Expected Amount", fmtRwf(fs.totalExpected)]),
    csvRow(["Compliance Rate", `${fs.complianceRate}%`]),
    csvRow(["Confirmed Records", String(fs.confirmedCount)]),
    csvRow(["Late Records", String(fs.lateCount)]),
    csvRow(["Pending Records", String(fs.pendingCount)]),
    csvRow(["Penalty Records", String(fs.penaltyCount)]),
    csvRow(["Loans Disbursed", fmtRwf(ls.disbursedTotal)]),
    csvRow(["Estimated Interest Earned", fmtRwf(ls.interestEarned)]),
    csvRow(["Overdue Loans", String(ls.overdue)]),
    "",
    "# === MEMBER CONTRIBUTION MATRIX ===",
    csvRow(["Member", "Email", ...monthHeaders, "Score"]),
    ...matrix.map((m) => {
      const confirmed = monthKeys.filter(
        (k) => m.contributions.get(k) === "confirmed"
      ).length
      return csvRow([
        m.name,
        m.email,
        ...monthKeys.map((k) => m.contributions.get(k) || ""),
        `${confirmed}/${auditMonths.length}`,
      ])
    }),
    "",
    "# === LOAN ACTIVITY ===",
    csvRow([
      "Member",
      "Email",
      "Status",
      "Requested Amount",
      "Approved Amount",
      "Requested Date",
      "Disbursed Date",
    ]),
    ...loans.map((l) =>
      csvRow([
        l.memberName || "Unknown",
        l.memberEmail || "",
        l.status,
        fmtRwf(l.requestedAmount),
        fmtRwf(l.approvedAmount),
        fmtDate(l.requestedAt),
        fmtDate(l.disbursedAt),
      ])
    ),
    "",
    "# === MEETINGS ===",
    csvRow(["Title", "Date", "Status", "Location", "Host Contribution"]),
    ...meetings.map((m) =>
      csvRow([
        m.title,
        fmtDate(m.scheduledAt),
        m.status,
        m.location || "",
        fmtRwf(m.hostContribution),
      ])
    ),
  ]
  downloadBlob(
    new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" }),
    `${filename}.csv`
  )
}

function exportAuditExcel(
  periodLabel: string,
  fs: AuditFinancialSummary,
  ls: AuditLoansSummary,
  matrix: MemberMatrixEntry[],
  auditMonths: Date[],
  loans: LoanEntry[],
  meetings: MeetingEntry[],
  filename: string
) {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, xlsxCompanySheet(), "Company Info")

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet([
      { Metric: "Period", Value: periodLabel },
      { Metric: "Total Collected", Value: fmtRwf(fs.totalCollected) },
      { Metric: "Total Confirmed", Value: fmtRwf(fs.totalConfirmed) },
      { Metric: "Shortfall", Value: fmtRwf(fs.shortfall) },
      { Metric: "Penalties Collected", Value: fmtRwf(fs.totalPenalties) },
      { Metric: "Expected Amount", Value: fmtRwf(fs.totalExpected) },
      { Metric: "Compliance Rate", Value: `${fs.complianceRate}%` },
      { Metric: "Loans Disbursed", Value: fmtRwf(ls.disbursedTotal) },
      { Metric: "Est. Interest Earned", Value: fmtRwf(ls.interestEarned) },
      { Metric: "Overdue Loans", Value: String(ls.overdue) },
    ]),
    "Summary"
  )

  const monthKeys = auditMonths.map((m) => format(m, "yyyy-MM"))
  const monthLabels = auditMonths.map((m) => format(m, "MMM yyyy"))
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      matrix.map((m) => {
        const confirmed = monthKeys.filter(
          (k) => m.contributions.get(k) === "confirmed"
        ).length
        const row: Record<string, string> = {
          "Member Name": m.name,
          "Member Email": m.email,
        }
        monthLabels.forEach((label, i) => {
          row[label] = m.contributions.get(monthKeys[i]) || "No record"
        })
        row["Score"] = `${confirmed}/${auditMonths.length}`
        return row
      })
    ),
    "Member Matrix"
  )

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      loans.length
        ? loans.map((l) => ({
            Member: l.memberName || "Unknown",
            Email: l.memberEmail || "",
            Status: l.status,
            "Requested Amount": fmtRwf(l.requestedAmount),
            "Approved Amount": fmtRwf(l.approvedAmount),
            "Requested Date": fmtDate(l.requestedAt),
            "Disbursed Date": fmtDate(l.disbursedAt),
          }))
        : [{ Note: "No loans in this period" }]
    ),
    "Loans"
  )

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      meetings.length
        ? meetings.map((m) => ({
            Title: m.title,
            Date: fmtDate(m.scheduledAt),
            Status: m.status,
            Location: m.location || "",
            "Host Contribution": fmtRwf(m.hostContribution),
          }))
        : [{ Note: "No meetings in this period" }]
    ),
    "Meetings"
  )

  XLSX.writeFile(wb, `${filename}.xlsx`)
}

async function exportAuditPDF(
  periodLabel: string,
  fs: AuditFinancialSummary,
  ls: AuditLoansSummary,
  matrix: MemberMatrixEntry[],
  auditMonths: Date[],
  loans: LoanEntry[],
  meetings: MeetingEntry[],
  filename: string
) {
  const doc = new jsPDF()
  const logo = await loadImage(COMPANY_INFO.logoUrl)
  const footer = makeFooter(doc)

  let y = addPdfHeader(doc, logo, "Audit Report", periodLabel)

  y = addSummaryBox(
    doc,
    [
      { label: "Compliance", value: `${fs.complianceRate}%` },
      { label: "Collected", value: fmtRwf(fs.totalCollected) },
      { label: "Shortfall", value: fmtRwf(fs.shortfall) },
      { label: "Penalties", value: fmtRwf(fs.totalPenalties) },
      { label: "Loans Out", value: fmtRwf(ls.disbursedTotal) },
    ],
    y
  )

  if (matrix.length > 0) {
    addSectionTitle(doc, "Member Contribution Matrix", y)
    y += 6

    const monthKeys = auditMonths.map((m) => format(m, "yyyy-MM"))
    const monthCols = auditMonths.map((m) => format(m, "MMM yy"))

    autoTable(doc, {
      ...baseTableStyles,
      head: [["Member", "Email", ...monthCols, "Score"]],
      body: matrix.map((m) => {
        const confirmed = monthKeys.filter(
          (k) => m.contributions.get(k) === "confirmed"
        ).length
        return [
          m.name,
          m.email,
          ...monthKeys.map((k) => statusInitial(m.contributions.get(k))),
          `${confirmed}/${auditMonths.length}`,
        ]
      }),
      startY: y,
      styles: { ...baseTableStyles.styles, fontSize: 7.5 },
      didDrawPage: footer,
    })
    y = (doc as any).lastAutoTable.finalY + 8
  }

  if (loans.length > 0) {
    if (y > 220) {
      doc.addPage()
      y = 20
    }
    addSectionTitle(doc, "Loan Activity", y)
    y += 6

    autoTable(doc, {
      ...baseTableStyles,
      head: [
        [
          "Member",
          "Status",
          "Requested",
          "Approved",
          "Requested Date",
          "Disbursed Date",
        ],
      ],
      body: loans.map((l) => [
        l.memberName || "Unknown",
        l.status,
        fmtRwf(l.requestedAmount),
        fmtRwf(l.approvedAmount),
        fmtDate(l.requestedAt),
        fmtDate(l.disbursedAt),
      ]),
      startY: y,
      didDrawPage: footer,
    })
    y = (doc as any).lastAutoTable.finalY + 8
  }

  if (meetings.length > 0) {
    if (y > 220) {
      doc.addPage()
      y = 20
    }
    addSectionTitle(doc, "Meetings", y)
    y += 6

    autoTable(doc, {
      ...baseTableStyles,
      head: [["Title", "Date", "Status", "Location", "Host Contribution"]],
      body: meetings.map((m) => [
        m.title,
        fmtDate(m.scheduledAt),
        m.status,
        m.location || "-",
        fmtRwf(m.hostContribution),
      ]),
      startY: y,
      didDrawPage: footer,
    })
  }

  doc.save(`${filename}.pdf`)
}

// ── Monthly Report ─────────────────────────────────────────────────────────────

export async function exportMonthlyReport(
  periodLabel: string,
  contribSummary: MonthlyContribSummary,
  loanCounts: {
    requestedCount: number
    approvedCount: number
    disbursedCount: number
    disbursedTotal: number
  },
  contributions: ContributionEntry[],
  monthLoans: LoanEntry[],
  monthMeetings: MeetingEntry[],
  fmt: ReportExportFormat,
  filename?: string
): Promise<void> {
  const name = filename || `monthly-report-${getTimestamp()}`
  if (fmt === "csv")
    exportMonthlyCSV(
      periodLabel,
      contribSummary,
      loanCounts,
      contributions,
      monthLoans,
      monthMeetings,
      name
    )
  else if (fmt === "excel")
    exportMonthlyExcel(
      periodLabel,
      contribSummary,
      loanCounts,
      contributions,
      monthLoans,
      monthMeetings,
      name
    )
  else
    await exportMonthlyPDF(
      periodLabel,
      contribSummary,
      loanCounts,
      contributions,
      monthLoans,
      monthMeetings,
      name
    )
}

function exportMonthlyCSV(
  periodLabel: string,
  cs: MonthlyContribSummary,
  lc: {
    requestedCount: number
    approvedCount: number
    disbursedCount: number
    disbursedTotal: number
  },
  contributions: ContributionEntry[],
  loans: LoanEntry[],
  meetings: MeetingEntry[],
  filename: string
) {
  const lines: string[] = [
    ...companyHeaderLines(),
    `# MONTHLY REPORT - ${periodLabel}`,
    "",
    "# === CONTRIBUTION SUMMARY ===",
    csvRow(["Metric", "Value"]),
    csvRow(["Period", periodLabel]),
    csvRow(["Expected Amount", fmtRwf(cs.expected)]),
    csvRow(["Total Collected", fmtRwf(cs.collected)]),
    csvRow(["Confirmed Amount", fmtRwf(cs.confirmed)]),
    csvRow(["Shortfall", fmtRwf(Math.max(0, cs.expected - cs.confirmed))]),
    csvRow(["Penalties Collected", fmtRwf(cs.penalties)]),
    csvRow(["Compliance Rate", `${cs.compliance}%`]),
    csvRow(["Confirmed Records", String(cs.confirmedCount)]),
    csvRow(["Pending Records", String(cs.pendingCount)]),
    csvRow(["Late Records", String(cs.lateCount)]),
    csvRow(["Waived Records", String(cs.waivedCount)]),
    csvRow(["Loan Requests", String(lc.requestedCount)]),
    csvRow(["Loans Approved", String(lc.approvedCount)]),
    csvRow(["Loans Disbursed", fmtRwf(lc.disbursedTotal)]),
    "",
    "# === MEMBER CONTRIBUTIONS ===",
    csvRow([
      "Member",
      "Email",
      "Status",
      "Amount",
      "Penalty",
      "Paid Date",
      "Payment Method",
    ]),
    ...contributions.map((c) =>
      csvRow([
        c.memberName || "Unknown",
        c.memberEmail || "",
        c.status || "",
        fmtRwf(c.amount),
        c.penaltyAmount && Number.parseFloat(c.penaltyAmount) > 0
          ? fmtRwf(c.penaltyAmount)
          : "",
        fmtDate(c.paidAt),
        paymentMethodLabel(c.metadata?.paymentMethod),
      ])
    ),
    "",
    "# === LOAN ACTIVITY ===",
    csvRow([
      "Member",
      "Email",
      "Status",
      "Requested Amount",
      "Approved Amount",
      "Requested Date",
    ]),
    ...loans.map((l) =>
      csvRow([
        l.memberName || "Unknown",
        l.memberEmail || "",
        l.status,
        fmtRwf(l.requestedAmount),
        fmtRwf(l.approvedAmount),
        fmtDate(l.requestedAt),
      ])
    ),
    "",
    "# === MEETINGS ===",
    csvRow(["Title", "Date", "Status", "Location", "Host Contribution"]),
    ...meetings.map((m) =>
      csvRow([
        m.title,
        fmtDate(m.scheduledAt),
        m.status,
        m.location || "",
        fmtRwf(m.hostContribution),
      ])
    ),
  ]
  downloadBlob(
    new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" }),
    `${filename}.csv`
  )
}

function exportMonthlyExcel(
  periodLabel: string,
  cs: MonthlyContribSummary,
  lc: {
    requestedCount: number
    approvedCount: number
    disbursedCount: number
    disbursedTotal: number
  },
  contributions: ContributionEntry[],
  loans: LoanEntry[],
  meetings: MeetingEntry[],
  filename: string
) {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, xlsxCompanySheet(), "Company Info")

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet([
      { Metric: "Period", Value: periodLabel },
      { Metric: "Expected Amount", Value: fmtRwf(cs.expected) },
      { Metric: "Total Collected", Value: fmtRwf(cs.collected) },
      { Metric: "Confirmed Amount", Value: fmtRwf(cs.confirmed) },
      {
        Metric: "Shortfall",
        Value: fmtRwf(Math.max(0, cs.expected - cs.confirmed)),
      },
      { Metric: "Penalties Collected", Value: fmtRwf(cs.penalties) },
      { Metric: "Compliance Rate", Value: `${cs.compliance}%` },
      { Metric: "Confirmed Count", Value: String(cs.confirmedCount) },
      { Metric: "Pending Count", Value: String(cs.pendingCount) },
      { Metric: "Late Count", Value: String(cs.lateCount) },
      { Metric: "Waived Count", Value: String(cs.waivedCount) },
      { Metric: "Loan Requests", Value: String(lc.requestedCount) },
      { Metric: "Loans Approved", Value: String(lc.approvedCount) },
      { Metric: "Loans Disbursed Total", Value: fmtRwf(lc.disbursedTotal) },
    ]),
    "Summary"
  )

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      contributions.length
        ? contributions.map((c) => ({
            Member: c.memberName || "Unknown",
            Email: c.memberEmail || "",
            Status: c.status || "",
            Amount: fmtRwf(c.amount),
            Penalty:
              c.penaltyAmount && Number.parseFloat(c.penaltyAmount) > 0
                ? fmtRwf(c.penaltyAmount)
                : "",
            "Paid Date": fmtDate(c.paidAt),
            "Payment Method": paymentMethodLabel(c.metadata?.paymentMethod),
          }))
        : [{ Note: "No contributions this period" }]
    ),
    "Contributions"
  )

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      loans.length
        ? loans.map((l) => ({
            Member: l.memberName || "Unknown",
            Email: l.memberEmail || "",
            Status: l.status,
            "Requested Amount": fmtRwf(l.requestedAmount),
            "Approved Amount": fmtRwf(l.approvedAmount),
            "Requested Date": fmtDate(l.requestedAt),
          }))
        : [{ Note: "No loans this period" }]
    ),
    "Loans"
  )

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      meetings.length
        ? meetings.map((m) => ({
            Title: m.title,
            Date: fmtDate(m.scheduledAt),
            Status: m.status,
            Location: m.location || "",
            "Host Contribution": fmtRwf(m.hostContribution),
          }))
        : [{ Note: "No meetings this period" }]
    ),
    "Meetings"
  )

  XLSX.writeFile(wb, `${filename}.xlsx`)
}

async function exportMonthlyPDF(
  periodLabel: string,
  cs: MonthlyContribSummary,
  lc: {
    requestedCount: number
    approvedCount: number
    disbursedCount: number
    disbursedTotal: number
  },
  contributions: ContributionEntry[],
  loans: LoanEntry[],
  meetings: MeetingEntry[],
  filename: string
) {
  const doc = new jsPDF()
  const logo = await loadImage(COMPANY_INFO.logoUrl)
  const footer = makeFooter(doc)

  let y = addPdfHeader(doc, logo, "Monthly Report", periodLabel)

  y = addSummaryBox(
    doc,
    [
      { label: "Collected", value: fmtRwf(cs.collected) },
      { label: "Compliance", value: `${cs.compliance}%` },
      { label: "Penalties", value: fmtRwf(cs.penalties) },
      { label: "Loans Out", value: fmtRwf(lc.disbursedTotal) },
      {
        label: "Shortfall",
        value: fmtRwf(Math.max(0, cs.expected - cs.confirmed)),
      },
    ],
    y
  )

  if (contributions.length > 0) {
    addSectionTitle(doc, "Member Contributions", y)
    y += 6

    autoTable(doc, {
      ...baseTableStyles,
      head: [["Member", "Status", "Amount", "Penalty", "Paid Date", "Method"]],
      body: contributions.map((c) => [
        c.memberName || "Unknown",
        c.status || "-",
        fmtRwf(c.amount),
        c.penaltyAmount && Number.parseFloat(c.penaltyAmount) > 0
          ? fmtRwf(c.penaltyAmount)
          : "-",
        fmtDate(c.paidAt),
        paymentMethodLabel(c.metadata?.paymentMethod),
      ]),
      startY: y,
      didDrawPage: footer,
    })
    y = (doc as any).lastAutoTable.finalY + 8
  }

  if (loans.length > 0) {
    if (y > 220) {
      doc.addPage()
      y = 20
    }
    addSectionTitle(doc, "Loan Activity", y)
    y += 6

    autoTable(doc, {
      ...baseTableStyles,
      head: [["Member", "Status", "Requested", "Approved", "Requested Date"]],
      body: loans.map((l) => [
        l.memberName || "Unknown",
        l.status,
        fmtRwf(l.requestedAmount),
        fmtRwf(l.approvedAmount),
        fmtDate(l.requestedAt),
      ]),
      startY: y,
      didDrawPage: footer,
    })
    y = (doc as any).lastAutoTable.finalY + 8
  }

  if (meetings.length > 0) {
    if (y > 220) {
      doc.addPage()
      y = 20
    }
    addSectionTitle(doc, "Meetings", y)
    y += 6

    autoTable(doc, {
      ...baseTableStyles,
      head: [["Title", "Date", "Status", "Location", "Host Contribution"]],
      body: meetings.map((m) => [
        m.title,
        fmtDate(m.scheduledAt),
        m.status,
        m.location || "-",
        fmtRwf(m.hostContribution),
      ]),
      startY: y,
      didDrawPage: footer,
    })
  }

  doc.save(`${filename}.pdf`)
}

// ── Expenses ───────────────────────────────────────────────────────────────────

export interface ExpenseEntry {
  id?: string
  description: string
  category: string
  amount?: string | number | null
  expenseDate?: string | Date | null
  status: string
  notes?: string | null
  rejectionNote?: string | null
  submittedByName?: string | null
  approvedByName?: string | null
}

export interface ExpenseSummary {
  totalCount: number
  approvedCount: number
  approvedAmount: number
  pendingCount: number
  pendingAmount: number
  rejectedCount: number
}

export async function exportExpenses(
  reportTitle: string,
  summary: ExpenseSummary,
  expenses: ExpenseEntry[],
  fmt: ReportExportFormat,
  filename?: string,
  showSubmitter = false
): Promise<void> {
  const name = filename || `expenses-${getTimestamp()}`
  if (fmt === "csv")
    exportExpensesCSV(reportTitle, summary, expenses, name, showSubmitter)
  else if (fmt === "excel")
    exportExpensesExcel(reportTitle, summary, expenses, name, showSubmitter)
  else
    await exportExpensesPDF(reportTitle, summary, expenses, name, showSubmitter)
}

function exportExpensesCSV(
  reportTitle: string,
  s: ExpenseSummary,
  expenses: ExpenseEntry[],
  filename: string,
  showSubmitter: boolean
) {
  const headers = showSubmitter
    ? [
        "Description",
        "Submitted By",
        "Category",
        "Amount",
        "Date",
        "Status",
        "Reviewed By",
        "Notes",
      ]
    : ["Description", "Category", "Amount", "Date", "Status", "Notes"]

  const lines: string[] = [
    ...companyHeaderLines(),
    `# ${reportTitle.toUpperCase()}`,
    "",
    "# === SUMMARY ===",
    csvRow(["Metric", "Value"]),
    csvRow(["Total Expenses", String(s.totalCount)]),
    csvRow(["Approved", `${s.approvedCount} - ${fmtRwf(s.approvedAmount)}`]),
    csvRow(["Pending", `${s.pendingCount} - ${fmtRwf(s.pendingAmount)}`]),
    csvRow(["Rejected", String(s.rejectedCount)]),
    "",
    `# === EXPENSES (${expenses.length}) ===`,
    csvRow(headers),
    ...expenses.map((e) => {
      const note =
        e.status === "rejected" && e.rejectionNote
          ? e.rejectionNote
          : (e.notes ?? "")
      return showSubmitter
        ? csvRow([
            e.description,
            e.submittedByName || "",
            e.category,
            fmtRwf(e.amount),
            fmtDate(e.expenseDate),
            e.status,
            e.approvedByName || "",
            note,
          ])
        : csvRow([
            e.description,
            e.category,
            fmtRwf(e.amount),
            fmtDate(e.expenseDate),
            e.status,
            note,
          ])
    }),
  ]
  downloadBlob(
    new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" }),
    `${filename}.csv`
  )
}

function exportExpensesExcel(
  reportTitle: string,
  s: ExpenseSummary,
  expenses: ExpenseEntry[],
  filename: string,
  showSubmitter: boolean
) {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, xlsxCompanySheet(), "Company Info")

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet([
      { Metric: "Total Expenses", Value: String(s.totalCount) },
      { Metric: "Approved Count", Value: String(s.approvedCount) },
      { Metric: "Approved Amount", Value: fmtRwf(s.approvedAmount) },
      { Metric: "Pending Count", Value: String(s.pendingCount) },
      { Metric: "Pending Amount", Value: fmtRwf(s.pendingAmount) },
      { Metric: "Rejected Count", Value: String(s.rejectedCount) },
    ]),
    "Summary"
  )

  const rows = expenses.map((e) => {
    const note =
      e.status === "rejected" && e.rejectionNote
        ? e.rejectionNote
        : (e.notes ?? "")
    if (showSubmitter) {
      return {
        Description: e.description,
        "Submitted By": e.submittedByName || "",
        Category: e.category,
        Amount: fmtRwf(e.amount),
        Date: fmtDate(e.expenseDate),
        Status: e.status,
        "Reviewed By": e.approvedByName || "",
        Notes: note,
      }
    }
    return {
      Description: e.description,
      Category: e.category,
      Amount: fmtRwf(e.amount),
      Date: fmtDate(e.expenseDate),
      Status: e.status,
      Notes: note,
    }
  })

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      rows.length ? rows : [{ Note: "No expenses found" }]
    ),
    "Expenses"
  )

  XLSX.writeFile(wb, `${filename}.xlsx`)
}

async function exportExpensesPDF(
  reportTitle: string,
  s: ExpenseSummary,
  expenses: ExpenseEntry[],
  filename: string,
  showSubmitter: boolean
) {
  const doc = new jsPDF()
  const logo = await loadImage(COMPANY_INFO.logoUrl)
  const footer = makeFooter(doc)

  let y = addPdfHeader(doc, logo, reportTitle)

  y = addSummaryBox(
    doc,
    [
      { label: "Total", value: String(s.totalCount) },
      { label: "Approved", value: fmtRwf(s.approvedAmount) },
      { label: "Pending", value: String(s.pendingCount) },
      { label: "Rejected", value: String(s.rejectedCount) },
    ],
    y
  )

  if (expenses.length > 0) {
    addSectionTitle(doc, "Expenses", y)
    y += 6

    const head = showSubmitter
      ? [
          [
            "Description",
            "Submitted By",
            "Category",
            "Amount",
            "Date",
            "Status",
            "Reviewed By",
          ],
        ]
      : [["Description", "Category", "Amount", "Date", "Status", "Notes"]]

    const body = expenses.map((e) => {
      const note =
        e.status === "rejected" && e.rejectionNote
          ? e.rejectionNote
          : (e.notes ?? "-")
      return showSubmitter
        ? [
            e.description,
            e.submittedByName || "-",
            e.category,
            fmtRwf(e.amount),
            fmtDate(e.expenseDate),
            e.status,
            e.approvedByName || "-",
          ]
        : [
            e.description,
            e.category,
            fmtRwf(e.amount),
            fmtDate(e.expenseDate),
            e.status,
            note,
          ]
    })

    autoTable(doc, {
      ...baseTableStyles,
      head,
      body,
      startY: y,
      didDrawPage: footer,
    })
  }

  doc.save(`${filename}.pdf`)
}
