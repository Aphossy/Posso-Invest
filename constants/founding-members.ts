export interface FoundingMember {
  no: number
  name: string
  phone: string
  email: string
  nationalId: string
  address?: string
  role: string
}

export const foundingMembers: FoundingMember[] = [
  {
    no: 1,
    name: "Abel Mutsinzi",
    phone: "0783497711",
    email: "abel.mutsinzi@gmail.com",
    nationalId: "11994018562077",
    address: "Kicukiro, Kigali",
    role: "Treasurer committee - 1st Advisor",
  },
  {
    no: 2,
    name: "Aphrodis Hakuzweyezu",
    phone: "0784343073",
    email: "hakuzweaphossy@gmail.com",
    nationalId: "1199780103422267",
    address: "Kimironko, Kigali",
    role: "Presidential committee - 1st Advisor",
  },
  {
    no: 3,
    name: "Divin Ntwari",
    phone: "0788207016",
    email: "divinbro1@gmail.com",
    nationalId: "119938?",
    address: "",
    role: "Secretariat committee - 1st Advisor",
  },
  {
    no: 4,
    name: "Gabriel Twambazimana",
    phone: "0785743404",
    email: "toimbag@gmail.com",
    nationalId: "1199800032505036",
    address: "Ndera, Gasabo",
    role: "Treasurer committee - Treasurer",
  },
  {
    no: 5,
    name: "Guy Levi Nsanzishimwe",
    phone: "0788847640",
    email: "leviguy.nsanzishimwe@gmail.com",
    nationalId: "119784009642217",
    address: "Nyarugenge, Kigali",
    role: "Presidential committee - 2nd Advisor",
  },
  {
    no: 6,
    name: "Jean Paul Rukeba",
    phone: "",
    email: "",
    nationalId: "119980000232190",
    address: "Nyanjenge, Kigali",
    role: "Secretariat committee - Secretary",
  },
  {
    no: 7,
    name: "Sosthene Niyonshuti",
    phone: "",
    email: "sosthene.niyonshuti1@gmail.com",
    nationalId: "119980?",
    address: "Kicukiro, Kigali",
    role: "Presidential committee - President",
  },
  {
    no: 8,
    name: "Alcade Rugamba",
    phone: "0788349021",
    email: "rugalcade@gmail.com",
    nationalId: "11993010479004",
    address: "Masaka, Kicukiro",
    role: "Treasurer committee - 2nd Advisor",
  },
  {
    no: 9,
    name: "Marius Ishimwe",
    phone: "0786000346",
    email: "ishimwemarius089@gmail.com",
    nationalId: "1200?",
    address: "Gisozi, Huye",
    role: "Conflict resolution committee - Executive",
  },
  {
    no: 10,
    name: "Nelkon Alain Christian Izabayo",
    phone: "0788228265",
    email: "christianalainizabayo@gmail.com",
    nationalId: "120018018717180",
    address: "Mugunga, Kigali",
    role: "Secretariat committee - 2nd Advisor",
  },
  {
    no: 11,
    name: "Sarah Rwema Kayesu",
    phone: "0782735621",
    email: "kayesusarah05@gmail.com",
    nationalId: "",
    address: "",
    role: "Conflict resolution committee - 2nd Advisor",
  },
  {
    no: 12,
    name: "Patrick Nsanzamahoro",
    phone: "",
    email: "",
    nationalId: "",
    address: "",
    role: "Conflict resolution committee - 1st Advisor",
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
