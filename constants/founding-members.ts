export interface FoundingMember {
  no: number
  name: string
  phone: string
  email: string
  nationalId: string
  role: string
}

export const foundingMembers: FoundingMember[] = [
  {
    no: 1,
    name: "Aphrodis Hakuzweyezu",
    phone: "0784 343 073",
    email: "hakuzweaphossy@gmail.com",
    nationalId: "1199980103422281",
    role: "President",
  },
  {
    no: 2,
    name: "Abel Mutsinzi",
    phone: "0783 xxx xxx",
    email: "exemple@gmail.com",
    nationalId: "1200180094074085",
    role: "Member",
  },
  {
    no: 3,
    name: "Aphrodis Hakuzweyezu",
    phone: "0784 343 073",
    email: "hakuzweaphossy@gmail.com",
    nationalId: "1199980103422281",
    role: "Member",
  },
  {
    no: 4,
    name: "Aphrodis Hakuzweyezu",
    phone: "0784 343 073",
    email: "hakuzweaphossy@gmail.com",
    nationalId: "1199980103422281",
    role: "Advisor",
  },
 {
    no: 5,
    name: "Aphrodis Hakuzweyezu",
    phone: "0784 343 073",
    email: "hakuzweaphossy@gmail.com",
    nationalId: "1199980103422281",
    role: "Treasurer",
  },
   {
    no: 6,
    name: "Aphrodis Hakuzweyezu",
    phone: "0784 343 073",
    email: "hakuzweaphossy@gmail.com",
    nationalId: "1199980103422281",
    role: "Member",
  },
  {
    no: 7,
    name: "Aphrodis Hakuzweyezu",
    phone: "0784 343 073",
    email: "hakuzweaphossy@gmail.com",
    nationalId: "1199980103422281",
    role: "Member",
  },
  {
    no: 8,
    name: "Aphrodis Hakuzweyezu",
    phone: "0783 756 001",
    email: "nsylvan4@gmail.com",
    nationalId: "1200180042282182",
    role: "Member",
  },
  {
    no: 9,
    name: "Aphrodis Hakuzweyezu",
    phone: "0786 154 121",
    email: "malainvictor@gmail.com",
    nationalId: "1200180148099265",
    role: "Member",
  },
  {
    no: 10,
    name: "Aphrodis Hakuzweyezu",
    phone: "0782035102",
    email: "nzizaoscar33@gmail.com",
    nationalId: "1200180123194015",
    role: "Secretary",
  },
]

function normalizeName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, " ")
}

function normalizePhone(phone: string) {
  return phone.replace(/\D+/g, "")
}

export const foundingMemberEmails = new Set(
  foundingMembers.map((member) => member.email.trim().toLowerCase())
)

export function findFoundingMemberContact(input: {
  email?: string | null
  name?: string | null
  phone?: string | null
}) {
  const normalizedEmail = input.email?.trim().toLowerCase()
  if (normalizedEmail) {
    const byEmail = foundingMembers.find(
      (member) => member.email.trim().toLowerCase() === normalizedEmail
    )
    if (byEmail) return byEmail
  }

  const normalizedName = input.name ? normalizeName(input.name) : ""
  if (normalizedName) {
    const byName = foundingMembers.find(
      (member) => normalizeName(member.name) === normalizedName
    )
    if (byName) return byName
  }

  const normalizedPhone = input.phone ? normalizePhone(input.phone) : ""
  if (normalizedPhone) {
    const byPhone = foundingMembers.find(
      (member) => normalizePhone(member.phone) === normalizedPhone
    )
    if (byPhone) return byPhone
  }

  return undefined
}
