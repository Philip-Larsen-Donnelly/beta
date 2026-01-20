import type React from "react"
import { requireProfile } from "@/lib/auth"
import { AppShell } from "@/components/app-shell"

export default async function GuidelinesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const profile = await requireProfile()

  return (
    <AppShell user={{ id: profile.id, email: profile.email!, displayName: profile.display_name }} isAdmin={profile.is_admin}>
      {children}
    </AppShell>
  )
}
