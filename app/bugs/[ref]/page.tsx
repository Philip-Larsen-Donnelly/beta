import { notFound, redirect } from "next/navigation"
import { requireProfile } from "@/lib/auth"
import { query } from "@/lib/db"
import { BugDetailView } from "@/components/bug-detail-view"
import { SmartBackButton } from "@/components/smart-back-button"

export default async function BugPermalinkPage({
  params,
}: {
  params: Promise<{ ref: string }>
}) {
  const { ref } = await params
  const profile = await requireProfile()
  if (!profile) redirect("/auth/login")

  // Parse ref: "V43-001" → code="V43", number=1
  const match = ref.match(/^(.+)-(\d+)$/i)
  if (!match) notFound()

  const code = match[1].toUpperCase()
  const bugNumber = parseInt(match[2], 10)
  if (isNaN(bugNumber)) notFound()

  // Look up the bug
  let bugRow: Record<string, unknown> | null = null

  if (code === "BUG") {
    // Global / no-campaign bugs
    const { rows } = await query(
      `SELECT b.*,
              c.name AS component_name,
              c.campaign_id AS component_campaign_id,
              camp.code AS campaign_code,
              camp.name AS campaign_name,
              p.display_name AS profile_display_name,
              p.email AS profile_email,
              (SELECT COUNT(*)::int FROM bug_votes bv WHERE bv.bug_id = b.id) AS vote_count
       FROM bugs b
       LEFT JOIN components c ON c.id = b.component_id
       LEFT JOIN campaigns camp ON camp.id = c.campaign_id
       LEFT JOIN profiles p ON p.id = b.user_id
       WHERE b.bug_number = $1
         AND (c.campaign_id IS NULL OR camp.code IS NULL)
       LIMIT 1`,
      [bugNumber],
    )
    bugRow = rows[0] ?? null
  } else {
    // Campaign-scoped bug
    const { rows } = await query(
      `SELECT b.*,
              c.name AS component_name,
              c.campaign_id AS component_campaign_id,
              camp.code AS campaign_code,
              camp.name AS campaign_name,
              p.display_name AS profile_display_name,
              p.email AS profile_email,
              (SELECT COUNT(*)::int FROM bug_votes bv WHERE bv.bug_id = b.id) AS vote_count
       FROM bugs b
       JOIN components c ON c.id = b.component_id
       JOIN campaigns camp ON camp.id = c.campaign_id
       LEFT JOIN profiles p ON p.id = b.user_id
       WHERE b.bug_number = $1
         AND UPPER(camp.code) = $2
       LIMIT 1`,
      [bugNumber, code],
    )
    bugRow = rows[0] ?? null
  }

  if (!bugRow) notFound()

  const bug = {
    id: bugRow.id as string,
    component_id: bugRow.component_id as string,
    user_id: bugRow.user_id as string,
    title: bugRow.title as string,
    description: bugRow.description as string,
    severity: bugRow.severity as string,
    priority: bugRow.priority as string,
    status: bugRow.status as string,
    bug_number: bugRow.bug_number as number | null,
    campaign_code: (bugRow.campaign_code as string | null) ?? null,
    vote_count: bugRow.vote_count as number,
    created_at: bugRow.created_at as string,
    updated_at: bugRow.updated_at as string,
    component_name: (bugRow.component_name as string | null) ?? null,
    campaign_name: (bugRow.campaign_name as string | null) ?? null,
    profile_display_name: (bugRow.profile_display_name as string | null) ?? null,
    profile_email: (bugRow.profile_email as string | null) ?? null,
  }

  return (
    <div className="space-y-6">
      <SmartBackButton fallbackHref="/testing" fallbackLabel="Back to Testing" />

      <BugDetailView
        bug={bug}
        currentUserId={profile.id}
        isAdmin={profile.is_admin}
      />
    </div>
  )
}
