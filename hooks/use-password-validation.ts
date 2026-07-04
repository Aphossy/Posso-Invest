"use client"

import { useCallback, useState } from "react"

export interface PasswordStrength {
  score: number
  feedback: string
  color: string
  isStrong: boolean
  requirements: {
    length: boolean
    uppercase: boolean
    lowercase: boolean
    number: boolean
    special: boolean
  }
}

export function usePasswordValidation() {
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({
    score: 0,
    feedback: "",
    color: "gray",
    isStrong: false,
    requirements: {
      length: false,
      uppercase: false,
      lowercase: false,
      number: false,
      special: false,
    },
  })

  const validatePassword = useCallback((password: string): PasswordStrength => {
    const requirements = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[^a-zA-Z0-9]/.test(password),
    }

    const score = Object.values(requirements).filter(Boolean).length
    let feedback = ""
    let color = "gray"
    let isStrong = false

    switch (score) {
      case 0:
      case 1:
        feedback = "Very weak"
        color = "red"
        break
      case 2:
        feedback = "Weak"
        color = "orange"
        break
      case 3:
        feedback = "Fair"
        color = "yellow"
        break
      case 4:
        feedback = "Good"
        color = "blue"
        isStrong = score >= 4 // At least 4 requirements met
        break
      case 5:
        feedback = "Strong"
        color = "green"
        isStrong = true
        break
    }

    const strength = {
      score,
      feedback,
      color,
      isStrong,
      requirements,
    }

    setPasswordStrength(strength)
    return strength
  }, [])

  return {
    passwordStrength,
    validatePassword,
  }
}
