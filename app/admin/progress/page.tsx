import Link from "next/link"
import { cookies } from "next/headers"
import { query } from "@/lib/db"
import { Button } from "@/components/ui/button"
import { ChevronLeft } from "lucide-react"
import { fetchUserProgress, fetchComponentCoverage, fetchStaleItems, fetchUnresolvedBugs } from "@/lib/analytics"
import { ProgressDashboard } from "@/components/admin/progress-dashboard"
import type { Campaign } from "@/lib/types"

export default async function AdminProgressPage({
  searchParams,
}: {
  searchParams: Promise<{ campaign?: string }>
}) {
  const { campaign: campaignId } = await searchParams
  const cookieStore = await cookies()
  const savedCampaign = cookieStore.get("admin_campaign")?.value

  const { rows: campaigns } = await query<Campaign>(
    "SELECT * FROM campaigns ORDER BY start_date DESC NULLS LAST",
  )

  const explicitId = campaignId || savedCampaign
  const activeCampaign = explicitId
    ? campaigns.find((c) => c.id === explicitId)
    : campaigns.find((c) => {
        const now = new Date()
        const start = c.start_date ? new Date(c.start_date) : null
        const end = c.end_date ? new Date(c.end_date) : null
        return (!start || start <= now) && (!end || end >= now)
      }) ?? campaigns[0]

  const selectedId = activeCampaign?.id

  let userProgress = null
  let componentCoverage = null
  let staleItems = null
  let unresolvedBugs = null

  if (selectedId) {
    ;[userProgress, componentCoverage, staleItems, unresolvedBugs] = await Promise.all([
      fetchUserProgress(selectedId),
      fetchComponentCoverage(selectedId),
      fetchStaleItems(selectedId, 3),
      fetchUnresolvedBugs(selectedId),
    ])
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link href="/admin">
          <Button variant="ghost" size="sm">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Admin Dashboard
          </Button>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Testing Progress</h1>
        <p className="text-muted-foreground">
          Track tester progress, component coverage, and items needing follow-up
        </p>
      </div>

      <ProgressDashboard
        campaigns={campaigns}
        selectedCampaignId={selectedId ?? null}
        userProgress={userProgress ?? []}
        componentCoverage={componentCoverage ?? []}
        staleItems={staleItems ?? []}
        unresolvedBugs={unresolvedBugs ?? []}
      />
    </div>
  )
}
