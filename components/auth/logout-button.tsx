// components\auth\logout-button.tsx
"use client"

import { useState } from "react"
import { motion } from "framer-motion"

import { useLogout } from "@/hooks/use-logout"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Loader } from "@/components/common/loader"

import { LogoutIcon } from "../ui/animated-icons/LogoutIcon"

interface LogoutButtonProps {
  variant?: "default" | "outline" | "ghost"
  size?: "sm" | "md" | "lg"
  showIcon?: boolean
  showText?: boolean
  className?: string
}

export function LogoutButton({
  variant = "ghost",
  size = "md",
  showIcon = true,
  showText = true,
  className = "",
}: LogoutButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false)
  const { logout, isLoggingOut } = useLogout()

  const handleLogout = async () => {
    await logout()
    setShowConfirm(false)
  }

  const buttonSizes = {
    sm: "px-2 py-1 text-sm",
    md: "px-4 py-2",
    lg: "px-6 py-3 text-lg",
  }

  return (
    <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
      <AlertDialogTrigger asChild>
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button
            variant={variant}
            className={`${buttonSizes[size]} ${className}`}
            disabled={isLoggingOut}>
            {isLoggingOut ? (
              <Loader size="sm" />
            ) : (
              <>
                {showIcon && <LogoutIcon className="h-4 w-4" />}
                {showText && (
                  <span className={showIcon ? "ml-2" : ""}>
                    {isLoggingOut ? "Logging out..." : "Logout"}
                  </span>
                )}
              </>
            )}
          </Button>
        </motion.div>
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm Logout</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to log out? You will need to sign in again to
            access your account.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="bg-red-500  hover:bg-red-700">
            {isLoggingOut ? (
              <>
                <Loader size="sm" className="mr-2" />
                Logging out...
              </>
            ) : (
              "Logout"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
