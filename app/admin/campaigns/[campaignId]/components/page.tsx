import { notFound } from "next/navigation"
import { query } from "@/lib/db"
import { fetchCategories, fetchCategoryMappingsForComponents } from "@/lib/data"
import { AdminComponentList } from "@/components/admin/component-list"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ChevronLeft } from "lucide-react"
import type { Campaign } from "@/lib/types"

export default async function AdminCampaignComponentsPage({
  params,
}: {
  params: Promise<{ campaignId: string }>
}) {
  const { campaignId } = await params

  const { rows: campaignRows } = await query("SELECT * FROM campaigns WHERE id = $1 LIMIT 1", [campaignId])
  const campaign = campaignRows[0]

  if (!campaign) {
    notFound()
  }

  const { rows: components } = await query(
    "SELECT * FROM components WHERE campaign_id = $1 ORDER BY display_order ASC",
    [campaignId],
  )

  const { rows: categories } = await query("SELECT * FROM component_categories ORDER BY name ASC")

  const componentIds = components.map((c) => c.id)
  const mappings = await fetchCategoryMappingsForComponents(componentIds)
  const categoryMap: Record<string, string[]> = {}
  mappings.forEach((m) => {
    if (!categoryMap[m.component_id]) categoryMap[m.component_id] = []
    categoryMap[m.component_id].push(m.category_id)
  })

  const { rows: allCampaigns } = await query("SELECT * FROM campaigns ORDER BY start_date ASC NULLS LAST")

  // Filter out current campaign for copy destinations
  const otherCampaigns = (allCampaigns || []).filter((c: Campaign) => c.id !== campaignId)

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link href="/admin/campaigns">
          <Button variant="ghost" size="sm">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Campaigns
          </Button>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">{campaign.name} - Components</h1>
        <p className="text-muted-foreground">Manage components for this campaign</p>
      </div>

      <AdminComponentList
        components={components || []}
        campaignId={campaignId}
        otherCampaigns={otherCampaigns}
        categories={categories || []}
        categoryMap={categoryMap}
      />
    </div>
  )
}
