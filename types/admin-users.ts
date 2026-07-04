import type { User } from "@/db"

export type AdminUser = User & {
  memberId?: string | null
  memberRole?: string | null
}
