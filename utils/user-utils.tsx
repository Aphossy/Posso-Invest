import { type User } from "@/db"
import {
  AlertTriangle,
  CheckCircle,
  ClipboardList,
  Shield,
  UserIcon,
  Wallet,
  XCircle,
} from "lucide-react"

export const getRoleIcon = (role: string) => {
  switch (role) {
    case "admin":
      return <Shield className="h-4 w-4" />
    case "treasurer":
      return <Wallet className="h-4 w-4" />
    case "secretary":
      return <ClipboardList className="h-4 w-4" />
    case "president":
      return <Shield className="h-4 w-4" />
    default:
      return <UserIcon className="h-4 w-4" />
  }
}

export const getRoleBadgeColor = (role: string) => {
  switch (role) {
    case "admin":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
    case "president":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
    case "treasurer":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
    case "secretary":
      return "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200"
    case "member":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"

    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
  }
}

export const getStatusBadgeColor = (customer: User) => {
  if (customer.banned) {
    return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
    // } else if (!customer.isActive) {
    //   return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
  } else {
    return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
  }
}

export const getStatusText = (customer: User) => {
  if (customer.banned) return "Banned"
  if (!customer.banned) return "Active"
  return "Active"
}

export const getStatusIcon = (customer: User) => {
  if (customer.banned) return <XCircle className="h-4 w-4" />
  if (!customer.banned) return <AlertTriangle className="h-4 w-4" />
  return <CheckCircle className="h-4 w-4" />
}
