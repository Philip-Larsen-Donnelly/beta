import { query } from "@/lib/db"
import { AdminUserList } from "@/components/admin/user-list"
import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default async function AdminUsersPage() {
  let users = []
  let error = null

  try {
    const { rows } = await query("SELECT * FROM profiles ORDER BY created_at DESC")
    users = rows || []
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load data"
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Manage Users</h1>
          <p className="text-muted-foreground">
            View and manage registered testers. Set admin privileges or remove users.
          </p>
        </div>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
          <AlertTriangle className="mx-auto h-10 w-10 text-destructive mb-3" />
          <h2 className="text-lg font-semibold mb-1">Failed to load users</h2>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <Button asChild variant="outline">
            <Link href="/admin/users">Try Again</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Manage Users</h1>
        <p className="text-muted-foreground">
          View and manage registered testers. Set admin privileges or remove users.
        </p>
      </div>

      <AdminUserList users={users} />
    </div>
  )
}
