"use client"

import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ChevronsUp } from "lucide-react"

import { Button } from "@/components/ui/button"

export default function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > 300) {
        setIsVisible(true)
      } else {
        setIsVisible(false)
      }
    }

    window.addEventListener("scroll", toggleVisibility)

    return () => window.removeEventListener("scroll", toggleVisibility)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    })
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="fixed right-8 bottom-8 z-50"
          exit={{ opacity: 0, y: 20 }}
          initial={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.2 }}>
          <Button
            aria-label="Scroll to top"
            title="Scroll to tops"
            className="size-8 rounded-full border-2 text-white  border-transparent bg-primary shadow-lg transition-all duration-300 hover:bg-primary/90 "
            onClick={scrollToTop}>
            <ChevronsUp className="h-6 w-6 text-white" />
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
