// components\auth\animated-form-field.tsx
"use client"

import { AnimatePresence, motion } from "framer-motion"

import { fieldVariants, messageVariants } from "@/lib/animations"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PhoneInput } from "@/components/ui/phone-input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface AnimatedFormFieldProps {
  id: string
  label: string
  type?: string
  value: string
  onChange: (value: string) => void
  error?: string
  placeholder?: string
  required?: boolean
  className?: string
  delay?: number
}

export function AnimatedFormField({
  id,
  label,
  type = "text",
  value,
  onChange,
  error,
  placeholder,
  required = false,
  className = "",
  delay = 0,
}: AnimatedFormFieldProps) {
  return (
    <motion.div
      className={className}
      variants={fieldVariants}
      initial="initial"
      animate="animate"
      transition={{ delay }}>
      <motion.div whileHover={{ x: 2 }} transition={{ duration: 0.2 }}>
        <Label
          htmlFor={id}
          className="text-sm font-medium"
          style={{ color: "#605D5E" }}>
          {label}
          {required && "*"}
        </Label>
      </motion.div>

      <motion.div
        className="mt-1"
        animate={error ? "error" : "animate"}
        variants={fieldVariants}>
        <Input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="border-gray-300 text-sm placeholder:text-sm transition-all duration-200 focus:border-primary focus:ring-primary"
          style={{ backgroundColor: "#F0F0F0", color: "#605D5E" }}
          placeholder={placeholder}
          required={required}
        />
      </motion.div>

      <AnimatePresence mode="wait">
        {error && (
          <motion.p
            className="mt-1 text-xs text-red-500"
            variants={messageVariants}
            initial="initial"
            animate="animate"
            exit="exit">
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

interface AnimatedSelectFieldProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  placeholder?: string
  required?: boolean
  className?: string
  delay?: number
  options: string[]
}

export function AnimatedSelectField({
  id,
  label,
  value,
  onChange,
  error,
  placeholder = "Select a district",
  required = false,
  className = "",
  delay = 0,
  options,
}: AnimatedSelectFieldProps) {
  return (
    <motion.div
      className={className}
      variants={fieldVariants}
      initial="initial"
      animate="animate"
      transition={{ delay }}>
      <motion.div whileHover={{ x: 2 }} transition={{ duration: 0.2 }}>
        <Label
          htmlFor={id}
          className="text-sm font-medium"
          style={{ color: "#605D5E" }}>
          {label}
          {required && "*"}
        </Label>
      </motion.div>

      <motion.div
        className="mt-1"
        animate={error ? "error" : "animate"}
        variants={fieldVariants}>
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger
            className="border-gray-300 focus:border-primary focus:ring-primary w-full"
            style={{ backgroundColor: "#F0F0F0", color: "#605D5E" }}>
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </motion.div>

      <AnimatePresence mode="wait">
        {error && (
          <motion.p
            className="mt-1 text-xs text-red-500"
            variants={messageVariants}
            initial="initial"
            animate="animate"
            exit="exit">
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

interface AnimatedPhoneFieldProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  placeholder?: string
  required?: boolean
  className?: string
  delay?: number
}

export function AnimatedPhoneField({
  id,
  label,
  value,
  onChange,
  error,
  placeholder,
  required = false,
  className = "",
  delay = 0,
}: AnimatedPhoneFieldProps) {
  return (
    <motion.div
      className={className}
      variants={fieldVariants}
      initial="initial"
      animate="animate"
      transition={{ delay }}>
      <motion.div whileHover={{ x: 2 }} transition={{ duration: 0.2 }}>
        <Label
          htmlFor={id}
          className="text-sm  font-medium"
          style={{ color: "#605D5E" }}>
          {label}
          {required && "*"}
        </Label>
      </motion.div>

      <motion.div
        className="mt-1"
        animate={error ? "error" : "animate"}
        variants={fieldVariants}>
        <PhoneInput
          defaultCountry="RW"
          international={true}
          value={value}
          onChange={(val) => onChange(val || "")}
          placeholder={placeholder || "Enter your phone number"}
          className="w-full text-sm placeholder:text-sm  flex"
        />
      </motion.div>

      <AnimatePresence mode="wait">
        {error && (
          <motion.p
            className="mt-1 text-xs text-red-500"
            variants={messageVariants}
            initial="initial"
            animate="animate"
            exit="exit">
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
