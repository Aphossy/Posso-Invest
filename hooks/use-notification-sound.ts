import { useCallback, useEffect, useRef } from "react"

interface UseNotificationSoundOptions {
  enabled?: boolean
  volume?: number
}

/**
 * Hook to play notification sounds
 * Usage:
 * const { play } = useNotificationSound({ enabled: true, volume: 0.5 })
 * play() // Play notification sound
 */
export function useNotificationSound(
  options: UseNotificationSoundOptions = {}
) {
  const { enabled = true, volume = 0.5 } = options
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    // Create audio element with a simple notification sound
    // You can replace this with your own sound file
    audioRef.current = new Audio()
    audioRef.current.volume = volume

    // Optional: Preload a sound file
    // audioRef.current.src = '/sounds/notification.mp3'
    // audioRef.current.load()

    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [volume])

  const play = useCallback(() => {
    if (!enabled || !audioRef.current) return

    // Create a simple beep sound using Web Audio API
    const audioContext = new (
      window.AudioContext || (window as any).webkitAudioContext
    )()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    oscillator.frequency.value = 800 // Frequency in Hz
    oscillator.type = "sine"

    gainNode.gain.setValueAtTime(volume, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      audioContext.currentTime + 0.3
    )

    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.3)

    // Cleanup
    setTimeout(() => {
      try {
        audioContext.close()
      } catch (e) {
        // Ignore errors
      }
    }, 500)
  }, [enabled, volume])

  const playCustom = useCallback(
    (soundUrl: string) => {
      if (!enabled || !audioRef.current) return

      audioRef.current.src = soundUrl
      audioRef.current.load()
      audioRef.current.play().catch((error) => {
        console.error("Error playing notification sound:", error)
      })
    },
    [enabled]
  )

  return { play, playCustom }
}
