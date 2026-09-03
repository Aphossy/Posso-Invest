export const ORGANIZATION_MESSAGE_SERVICE_VALUES = [
  "contributions-savings",
  "loans-repayments",
  "meetings-minutes",
  "penalties-compliance",
  "member-account",
  "access-technical",
  "access",
  "other",
] as const

export type OrganizationMessageService =
  (typeof ORGANIZATION_MESSAGE_SERVICE_VALUES)[number]

export const ORGANIZATION_MESSAGE_SERVICE_LABELS: Record<
  OrganizationMessageService,
  string
> = {
  "contributions-savings": "Contributions & Savings",
  "loans-repayments": "Loans & Repayments",
  "meetings-minutes": "Meetings & Minutes",
  "penalties-compliance": "Penalties & Compliance",
  "member-account": "Member Account",
  "access-technical": "Access & Technical",
  access: "Access Request",
  other: "General Inquiry",
}

export const ORGANIZATION_MESSAGE_SERVICE_OPTIONS =
  ORGANIZATION_MESSAGE_SERVICE_VALUES.map((value) => ({
    value,
    label: ORGANIZATION_MESSAGE_SERVICE_LABELS[value],
  }))
