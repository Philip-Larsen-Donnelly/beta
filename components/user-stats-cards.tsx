import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { query } from "@/lib/db";

function getCompetitionRank(
  rows: Array<{ user_id: string; total: number }>,
  userId: string,
) {
  let lastTotal: number | null = null;
  let currentRank = 0;
  for (const row of rows) {
    if (lastTotal === null || row.total < lastTotal) {
      currentRank += 1;
      lastTotal = row.total;
    }
    if (row.user_id === userId) return currentRank;
  }
  return null;
}

export async function UserStatsCards() {
  const profile = await requireProfile();

  const { rows: activeCampaigns } = await query<{ id: string }>(
    `SELECT id
     FROM campaigns
     WHERE (start_date IS NULL OR start_date <= CURRENT_DATE)
       AND (end_date IS NULL OR end_date >= CURRENT_DATE)`,
  );
  const activeCampaignIds = activeCampaigns.map((c) => c.id);

  const { rows: components } = await query<{
    id: string;
    campaign_id: string | null;
  }>(
    activeCampaignIds.length
      ? "SELECT id, campaign_id FROM components WHERE campaign_id = ANY($1::uuid[])"
      : "SELECT id, campaign_id FROM components WHERE 1=0",
    activeCampaignIds.length ? [activeCampaignIds] : undefined,
  );

  const componentIds = components.map((c) => c.id);

  // all components ids (for all-time calculations)
  const { rows: allComponents } = await query<{ id: string }>(
    `SELECT id FROM components`,
  );
  const allComponentIds = allComponents.map((c) => c.id);

  // Determine scope: 'current' (default) or 'all'
  const hasCurrentComponents = componentIds.length > 0;
  const scope = hasCurrentComponents ? "current" : "all";

  // Query current-scope user statuses
  const { rows: userStatusesCurrent } = await query(
    componentIds.length
      ? "SELECT * FROM user_component_status WHERE user_id = $1 AND component_id = ANY($2::uuid[])"
      : "SELECT * FROM user_component_status WHERE 1=0",
    componentIds.length ? [profile.id, componentIds] : undefined,
  );
  const selectedCountCurrent = userStatusesCurrent.filter(
    (s: any) => s.is_selected,
  ).length;
  const completedCountCurrent = userStatusesCurrent.filter(
    (s: any) => s.is_selected && s.status === "completed",
  ).length;
  const percentCompleteCurrent =
    selectedCountCurrent > 0
      ? Math.round((completedCountCurrent / selectedCountCurrent) * 100)
      : 0;

  // Query all-time user statuses
  const { rows: userStatusesAll } = await query(
    allComponentIds.length
      ? "SELECT * FROM user_component_status WHERE user_id = $1 AND component_id = ANY($2::uuid[])"
      : "SELECT * FROM user_component_status WHERE 1=0",
    allComponentIds.length ? [profile.id, allComponentIds] : undefined,
  );
  const selectedCountAll = userStatusesAll.filter(
    (s: any) => s.is_selected,
  ).length;
  const completedCountAll = userStatusesAll.filter(
    (s: any) => s.is_selected && s.status === "completed",
  ).length;
  const percentCompleteAll =
    selectedCountAll > 0
      ? Math.round((completedCountAll / selectedCountAll) * 100)
      : 0;

  // bug totals current
  const { rows: bugTotalsCurrent } = await query<{
    total: number;
    mine: number;
  }>(
    componentIds.length
      ? `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE user_id = $2)::int AS mine
         FROM bugs
         WHERE component_id = ANY($1::uuid[])`
      : `SELECT 0::int AS total, 0::int AS mine`,
    componentIds.length ? [componentIds, profile.id] : undefined,
  );
  const bugsReportedCurrent = bugTotalsCurrent[0]?.mine ?? 0;
  const bugsPerComponentCurrent =
    componentIds.length > 0
      ? Number(
          ((bugTotalsCurrent[0]?.total ?? 0) / componentIds.length).toFixed(1),
        )
      : 0;

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
  );
  const bugsReportedAll = bugTotalsAll[0]?.mine ?? 0;
  const bugsPerComponentAll =
    allComponentIds.length > 0
      ? Number(
          ((bugTotalsAll[0]?.total ?? 0) / allComponentIds.length).toFixed(1),
        )
      : 0;

  // leaderboards: current
  const { rows: leaderboardCurrent } = componentIds.length
    ? await query<{ user_id: string; completed: number }>(
        `SELECT user_id, COUNT(*)::int AS completed
         FROM user_component_status
         WHERE is_selected = true AND status = 'completed' AND component_id = ANY($1::uuid[])
         GROUP BY user_id
         ORDER BY completed DESC, user_id`,
        [componentIds],
      )
    : { rows: [] };
  const badgeRankCurrent = componentIds.length
    ? getCompetitionRank(
        leaderboardCurrent.map((row) => ({
          user_id: row.user_id,
          total: row.completed,
        })),
        profile.id,
      )
    : null;

  // leaderboards: all-time
  const { rows: leaderboardAll } = allComponentIds.length
    ? await query<{ user_id: string; completed: number }>(
        `SELECT user_id, COUNT(*)::int AS completed
         FROM user_component_status
         WHERE is_selected = true AND status = 'completed' AND component_id = ANY($1::uuid[])
         GROUP BY user_id
         ORDER BY completed DESC, user_id`,
        [allComponentIds],
      )
    : { rows: [] };
  const badgeRankAll = allComponentIds.length
    ? getCompetitionRank(
        leaderboardAll.map((row) => ({
          user_id: row.user_id,
          total: row.completed,
        })),
        profile.id,
      )
    : null;

  const { rows: bugLeaderboardCurrent } = componentIds.length
    ? await query<{ user_id: string; reported: number }>(
        `SELECT user_id, COUNT(*)::int AS reported
         FROM bugs
         WHERE component_id = ANY($1::uuid[])
         GROUP BY user_id
         ORDER BY reported DESC, user_id`,
        [componentIds],
      )
    : { rows: [] };
  const bugBadgeRankCurrent = componentIds.length
    ? getCompetitionRank(
        bugLeaderboardCurrent.map((row) => ({
          user_id: row.user_id,
          total: row.reported,
        })),
        profile.id,
      )
    : null;

  const { rows: bugLeaderboardAll } = allComponentIds.length
    ? await query<{ user_id: string; reported: number }>(
        `SELECT user_id, COUNT(*)::int AS reported
         FROM bugs
         WHERE component_id = ANY($1::uuid[])
         GROUP BY user_id
         ORDER BY reported DESC, user_id`,
        [allComponentIds],
      )
    : { rows: [] };
  const bugBadgeRankAll = allComponentIds.length
    ? getCompetitionRank(
        bugLeaderboardAll.map((row) => ({
          user_id: row.user_id,
          total: row.reported,
        })),
        profile.id,
      )
    : null;

  const hasCurrentStats =
    selectedCountCurrent > 0 ||
    completedCountCurrent > 0 ||
    bugsReportedCurrent > 0;
  const hasAllTimeStats =
    selectedCountAll > 0 || completedCountAll > 0 || bugsReportedAll > 0;
  const hasAnyStats = hasCurrentStats || hasAllTimeStats;

  if (!hasAnyStats) {
    return null;
  }

  const rankPalette = (rank: number) => {
    switch (rank) {
      case 1:
        return {
          bgFrom: "#facc15",
          bgTo: "#d97706",
          ring: "#b45309",
          text: "#ffffff",
        }; // gold
      case 2:
        return {
          bgFrom: "#e5e7eb",
          bgTo: "#4b5563",
          ring: "#374151",
          text: "#ffffff",
        }; // silver
      case 3:
        return {
          bgFrom: "#fb923c",
          bgTo: "#7c2d12",
          ring: "#7c2d12",
          text: "#ffffff",
        }; // bronze
      default:
        return {
          bgFrom: "#e5e7eb",
          bgTo: "#9ca3af",
          ring: "#9ca3af",
          text: "#111827",
        };
    }
  };

  const ordinal = (n: number) => {
    const v = n % 100;
    if (v >= 11 && v <= 13) return `${n}th`;
    switch (n % 10) {
      case 1:
        return `${n}st`;
      case 2:
        return `${n}nd`;
      case 3:
        return `${n}rd`;
      default:
        return `${n}th`;
    }
  };

  const selectedCountDisplay =
    scope === "all" ? selectedCountAll : selectedCountCurrent;
  const completedCountDisplay =
    scope === "all" ? completedCountAll : completedCountCurrent;
  const percentCompleteDisplay =
    scope === "all" ? percentCompleteAll : percentCompleteCurrent;
  const bugsReportedDisplay =
    scope === "all" ? bugsReportedAll : bugsReportedCurrent;
  const bugsPerComponentDisplay =
    scope === "all" ? bugsPerComponentAll : bugsPerComponentCurrent;
  const badgeRank = scope === "all" ? badgeRankAll : badgeRankCurrent;
  const bugBadgeRank = scope === "all" ? bugBadgeRankAll : bugBadgeRankCurrent;

  return (
    <div className="w-52 shrink-0 rounded-lg border bg-card divide-y">
      <div className="px-3 py-2 bg-muted/50">
        <p className="text-xs font-medium">My Stats</p>
      </div>

      <div className="px-3 py-2">
        <p className="text-xs text-muted-foreground">Components selected</p>
        <p className="text-2xl font-semibold leading-tight">
          {selectedCountDisplay}
        </p>
      </div>

      <div className="px-3 py-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Completed components</p>
          <span className="text-xs text-green-600">
            {percentCompleteDisplay}%
          </span>
        </div>
        <div className="flex items-center gap-2">
          <p className="text-2xl font-semibold leading-tight">
            {completedCountDisplay}
          </p>
          {badgeRank && badgeRank > 0 && badgeRank <= 10 && (
            <Link
              href="/leaderboard"
              className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold hover:opacity-80 transition-opacity"
              style={{
                backgroundImage: `linear-gradient(135deg, ${rankPalette(badgeRank).bgFrom}, ${rankPalette(badgeRank).bgTo})`,
                color: rankPalette(badgeRank).text,
              }}
              title={`${ordinal(badgeRank)} in the leaderboard`}
            >
              {ordinal(badgeRank)} position!
            </Link>
          )}
        </div>
      </div>

      <div className="px-3 py-2">
        <p className="text-xs text-muted-foreground">Bugs Reported</p>
        <div className="flex items-center gap-2">
          <p className="text-2xl font-semibold leading-tight">
            {bugsReportedDisplay}
          </p>
          {bugBadgeRank && bugBadgeRank > 0 && bugBadgeRank <= 10 && (
            <Link
              href="/leaderboard"
              className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold hover:opacity-80 transition-opacity"
              style={{
                backgroundImage: `linear-gradient(135deg, ${rankPalette(bugBadgeRank).bgFrom}, ${rankPalette(bugBadgeRank).bgTo})`,
                color: rankPalette(bugBadgeRank).text,
              }}
              title={`${ordinal(bugBadgeRank)} in the leaderboard`}
            >
              {ordinal(bugBadgeRank)} position!
            </Link>
          )}
        </div>
      </div>

      <div className="px-3 py-2">
        <p className="text-xs text-muted-foreground">Bugs per Component</p>
        <p className="text-2xl font-semibold leading-tight">
          {bugsPerComponentDisplay}
        </p>
      </div>
    </div>
  );
}
