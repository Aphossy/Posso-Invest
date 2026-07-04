// app\(dashboard)\customer\not-found.tsx
"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowLeft, Home, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"

export default function CustomerNotFound() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Main content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-center space-y-6">
          {/* Main heading */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="space-y-3">
            <h1 className="text-4xl md:text-5xl font-bold bg-linear-to-r from-[#00A1DE] via-[#FAD201] to-[#20603D] bg-clip-text text-transparent">
              Coming Soon!
            </h1>
            <p className="text-xl text-muted-foreground">
              This page is currently under construction
            </p>
          </motion.div>

          {/* Description */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="max-w-lg mx-auto">
            <p className="text-muted-foreground leading-relaxed">
              Our team is working hard to bring you this feature. It will be
              available soon with amazing functionality tailored for your saving
              goals.
            </p>
          </motion.div>

          {/* Progress indicator */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.7, duration: 0.5 }}
            className="max-w-lg mx-auto space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Development Progress
              </span>
              <span className="font-semibold text-[#00A1DE]">In Progress</span>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: "0%" }}
                animate={{ width: "65%" }}
                transition={{ delay: 0.8, duration: 1, ease: "easeOut" }}
                className="h-full bg-linear-to-r from-[#00A1DE] via-[#FAD201] to-[#20603D] rounded-full"
              />
            </div>
          </motion.div>

          {/* Action buttons */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.5 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button
              asChild
              className="bg-linear-to-r from-[#00A1DE] to-[#20603D] hover:from-[#20603D] hover:to-[#00A1DE] text-white shadow-lg hover:shadow-xl transition-all duration-500 border-0">
              <Link
                href="/member/dashboard"
                className="flex items-center gap-2">
                <Home className="w-4 h-4" />
                <span className="font-semibold">Go to Dashboard</span>
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              className="border-2 border-[#00A1DE]/30 hover:bg-[#00A1DE]/10 hover:border-[#00A1DE] transition-all duration-300">
              <Link
                href="/member/dashboard"
                className="flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                <span className="font-semibold">Back to Home</span>
              </Link>
            </Button>
          </motion.div>

          {/* Footer note */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.5 }}
            className="pt-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-linear-to-r from-[#00A1DE]/5 via-[#FAD201]/5 to-[#20603D]/5 border border-[#00A1DE]/10">
              <Sparkles className="w-4 h-4 text-[#FAD201]" />
              <span className="text-sm font-medium bg-linear-to-r from-[#00A1DE] to-[#20603D] bg-clip-text text-transparent">
                TrustLink Group - Building the Future
              </span>
            </div>
          </motion.div>
        </motion.div>

        {/* Rwanda colors accent bottom */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 1.1, duration: 0.5 }}
          className="h-1 flex mt-8 rounded-full overflow-hidden">
          <div className="flex-1 bg-[#20603D]" />
          <div className="flex-1 bg-[#FAD201]" />
          <div className="flex-1 bg-[#00A1DE]" />
        </motion.div>
      </div>
    </div>
  )
}
