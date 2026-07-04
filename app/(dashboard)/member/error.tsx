"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  Calendar,
  Home,
  MapPin,
  RefreshCcw,
  Search,
  Sparkles,
  User,
} from "lucide-react"

import { Button } from "@/components/ui/button"

// Brand colors
const BRAND_COLORS = {
  primary: "#165598",
  secondary: "#28bcd6",
  accent: "#ff7b42",
  rwandaBlue: "#00A1DE",
  rwandaYellow: "#FAD201",
  rwandaGreen: "#20603D",
}

export default function CustomerError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })

  useEffect(() => {
    console.error("Customer dashboard error:", error)

    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth) * 100,
        y: (e.clientY / window.innerHeight) * 100,
      })
    }

    window.addEventListener("mousemove", handleMouseMove)
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [error])

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-linear-to-br from-white via-emerald-50/30 to-white dark:from-gray-950 dark:via-emerald-950/20 dark:to-gray-950">
      {/* Rwanda flag accent - top */}
      <div className="fixed top-0 left-0 right-0 h-1 flex z-50">
        <div className="flex-1 bg-[#00A1DE]" />
        <div className="flex-1 bg-[#FAD201]" />
        <div className="flex-1 bg-[#20603D]" />
      </div>

      {/* Background gradient effects */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />
        <div
          className="absolute bottom-0 right-0 w-96 h-96 bg-[#165598]/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        />
      </div>

      {/* Interactive Mouse Follower */}
      <motion.div
        className="pointer-events-none absolute h-96 w-96 rounded-full bg-emerald-500/5 blur-3xl"
        animate={{
          x: mousePosition.x * 3,
          y: mousePosition.y * 3,
        }}
        transition={{ type: "spring" as const, stiffness: 50, damping: 30 }}
      />

      {/* Main Content */}
      <div className="relative z-10 mx-auto max-w-4xl px-4 text-center">
        {/* Error Icon */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.1, type: "spring" as const, stiffness: 200 }}
          className="mb-8 flex justify-center">
          <div className="relative">
            {/* Rotating rings */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{
                duration: 20,
                repeat: Number.POSITIVE_INFINITY,
                ease: "linear",
              }}
              className="absolute inset-0 h-24 w-24 rounded-full border-2 border-emerald-500/20"
            />
            <motion.div
              animate={{ rotate: -360 }}
              transition={{
                duration: 15,
                repeat: Number.POSITIVE_INFINITY,
                ease: "linear",
              }}
              className="absolute inset-2 h-20 w-20 rounded-full border border-[#165598]/30"
            />

            {/* Central icon */}
            <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-linear-to-br from-emerald-500/10 to-[#165598]/10 backdrop-blur-sm border border-emerald-500/20">
              <User className="h-12 w-12 text-emerald-600 dark:text-emerald-400" />

              {/* Sparkles */}
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 2,
                  repeat: Number.POSITIVE_INFINITY,
                }}
                className="absolute -top-2 -right-2">
                <Sparkles className="h-5 w-5 text-[#FAD201]" />
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="mb-4 text-3xl font-bold text-foreground md:text-4xl lg:text-5xl">
          Customer Dashboard Error
        </motion.h1>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="mx-auto mb-8 max-w-2xl text-muted-foreground text-lg">
          We encountered an error while loading your customer dashboard. Please
          try again or contact support if you need help.
        </motion.p>

        {/* Error details for development */}
        {process.env.NODE_ENV === "development" && error.message && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="mx-auto mb-8 max-w-2xl rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 text-left">
            <p className="font-mono text-sm text-foreground/80">
              {error.message}
            </p>
            {error.digest && (
              <p className="mt-2 font-mono text-xs text-muted-foreground">
                Error ID: {error.digest}
              </p>
            )}
          </motion.div>
        )}

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button
            onClick={() => reset()}
            size="lg"
            className="group bg-linear-to-r from-[#165598] to-[#28bcd6] hover:from-[#28bcd6] hover:to-[#165598] text-white shadow-lg hover:shadow-xl transition-all duration-500 border-0">
            <RefreshCcw className="mr-2 h-5 w-5 transition-transform group-hover:rotate-180 duration-500" />
            Try Again
          </Button>

          <Button
            asChild
            size="lg"
            variant="outline"
            className="group border-2 border-emerald-500/30 hover:bg-emerald-500/10 hover:border-emerald-500 transition-all duration-300">
            <Link href="/member/dashboard">
              <User className="mr-2 h-5 w-5 transition-transform group-hover:scale-110" />
              Dashboard Home
            </Link>
          </Button>

          <Button
            asChild
            size="lg"
            variant="outline"
            className="group border-2 border-[#165598]/30 hover:bg-[#165598]/10 hover:border-[#165598] transition-all duration-300">
            <Link href="/">
              <Home className="mr-2 h-5 w-5 transition-transform group-hover:scale-110" />
              Home
            </Link>
          </Button>
        </motion.div>

        {/* Rwanda Pride Badge */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="mt-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-linear-to-r from-[#00A1DE]/10 via-[#FAD201]/10 to-[#20603D]/10 border border-[#165598]/20">
            <MapPin className="w-4 h-4 text-[#165598]" />
            <span className="text-sm font-semibold bg-linear-to-r from-[#165598] to-[#28bcd6] bg-clip-text text-transparent">
              TrustLink Group
            </span>
            <Sparkles className="w-4 h-4 text-[#FAD201]" />
          </div>
        </motion.div>
      </div>

      {/* Decorative elements */}
      <div className="absolute top-20 right-20 hidden xl:block">
        <motion.div
          animate={{
            rotate: [0, 15, -15, 0],
            y: [-10, 10, -10],
          }}
          transition={{
            duration: 8,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
          }}>
          <Search className="h-8 w-8 text-emerald-500/20" />
        </motion.div>
      </div>

      <div className="absolute bottom-20 left-20 hidden xl:block">
        <motion.div
          animate={{
            rotate: [0, -15, 15, 0],
            y: [10, -10, 10],
          }}
          transition={{
            duration: 10,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
          }}>
          <Calendar className="h-6 w-6 text-[#165598]/20" />
        </motion.div>
      </div>

      {/* Rwanda flag accent - bottom */}
      <div className="fixed bottom-0 left-0 right-0 h-1 flex z-50">
        <div className="flex-1 bg-[#20603D]" />
        <div className="flex-1 bg-[#FAD201]" />
        <div className="flex-1 bg-[#00A1DE]" />
      </div>
    </div>
  )
}
