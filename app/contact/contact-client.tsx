"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Mail, MessageSquare } from "lucide-react"
import { adminPages, getIconComponent } from "@/constants/admin-panel-login"
import { AnimatePresence, motion } from "framer-motion"
import { Autoplay, Pagination } from "swiper/modules"
import { Swiper, SwiperSlide } from "swiper/react"

// Import Swiper styles
import "swiper/css"
import "swiper/css/pagination"
import "./style.css"
import { ContactFormSection } from "@/components/contact/contact-form-section"

interface ContactClientProps {
  initialService?: "contributions-savings" | "loans-repayments" | "meetings-minutes" | "penalties-compliance" | "member-account" | "access-technical" | "access" | "other"
  initialSubject?: string
  initialMessage?: string
}

export function ContactClient({
  initialService,
  initialSubject,
  initialMessage,
}: ContactClientProps) {
  const [domLoaded, setDomLoaded] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

  // Fix for hydration issues with Swiper
  useEffect(() => {
    setDomLoaded(true)
  }, [])

  // Animated background elements
  const renderBackgroundElements = () => {
    return (
      <>
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-[#11922f]/10"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              width: `${Math.random() * 100 + 20}px`,
              height: `${Math.random() * 100 + 20}px`,
            }}
            animate={{
              y: [0, Math.random() * 30 - 15],
              opacity: [0.1, 0.3, 0.1],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 5 + Math.random() * 5,
              repeat: Number.POSITIVE_INFINITY,
              repeatType: "reverse",
            }}
          />
        ))}
      </>
    )
  }

  return (
    <div className="relative min-h-screen  bg-primary text-[#F7F3EC]">
      <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay"></div>
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden="true"
      >
        <div className="absolute -top-20 left-1/2 h-96 w-150 -translate-x-1/2 rounded-full bg-linear-to-b from-[#E8B84B]/18 via-[#C9992A]/10 to-transparent blur-3xl" />
        <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-primary/70 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(247,243,236,0.55) 1px, transparent 1px), linear-gradient(90deg, rgba(247,243,236,0.55) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      <main className="relative mx-auto max-w-6xl px-6 pb-20 pt-16 sm:px-8 sm:pt-18 lg:pb-16">
        {/* Header */}
        <div className="mx-auto mb-10 max-w-2xl text-center lg:mb-12">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/12 px-4 py-1.5 text-xs font-medium uppercase tracking-widest text-[#E8B84B]">
            <MessageSquare className="h-3 w-3" />
            Get in Touch
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[#FFFFFF] sm:text-4xl lg:text-5xl">
            Contact Us
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-[#F7F3EC]/72">
            Reach out to our leadership committee for any questions about
            Posso Ventures Platform. For access requests, use the dedicated form below.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2 lg:gap-10">
          {/* Leadership contacts */}
          <section className="space-y-3 lg:sticky lg:top-8 lg:self-start">
            <div className="relative flex flex-col items-center justify-center">
              <h2 className="mb-2 text-3xl font-bold text-white">
                Posso Ventures Platform
              </h2>
              <p className="mb-12 max-w-md text-center text-white/80">
                Our leadership committee is here to assist you with any inquiries or concerns regarding the Posso Ventures Platform. Please feel free to reach out to us for support or information.
              </p>

              {domLoaded && (
                <div className="relative h-[200px] w-full max-w-md">
                  {/* Stacked feature cards */}
                  <div className="relative flex h-full items-center justify-center">
                    <AnimatePresence>
                      {adminPages.map((page, index) => {
                        // Calculate if this card should be visible based on activeIndex
                        const isVisible =
                          index === activeIndex ||
                          index === (activeIndex + 1) % adminPages.length ||
                          index === (activeIndex + 2) % adminPages.length

                        // Calculate position and z-index based on relation to activeIndex
                        let position = "center"
                        let zIndex = 10

                        if (index === (activeIndex + 1) % adminPages.length) {
                          position = "back"
                          zIndex = 9
                        } else if (
                          index ===
                          (activeIndex + 2) % adminPages.length
                        ) {
                          position = "hidden"
                          zIndex = 8
                        }

                        return (
                          isVisible && (
                            <motion.div
                              key={page.id}
                              className="absolute w-full max-w-[350px] overflow-hidden rounded-lg border border-white/20 bg-white/10 shadow-lg backdrop-blur-sm"
                              initial={{
                                opacity: 0,
                                y: 50,
                                x: 0,
                                scale: 0.8,
                              }}
                              animate={{
                                opacity: position === "hidden" ? 0.3 : 1,
                                y:
                                  position === "center"
                                    ? 0
                                    : position === "back"
                                      ? 20
                                      : 40,
                                x:
                                  position === "center"
                                    ? 0
                                    : position === "back"
                                      ? 30
                                      : 60,
                                scale:
                                  position === "center"
                                    ? 1
                                    : position === "back"
                                      ? 0.9
                                      : 0.8,
                                zIndex,
                              }}
                              exit={{
                                opacity: 0,
                                y: -50,
                                scale: 0.8,
                              }}
                              transition={{
                                duration: 0.5,
                                ease: "easeInOut",
                              }}
                            >
                              <div className="p-5">
                                <div className="mb-3 flex items-center">
                                  <div className="mr-3 rounded-full bg-white/20 p-2">
                                    {getIconComponent(page.icon)}
                                  </div>
                                  <h3 className="font-medium text-white">
                                    {page.title}
                                  </h3>
                                </div>
                                <p className="text-sm text-white/80">
                                  {page.description}
                                </p>
                              </div>
                            </motion.div>
                          )
                        )
                      })}
                    </AnimatePresence>
                  </div>

                  {/* Hidden swiper for controlling the animation */}
                  <div className="absolute right-0 bottom-0 left-0 h-0 overflow-hidden opacity-0">
                    <Swiper
                      slidesPerView={1}
                      spaceBetween={0}
                      loop={true}
                      autoplay={{
                        delay: 4000,
                        disableOnInteraction: false,
                      }}
                      pagination={{
                        clickable: true,
                        el: ".custom-pagination",
                      }}
                      modules={[Pagination, Autoplay]}
                      onSlideChange={(swiper) => setActiveIndex(swiper.realIndex)}
                      className="w-full"
                    >
                      {adminPages.map((page) => (
                        <SwiperSlide key={page.id}>
                          <div className="h-1 w-1"></div>
                        </SwiperSlide>
                      ))}
                    </Swiper>
                  </div>

                  {/* Custom pagination */}
                  <div className="custom-pagination mt-8 flex justify-center space-x-2"></div>
                </div>
              )}
            </div>

            {/* Ventures Platform email */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <a
                href="mailto:possoventures@gmail.com"
                className="flex items-center gap-3 rounded-2xl border border-[#FFFFFF]/12 bg-[#FFFFFF]/6 px-5 py-4 backdrop-blur-sm transition hover:border-[#E8B84B]/40 hover:bg-[#FFFFFF]/10"
              >
                <Mail className="h-4 w-4 shrink-0 text-[#C9992A]" />
                <div>
                  <p className="text-xs text-[#F7F3EC]/62">Ventures Platform Email</p>
                  <p className="mt-0.5 text-sm font-medium text-[#FFFFFF]/92">
                    possoventures@gmail.com
                  </p>
                </div>
              </a>
            </div>

            <div className="mt-8 hidden sm:flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-[#F7F3EC]/55 lg:mt-10">
              <Link href="/" className="transition hover:text-[#FFFFFF]">
                Home
              </Link>

              <span>·</span>
              <Link href="/login" className="transition hover:text-[#FFFFFF]">
                Login
              </Link>
            </div>
          </section>

          <aside className="flex flex-col">
            <ContactFormSection
              variant="contact"
              embedded
              showIntro={false}
              initialService={initialService}
              initialSubject={initialSubject}
              initialMessage={initialMessage}
            />

            {/* Footer links */}
            <div className="mt-8 flex flex-wrap sm:hidden items-center justify-center gap-x-6 gap-y-2 text-xs text-[#F7F3EC]/55 lg:mt-10">
              <Link href="/" className="transition hover:text-[#FFFFFF]">
                Home
              </Link>

              <span>·</span>
              <Link href="/login" className="transition hover:text-[#FFFFFF]">
                Login
              </Link>
            </div>
          </aside>
        </div>
      </main>
    </div>
  )
}
