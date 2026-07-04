import type { Metadata } from "next"

import "../styles/globals.css"

import Providers from "@/providers"
import { GoogleAnalytics } from "@next/third-parties/google"
import { GeistMono } from "geist/font/mono"
import { GeistSans } from "geist/font/sans"

import { siteMetadata } from "./siteMetadata"

export const metadata: Metadata = siteMetadata

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <Providers>
          {process.env.NODE_ENV === "production" && (
            <>
              <GoogleAnalytics gaId="G-YTJZ290FHZ" />
            </>
          )}
          {children}
        </Providers>
      </body>
    </html>
  )
}
