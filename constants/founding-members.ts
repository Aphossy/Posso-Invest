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
    name: "HIRWA WICLIF",
    phone: "0787 575 201",
    email: "hirwawiclef@gmail.com",
    nationalId: "1200180052396058",
    role: "Treasurer",
  },
  {
    no: 2,
    name: "HIRWA YVAN",
    phone: "0783 209 721",
    email: "yvanhirwa523@gmail.com",
    nationalId: "1200180094074085",
    role: "Member",
  },
  {
    no: 3,
    name: "IRADUKUNDA IRENE",
    phone: "0786 137 333",
    email: "iradukundairene515@gmail.com",
    nationalId: "1199980101734144",
    role: "Member",
  },
  {
    no: 4,
    name: "ISHIMWE JEAN BAPTISTE",
    phone: "0785 577 189",
    email: "ijbapte@gmail.com",
    nationalId: "1200180094995135",
    role: "Advisor",
  },
  {
    no: 5,
    name: "MANIRIHO JEAN PAUL",
    phone: "0785 251 067",
    email: "manirihojpaul11@gmail.com",
    nationalId: "1200080089752022",
    role: "President",
  },
  {
    no: 6,
    name: "MUSABYIMANA VINCENT",
    phone: "0785 690 949",
    email: "vincentmusabyimana5@gmail.com",
    nationalId: "1199980142443046",
    role: "Member",
  },
  {
    no: 7,
    name: "NGENDAHIMANA FIDELE",
    phone: "0789 118 887",
    email: "ngendahimanafidele00@gmail.com",
    nationalId: "1200080148917021",
    role: "Member",
  },
  {
    no: 8,
    name: "NIYONKURU SYLVAN",
    phone: "0783 756 001",
    email: "nsylvan4@gmail.com",
    nationalId: "1200180042282182",
    role: "Member",
  },
  {
    no: 8,
    name: "NIZAYO ALAIN VICTOR",
    phone: "0786 154 121",
    email: "malainvictor@gmail.com",
    nationalId: "1200180148099265",
    role: "Member",
  },
  {
    no: 10,
    name: "NZIZA OSCAR",
    phone: "0782035102",
    email: "nzizaoscar33@gmail.com",
    nationalId: "1200180123194015",
    role: "Secretary",
  },
  {
    no: 11,
    name: "RUGIRABABIRI JEAN CLAUDE",
    phone: "0789455887",
    email: "rugirababiri9@gmail.com",
    nationalId: "1199980025580022",
    role: "Member",
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
