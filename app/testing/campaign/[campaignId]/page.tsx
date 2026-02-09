import { redirect, notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { query } from "@/lib/db";
import {
  fetchCategories,
  fetchCategoryMappingsForComponents,
} from "@/lib/data";
import { ComponentList } from "@/components/component-list";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MarkdownContent } from "@/components/markdown-content";
import { formatDateRange } from "@/lib/utils";

export interface ComponentStats {
  statusCounts: Record<string, Record<string, number>>;
  bugCounts: Record<string, { open: number; closed: number }>;
  myBugCounts: Record<string, number>;
}

export default async function CampaignTestingPage({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId } = await params;
  const profile = await requireProfile();
  if (!profile) {
    redirect("/auth/login");
  }

  // Fetch campaign
  const { rows: campaignRows } = await query(
    "SELECT * FROM campaigns WHERE id = $1 LIMIT 1",
    [campaignId],
  );
  const campaign = campaignRows[0];

  if (!campaign) {
    notFound();
  }

  // Fetch components for this campaign
  const { rows: components } = await query(
    "SELECT * FROM components WHERE campaign_id = $1 ORDER BY display_order ASC",
    [campaignId],
  );

  const categories = await fetchCategories();
  const componentIds = components?.map((c) => c.id) || [];
  const categoryMappings =
    await fetchCategoryMappingsForComponents(componentIds);
  const categoryMap: Record<string, string[]> = {};
  categoryMappings.forEach((m) => {
    if (!categoryMap[m.component_id]) categoryMap[m.component_id] = [];
    categoryMap[m.component_id].push(m.category_id);
  });

  const { rows: statuses } = await query(
    "SELECT * FROM user_component_status WHERE user_id = $1",
    [profile.id],
  );

  const { rows: allStatuses } = componentIds.length
    ? await query(
        "SELECT component_id, status, is_selected FROM user_component_status WHERE is_selected = true AND component_id = ANY($1::uuid[])",
        [componentIds],
      )
    : { rows: [] };

  const { rows: allBugs } = componentIds.length
    ? await query(
        "SELECT component_id, status FROM bugs WHERE component_id = ANY($1::uuid[])",
        [componentIds],
      )
    : { rows: [] };

  const { rows: myBugs } = componentIds.length
    ? await query(
        "SELECT component_id FROM bugs WHERE component_id = ANY($1::uuid[]) AND user_id = $2",
        [componentIds, profile.id],
      )
    : { rows: [] };

  const statusCounts: Record<string, Record<string, number>> = {};
  allStatuses?.forEach((s) => {
    if (!statusCounts[s.component_id]) {
      statusCounts[s.component_id] = {
        not_started: 0,
        in_progress: 0,
        completed: 0,
        blocked: 0,
      };
    }
    statusCounts[s.component_id][s.status] =
      (statusCounts[s.component_id][s.status] || 0) + 1;
  });

  const bugCounts: Record<string, { open: number; closed: number }> = {};
  allBugs?.forEach((b) => {
    if (!bugCounts[b.component_id]) {
      bugCounts[b.component_id] = { open: 0, closed: 0 };
    }
    if (b.status === "open" || b.status === "reported") {
      bugCounts[b.component_id].open += 1;
    } else {
      bugCounts[b.component_id].closed += 1;
    }
  });

  const myBugCounts: Record<string, number> = {};
  myBugs?.forEach((b) => {
    myBugCounts[b.component_id] = (myBugCounts[b.component_id] || 0) + 1;
  });

  const stats: ComponentStats = { statusCounts, bugCounts, myBugCounts };

  return (
    <div className="space-y-10">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Link href="/testing">
            <Button variant="ghost" size="sm">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to Campaigns
            </Button>
          </Link>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">{campaign.name}</h1>
        {campaign.description && (
          <p className="text-muted-foreground">{campaign.description}</p>
        )}
        {formatDateRange(campaign.start_date, campaign.end_date) && (
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {formatDateRange(campaign.start_date, campaign.end_date)}
          </p>
        )}
      </div>

      {campaign.details && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Campaign Details</CardTitle>
          </CardHeader>
          <CardContent>
            <MarkdownContent content={campaign.details} />
          </CardContent>
        </Card>
      )}

      <ComponentList
        components={components || []}
        statuses={statuses || []}
        userId={profile.id}
        stats={stats}
        isAdmin={profile.is_admin}
        categories={categories}
        categoryMap={categoryMap}
      />
    </div>
  );
}
