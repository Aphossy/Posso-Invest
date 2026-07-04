export const organisationName =
  process.env.NEXT_PUBLIC_ORGANISATION_NAME || "Posso Ventures"
export const organisationSlogan =
  process.env.NEXT_PUBLIC_ORGANISATION_SLOGAN ||
  "Save together. Build together."
export const organisationLogo =
  process.env.NEXT_PUBLIC_ORGANISATION_LOGO ||
  "https://possocapital.vercel.app/brand/logo.png"
export const organisationEmail =
  process.env.NEXT_PUBLIC_ORGANISATION_EMAIL || "possowiba01@gmail.com"
export const organisationCCEmail =
  process.env.NEXT_PUBLIC_CC_EMAIL || "hakuzweaphossy@gmail.com"
export const organisationPhone =
  process.env.NEXT_PUBLIC_ORGANISATION_PHONE || "+250 785 251 067"
export const organisationWebsite =
  process.env.NEXT_PUBLIC_ORGANISATION_WEBSITE ||
  "https://possocapital.vercel.app"

export const treasurerEmail =
  process.env.NEXT_PUBLIC_TREASURER_EMAIL || "hakuzweaphossy@gmail.com"
export const presidentEmail =
  process.env.NEXT_PUBLIC_PRESIDENT_EMAIL || "hakuzweaphossy@gmail.com"
export const advisorEmail =
  process.env.NEXT_PUBLIC_ADVISOR_EMAIL || "hakuzweaphossy@gmail.com"
export const secretaryEmail =
  process.env.NEXT_PUBLIC_SECRETARY_EMAIL || "possowiba01@gmail.com"

export const defaultLeaderEmailRecipients = [
  treasurerEmail,
  presidentEmail,
  advisorEmail,
  secretaryEmail,
]

export const COMPANY_INFO = {
  name: organisationName,
  slogan: organisationSlogan,
  contact: organisationPhone,
  email: organisationEmail,
  website: organisationWebsite,
  logoUrl: organisationLogo,
  address:
    process.env.NEXT_PUBLIC_ORGANISATION_PHYSICAL_ADDRESS ||
    "Kigali, Rwanda",
}
