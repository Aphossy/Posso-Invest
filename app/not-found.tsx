"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, HelpCircle, Home } from "lucide-react"

export default function NotFound() {
  const router = useRouter()

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0a0f1a] text-white">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute left-1/2 top-1/2 h-[500px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-b from-emerald-500/10 to-transparent blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-md px-6 py-24 text-center">
        {/* Big 404 */}
        <p className="bg-gradient-to-b from-white/20 to-white/5 bg-clip-text text-[120px] font-bold leading-none tabular-nums text-transparent sm:text-[160px]">
          404
        </p>

        <h1 className="mt-2 text-2xl font-bold tracking-tight text-white/90">
          Page not found
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-white/45">
          The page you are looking for does not exist or may have moved. Check
          the URL, or use one of the links below.
        </p>

        {/* Actions */}
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-slate-900 transition hover:-translate-y-0.5 hover:bg-white/90 sm:w-auto">
            <Home className="h-4 w-4" />
            Go to Home
          </Link>
          <button
            onClick={() => router.back()}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/20 bg-white/5 px-6 py-2.5 text-sm font-semibold text-white/80 transition hover:-translate-y-0.5 hover:border-white/35 sm:w-auto">
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </button>
        </div>

        {/* Helpful links */}
        <div className="mt-10 border-t border-white/8 pt-8">
          <p className="mb-4 text-xs text-white/30">Helpful links</p>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-white/40">
            <Link href="/contact" className="transition hover:text-white/70">
              Contact
            </Link>
            <span>·</span>
            <Link href="/login" className="transition hover:text-white/70">
              Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
