import { notFound, redirect } from "next/navigation"
import { requireProfile } from "@/lib/auth"
import { query } from "@/lib/db"
import { ComponentDetailView } from "@/components/component-detail-view"
import { fetchResourcesForComponent } from "@/lib/data"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ChevronLeft } from "lucide-react"

export default async function ComponentTestingPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const profile = await requireProfile()
  if (!profile) {
    redirect("/auth/login")
  }

  const isAdmin = profile.is_admin

  const { rows: componentRows } = await query(
    `SELECT c.*, camp.id AS campaign_id, camp.name AS campaign_name
     FROM components c
     LEFT JOIN campaigns camp ON camp.id = c.campaign_id
     WHERE c.id = $1
     LIMIT 1`,
    [id],
  )
  const componentRow = componentRows[0]
  const component = componentRow
    ? {
        ...componentRow,
        campaign: componentRow.campaign_id ? { id: componentRow.campaign_id, name: componentRow.campaign_name } : null,
      }
    : null

  if (!component) {
    notFound()
  }

  // Fetch user's status for this component
  const { rows: userStatusRows } = await query(
    "SELECT * FROM user_component_status WHERE user_id = $1 AND component_id = $2 LIMIT 1",
    [profile.id, id],
  )
  const userStatus = userStatusRows[0] ?? null

  // Get the campaign code for bug references
  const campaignCode = component.campaign
    ? (await query<{ code: string | null }>("SELECT code FROM campaigns WHERE id = $1", [component.campaign.id])).rows[0]?.code ?? null
    : null

  const { rows: bugs } = await query(
    `SELECT b.*,
            (SELECT COUNT(*)::int FROM bug_votes bv WHERE bv.bug_id = b.id) AS vote_count
     FROM bugs b
     WHERE b.component_id = $1
     ORDER BY b.created_at DESC`,
    [id],
  )

  const resources = await fetchResourcesForComponent(id)

  // Fetch profiles for bug authors
  const userIds = [...new Set((bugs || []).map((b) => b.user_id))]
  let profilesMap: Record<string, { display_name: string | null; email: string | null }> = {}

  if (userIds.length > 0) {
    const { rows: profiles } = await query(
      "SELECT id, display_name, email FROM profiles WHERE id = ANY($1::uuid[])",
      [userIds],
    )

    profilesMap = (profiles || []).reduce(
      (acc, p) => {
        acc[p.id] = { display_name: p.display_name, email: p.email }
        return acc
      },
      {} as Record<string, { display_name: string | null; email: string | null }>,
    )
  }

  // Merge bugs with profile data and campaign code
  const bugsWithProfiles = (bugs || []).map((bug) => ({
    ...bug,
    campaign_code: campaignCode,
    profile: profilesMap[bug.user_id] || null,
  }))

  const backLink = component.campaign ? `/testing/campaign/${component.campaign.id}` : "/testing"
  const backLabel = component.campaign ? `Back to ${component.campaign.name}` : "Back to Campaigns"

  return (
    <div className="space-y-6">
      <Link href={backLink}>
        <Button variant="ghost" size="sm">
          <ChevronLeft className="h-4 w-4 mr-1" />
          {backLabel}
        </Button>
      </Link>
      <ComponentDetailView
        component={component}
        userStatus={userStatus}
        bugs={bugsWithProfiles}
        resources={resources}
        userId={profile.id}
        isAdmin={isAdmin}
      />
    </div>
  )
}
