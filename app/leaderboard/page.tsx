import { query } from "@/lib/db";
import { requireProfile } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { CheckCircle2, Bug } from "lucide-react";

type LeaderboardRow = {
  user_id: string;
  name: string;
  total: number;
};

type RankedLeaderboardRow = LeaderboardRow & {
  rank: number;
};

function withCompetitionRank(rows: LeaderboardRow[]): RankedLeaderboardRow[] {
  let lastTotal: number | null = null;
  let currentRank = 0;
  return rows.map((row) => {
    if (lastTotal === null || row.total < lastTotal) {
      currentRank += 1;
      lastTotal = row.total;
    }
    return { ...row, rank: currentRank };
  });
}

function rankRowStyle(rank: number): React.CSSProperties | undefined {
  if (rank === 1) {
    return {
      backgroundImage: "linear-gradient(135deg, #facc15, #d97706)",
      color: "#ffffff",
    };
  }
  if (rank === 2) {
    return {
      backgroundImage: "linear-gradient(135deg, #e5e7eb, #4b5563)",
      color: "#ffffff",
    };
  }
  if (rank === 3) {
    return {
      backgroundImage: "linear-gradient(135deg, #fb923c, #7c2d12)",
      color: "#ffffff",
    };
  }
  return undefined;
}

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams?: { campaign?: string };
}) {
  const profile = await requireProfile();

  // components for currently active campaigns (used as default)
  const { rows: activeComponentIds } = await query<{ id: string }>(
    `SELECT comp.id
     FROM components comp
     JOIN campaigns c ON c.id = comp.campaign_id
     WHERE (c.start_date IS NULL OR c.start_date <= CURRENT_DATE)
       AND (c.end_date IS NULL OR c.end_date >= CURRENT_DATE)`,
  );

  // all campaigns for the selector
  const { rows: campaigns } = await query<{
    id: string;
    name: string | null;
    start_date: string | null;
    end_date: string | null;
  }>(
    `SELECT id, name, start_date, end_date FROM campaigns ORDER BY start_date DESC NULLS LAST`,
  );

  const resolvedSearchParams = await (searchParams ?? Promise.resolve({}));
  const selectedCampaign =
    (resolvedSearchParams?.campaign as string) || "active";

  let componentIds: string[] = [];
  if (selectedCampaign === "active") {
    componentIds = activeComponentIds.map((c) => c.id);
  } else if (selectedCampaign === "all") {
    const { rows: allComponents } = await query<{ id: string }>(
      `SELECT id FROM components`,
    );
    componentIds = allComponents.map((c) => c.id);
  } else {
    // specific campaign id
    const { rows: campaignComponents } = await query<{ id: string }>(
      `SELECT id FROM components WHERE campaign_id = $1`,
      [selectedCampaign],
    );
    componentIds = campaignComponents.map((c) => c.id);
  }

  const campaignName = campaigns.find((c) => c.id === selectedCampaign)?.name;
  const headerLabel =
    selectedCampaign === "active"
      ? "active campaigns"
      : selectedCampaign === "all"
        ? "all campaigns"
        : (campaignName ?? "selected campaign");
  const cardSubLabel =
    selectedCampaign === "active"
      ? "In active campaigns"
      : selectedCampaign === "all"
        ? "Across all campaigns"
        : `In ${campaignName ?? "this campaign"}`;

  const { rows: completedLeaderboard } = componentIds.length
    ? await query<LeaderboardRow>(
        `SELECT u.user_id, COALESCE(p.display_name, p.username, p.email, 'Unknown') AS name, COUNT(*)::int AS total
         FROM user_component_status u
         JOIN profiles p ON p.id = u.user_id
         WHERE u.is_selected = true AND u.status = 'completed' AND u.component_id = ANY($1::uuid[])
         GROUP BY u.user_id, p.display_name, p.username, p.email
         ORDER BY total DESC, name ASC`,
        [componentIds],
      )
    : { rows: [] };

  const { rows: bugLeaderboard } = componentIds.length
    ? await query<LeaderboardRow>(
        `SELECT b.user_id, COALESCE(p.display_name, p.username, p.email, 'Unknown') AS name, COUNT(*)::int AS total
         FROM bugs b
         JOIN profiles p ON p.id = b.user_id
         WHERE b.component_id = ANY($1::uuid[])
         GROUP BY b.user_id, p.display_name, p.username, p.email
         ORDER BY total DESC, name ASC`,
        [componentIds],
      )
    : { rows: [] };

  const rankedCompletedLeaderboard = withCompetitionRank(completedLeaderboard);
  const rankedBugLeaderboard = withCompetitionRank(bugLeaderboard);

  const topCompleted = rankedCompletedLeaderboard[0];
  const topBugs = rankedBugLeaderboard[0];
  const topCompletedLeaders = topCompleted
    ? rankedCompletedLeaderboard.filter((row) => row.total === topCompleted.total)
    : [];
  const topBugLeaders = topBugs
    ? rankedBugLeaderboard.filter((row) => row.total === topBugs.total)
    : [];

  const formatLeaderNames = (rows: RankedLeaderboardRow[]) => {
    const names = rows.map((row) => row.name);
    if (names.length <= 3) return names.join(", ");
    return `${names.slice(0, 3).join(", ")} +${names.length - 3} others`;
  };

  const renderTable = (rows: RankedLeaderboardRow[], label: string) => (
    <div className="rounded-lg border bg-card">
      <div className="px-4 py-3 border-b">
        <h3 className="text-sm font-medium">{label}</h3>
      </div>
      <div className="divide-y">
        {rows.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No data yet
          </div>
        ) : (
          rows.map((row, idx) => (
            <div
              key={row.user_id}
              className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/50"
              style={rankRowStyle(row.rank)}
            >
              <span className="w-6 text-xs font-medium">{row.rank}</span>
              <span
                className={`flex-1 text-sm truncate ${
                  idx === 0 ? "font-medium" : ""
                }`}
              >
                {row.name}
              </span>
              <span
                className={`text-sm tabular-nums ${idx === 0 ? "font-semibold" : ""}`}
              >
                {row.total}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <AppShell
      user={{
        id: profile.id,
        email: profile.email!,
        displayName: profile.display_name,
      }}
      isAdmin={profile.is_admin}
    >
      <div className="space-y-8">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight">Leaderboard</h1>
            <p className="text-sm text-muted-foreground">
              Top contributors for {headerLabel}
            </p>
          </div>
          <form method="get" className="flex items-center gap-2">
            <select
              name="campaign"
              defaultValue={selectedCampaign}
              className="h-8 rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="active">Active campaigns</option>
              <option value="all">All campaigns</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name ?? c.id}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="h-8 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Apply
            </button>
          </form>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="group relative overflow-hidden rounded-lg border bg-gradient-to-br from-amber-50 to-orange-50 p-5 dark:from-amber-950/20 dark:to-orange-950/20">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-amber-900/70 dark:text-amber-200/70">
                  {topCompletedLeaders.length > 1 ? "Top Testers (Joint 1st)" : "Top Tester"}
                </p>
                <p className="text-2xl font-semibold tracking-tight text-amber-950 dark:text-amber-50">
                  {topCompleted ? formatLeaderNames(topCompletedLeaders) : "—"}
                </p>
                {topCompleted && (
                  <p className="text-sm text-amber-800/60 dark:text-amber-300/60">
                    {topCompleted.total} components completed
                  </p>
                )}
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10 dark:bg-amber-400/10">
                <CheckCircle2 className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            {topCompleted && (
              <p className="mt-3 text-xs text-amber-700/50 dark:text-amber-400/50">
                {cardSubLabel}
              </p>
            )}
          </div>

          <div className="group relative overflow-hidden rounded-lg border bg-gradient-to-br from-sky-50 to-blue-50 p-5 dark:from-sky-950/20 dark:to-blue-950/20">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-sky-900/70 dark:text-sky-200/70">
                  {topBugLeaders.length > 1 ? "Top Bug Hunters (Joint 1st)" : "Top Bug Hunter"}
                </p>
                <p className="text-2xl font-semibold tracking-tight text-sky-950 dark:text-sky-50">
                  {topBugs ? formatLeaderNames(topBugLeaders) : "—"}
                </p>
                {topBugs && (
                  <p className="text-sm text-sky-800/60 dark:text-sky-300/60">
                    {topBugs.total} bugs reported
                  </p>
                )}
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-500/10 dark:bg-sky-400/10">
                <Bug className="h-5 w-5 text-sky-600 dark:text-sky-400" />
              </div>
            </div>
            {topBugs && (
              <p className="mt-3 text-xs text-sky-700/50 dark:text-sky-400/50">
                {cardSubLabel}
              </p>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {renderTable(rankedCompletedLeaderboard, "Component coverage")}
          {renderTable(rankedBugLeaderboard, "Bugs reported")}
        </div>
      </div>
    </AppShell>
  );
}
