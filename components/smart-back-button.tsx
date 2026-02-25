"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ChevronLeft } from "lucide-react"

interface SmartBackButtonProps {
  fallbackHref: string
  fallbackLabel: string
}

export function SmartBackButton({ fallbackHref, fallbackLabel }: SmartBackButtonProps) {
  const router = useRouter()
  const [canGoBack, setCanGoBack] = useState(false)

  useEffect(() => {
    try {
      const hasHistory = window.history.length > 1
      const hasSameOriginReferrer =
        !!document.referrer && new URL(document.referrer).origin === window.location.origin
      setCanGoBack(hasHistory && hasSameOriginReferrer)
    } catch {
      // invalid referrer URL
    }
  }, [])

  const handleClick = () => {
    if (canGoBack) {
      router.back()
    } else {
      router.push(fallbackHref)
    }
  }

  return (
    <Button variant="ghost" size="sm" onClick={handleClick}>
      <ChevronLeft className="h-4 w-4 mr-1" />
      {canGoBack ? "Back" : fallbackLabel}
    </Button>
  )
}
