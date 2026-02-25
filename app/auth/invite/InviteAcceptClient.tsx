"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { acceptInvite } from "@/lib/actions"

export default function InviteAcceptClient({ token }: { token: string }) {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async () => {
    setError(null)
    if (!token) return setError("Invalid invite token")
    if (!password || password.length < 6) return setError("Password must be at least 6 characters")
    if (password !== confirm) return setError("Passwords do not match")
    setLoading(true)
    try {
      const res = await acceptInvite(token, email, password)
      if (!res || !res.success) {
        setError(res?.error || "Failed to accept invite")
        setLoading(false)
        return
      }
      setSuccess(true)
      setLoading(false)
      setTimeout(() => router.push("/auth/login"), 1500)
    } catch (e: any) {
      setError(e?.message || String(e))
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="max-w-md mx-auto py-12">
        <h2 className="text-xl font-semibold mb-4">Invite accepted</h2>
        <p className="text-sm text-muted-foreground mb-4">Your account has been activated. Redirecting to login...</p>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto py-12">
      <h2 className="text-xl font-semibold mb-4">Complete your account</h2>
      <div className="space-y-4">
        <div>
          <Label htmlFor="email">Email (only required if not already set)</Label>
          <Input id="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="password">New password</Label>
          <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="confirm">Confirm password</Label>
          <Input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>
        {error && <div className="text-sm text-destructive">{error}</div>}
        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={loading}>{loading ? "Submitting..." : "Set password"}</Button>
        </div>
      </div>
    </div>
  )
}
