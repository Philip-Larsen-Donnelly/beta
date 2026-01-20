import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Bug, CheckCircle2 } from "lucide-react"
import { query } from "@/lib/db"
import { requireProfile } from "@/lib/auth"
import { AppShell } from "@/components/app-shell"

type LeaderboardRow = {
  user_id: string
  name: string
  total: number
}

const rankPalette = (rank: number) => {
  switch (rank) {
    case 1:
      return {
        bgFrom: "#facc15",
        bgTo: "#d97706",
        ring: "#b45309",
        text: "#ffffff",
      } // gold
    case 2:
      return {
        bgFrom: "#e5e7eb",
        bgTo: "#4b5563",
        ring: "#374151",
        text: "#ffffff",
      } // silver
    case 3:
      return {
        bgFrom: "#f59e0b",
        bgTo: "#92400e",
        ring: "#78350f",
        text: "#ffffff",
      } // bronze
    case 4:
      return {
        bgFrom: "#93c5fd",
        bgTo: "#1e3a8a",
        ring: "#1d4ed8",
        text: "#ffffff",
      } // blue
    case 5:
      return {
        bgFrom: "#c4b5fd",
        bgTo: "#5b21b6",
        ring: "#4c1d95",
        text: "#ffffff",
      } // purple
    default:
      return {
        bgFrom: "#fbbf24",
        bgTo: "#b45309",
        ring: "#92400e",
        text: "#ffffff",
      }
  }
}

const ordinal = (n: number) => {
  const v = n % 100
  if (v >= 11 && v <= 13) return `${n}th`
  switch (n % 10) {
    case 1:
      return `${n}st`
    case 2:
      return `${n}nd`
    case 3:
      return `${n}rd`
    default:
      return `${n}th`
  }
}

function RankBadge({ rank }: { rank: number }) {
  const palette = rankPalette(rank)
  return (
    <span
      className="inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold border-2 border-white shadow"
      style={{
        backgroundImage: `linear-gradient(135deg, ${palette.bgFrom}, ${palette.bgTo})`,
        color: palette.text,
        boxShadow: `0 0 0 2px ${palette.ring}, 0 2px 4px rgba(0,0,0,0.25)`,
        textShadow: "0 1px 1px rgba(0,0,0,0.35)",
      }}
      title={`${ordinal(rank)} place`}
    >
      #{rank}
    </span>
  )
}

export default async function LeaderboardPage({ searchParams }: { searchParams?: { campaign?: string } }) {
  const profile = await requireProfile()

  // components for currently active campaigns (used as default)
  const { rows: activeComponentIds } = await query<{ id: string }>(
    `SELECT comp.id
     FROM components comp
     JOIN campaigns c ON c.id = comp.campaign_id
     WHERE (c.start_date IS NULL OR c.start_date <= CURRENT_DATE)
       AND (c.end_date IS NULL OR c.end_date >= CURRENT_DATE)`,
  )

  // all campaigns for the selector
  const { rows: campaigns } = await query<{ id: string; name: string | null; start_date: string | null; end_date: string | null }>(
    `SELECT id, name, start_date, end_date FROM campaigns ORDER BY start_date DESC NULLS LAST`,
  )

  const resolvedSearchParams = await (searchParams ?? Promise.resolve({}))
  const selectedCampaign = (resolvedSearchParams?.campaign as string) || "active"

  let componentIds: string[] = []
  if (selectedCampaign === "active") {
    componentIds = activeComponentIds.map((c) => c.id)
  } else if (selectedCampaign === "all") {
    const { rows: allComponents } = await query<{ id: string }>(`SELECT id FROM components`)
    componentIds = allComponents.map((c) => c.id)
  } else {
    // specific campaign id
    const { rows: campaignComponents } = await query<{ id: string }>(`SELECT id FROM components WHERE campaign_id = $1`, [selectedCampaign])
    componentIds = campaignComponents.map((c) => c.id)
  }

  const campaignName = campaigns.find((c) => c.id === selectedCampaign)?.name
  const headerLabel = selectedCampaign === "active" ? "active campaigns" : selectedCampaign === "all" ? "all campaigns" : campaignName ?? "selected campaign"
  const cardSubLabel = selectedCampaign === "active" ? "In active campaigns" : selectedCampaign === "all" ? "Across all campaigns" : `In ${campaignName ?? "this campaign"}`

  const { rows: completedLeaderboard } = componentIds.length
    ? await query<LeaderboardRow>(
        `SELECT u.user_id, COALESCE(p.display_name, p.username, p.email, 'Unknown') AS name, COUNT(*)::int AS total
         FROM user_component_status u
         JOIN profiles p ON p.id = u.user_id
         WHERE u.is_selected = true AND u.status = 'completed' AND u.component_id = ANY($1::uuid[])
         GROUP BY u.user_id, p.display_name, p.username, p.email
         ORDER BY total DESC, name ASC
         LIMIT 10`,
        [componentIds],
      )
    : { rows: [] }

  const { rows: bugLeaderboard } = componentIds.length
    ? await query<LeaderboardRow>(
        `SELECT b.user_id, COALESCE(p.display_name, p.username, p.email, 'Unknown') AS name, COUNT(*)::int AS total
         FROM bugs b
         JOIN profiles p ON p.id = b.user_id
         WHERE b.component_id = ANY($1::uuid[])
         GROUP BY b.user_id, p.display_name, p.username, p.email
         ORDER BY total DESC, name ASC
         LIMIT 10`,
        [componentIds],
      )
    : { rows: [] }

  const topCompleted = completedLeaderboard[0]
  const topBugs = bugLeaderboard[0]

  const renderTable = (rows: LeaderboardRow[], label: string) => (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">{label}</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="w-16 pb-2">Rank</th>
              <th className="w-24 pb-2">Total</th>
              <th className="pb-2">User</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-4 text-muted-foreground">
                  No data yet.
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => (
                <tr key={row.user_id}>
                  <td className="py-2">
                    {idx + 1 <= 5 ? <RankBadge rank={idx + 1} /> : <span className="text-muted-foreground">#{idx + 1}</span>}
                  </td>
                  <td className="py-2 font-semibold">{row.total}</td>
                  <td className="py-2">{row.name}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </CardContent>
    </Card>
  )

  return (
    <AppShell user={{ id: profile.id, email: profile.email!, displayName: profile.display_name }} isAdmin={profile.is_admin}>
      <div className="space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">Leaderboard</h1>
            <p className="text-muted-foreground">
              Top contributors across {headerLabel}, for components tested and bugs raised.
            </p>
          </div>
          <div className="ml-auto">
            <form method="get" className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground">Campaign</label>
              <select name="campaign" defaultValue={selectedCampaign} className="rounded border px-2 py-1">
                <option value="active">Active campaigns</option>
                <option value="all">All campaigns</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>{c.name ?? c.id}</option>
                ))}
              </select>
              <button type="submit" className="ml-2 rounded bg-primary px-3 py-1 text-sm text-white">Apply</button>
            </form>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="relative overflow-hidden border-2 border-orange-300 bg-gradient-to-br from-amber-200 via-orange-400 to-amber-600 shadow-xl text-white gap-3">
            <div className="pointer-events-none absolute right-4 top-4 h-20 w-20 rounded-full bg-orange-300/40 blur-3xl" />
            <CardHeader className="pb-1 space-y-0">
              <CardTitle className="text-xl font-semibold text-white text-shadow-strong">
                Most Components Tested: {topCompleted ? topCompleted.total : 0}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="text-4xl font-black leading-tight text-white text-shadow-strong">
                  {topCompleted ? topCompleted.name : "No data yet"}
                </div>
                <div className="text-sm uppercase tracking-wide text-white/85 text-shadow-strong">
                  {cardSubLabel}
                </div>
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm">
                <CheckCircle2 className="h-9 w-9 text-white drop-shadow" />
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-2 border-sky-300 bg-gradient-to-br from-sky-200 via-sky-400 to-blue-700 shadow-xl text-white gap-3">
            <div className="pointer-events-none absolute right-4 top-4 h-20 w-20 rounded-full bg-sky-300/40 blur-3xl" />
            <CardHeader className="pb-1 space-y-0">
              <CardTitle className="text-xl font-semibold text-white text-shadow-strong">
                Most Valid Bugs Raised: {topBugs ? topBugs.total : 0}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="text-4xl font-black leading-tight text-white text-shadow-strong">
                  {topBugs ? topBugs.name : "No data yet"}
                </div>
                <div className="text-sm uppercase tracking-wide text-white/85 text-shadow-strong">
                  {cardSubLabel}
                </div>
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm">
                <Bug className="h-9 w-9 text-white drop-shadow" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {renderTable(
            completedLeaderboard.map((row, idx) => ({ ...row, total: row.total })),
            "Top Ten Users for Component Coverage",
          )}
          {renderTable(
            bugLeaderboard.map((row, idx) => ({ ...row, total: row.total })),
            "Top Ten Users for Bugs Raised",
          )}
        </div>
      </div>
    </AppShell>
  )
}

