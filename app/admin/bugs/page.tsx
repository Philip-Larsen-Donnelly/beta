import { query } from "@/lib/db"
import { requireProfile } from "@/lib/auth"
import { AdminBugList } from "@/components/admin/bug-list"
import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default async function AdminBugsPage() {
  const profile = await requireProfile()
  let bugs = []
  let components = []
  let campaigns = []
  let error = null

  try {
    const [bugsResult, componentsResult, campaignsResult] = await Promise.all([
      query(
        `SELECT b.*,
                c.name AS component_name,
                c.campaign_id AS component_campaign_id,
                camp.name AS campaign_name,
                p.display_name AS profile_display_name,
                p.email AS profile_email,
                (SELECT COUNT(*)::int FROM bug_votes bv WHERE bv.bug_id = b.id) AS vote_count
         FROM bugs b
         LEFT JOIN components c ON c.id = b.component_id
         LEFT JOIN campaigns camp ON camp.id = c.campaign_id
         LEFT JOIN profiles p ON p.id = b.user_id
         ORDER BY b.created_at DESC`,
      ),
      query(
        `SELECT c.id, c.name, c.campaign_id, camp.name AS campaign_name
         FROM components c
         LEFT JOIN campaigns camp ON camp.id = c.campaign_id
         ORDER BY c.name`,
      ),
      query("SELECT id, name, start_date, end_date FROM campaigns ORDER BY start_date ASC NULLS LAST"),
    ])

    bugs =
      bugsResult.rows?.map((b) => ({
        ...b,
        component: b.component_id
          ? { name: b.component_name, campaign_id: b.component_campaign_id, campaign: { name: b.campaign_name } }
          : null,
        profile:
          b.profile_display_name !== null || b.profile_email !== null
            ? { display_name: b.profile_display_name, email: b.profile_email }
            : null,
      })) || []
    components =
      componentsResult.rows?.map((c) => ({
        id: c.id,
        name: c.name,
        campaign_id: c.campaign_id,
        campaign: c.campaign_name ? { name: c.campaign_name } : null,
      })) || []
    campaigns = campaignsResult.rows || []
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load data"
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">All Bug Reports</h1>
          <p className="text-muted-foreground">View and manage all submitted bugs across campaigns</p>
        </div>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
          <AlertTriangle className="mx-auto h-10 w-10 text-destructive mb-3" />
          <h2 className="text-lg font-semibold mb-1">Failed to load bugs</h2>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <Button asChild variant="outline">
            <Link href="/admin/bugs">Try Again</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">All Bug Reports</h1>
        <p className="text-muted-foreground">View and manage all submitted bugs across campaigns</p>
      </div>

      <AdminBugList
        bugs={bugs}
        components={components}
        campaigns={campaigns}
        currentUserId={profile.id}
      />
    </div>
  )
}
