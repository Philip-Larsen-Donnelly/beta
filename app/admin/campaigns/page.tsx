import { query } from "@/lib/db"
import { AdminCampaignList } from "@/components/admin/campaign-list"

export default async function AdminCampaignsPage() {
  const { rows: campaigns } = await query("SELECT * FROM campaigns ORDER BY start_date ASC NULLS LAST")
  const { rows: components } = await query<{ campaign_id: string | null }>("SELECT campaign_id FROM components")

  const componentCounts: Record<string, number> = {}
  components.forEach((c) => {
    if (c.campaign_id) {
      componentCounts[c.campaign_id] = (componentCounts[c.campaign_id] || 0) + 1
    }
  })

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Manage Campaigns</h1>
        <p className="text-muted-foreground">Create and configure testing campaigns</p>
      </div>

      <AdminCampaignList campaigns={campaigns || []} componentCounts={componentCounts} />
    </div>
  )
}
