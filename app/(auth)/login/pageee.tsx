"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { adminPages, getIconComponent } from "@/constants/admin-panel-login"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowLeft } from "lucide-react"
import { Autoplay, Pagination } from "swiper/modules"
import { Swiper, SwiperSlide } from "swiper/react"

import LoginPageComponent from "@/components/auth-pages/login-form"

// Import Swiper styles
import "swiper/css"
import "swiper/css/pagination"
import "./style.css"

import { Button } from "@/components/ui/button"

export default function SignInViewPage() {
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
    <div className="relative h-screen flex-col items-center justify-center overflow-hidden md:grid lg:max-w-none lg:grid-cols-2 lg:px-0">
      {/* Left side with stacked feature cards */}

      {/* Back Button */}
      <Button
        onClick={() => router.push("/")}
        variant="ghost"
        size="sm"
        className="absolute top-8 left-6 flex items-center gap-2 text-sm text-white backdrop-blur-lg bg-white/20 hover:bg-white/30 hover:text-gray-100 rounded-lg hover:cursor-pointer z-50 border border-white/20 transition-all duration-300">
        <ArrowLeft className="h-4 w-4" />
        Home
      </Button>

      <div className="relative hidden h-full flex-col bg-linear-to-br from-[#11922f] to-[#00753c] p-10 text-white lg:flex dark:border-r">
        {/* Background Image with better overlay */}
        <div className="absolute inset-0 bg-[url('/v.jpg')] bg-cover bg-center opacity-7" />

        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay"></div>

        <div className="relative flex pt-5 flex-col items-center justify-center">
          <h2 className="mb-2 text-3xl font-bold text-white">
            Trustlink Group - Ikimina
          </h2>
          <p className="mb-12 max-w-md text-center text-white/80">
            Save together. Build together. Thrive together. Welcome to the
            future of community-driven savings and growth.
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
                          }}>
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
                  className="w-full">
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

        <div className="absolute bottom-10 left-10 z-10">
          <div className="flex items-center">
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
              <h3 className="font-bold">Trustlink Group</h3>
              <p className="text-sm text-white/70">
                Building a better future together
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right side with login form */}
      <div className="relative flex h-full items-center justify-center overflow-hidden bg-gray-50 p-4 lg:p-8">
        {renderBackgroundElements()}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="z-10 mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[500px]">
          <div className="rounded-lg p-2 sm:p-2">
            <LoginPageComponent />
          </div>
        </motion.div>
      </div>
    </div>
  )
}
