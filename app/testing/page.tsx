import { redirect } from "next/navigation"
import { requireProfile } from "@/lib/auth"
import { query } from "@/lib/db"
import { CampaignList } from "@/components/campaign-list"
import { UserStatsCards } from "@/components/user-stats-cards"
import { MyBugsTable } from "@/components/my-bugs-table"

export default async function TestingPage() {
  const profile = await requireProfile()
  if (!profile) {
    redirect("/auth/login")
  }

  const { rows: campaigns } = await query("SELECT * FROM campaigns ORDER BY start_date ASC NULLS LAST")
  const [{ rows: components }, { rows: allBugs }] = await Promise.all([
    query<{ campaign_id: string | null }>("SELECT campaign_id FROM components"),
    query(
      `SELECT b.*,
              c.name AS component_name,
              camp.name AS campaign_name,
              camp.code AS campaign_code,
              p.display_name AS profile_display_name,
              p.email AS profile_email,
              (SELECT COUNT(*)::int FROM bug_votes bv WHERE bv.bug_id = b.id) AS vote_count,
              COALESCE(comment_stats.comment_count, 0) AS comment_count,
              GREATEST(
                b.updated_at,
                COALESCE(comment_stats.last_comment_activity_at, b.updated_at)
              ) AS last_activity_at
       FROM bugs b
       LEFT JOIN components c ON c.id = b.component_id
       LEFT JOIN campaigns camp ON camp.id = c.campaign_id
       LEFT JOIN profiles p ON p.id = b.user_id
       LEFT JOIN LATERAL (
         SELECT
           COUNT(*)::int AS comment_count,
           MAX(COALESCE(bc.updated_at, bc.created_at)) AS last_comment_activity_at
         FROM bug_comments bc
         WHERE bc.bug_id = b.id
           AND bc.deleted_at IS NULL
       ) comment_stats ON TRUE
       ORDER BY last_activity_at DESC`,
    ),
  ])

  const componentCounts: Record<string, number> = {}
  components.forEach((c: { campaign_id: string | null }) => {
    if (c.campaign_id) {
      componentCounts[c.campaign_id] = (componentCounts[c.campaign_id] || 0) + 1
    }
  })

  return (
    <div className="space-y-6">
      <div className="flex gap-6 items-start">
        <div className="flex-1 min-w-0">
          <CampaignList
            campaigns={campaigns || []}
            componentCounts={componentCounts}
          />
        </div>
        <UserStatsCards />
      </div>
      <MyBugsTable bugs={allBugs || []} currentUserId={profile.id} isAdmin={profile.is_admin} />
    </div>
  )
}
