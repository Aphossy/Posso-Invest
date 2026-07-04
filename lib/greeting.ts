// C:\Users\user\OneDrive\Desktop\trustlink-group\lib\utils\greeting.ts

export function getDynamicGreeting(): string {
  const now = new Date()
  const hour = now.getHours()
  const day = now.getDay() // 0 = Sunday, 1 = Monday, etc.
  const dayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ]

  // Time-based greetings
  let timeGreeting = ""
  if (hour >= 5 && hour < 12) {
    timeGreeting = "Good Morning"
  } else if (hour >= 12 && hour < 17) {
    timeGreeting = "Good Afternoon"
  } else if (hour >= 17 && hour < 22) {
    timeGreeting = "Good Evening"
  } else {
    timeGreeting = "Good Night"
  }

  // Combine with day for variety
  const greetings = [
    `Happy ${dayNames[day]}`,
    `${timeGreeting}`,
    `Welcome Back`,
    `Great to see you`,
  ]

  // Weight the greeting selection:
  // 40% chance for day greeting, 40% for time greeting, 20% for others
  const random = Math.random()
  if (random < 0.4) {
    return `Happy ${dayNames[day]}`
  } else if (random < 0.8) {
    return timeGreeting + ""
  } else {
    return greetings[Math.floor(Math.random() * 2) + 2] // Welcome Back or Great to see you
  }
}

export function getDashboardSubtitle(): string {
  const subtitles = [
    "Here's what's happening with your trustlink group",
    "Let's see what's new today",
    "Ready to make progress?",
    "Let's get things done!",
  ]

  return subtitles[Math.floor(Math.random() * subtitles.length)]
}
