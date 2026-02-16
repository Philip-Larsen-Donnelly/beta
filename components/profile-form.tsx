"use client"

import type React from "react"
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { updateOwnProfile } from "@/lib/actions"
import { User, CheckCircle } from "lucide-react"

interface ProfileFormProps {
  profile: {
    username: string | null
    email: string | null
    display_name: string | null
    organisation: string | null
  }
}

export function ProfileForm({ profile }: ProfileFormProps) {
  const [email, setEmail] = useState(profile.email ?? "")
  const [displayName, setDisplayName] = useState(profile.display_name ?? "")
  const [organisation, setOrganisation] = useState(profile.organisation ?? "")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess(false)

    if (!email.trim()) {
      setError("Email is required")
      return
    }

    setIsLoading(true)
    const result = await updateOwnProfile({
      email: email.trim(),
      display_name: displayName.trim(),
      organisation: organisation.trim(),
    })

    if (!result.success) {
      setError(result.error || "Failed to update profile")
      setIsLoading(false)
      return
    }

    setSuccess(true)
    setIsLoading(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Profile
        </CardTitle>
        <CardDescription>Update your personal information</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={profile.username ?? ""}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">Username cannot be changed</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => {
                setDisplayName(e.target.value)
                setSuccess(false)
              }}
              placeholder="How your name appears to others"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setSuccess(false)
              }}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="organisation">
              Organisation <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Input
              id="organisation"
              value={organisation}
              onChange={(e) => {
                setOrganisation(e.target.value)
                setSuccess(false)
              }}
              placeholder="Your company or organisation"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          {success && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle className="h-4 w-4" />
              Profile updated successfully
            </div>
          )}

          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Saving..." : "Save Profile"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
