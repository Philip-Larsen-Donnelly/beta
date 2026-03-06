import Link from "next/link"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Bug, Users, FolderOpen, AlertCircle, CheckCircle2, Tags, BarChart3, ClipboardList, FileText, Activity } from "lucide-react"
import { query } from "@/lib/db"

export default async function AdminPage() {
  const { rows: campaignCounts } = await query<{
    total: number
    active: number
  }>(
    `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (
         WHERE (start_date IS NULL OR start_date <= CURRENT_DATE)
           AND (end_date IS NULL OR end_date >= CURRENT_DATE)
       )::int AS active
     FROM campaigns`,
  )
  const activeCampaignsCount = campaignCounts[0]?.active ?? 0

  const { rows: bugCounts } = await query<{ open: number; resolved: number }>(
    `SELECT
       COUNT(*) FILTER (WHERE status IN ('open', 'reported'))::int AS open,
       COUNT(*) FILTER (WHERE status IN ('closed', 'fixed'))::int AS resolved
     FROM bugs`,
  )
  const openBugCount = bugCounts[0]?.open ?? 0
  const resolvedBugCount = bugCounts[0]?.resolved ?? 0

  const { rows: userRows } = await query<{ count: number }>("SELECT COUNT(*)::int AS count FROM profiles")
  const userCount = userRows[0]?.count ?? 0

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">Manage testing campaigns and review bug reports</p>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <FolderOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active Campaigns</p>
              <p className="text-2xl font-bold">{activeCampaignsCount}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500/10">
              <AlertCircle className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Open Bugs</p>
              <p className="text-2xl font-bold">{openBugCount}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Resolved Bugs</p>
              <p className="text-2xl font-bold">{resolvedBugCount}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10">
              <Users className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Registered Users</p>
              <p className="text-2xl font-bold">{userCount || 0}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Configuration</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Link href="/admin/campaigns" className="block">
            <Card className="h-full transition-colors hover:bg-muted/50 cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FolderOpen className="h-5 w-5" />
                  Campaigns
                </CardTitle>
                <CardDescription>
                  Create and configure testing campaigns. Components are managed within each campaign.
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/admin/users" className="block">
            <Card className="h-full transition-colors hover:bg-muted/50 cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Users
                </CardTitle>
                <CardDescription>Manage registered testers. Set admin privileges or remove users.</CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/admin/categories" className="block">
            <Card className="h-full transition-colors hover:bg-muted/50 cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tags className="h-5 w-5" />
                  Component Categories
                </CardTitle>
                <CardDescription>Define and manage categories for components</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Triage</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Link href="/admin/bugs" className="block">
            <Card className="h-full transition-colors hover:bg-muted/50 cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bug className="h-5 w-5" />
                  Bug Reports
                </CardTitle>
                <CardDescription>
                  Review and manage all submitted bugs across campaigns.{" "}
                  {openBugCount > 0 && `${openBugCount} requiring attention.`}
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/admin/progress" className="block">
            <Card className="h-full transition-colors hover:bg-muted/50 cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Testing Progress
                </CardTitle>
                <CardDescription>
                  Per-user and per-component progress tracking with stale work detection.
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Analytics</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Link href="/admin/bug-analytics" className="block">
            <Card className="h-full transition-colors hover:bg-muted/50 cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Bug Analytics
                </CardTitle>
                <CardDescription>
                  Bug distribution, severity breakdown, and reporter activity.
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/admin/testpad-coverage" className="block">
            <Card className="h-full transition-colors hover:bg-muted/50 cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5" />
                  Testpad Coverage
                </CardTitle>
                <CardDescription>
                  Testpad execution rates and pass/fail/blocked results.
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/admin/reports" className="block">
            <Card className="h-full transition-colors hover:bg-muted/50 cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Campaign Reports
                </CardTitle>
                <CardDescription>
                  Campaign summaries with coverage and bug metrics.
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  )
}
