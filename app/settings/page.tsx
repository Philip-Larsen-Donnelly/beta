import { redirect } from "next/navigation"
import { requireProfile } from "@/lib/auth"
import { AppShell } from "@/components/app-shell"
import { ProfileForm } from "@/components/profile-form"
import { ChangePasswordForm } from "@/components/change-password-form"

export default async function SettingsPage() {
  const profile = await requireProfile()
  if (!profile) {
    redirect("/auth/login")
  }

  return (
    <AppShell
      user={{
        id: profile.id,
        email: profile.email || "",
        displayName: profile?.username || profile?.display_name,
      }}
      isAdmin={profile?.is_admin || false}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Profile & Settings</h1>
          <p className="text-muted-foreground">Manage your profile and account settings</p>
        </div>

        <div className="max-w-md space-y-6">
          <ProfileForm
            profile={{
              username: profile.username,
              email: profile.email,
              display_name: profile.display_name,
              organisation: profile.organisation,
            }}
          />
          <ChangePasswordForm />
        </div>
      </div>
    </AppShell>
  )
}
