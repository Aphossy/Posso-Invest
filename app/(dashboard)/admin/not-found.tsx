// app\(dashboard)\admin\not-found.tsx
"use client"

import { motion } from "framer-motion"
import { Construction, Settings, Shield, Sparkles, Zap } from "lucide-react"

export default function AdminNotFound() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <div className="max-w-3xl w-full">
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
            <h1 className="text-4xl font-bold bg-linear-to-r from-primary via-[#FAD201] to-indigo-600 bg-clip-text text-transparent">
              Admin Feature Coming Soon
            </h1>
            <p className="text-xl text-muted-foreground">
              This administrative feature is being built for you
            </p>
          </motion.div>

          {/* Description */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="max-w-xl mx-auto">
            <p className="text-muted-foreground leading-relaxed">
              We're developing advanced administrative tools to help you manage
              the TrustLink Group platform efficiently. This feature will give
              you powerful controls and insights.
            </p>
          </motion.div>

          {/* Progress indicator */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.7, duration: 0.5 }}
            className="max-w-xl mx-auto space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Development Progress
              </span>
              <div className="flex items-center gap-2">
                <Zap className="w-3 h-3 text-[#FAD201]" />
                <span className="font-semibold text-purple-600 dark:text-purple-400">
                  In Progress
                </span>
              </div>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: "0%" }}
                animate={{ width: "75%" }}
                transition={{ delay: 0.8, duration: 1, ease: "easeOut" }}
                className="h-full bg-linear-to-r from-purple-600 via-[#FAD201] to-indigo-600 rounded-full relative overflow-hidden">
                {/* Animated shine effect */}
                <motion.div
                  animate={{
                    x: ["-100%", "200%"],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                  className="absolute inset-0 bg-linear-to-r from-transparent via-white/40 to-transparent"
                />
              </motion.div>
            </div>
          </motion.div>

          {/* Admin note */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.5 }}
            className="pt-6">
            <div className="max-w-xl mx-auto p-4 rounded-xl bg-linear-to-br from-purple-500/5 to-indigo-600/5 border border-purple-500/10">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1">
                  <Shield className="w-5 h-5 text-purple-600" />
                </div>
                <div className="text-left space-y-1">
                  <p className="text-sm font-semibold text-foreground">
                    Advanced Admin Controls
                  </p>
                  <p className="text-xs text-muted-foreground">
                    We're building comprehensive administrative features
                    including user management, analytics dashboards, platform
                    settings. Stay tuned for powerful tools to help you manage
                    your experience on the TrustLink Group platform.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Footer note */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1, duration: 0.5 }}
            className="pt-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-linear-to-r from-purple-500/5 via-[#FAD201]/5 to-indigo-600/5 border border-purple-500/10">
              <Sparkles className="w-4 h-4 text-[#FAD201]" />
              <span className="text-sm font-medium bg-linear-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                TrustLink Group - Platform Excellence
              </span>
            </div>
          </motion.div>
        </motion.div>

        {/* Rwanda colors accent bottom */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 1.2, duration: 0.5 }}
          className="h-1 flex mt-8 rounded-full overflow-hidden">
          <div className="flex-1 bg-[#20603D]" />
          <div className="flex-1 bg-[#FAD201]" />
          <div className="flex-1 bg-[#00A1DE]" />
        </motion.div>
      </div>
    </div>
  )
}
