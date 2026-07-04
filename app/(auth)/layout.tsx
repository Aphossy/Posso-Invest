"use client"

import { Suspense, useEffect, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { adminPages, getIconComponent } from "@/constants/admin-panel-login"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowLeft, TrendingUp } from "lucide-react"
import { Autoplay, Pagination } from "swiper/modules"
import { Swiper, SwiperSlide } from "swiper/react"

// Import Swiper styles
import "swiper/css"
import "swiper/css/pagination"
import "./style.css"

import { Button } from "@/components/ui/button"
import { OrbitingSpinner } from "@/components/ui/spinner"

const AuthLayout = ({ children }: { children: React.ReactNode }) => {
  const [domLoaded, setDomLoaded] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const router = useRouter()

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
            className="absolute rounded-full bg-[#165598]/10"
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
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center py-20">
          <OrbitingSpinner />
        </div>
      }>
      <div className="relative h-screen flex-col items-center justify-center overflow-hidden md:grid lg:max-w-none lg:grid-cols-2 lg:px-0">
        {/* Left side with stacked feature cards */}

        <div className="relative hidden h-full flex-col bg-linear-to-br from-primary to-primary p-10 text-white lg:flex dark:border-r">
          {/* Back Button */}
          <Button
            onClick={() => router.push("/")}
            variant="ghost"
            size="sm"
            className="absolute top-8 left-6 flex items-center gap-2 text-sm text-white backdrop-blur-lg bg-white/20 hover:bg-white/30 hover:text-gray-100 rounded-lg hover:cursor-pointer z-50 border border-white/20 transition-all duration-300">
            <ArrowLeft className="h-4 w-4" />
            Home
          </Button>

          {/* Background Image with better overlay */}

          <div className="absolute inset-0 bg-cover bg-center opacity-7" />

          <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay"></div>

          <div className="relative flex flex-col items-center justify-center pt-5">
            <h2 className="mb-2 text-3xl font-bold text-white">
              Posso Ventures
            </h2>
            <p className="mb-4 max-w-md text-center text-white/80">
              Welcome to the future of community-driven savings and growth.
            </p>

            {domLoaded && (
              <div className="relative h-50 w-full max-w-md">
                <div className="relative flex h-full items-center justify-center">
                  <AnimatePresence>
                    {adminPages.map((page, index) => {
                      const isVisible =
                        index === activeIndex ||
                        index === (activeIndex + 1) % adminPages.length ||
                        index === (activeIndex + 2) % adminPages.length

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
                            className="absolute w-full max-w-87.5 overflow-hidden rounded-lg border border-white/20 bg-white/10 shadow-lg backdrop-blur-sm"
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

                <div className="custom-pagination flex justify-center space-x-2"></div>
              </div>
            )}
          </div>

          <div className="absolute bottom-6 left-6 z-10 flex items-start gap-3">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
              className="flex items-center rounded-2xl border border-white/15 bg-white/10 px-4 py-3 shadow-lg backdrop-blur-md"
            >
              <div className="mr-3 h-10 w-10 overflow-hidden rounded-full border-2 border-white/50">
                <Image
                  src="/brand/logo.png"
                  alt=""
                  width={40}
                  height={40}
                  className="h-full w-full object-cover"
                />
              </div>
              <div>
                <h3 className="font-bold">Posso Ventures</h3>
                <p className="text-sm text-white/70">
                  Building a better future together
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
              whileHover={{ scale: 1.01, y: -2 }}
              className="w-70 rounded-2xl border border-white/15 bg-white/10 p-3 shadow-lg backdrop-blur-md"
            >
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.28em] text-white/60">
                    Growth
                  </p>
                
                </div>
                <div className="rounded-full bg-emerald-400/20 px-2.5 py-1 text-[11px] font-medium text-emerald-200">
                  <TrendingUp className="mr-1 inline h-3 w-3" />
                </div>
              </div>

              <svg viewBox="0 0 260 120" className="h-24 w-full">
                {[0, 1, 2, 3].map((line) => (
                  <line
                    key={line}
                    x1="12"
                    x2="248"
                    y1={20 + line * 24}
                    y2={20 + line * 24}
                    stroke="rgba(255,255,255,0.16)"
                    strokeWidth="1"
                  />
                ))}

                {[
                  { height: 44, color: "#34d399" },
                  { height: 30, color: "#fbbf24" },
                  { height: 58, color: "#60a5fa" },
                  { height: 38, color: "#fb923c" },
                  { height: 52, color: "#f472b6" },
                  { height: 22, color: "#a78bfa" },
                  { height: 34, color: "#f87171" },
                ].map((bar, index) => (
                  <motion.rect
                    key={bar.color}
                    x={24 + index * 32}
                    y={90 - bar.height}
                    width="18"
                    height={bar.height}
                    rx="4"
                    fill={bar.color}
                    initial={{ height: 0, y: 90, opacity: 0.4 }}
                    animate={{ height: bar.height, y: 90 - bar.height, opacity: [0.4, 1, 0.85, 1] }}
                    transition={{ duration: 0.9, delay: 0.1 + index * 0.08, repeat: Number.POSITIVE_INFINITY, repeatType: "mirror", repeatDelay: 2.4 }}
                  />
                ))}

                <motion.path
                  d="M24 84 C44 72, 54 56, 72 60 S102 82, 120 72 S150 44, 168 54 S198 84, 216 70 S238 42, 248 48"
                  fill="none"
                  stroke="#60a5fa"
                  strokeWidth="2.5"
                  initial={{ pathLength: 0, opacity: 0.3 }}
                  animate={{ pathLength: [0, 1, 1], opacity: [0.3, 1, 0.85] }}
                  transition={{ duration: 1.2, delay: 0.2, repeat: Number.POSITIVE_INFINITY, repeatType: "mirror", repeatDelay: 2.2 }}
                />
              </svg>
            </motion.div>
          </div>
        </div>

        {/* Right side with login form */}
        <div className="relative flex h-full items-center justify-center overflow-hidden bg-gray-50 p-4 lg:p-8">
          {renderBackgroundElements()}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="z-10 mx-auto flex w-full flex-col justify-center space-y-6 sm:w-125">
            <div className="rounded-lg p-2 sm:p-2">{children}</div>
          </motion.div>
        </div>
      </div>
    </Suspense>
  )
}

export default AuthLayout
