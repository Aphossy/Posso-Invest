"use client"

import * as React from "react"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DateInputProps {
  value?: Date
  onChange?: (date: Date) => void
  placeholder?: string
  className?: string
}

export function DateInput({
  value,
  onChange,
  placeholder = "Pick a date",
  className,
}: DateInputProps) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState(
    value ? format(value, "yyyy-MM-dd") : ""
  )

  React.useEffect(() => {
    if (value) {
      setInputValue(format(value, "yyyy-MM-dd"))
    }
  }, [value])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)

    // Try to parse the date
    const date = new Date(newValue)
    if (!isNaN(date.getTime()) && onChange) {
      onChange(date)
    }
  }

  const handleDateSelect = (date: Date | undefined) => {
    if (date && onChange) {
      onChange(date)
      setOpen(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-[140px] justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className
          )}>
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? format(value, "MMM dd, yyyy") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <div className="p-3">
          <Input
            type="date"
            value={inputValue}
            onChange={handleInputChange}
            className="mb-2"
          />
        </div>
        <Calendar
          mode="single"
          selected={value}
          onSelect={handleDateSelect}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}
