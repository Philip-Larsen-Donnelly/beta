import type React from "react"
import { requireProfile } from "@/lib/auth"
import { AppShell } from "@/components/app-shell"
import { query } from "@/lib/db"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BadgeCheck, Bug, CheckCircle2, LayoutGrid } from "lucide-react"

export default async function TestingLayout({
  children,
  searchParams,
}: {
  children: React.ReactNode
  searchParams?: { all_time?: string }
}) {
  const profile = await requireProfile()
  const resolvedSearchParams = await (searchParams ?? Promise.resolve({}))
  const paramScope = (resolvedSearchParams?.scope as string) || (resolvedSearchParams?.all_time === "1" || resolvedSearchParams?.all_time === "true" ? "all" : undefined)

  const { rows: activeCampaigns } = await query<{ id: string }>(
    `SELECT id
     FROM campaigns
     WHERE (start_date IS NULL OR start_date <= CURRENT_DATE)
       AND (end_date IS NULL OR end_date >= CURRENT_DATE)`,
  )
  const activeCampaignIds = activeCampaigns.map((c) => c.id)

  const { rows: components } = await query<{ id: string; campaign_id: string | null }>(
    activeCampaignIds.length
      ? "SELECT id, campaign_id FROM components WHERE campaign_id = ANY($1::uuid[])"
      : "SELECT id, campaign_id FROM components WHERE 1=0",
    activeCampaignIds.length ? [activeCampaignIds] : undefined,
  )

  const componentIds = components.map((c) => c.id)
  // all components ids (for all-time calculations)
  const { rows: allComponents } = await query<{ id: string }>(`SELECT id FROM components`)
  const allComponentIds = allComponents.map((c) => c.id)

  // Determine scope: 'current' (default) or 'all'
  const hasCurrentComponents = componentIds.length > 0
  const scope = paramScope ?? (hasCurrentComponents ? "current" : "all")

  // Query current-scope user statuses
  const { rows: userStatusesCurrent } = await query(
    componentIds.length
      ? "SELECT * FROM user_component_status WHERE user_id = $1 AND component_id = ANY($2::uuid[])"
      : "SELECT * FROM user_component_status WHERE 1=0",
    componentIds.length ? [profile.id, componentIds] : undefined,
  )
  const selectedCountCurrent = userStatusesCurrent.filter((s: any) => s.is_selected).length
  const completedCountCurrent = userStatusesCurrent.filter((s: any) => s.is_selected && s.status === "completed").length
  const percentCompleteCurrent = selectedCountCurrent > 0 ? Math.round((completedCountCurrent / selectedCountCurrent) * 100) : 0

  // Query all-time user statuses
  const { rows: userStatusesAll } = await query(
    allComponentIds.length
      ? "SELECT * FROM user_component_status WHERE user_id = $1 AND component_id = ANY($2::uuid[])"
      : "SELECT * FROM user_component_status WHERE 1=0",
    allComponentIds.length ? [profile.id, allComponentIds] : undefined,
  )
  const selectedCountAll = userStatusesAll.filter((s: any) => s.is_selected).length
  const completedCountAll = userStatusesAll.filter((s: any) => s.is_selected && s.status === "completed").length
  const percentCompleteAll = selectedCountAll > 0 ? Math.round((completedCountAll / selectedCountAll) * 100) : 0
  const pieRadius = 25
  const pieCircumference = 2 * Math.PI * pieRadius

  // bug totals current
  const { rows: bugTotalsCurrent } = await query<{ total: number; mine: number }>(
    componentIds.length
      ? `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE user_id = $2)::int AS mine
         FROM bugs
         WHERE component_id = ANY($1::uuid[])`
      : `SELECT 0::int AS total, 0::int AS mine`,
    componentIds.length ? [componentIds, profile.id] : undefined,
  )
  const bugsReportedCurrent = bugTotalsCurrent[0]?.mine ?? 0
  const bugsPerComponentCurrent = componentIds.length > 0 ? Number(((bugTotalsCurrent[0]?.total ?? 0) / componentIds.length).toFixed(1)) : 0

  // bug totals all-time
  const { rows: bugTotalsAll } = await query<{ total: number; mine: number }>(
    allComponentIds.length
      ? `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE user_id = $2)::int AS mine
         FROM bugs
         WHERE component_id = ANY($1::uuid[])`
      : `SELECT 0::int AS total, 0::int AS mine`,
    allComponentIds.length ? [allComponentIds, profile.id] : undefined,
  )
  const bugsReportedAll = bugTotalsAll[0]?.mine ?? 0
  const bugsPerComponentAll = allComponentIds.length > 0 ? Number(((bugTotalsAll[0]?.total ?? 0) / allComponentIds.length).toFixed(1)) : 0

  // leaderboards: current
  const { rows: leaderboardCurrent } = componentIds.length
    ? await query<{ user_id: string; completed: number }>(
        `SELECT user_id, COUNT(*)::int AS completed
         FROM user_component_status
         WHERE is_selected = true AND status = 'completed' AND component_id = ANY($1::uuid[])
         GROUP BY user_id
         ORDER BY completed DESC, user_id
         LIMIT 5`,
        [componentIds],
      )
    : { rows: [] }
  const badgeRankCurrent = componentIds.length ? leaderboardCurrent.findIndex((row) => row.user_id === profile.id) + 1 || null : null

  // leaderboards: all-time
  const { rows: leaderboardAll } = allComponentIds.length
    ? await query<{ user_id: string; completed: number }>(
        `SELECT user_id, COUNT(*)::int AS completed
         FROM user_component_status
         WHERE is_selected = true AND status = 'completed' AND component_id = ANY($1::uuid[])
         GROUP BY user_id
         ORDER BY completed DESC, user_id
         LIMIT 5`,
        [allComponentIds],
      )
    : { rows: [] }
  const badgeRankAll = allComponentIds.length ? leaderboardAll.findIndex((row) => row.user_id === profile.id) + 1 || null : null

  const { rows: bugLeaderboardCurrent } = componentIds.length
    ? await query<{ user_id: string; reported: number }>(
        `SELECT user_id, COUNT(*)::int AS reported
         FROM bugs
         WHERE component_id = ANY($1::uuid[])
         GROUP BY user_id
         ORDER BY reported DESC, user_id
         LIMIT 5`,
        [componentIds],
      )
    : { rows: [] }
  const bugBadgeRankCurrent = componentIds.length ? bugLeaderboardCurrent.findIndex((row) => row.user_id === profile.id) + 1 || null : null

  const { rows: bugLeaderboardAll } = allComponentIds.length
    ? await query<{ user_id: string; reported: number }>(
        `SELECT user_id, COUNT(*)::int AS reported
         FROM bugs
         WHERE component_id = ANY($1::uuid[])
         GROUP BY user_id
         ORDER BY reported DESC, user_id
         LIMIT 5`,
        [allComponentIds],
      )
    : { rows: [] }
  const bugBadgeRankAll = allComponentIds.length ? bugLeaderboardAll.findIndex((row) => row.user_id === profile.id) + 1 || null : null

  const noActive = componentIds.length === 0
  const hasCurrentStats = selectedCountCurrent > 0 || completedCountCurrent > 0 || bugsReportedCurrent > 0
  const hasAllTimeStats = selectedCountAll > 0 || completedCountAll > 0 || bugsReportedAll > 0
  const hasAnyStats = hasCurrentStats || hasAllTimeStats

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

  const cardDisabledClass = ""
  const selectedCountDisplay = scope === "all" ? selectedCountAll : selectedCountCurrent
  const completedCountDisplay = scope === "all" ? completedCountAll : completedCountCurrent
  const percentCompleteDisplay = scope === "all" ? percentCompleteAll : percentCompleteCurrent
  const bugsReportedDisplay = scope === "all" ? bugsReportedAll : bugsReportedCurrent
  const bugsPerComponentDisplay = scope === "all" ? bugsPerComponentAll : bugsPerComponentCurrent
  const badgeRank = scope === "all" ? badgeRankAll : badgeRankCurrent
  const bugBadgeRank = scope === "all" ? bugBadgeRankAll : bugBadgeRankCurrent
  const pieProgressDisplay = (percent: number) => (percent / 100) * pieCircumference

  return (
    <AppShell user={{ id: profile.id, email: profile.email!, displayName: profile.display_name }} isAdmin={profile.is_admin}>
      <div className="space-y-6">
        {hasAnyStats ? (
          <div className="flex items-start gap-6">
            <div className="flex-1 grid gap-2 md:grid-cols-4">
          <Card className="py-1.5">
            <CardHeader className="py-1.5">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <span className="text-2xl font-bold leading-tight text-foreground">{selectedCountDisplay}</span>
                <span className="flex items-center gap-2">
                  <LayoutGrid className="h-4 w-4 text-muted-foreground" />
                  Components Selected
                </span>
              </CardTitle>
              <CardDescription className="text-xs">Your current selections</CardDescription>
            </CardHeader>
          </Card>

          <Card className="py-1.5 relative">
            {badgeRank && badgeRank > 0 && (
              <div
                className="absolute -top-2 -left-2 rounded-full px-2 py-0.5 text-sm font-semibold shadow border-2 border-white"
                style={{
                  textShadow: "0 1px 1px rgba(0,0,0,0.35)",
                  backgroundImage: `linear-gradient(135deg, ${rankPalette(badgeRank).bgFrom}, ${rankPalette(badgeRank).bgTo})`,
                  color: rankPalette(badgeRank).text,
                  boxShadow: `0 0 0 2px ${rankPalette(badgeRank).ring}, 0 2px 4px rgba(0,0,0,0.25)`,
                }}
                title={`${ordinal(badgeRank)} in the leaderboard`}
              >
                <span className="font-normal">#</span>
                <span className="font-semibold">{badgeRank}</span>
              </div>
            )}
            <CardHeader className="py-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <span className="text-2xl font-bold leading-tight text-foreground">{completedCountDisplay}</span>
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Completed
                  </span>
                </div>
              </div>
              <CardDescription className="text-xs">{`${percentCompleteDisplay}% of selected`}</CardDescription>
            </CardHeader>
            <div className="absolute" style={{ top: "calc(var(--spacing) * 3)", right: "calc(var(--spacing) * 3)", height: "3.5rem", width: "3.5rem" }}>
              <svg width="56" height="56" className="absolute inset-0 rotate-[-90deg]">
                <circle
                  cx="28"
                  cy="28"
                  r={pieRadius}
                  stroke="#d1d5db"
                  strokeWidth="6"
                  fill="none"
                  opacity="0.4"
                />
                <circle
                  cx="28"
                  cy="28"
                  r={pieRadius}
                  stroke="#16a34a"
                  strokeWidth="6"
                  fill="none"
                  strokeDasharray={`${pieCircumference} ${pieCircumference}`}
                  strokeDashoffset={pieCircumference - pieProgressDisplay(percentCompleteDisplay)}
                  strokeLinecap="round"
                />
                <text
                  x="28"
                  y="28"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="rotate-90 text-[10px] fill-foreground"
                  transform="rotate(90 28 28)"
                >
                  {`${percentCompleteDisplay}%`}
                </text>
              </svg>
            </div>
          </Card>

          <Card className="py-1.5 relative">
            {bugBadgeRank && bugBadgeRank > 0 && (
              <div
                className="absolute -top-2 -left-2 rounded-full px-2 py-0.5 text-sm font-semibold shadow border-2 border-white"
                style={{
                  textShadow: "0 1px 1px rgba(0,0,0,0.35)",
                  backgroundImage: `linear-gradient(135deg, ${rankPalette(bugBadgeRank).bgFrom}, ${rankPalette(bugBadgeRank).bgTo})`,
                  color: rankPalette(bugBadgeRank).text,
                  boxShadow: `0 0 0 2px ${rankPalette(bugBadgeRank).ring}, 0 2px 4px rgba(0,0,0,0.25)`,
                }}
                title={`${ordinal(bugBadgeRank)} in the leaderboard`}
              >
                <span className="font-normal">#</span>
                <span className="font-semibold">{bugBadgeRank}</span>
              </div>
            )}
            <CardHeader className="py-1.5">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <span className="text-2xl font-bold leading-tight text-foreground">{bugsReportedDisplay}</span>
                <span className="flex items-center gap-2">
                  <Bug className="h-4 w-4 text-orange-600" />
                  Bugs Reported
                </span>
              </CardTitle>
              <CardDescription className="text-xs">{scope === 'all' ? 'By you (all time)' : 'By you in active campaigns'}</CardDescription>
            </CardHeader>
          </Card>

          <Card className="py-1.5">
            <CardHeader className="py-1.5">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <span className="text-2xl font-bold leading-tight text-foreground">{bugsPerComponentDisplay}</span>
                <span className="flex items-center gap-2">
                  <BadgeCheck className="h-4 w-4 text-blue-600" />
                  Bugs per Component
                </span>
              </CardTitle>
              <CardDescription className="text-xs">{scope === 'all' ? 'Across all components' : 'Across active campaigns'}</CardDescription>
            </CardHeader>
          </Card>
          </div>
        </div>
        ) : null}

      {children}
      </div>
    </AppShell>
  )
}
