import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return ""
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return ""
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function formatDateRange(start: string | null, end: string | null): string | null {
  if (!start && !end) return null
  if (start && end) return `${formatDate(start)} – ${formatDate(end)}`
  if (start) return `From ${formatDate(start)}`
  return `Until ${formatDate(end)}`
}

/**
 * Format a bug reference string like "V43-001" or "BUG-001"
 */
export function formatBugRef(bugNumber: number | null | undefined, campaignCode: string | null | undefined): string | null {
  if (bugNumber == null) return null
  const prefix = campaignCode || "BUG"
  return `${prefix}-${String(bugNumber).padStart(3, "0")}`
}

/**
 * Build the permalink path for a bug, e.g. "/bugs/V43-001"
 */
export function bugPermalink(bugNumber: number | null | undefined, campaignCode: string | null | undefined): string | null {
  const ref = formatBugRef(bugNumber, campaignCode)
  if (!ref) return null
  return `/bugs/${ref}`
}
