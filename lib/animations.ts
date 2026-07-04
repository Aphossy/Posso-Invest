"use client"

import type { Variants } from "framer-motion"

// Page transition animations
export const pageVariants: Variants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: "easeOut",
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: {
      duration: 0.3,
      ease: "easeIn",
    },
  },
}

// Card entrance animations
export const cardVariants: Variants = {
  initial: {
    opacity: 0,
    scale: 0.95,
    y: 20,
  },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut",
    },
  },
}

// Form field animations
export const fieldVariants: Variants = {
  initial: {
    opacity: 0,
    x: -20,
  },
  animate: {
    opacity: 1,
    x: 0,
  },
  error: {
    x: [-10, 10, -10, 10, 0],
    transition: {
      duration: 0.4,
    },
  },
}

// Button animations
export const buttonVariants: Variants = {
  initial: {
    scale: 1,
  },
  hover: {
    scale: 1.009,
    transition: {
      duration: 0.2,
    },
  },
  tap: {
    scale: 0.98,
    transition: {
      duration: 0.1,
    },
  },
  loading: {
    scale: [1, 1, 1],
    transition: {
      duration: 1,
      repeat: Number.POSITIVE_INFINITY,
      ease: "easeInOut",
    },
  },
}

// OTP input animations
export const otpVariants: Variants = {
  initial: {
    opacity: 0,
    scale: 0.8,
  },
  animate: {
    opacity: 1,
    scale: 1,
  },
  focus: {
    scale: 1.05,
    borderColor: "#8B2635",
    transition: {
      duration: 0.2,
    },
  },
  success: {
    backgroundColor: "#10B981",
    borderColor: "#10B981",
    color: "#FFFFFF",
    transition: {
      duration: 0.3,
    },
  },
  error: {
    x: [-5, 5, -5, 5, 0],
    borderColor: "#EF4444",
    transition: {
      duration: 0.4,
    },
  },
}

// Social button animations
export const socialButtonVariants: Variants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  animate: {
    opacity: 1,
    y: 0,
  },
  hover: {
    scale: 1.05,
    y: -2,
    transition: {
      duration: 0.2,
    },
  },
  tap: {
    scale: 0.95,
  },
}

// Stagger container for multiple elements
export const staggerContainer: Variants = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
}

// Loading spinner animation
export const spinnerVariants: Variants = {
  animate: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Number.POSITIVE_INFINITY,
      ease: "linear",
    },
  },
}

// Success/Error message animations
export const messageVariants: Variants = {
  initial: {
    opacity: 0,
    y: -10,
    scale: 0.95,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.3,
      ease: "easeOut",
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    scale: 0.95,
    transition: {
      duration: 0.2,
    },
  },
}

// Floating animation for decorative elements
export const floatingVariants: Variants = {
  animate: {
    y: [-10, 10, -10],
    transition: {
      duration: 6,
      repeat: Number.POSITIVE_INFINITY,
      ease: "easeInOut",
    },
  },
}

// Pulse animation for important elements
export const pulseVariants: Variants = {
  animate: {
    scale: [1, 1.05, 1],
    transition: {
      duration: 2,
      repeat: Number.POSITIVE_INFINITY,
      ease: "easeInOut",
    },
  },
}
