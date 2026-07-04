"use client"

import { useEffect } from "react"
import { motion, stagger, useAnimate, useInView } from "framer-motion"

import { cn } from "@/lib/utils"

export const TypewriterEffect = ({
  words,
  className,
  cursorClassName,
}: {
  words: {
    text: string
    className?: string
  }[]
  className?: string
  cursorClassName?: string
}) => {
  const [scope, animate] = useAnimate()
  const isInView = useInView(scope)

  useEffect(() => {
    if (isInView) {
      animate(
        "span",
        {
          opacity: 1,
        },
        {
          duration: 0.3,
          delay: stagger(0.1),
        }
      )
    }
  }, [isInView, animate])

  const renderWords = () => {
    return (
      <motion.div ref={scope} className="inline">
        {words.map((word, idx) => {
          return (
            <div key={`word-${idx}`} className="inline-block">
              {word.text.split("").map((char, index) => (
                <motion.span
                  initial={{
                    opacity: 0,
                  }}
                  key={`char-${index}`}
                  className={cn(`inline-block opacity-0`, word.className)}>
                  {char}
                </motion.span>
              ))}
              &nbsp;
            </div>
          )
        })}
      </motion.div>
    )
  }

  return (
    <div className={cn("flex items-center", className)}>
      <div className="inline-block">{renderWords()}</div>
      <motion.span
        initial={{
          opacity: 0,
        }}
        animate={{
          opacity: 1,
        }}
        transition={{
          duration: 0.8,
          repeat: Number.POSITIVE_INFINITY,
          repeatType: "reverse",
        }}
        className={cn(
          "inline-block h-4 w-[2px] bg-emerald-400",
          cursorClassName
        )}
      />
    </div>
  )
}

export const TypewriterEffectSmooth = ({
  words,
  className,
  cursorClassName,
}: {
  words: {
    text: string
    className?: string
  }[]
  className?: string
  cursorClassName?: string
}) => {
  // Split text inside of words into individual letters
  const wordsArray = words.map((word) => {
    return {
      ...word,
      text: word.text.split(""),
    }
  })

  const renderWords = () => {
    return (
      <div>
        {wordsArray.map((word, idx) => {
          return (
            <div key={`word-${idx}`} className="inline-block">
              {word.text.map((char, index) => (
                <span
                  key={`char-${index}`}
                  className={cn(`inline-block`, word.className)}>
                  {char}
                </span>
              ))}
              &nbsp;
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className={cn("flex items-center", className)}>
      <motion.div
        className="inline-block"
        initial={{
          width: "0%",
        }}
        animate={{
          width: "fit-content",
        }}
        transition={{
          duration: 2,
          ease: "linear",
          delay: 1,
        }}>
        <div className="overflow-hidden whitespace-nowrap">{renderWords()}</div>
      </motion.div>
      <motion.span
        initial={{
          opacity: 0,
        }}
        animate={{
          opacity: 1,
        }}
        transition={{
          duration: 0.8,
          repeat: Number.POSITIVE_INFINITY,
          repeatType: "reverse",
        }}
        className={cn(
          "inline-block h-4 w-[2px] bg-emerald-400",
          cursorClassName
        )}
      />
    </div>
  )
}
