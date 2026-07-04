import {
  Geist,
  Geist_Mono,
  Inter,
  JetBrains_Mono,
  Libre_Franklin,
  Poppins,
} from "next/font/google"

export const inter = Inter({
  subsets: ["latin"],
  display: "swap",
})

export const libreFranklin = Libre_Franklin({
  subsets: ["latin"],
  variable: "--font-libre-franklin",
})

export const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
})

export const poppins = Poppins({
  weight: ["400", "600", "700"],
  subsets: ["latin"],
  variable: "--font-poppins",
})

export const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

export const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})
