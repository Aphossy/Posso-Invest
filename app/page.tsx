"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { motion, useAnimation, useReducedMotion } from "framer-motion"
import { ArrowRight, Lock, Stethoscope, UserPlus, Video } from "lucide-react"

import { useMediaQuery } from "@/hooks/use-media-query"
import { useMousePosition } from "@/hooks/use-mouse-position"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { AuthErrorToast } from "@/components/auth/auth-error-toast"
import { AnimatedSphere } from "@/components/hero/animated-sphere"

const TUTORIAL_URL = "https://youtu.be/Lrf3ECWCfDM"
const words = ["Save", "Invest", "Grow",];

const steps = [
  {
    title: "Check your invitation email",
    description:
      "You should have received an invitation link by email. If you don't see it in your inbox, check your Spam or Junk folder - it sometimes ends up there.",
  },
  {
    title: "Login with Google",
    description:
      'Use the same email address the invitation was sent to. On the login page, click "Login with Google" to sign in.',
  },
  {
    title: "Accept the invitation",
    description:
      "After logging in, go back to your email and click the \"Accept Invitation\" link. That's it - you'll be granted access automatically.",
  },
]

function RequestAccessGuide({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="space-y-6">
      <ol className="space-y-4">
        {steps.map((step, i) => (
          <li key={i} className="flex gap-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#007952]/10 text-[#007952] font-bold text-sm">
              {i + 1}
            </div>
            <div className="space-y-0.5">
              <p className="font-semibold text-sm text-foreground">
                {step.title}
              </p>
              <p className="text-sm text-muted-foreground">
                {step.description}
              </p>
            </div>
          </li>
        ))}
      </ol>

      <div className="rounded-lg border border-[#007952]/20 bg-[#007952]/5 p-4 flex items-start gap-3">
        <Video className="mt-0.5 h-4 w-4 shrink-0 text-[#007952]" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">
            Need a visual walkthrough?
          </p>
          <a
            href={TUTORIAL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-[#007952] underline underline-offset-4 hover:text-[#007952]/80">
            Watch the tutorial video →
          </a>
        </div>
      </div>

      <div className="flex flex-col gap-2 pt-1">
        <Button
          asChild
          className="w-full bg-[#007952] hover:bg-[#007952]/90 text-white">
          <Link href="/login">Go to Login</Link>
        </Button>
        <Button variant="secondary" className="w-full" onClick={onContinue}>
          I don't have an invitation - request access
        </Button>
      </div>
    </div>
  )
}

export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null)
  const mousePosition = useMousePosition()
  const spotlightControls = useAnimation()
  const reduceMotion = useReducedMotion()
  const isDesktop = useMediaQuery("(min-width: 768px)")
  const [guideOpen, setGuideOpen] = useState(false)
  const [wordIndex, setWordIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (
      reduceMotion ||
      !containerRef.current ||
      mousePosition.x == null ||
      mousePosition.y == null
    ) {
      return
    }

    const rect = containerRef.current.getBoundingClientRect()
    const x = mousePosition.x - rect.left
    const y = mousePosition.y - rect.top

 spotlightControls.start({
  background: `radial-gradient(circle at ${x}px ${y}px, rgba(0, 121, 82, 0.28) 0%, rgba(0, 95, 64, 0.14) 16%, rgba(0, 0, 0, 0) 52%)`,
})
  }, [mousePosition.x, mousePosition.y, reduceMotion, spotlightControls])

   useEffect(() => {
      setIsVisible(true);
    }, []);
  
    useEffect(() => {
      const interval = setInterval(() => {
        setWordIndex((prev) => (prev + 1) % words.length);
      }, 2500);
      return () => clearInterval(interval);
    }, []);

  return (
    <div
      ref={containerRef}
      className="relative flex min-h-screen flex-col overflow-hidden bg-[#E6F4ED] text-[#F7F3EC]">
      {/* Skip link */}
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-[#FFFFFF] focus:px-4 focus:py-2 focus:text-[#00A06B]">
        Skip to content
      </a>

      {/* Ambient background */}
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden="true">
        <motion.div
         className="absolute -top-32 left-1/2 h-125 w-175 -translate-x-1/2 rounded-full bg-linear-to-b from-[#007952]/20 via-[#00A06B]/10 to-transparent blur-3xl"
          animate={
            reduceMotion
              ? undefined
              : {
                  y: [0, 14, 0],
                }
          }
          transition={
            reduceMotion
              ? undefined
              : {
                  duration: 14,
                  ease: "easeInOut",
                  repeat: Number.POSITIVE_INFINITY,
                }
          }
        />
        <motion.div
          className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-[#007952]/25 blur-3xl"
          animate={
            reduceMotion
              ? undefined
              : {
                  x: [0, -10, 0],
                  y: [0, -8, 0],
                }
          }
          transition={
            reduceMotion
              ? undefined
              : {
                  duration: 18,
                  ease: "easeInOut",
                  repeat: Number.POSITIVE_INFINITY,
                }
          }
        />
        {/* Subtle grid texture */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(247,243,236,0.55) 1px, transparent 1px), linear-gradient(90deg, rgba(247,243,236,0.55) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <motion.div
          className="absolute inset-0 opacity-80"
          animate={spotlightControls}
          transition={{ type: "tween", ease: "backOut", duration: 0.45 }}
        />
      </div>

      <main
        id="content"
        className="relative mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 pb-5 pt-8 sm:px-8 sm:pt-10 lg:pt-12">
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-120 h-120 lg:w-180 lg:h-180 opacity-40 pointer-events-none">
                <AnimatedSphere />
        </div>
              
      {/* Subtle grid lines */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
        {[...Array(8)].map((_, i) => (
          <div
            key={`h-${i}`}
            className="absolute h-px bg-foreground/10"
            style={{
              top: `${12.5 * (i + 1)}%`,
              left: 0,
              right: 0,
            }}
          />
        ))}
        {[...Array(12)].map((_, i) => (
          <div
            key={`v-${i}`}
            className="absolute w-px bg-foreground/10"
            style={{
              left: `${8.33 * (i + 1)}%`,
              top: 0,
              bottom: 0,
            }}
          />
        ))}
      </div>
        <section className="flex flex-1 flex-col justify-center">
          <div className="mx-auto w-full max-w-3xl">
            {/* Badge */}
            <div className="flex justify-center">
              <motion.div
                className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#E8B84B]/35 bg-[#C9992A]/12 px-4 py-1.5 text-xs font-medium uppercase tracking-widest text-[#E8B84B]"
                initial={
                  reduceMotion ? false : { opacity: 0, y: 14, scale: 0.995 }
                }
                animate={
                  reduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }
                }
                transition={{ duration: 0.7, delay: 0.08, ease: "easeOut" }}>
                <Stethoscope className="h-3 w-3" />
                Posso Ventures
              </motion.div>
            </div>

            {/* Hero */}
            <div className="text-center">
              <motion.h1
                className="text-4xl text-[#007952]/80 font-bold tracking-tight sm:text-5xl lg:text-[3.5rem] lg:leading-[1.1]"
                initial={
                  reduceMotion ? false : { opacity: 0, y: 14, scale: 0.995 }
                }
                animate={
                  reduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }
                }
                transition={{ duration: 0.7, delay: 0.16, ease: "easeOut" }}>
              <span className="text-[#007952]">
              {" "}
              <span className="relative inline-block">
                <span 
                  key={wordIndex}
                  className="inline-flex"
                >
                  {words[wordIndex].split("").map((char, i) => (
                    <span
                      key={`${wordIndex}-${i}`}
                      className="inline-block animate-char-in"
                      style={{
                        animationDelay: `${i * 50}ms`,
                      }}
                    >
                      {char}
                    </span>
                  ))}
                </span>
                <span className="absolute -bottom-2 left-0 right-0 h-3 bg-foreground/10" />
              </span>
            </span> together.{" "}
                <span className="bg-linear-to-r from-[#1D293B]/90 to-[#1D293B] bg-clip-text text-transparent">
                  Build the future.
                </span>
              </motion.h1>
              <motion.p
                className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-[#1D293B]/82 sm:text-[1.03rem]"
                initial={
                  reduceMotion ? false : { opacity: 0, y: 14, scale: 0.995 }
                }
                animate={
                  reduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }
                }
                transition={{ duration: 0.7, delay: 0.24, ease: "easeOut" }}>
                A private savings and investment platform for a trusted member
                circle. Access is confidential and available by invitation only.
              </motion.p>
            </div>

            {/* CTAs */}
            <motion.div
              className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4"
              initial={
                reduceMotion ? false : { opacity: 0, y: 14, scale: 0.995 }
              }
              animate={
                reduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }
              }
              transition={{ duration: 0.7, delay: 0.32, ease: "easeOut" }}>
              <Link
                href="/login"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#007952] px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-black/20 transition hover:-translate-y-0.5 hover:bg-[#007952] sm:w-auto sm:min-w-40">
                <Lock className="h-4 w-4" />
                Member Login
                <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
              </Link>
              <button
                onClick={() => setGuideOpen(true)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#007952]/40 bg-[#FFFFFF]/10 px-7 py-3 text-sm font-semibold text-[#007952] backdrop-blur-sm transition hover:-translate-y-0.5 hover:border-[#007952]/70 hover:bg-[#FFFFFF]/14 sm:w-auto sm:min-w-40">
                <UserPlus className="h-4 w-4" />
                Request Access
              </button>
            </motion.div>
          </div>
        </section>

        <Suspense>
          <AuthErrorToast />
        </Suspense>

        <motion.footer
          className="pt-6 sm:pt-7"
          initial={reduceMotion ? false : { opacity: 0, y: 14, scale: 0.995 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.42, ease: "easeOut" }}>
          <p className="text-center text-xs text-[#1D293B]">
            © {new Date().getFullYear()} Posso Ventures . All rights
            reserved.
          </p>
        </motion.footer>
      </main>

      {/* Request Access Guide - Dialog on desktop, Drawer on mobile */}
      {isDesktop ? (
        <Dialog open={guideOpen} onOpenChange={setGuideOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>How to get access</DialogTitle>
              <DialogDescription>
                Access is confidential and by invitation only. Follow the steps
                below to join.
              </DialogDescription>
            </DialogHeader>
            <RequestAccessGuide
              onContinue={() => {
                setGuideOpen(false)
                window.location.href = "/contact?service=request-access"
              }}
            />
          </DialogContent>
        </Dialog>
      ) : (
        <Drawer open={guideOpen} onOpenChange={setGuideOpen}>
          <DrawerContent className="max-h-[92vh]">
            <DrawerHeader className="text-left">
              <DrawerTitle>How to get access</DrawerTitle>
              <DrawerDescription>
                Access is confidential and by invitation only. Follow the steps
                below to join.
              </DrawerDescription>
            </DrawerHeader>
            <div className="overflow-y-auto px-4 pb-6">
              <RequestAccessGuide
                onContinue={() => {
                  setGuideOpen(false)
                  window.location.href = "/contact?service=request-access"
                }}
              />
            </div>
          </DrawerContent>
        </Drawer>
      )}
    </div>
  )
}
