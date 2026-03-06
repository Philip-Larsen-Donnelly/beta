import Link from "next/link"
import { cookies } from "next/headers"
import { query } from "@/lib/db"
import { Button } from "@/components/ui/button"
import { ChevronLeft } from "lucide-react"
import { fetchTestpadCoverage, fetchUserTestpadProgress } from "@/lib/analytics"
import { TestpadCoverageDashboard } from "@/components/admin/testpad-coverage-dashboard"
import type { Campaign } from "@/lib/types"

export default async function AdminTestpadCoveragePage({
  searchParams,
}: {
  searchParams: { campaign?: string }
}) {
  const { campaign: campaignId } = searchParams
  const cookieStore = cookies()
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

  let testpadCoverage = null
  let userTestpadProgress = null

  if (selectedId) {
    ;[testpadCoverage, userTestpadProgress] = await Promise.all([
      fetchTestpadCoverage(selectedId),
      fetchUserTestpadProgress(selectedId),
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
        <h1 className="text-2xl font-bold tracking-tight">Testpad Coverage</h1>
        <p className="text-muted-foreground">
          Track testpad execution rates and results across testers
        </p>
      </div>

      <TestpadCoverageDashboard
        campaigns={campaigns}
        selectedCampaignId={selectedId}
        testpadCoverage={testpadCoverage ?? []}
        userTestpadProgress={userTestpadProgress ?? []}
      />
    </div>
  )
}
