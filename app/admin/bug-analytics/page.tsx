import Link from "next/link"
import { cookies } from "next/headers"
import { query } from "@/lib/db"
import { Button } from "@/components/ui/button"
import { ChevronLeft } from "lucide-react"
import { fetchBugStatusCounts, fetchBugsByComponent, fetchBugReporters } from "@/lib/analytics"
import { BugAnalyticsDashboard } from "@/components/admin/bug-analytics-dashboard"
import type { Campaign } from "@/lib/types"

const ALL_CAMPAIGNS = "__all__"

export default async function AdminBugAnalyticsPage({
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

  const isAllCampaigns = campaignId === ALL_CAMPAIGNS
  const explicitId = isAllCampaigns ? null : (campaignId || savedCampaign)
  const activeCampaign = explicitId
    ? campaigns.find((c) => c.id === explicitId)
    : isAllCampaigns
      ? undefined
      : campaigns.find((c) => {
          const now = new Date()
          const start = c.start_date ? new Date(c.start_date) : null
          const end = c.end_date ? new Date(c.end_date) : null
          return (!start || start <= now) && (!end || end >= now)
        }) ?? campaigns[0]

  const selectedId = isAllCampaigns ? null : (activeCampaign?.id ?? null)

  const [statusCounts, bugsByComponent, reporters] = await Promise.all([
    fetchBugStatusCounts(selectedId),
    selectedId ? fetchBugsByComponent(selectedId) : Promise.resolve([]),
    fetchBugReporters(selectedId),
  ])

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link href="/admin">
          <Button variant="ghost" size="sm">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Admin Dashboard
          </Button>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Bug Analytics</h1>
        <p className="text-muted-foreground">
          Bug distribution, severity breakdown, and reporter activity
        </p>
      </div>

      <BugAnalyticsDashboard
        campaigns={campaigns}
        selectedCampaignId={selectedId}
        statusCounts={statusCounts ?? { open: 0, reported: 0, closed: 0, fixed: 0, critical: 0, high: 0, medium: 0, low: 0, total: 0 }}
        bugsByComponent={bugsByComponent}
        reporters={reporters}
      />
    </div>
  )
}
