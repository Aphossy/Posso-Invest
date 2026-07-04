import type { Route } from "next"
import Link from "next/link"
import { ChevronRight } from "lucide-react"

interface BreadcrumbProps {
  items: { label: string; href: string }[]
}

export default function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="flex" aria-label="Breadcrumb">
      <ol className="inline-flex items-center space-x-1 rounded-full bg-black/30 px-4 py-2 md:space-x-3">
        {items.map((item, index) => (
          <li key={item.href} className="inline-flex items-center">
            {index > 0 && (
              <ChevronRight className="mx-2 h-4 w-4 text-indigo-600" />
            )}
            <Link
              href={item.href as Route}
              className={`inline-flex items-center text-sm font-medium ${
                index === items.length - 1
                  ? "text-blue-600"
                  : "text-gray-300 transition-colors duration-200 hover:text-indigo-600"
              }`}>
              {item.label}
            </Link>
          </li>
        ))}
      </ol>
    </nav>
  )
}
