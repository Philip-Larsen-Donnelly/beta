import { redirect } from "next/navigation"
import { requireProfile } from "@/lib/auth"
import { query } from "@/lib/db"
import { CampaignList } from "@/components/campaign-list"

export default async function TestingPage() {
  const profile = await requireProfile()
  if (!profile) {
    redirect("/auth/login")
  }

  const { rows: campaigns } = await query("SELECT * FROM campaigns ORDER BY start_date ASC NULLS LAST")
  const { rows: components } = await query<{ campaign_id: string | null }>("SELECT campaign_id FROM components")

  const componentCounts: Record<string, number> = {}
  components.forEach((c) => {
    if (c.campaign_id) {
      componentCounts[c.campaign_id] = (componentCounts[c.campaign_id] || 0) + 1
    }
  })

  return <CampaignList campaigns={campaigns || []} componentCounts={componentCounts} />
}
