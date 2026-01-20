import type React from "react"
import { requireAdmin } from "@/lib/auth"
import { AppShell } from "@/components/app-shell"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const profile = await requireAdmin()

  return (
    <AppShell user={{ id: profile.id, email: profile.email!, displayName: profile.display_name }} isAdmin={true}>
      {children}
    </AppShell>
  )
}
