"use client"

import { useCallback, useEffect, useState } from "react"

interface TimeRemaining {
  days: number
  hours: number
  minutes: number
  seconds: number
  totalSeconds: number
  isExpired: boolean
}

interface UseCountdownOptions {
  onExpire?: () => void
  interval?: number
}

export function useCountdown(
  endDate: Date | string,
  options: UseCountdownOptions = {}
) {
  const { onExpire, interval = 1000 } = options

  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    totalSeconds: 0,
    isExpired: false,
  })

  const calculateTimeRemaining = useCallback(() => {
    const now = new Date().getTime()
    const end = new Date(endDate).getTime()
    const difference = end - now

    if (difference <= 0) {
      const expiredState = {
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        totalSeconds: 0,
        isExpired: true,
      }
      setTimeRemaining(expiredState)
      onExpire?.()
      return expiredState
    }

    const days = Math.floor(difference / (1000 * 60 * 60 * 24))
    const hours = Math.floor(
      (difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    )
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((difference % (1000 * 60)) / 1000)
    const totalSeconds = Math.floor(difference / 1000)

    const newState = {
      days,
      hours,
      minutes,
      seconds,
      totalSeconds,
      isExpired: false,
    }

    setTimeRemaining(newState)
    return newState
  }, [endDate, onExpire])

  useEffect(() => {
    calculateTimeRemaining()
    const intervalId = setInterval(calculateTimeRemaining, interval)
    return () => clearInterval(intervalId)
  }, [calculateTimeRemaining, interval])

  return { timeRemaining }
}

export function useAuthCountdown(duration: number) {
  const [seconds, setSeconds] = useState(duration)
  const [isActive, setIsActive] = useState(false)

  const start = (newDuration: number) => {
    setSeconds(newDuration)
    setIsActive(true)
  }

  useEffect(() => {
    if (!isActive || seconds <= 0) return

    const timer = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          setIsActive(false)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [isActive, seconds])

  return { seconds, isActive, start }
}
