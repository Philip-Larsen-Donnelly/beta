import Link from "next/link"
import { cookies } from "next/headers"
import { query } from "@/lib/db"
import { Button } from "@/components/ui/button"
import { ChevronLeft } from "lucide-react"
import { fetchCampaignSummaries } from "@/lib/analytics"
import { CampaignReportsDashboard } from "@/components/admin/campaign-reports-dashboard"
import type { Campaign } from "@/lib/types"

export default async function AdminReportsPage({
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

  const selectedId = activeCampaign?.id ?? null

  const summaries = await fetchCampaignSummaries()
  const selectedSummary = selectedId
    ? summaries.find((s) => s.campaign_id === selectedId) ?? null
    : null

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link href="/admin">
          <Button variant="ghost" size="sm">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Admin Dashboard
          </Button>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Campaign Reports</h1>
        <p className="text-muted-foreground">
          Campaign overview with coverage and bug metrics
        </p>
      </div>

      <CampaignReportsDashboard
        campaigns={campaigns}
        selectedCampaignId={selectedId}
        summary={selectedSummary}
        allSummaries={summaries}
      />
    </div>
  )
}
