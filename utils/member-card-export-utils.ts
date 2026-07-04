import jsPDF from "jspdf"

export interface MemberCardPdfPayload {
  name: string
  role: string
  memberId: string
  joinDate: string
  contactPhone?: string
  contactEmail?: string
}

const BRAND = {
  orgName: process.env.NEXT_PUBLIC_ORGANISATION_NAME || "TrustLink Group",
  groupLabel: "Group · Ikimina",
  location:
    process.env.NEXT_PUBLIC_ORGANISATION_PHYSICAL_ADDRESS ||
    "Nyamata Sector, Bugesera, Rwanda",
  phone: process.env.NEXT_PUBLIC_ORGANISATION_PHONE || "+250 785 251 067",
  email:
    process.env.NEXT_PUBLIC_ORGANIZATION_EMAIL || "trustlinkgrouprw@gmail.com",
}

function formatFileSafe(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
}

function drawCardFront(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  payload: MemberCardPdfPayload,
  withRoundedCorners = true,
  includeBottomStripe = true
) {
  const navy: [number, number, number] = [11, 31, 58]
  const navySoft: [number, number, number] = [24, 51, 83]
  const gold: [number, number, number] = [201, 153, 42]
  const goldLight: [number, number, number] = [232, 184, 75]

  const nameLines = doc
    .splitTextToSize(payload.name.trim() || "Member", width - 24)
    .slice(0, 2) as string[]

  doc.setFillColor(...navy)
  if (withRoundedCorners) {
    doc.roundedRect(x, y, width, height, 2.5, 2.5, "F")
  } else {
    doc.rect(x, y, width, height, "F")
  }

  doc.setFillColor(...navySoft)
  doc.circle(x + width - 1.2, y + 1.2, 20, "F")

  if (includeBottomStripe) {
    doc.setFillColor(...gold)
    doc.rect(x, y + height - 1.6, width, 1.6, "F")
  }

  // Logo block and spacing tuned closer to brand sample.
  drawLinkMark(doc, x + 9.8, y + 12.8, true)

  doc.setFont("times", "bold")
  doc.setFontSize(14.5)
  doc.setTextColor(255, 255, 255)
  doc.text("TrustLink", x + 20, y + 11.9)

  doc.setFont("helvetica", "bold")
  doc.setFontSize(6.9)
  doc.setTextColor(...goldLight)
  doc.text(BRAND.groupLabel.toUpperCase(), x + 20, y + 16.3)

  doc.setFont("times", "bold")
  doc.setFontSize(nameLines.length > 1 ? 12.2 : 13.8)
  doc.setTextColor(255, 255, 255)
  doc.text(nameLines, x + 9, y + height - 17)

  doc.setFont("helvetica", "bold")
  doc.setFontSize(8.2)
  doc.setTextColor(...goldLight)
  doc.text(payload.role.toUpperCase(), x + 9, y + height - 8.2)
}

function drawCardBack(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  payload: MemberCardPdfPayload,
  withRoundedCorners = true,
  includeBottomStripe = true
) {
  const navy: [number, number, number] = [11, 31, 58]
  const gold: [number, number, number] = [201, 153, 42]
  const cream: [number, number, number] = [247, 243, 236]

  doc.setFillColor(...cream)
  if (withRoundedCorners) {
    doc.roundedRect(x, y, width, height, 2.5, 2.5, "F")
  } else {
    doc.rect(x, y, width, height, "F")
  }

  doc.setFillColor(...gold)
  doc.rect(x, y, 1.2, height, "F")
  if (includeBottomStripe) {
    doc.rect(x, y + height - 1.6, width, 1.6, "F")
  }

  drawLinkMark(doc, x + width - 31, y + 11, false)
  doc.setFont("times", "bold")
  doc.setFontSize(9)
  doc.setTextColor(172, 172, 172)
  doc.text("TrustLink", x + width - 22.5, y + 12.5)

  const dotX = x + 12
  const textX = dotX + 5
  const topLineY = y + 30
  const rowGap = 9.2
  const contactLines = [
    payload.contactPhone || BRAND.phone,
    payload.contactEmail || BRAND.email,
    BRAND.location,
  ]

  for (const [index, line] of contactLines.entries()) {
    const lineParts = doc.splitTextToSize(
      line,
      width - (textX - x) - 8
    ) as string[]
    const rowY = topLineY + index * rowGap

    doc.setFillColor(...gold)
    doc.circle(dotX, rowY - 1.2, 0.75, "F")

    doc.setFont("helvetica", "normal")
    doc.setFontSize(8.9)
    doc.setTextColor(...navy)
    doc.text(lineParts[0] || "", textX, rowY)
  }

  doc.setFont("courier", "normal")
  doc.setFontSize(9)
  doc.setTextColor(140, 148, 166)
  doc.text(`ID: ${payload.memberId}`, x + 12, y + height - 9)
}

function createMemberCardPdfClassic(payload: MemberCardPdfPayload) {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" })
  const pageWidth = doc.internal.pageSize.getWidth()
  const cardX = 25
  const cardY = 38
  const cardWidth = pageWidth - cardX * 2
  const cardHeight = 120

  doc.setFont("helvetica", "bold")
  doc.setFontSize(18)
  doc.setTextColor(15, 35, 64)
  doc.text("Member Card - Classic", cardX, 20)

  doc.setFillColor(10, 25, 48)
  doc.roundedRect(cardX, cardY, cardWidth, cardHeight, 4, 4, "F")
  doc.setFillColor(212, 175, 55)
  doc.rect(cardX, cardY, cardWidth, 12, "F")
  doc.rect(cardX, cardY + cardHeight - 10, cardWidth, 10, "F")

  doc.setFont("helvetica", "bold")
  doc.setFontSize(13)
  doc.setTextColor(12, 31, 58)
  doc.text(BRAND.orgName.toUpperCase(), cardX + cardWidth / 2, cardY + 7.8, {
    align: "center",
  })

  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.setTextColor(200, 213, 230)
  doc.text("MEMBERSHIP CARD", cardX + cardWidth / 2, cardY + 22, {
    align: "center",
  })

  const maxNameWidth = cardWidth - 20
  const trimmedName = payload.name.trim() || "Member"
  const nameLines = doc.splitTextToSize(trimmedName, maxNameWidth).slice(0, 2)

  doc.setFont("helvetica", "bold")
  doc.setFontSize(nameLines.length > 1 ? 18 : 21)
  doc.setTextColor(245, 247, 250)
  doc.text(nameLines, cardX + cardWidth / 2, cardY + 45, {
    align: "center",
    baseline: "middle",
  })

  doc.setFont("helvetica", "bold")
  doc.setFontSize(11)
  doc.setTextColor(212, 175, 55)
  doc.text(
    `* ${payload.role.toUpperCase()} *`,
    cardX + cardWidth / 2,
    cardY + 61,
    {
      align: "center",
    }
  )

  doc.setDrawColor(44, 76, 117)
  doc.setLineWidth(0.35)
  doc.line(cardX + 10, cardY + 68, cardX + cardWidth - 10, cardY + 68)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor(148, 179, 213)
  doc.text("MEMBER SINCE", cardX + 20, cardY + 80)
  doc.text("MEMBER ID", cardX + cardWidth / 2 + 8, cardY + 80)

  doc.setFont("helvetica", "bold")
  doc.setFontSize(12)
  doc.setTextColor(244, 247, 251)
  doc.text(payload.joinDate, cardX + 20, cardY + 87)
  doc.text(payload.memberId, cardX + cardWidth / 2 + 8, cardY + 87)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor(170, 190, 216)
  doc.text(BRAND.groupLabel, cardX + cardWidth / 2, cardY + cardHeight - 4.5, {
    align: "center",
  })

  return doc
}

function createMemberCardPdfV2(payload: MemberCardPdfPayload) {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  doc.setFillColor(240, 235, 226)
  doc.rect(0, 0, pageWidth, pageHeight, "F")

  const margin = 12
  const gap = 10
  const cardWidth = (pageWidth - margin * 2 - gap) / 2
  const cardHeight = cardWidth / 1.75
  const cardY = (pageHeight - cardHeight) / 2 - 6
  const frontX = margin
  const backX = frontX + cardWidth + gap

  drawCardFront(doc, frontX, cardY, cardWidth, cardHeight, payload)
  drawCardBack(doc, backX, cardY, cardWidth, cardHeight, payload)

  doc.setFont("courier", "normal")
  doc.setFontSize(9)
  doc.setTextColor(58, 86, 122)
  doc.text("FRONT", frontX + cardWidth / 2, cardY + cardHeight + 12, {
    align: "center",
  })
  doc.text("BACK", backX + cardWidth / 2, cardY + cardHeight + 12, {
    align: "center",
  })

  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.setTextColor(125, 129, 135)
  doc.text(
    `Member since ${payload.joinDate}`,
    backX + cardWidth - 5,
    cardY + cardHeight + 12,
    {
      align: "right",
    }
  )

  return doc
}

function openPdfPreview(doc: jsPDF) {
  if (typeof window === "undefined") return

  const pdfBlob = doc.output("blob")
  const blobUrl = URL.createObjectURL(pdfBlob)
  window.open(blobUrl, "_blank", "noopener,noreferrer")

  window.setTimeout(() => {
    URL.revokeObjectURL(blobUrl)
  }, 60_000)
}

export function exportMemberCardPdfClassic(payload: MemberCardPdfPayload) {
  const doc = createMemberCardPdfClassic(payload)
  const trimmedName = payload.name.trim() || "Member"
  const safeName = formatFileSafe(trimmedName) || "member"
  doc.save(`member-card-classic-${safeName}.pdf`)
}

export function exportMemberCardPdfV2(payload: MemberCardPdfPayload) {
  const doc = createMemberCardPdfV2(payload)
  const trimmedName = payload.name.trim() || "Member"
  const safeName = formatFileSafe(trimmedName) || "member"
  doc.save(`member-card-v2-${safeName}.pdf`)
}

export function previewMemberCardPdfClassic(payload: MemberCardPdfPayload) {
  const doc = createMemberCardPdfClassic(payload)
  openPdfPreview(doc)
}

export function previewMemberCardPdfV2(payload: MemberCardPdfPayload) {
  const doc = createMemberCardPdfV2(payload)
  openPdfPreview(doc)
}

function drawLinkMark(doc: jsPDF, x: number, y: number, onDark: boolean) {
  const lightStroke: [number, number, number] = [255, 255, 255]
  const darkStroke: [number, number, number] = [11, 31, 58]
  const goldStroke: [number, number, number] = [201, 153, 42]

  doc.setDrawColor(...(onDark ? lightStroke : darkStroke))
  doc.setLineWidth(0.7)
  doc.roundedRect(x - 2.4, y - 3.1, 4.5, 3.1, 1.5, 1.5, "S")

  doc.setDrawColor(...goldStroke)
  doc.roundedRect(x + 1.4, y - 3.1, 4.5, 3.1, 1.5, 1.5, "S")

  const innerFill: [number, number, number] = onDark
    ? [11, 31, 58]
    : [247, 243, 236]
  doc.setFillColor(...innerFill)
  doc.rect(x + 1.1, y - 2.35, 1.2, 1.55, "F")

  doc.setFillColor(...goldStroke)
  doc.circle(x + 1.8, y - 1.58, 0.38, "F")
}
