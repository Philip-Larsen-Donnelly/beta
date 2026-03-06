"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Download } from "lucide-react"
import { formatDate } from "@/lib/utils"
import type { Campaign } from "@/lib/types"
import type { CampaignSummaryRow } from "@/lib/analytics"

interface CampaignReportsDashboardProps {
  campaigns: Campaign[]
  selectedCampaignId: string | null
  summary: CampaignSummaryRow | null
  allSummaries: CampaignSummaryRow[]
}

function SeverityBar({ critical, high, medium, low, total }: {
  critical: number; high: number; medium: number; low: number; total: number
}) {
  if (total === 0) return null
  return (
    <div className="flex gap-0.5 h-4 w-full rounded overflow-hidden">
      {critical > 0 && (
        <div className="bg-red-500 h-full" style={{ width: `${(critical / total) * 100}%` }} title={`Critical: ${critical}`} />
      )}
      {high > 0 && (
        <div className="bg-orange-500 h-full" style={{ width: `${(high / total) * 100}%` }} title={`High: ${high}`} />
      )}
      {medium > 0 && (
        <div className="bg-yellow-500 h-full" style={{ width: `${(medium / total) * 100}%` }} title={`Medium: ${medium}`} />
      )}
      {low > 0 && (
        <div className="bg-gray-400 h-full" style={{ width: `${(low / total) * 100}%` }} title={`Low: ${low}`} />
      )}
    </div>
  )
}

function exportCsv(summaries: CampaignSummaryRow[]) {
  const headers = [
    "Campaign", "Code", "Start Date", "End Date",
    "Components", "Coverage %", "Components Completed", "Multi-Tested",
    "Avg Completions/Component", "Testers", "Selections", "Completed", "Blocked",
    "Total Bugs", "Open", "Reported", "Closed", "Fixed",
    "Critical", "High", "Medium", "Low", "Total Votes",
  ]

  const rows = summaries.map((s) => {
    const coveragePct = s.total_components > 0
      ? Math.round((s.components_completed / s.total_components) * 100)
      : 0
    return [
      `"${s.campaign_name}"`,
      s.campaign_code ?? "",
      s.start_date ?? "",
      s.end_date ?? "",
      s.total_components,
      `${coveragePct}%`,
      s.components_completed,
      s.components_multi_tested,
      s.avg_completions_per_component,
      s.total_testers,
      s.total_selections,
      s.completed_selections,
      s.blocked_selections,
      s.total_bugs,
      s.open_bugs,
      s.reported_bugs,
      s.closed_bugs,
      s.fixed_bugs,
      s.critical_bugs,
      s.high_bugs,
      s.medium_bugs,
      s.low_bugs,
      s.total_votes,
    ].join(",")
  })

  const csv = [headers.join(","), ...rows].join("\n")
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `campaign-reports-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function CampaignReportsDashboard({
  campaigns,
  selectedCampaignId,
  summary: s,
  allSummaries,
}: CampaignReportsDashboardProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleCampaignChange = (id: string) => {
    document.cookie = `admin_campaign=${id};path=/admin;max-age=${60 * 60 * 24 * 30};samesite=lax`
    const params = new URLSearchParams(searchParams.toString())
    params.set("campaign", id)
    router.push(`/admin/reports?${params.toString()}`)
  }

  const coveragePct = s && s.total_components > 0
    ? Math.round((s.components_completed / s.total_components) * 100)
    : 0
  const multiCompletedCount = s ? Math.min(s.components_multi_tested, s.components_completed) : 0
  const singleCompletedCount = s ? Math.max(s.components_completed - multiCompletedCount, 0) : 0
  const inProgressCount = s ? Math.max(s.components_with_testers - s.components_completed, 0) : 0

  return (
    <div className="space-y-6">
      {/* Campaign selector and export */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">Campaign</span>
          <Select value={selectedCampaignId ?? ""} onValueChange={handleCampaignChange}>
            <SelectTrigger className="w-[300px]">
              <SelectValue placeholder="Select a campaign" />
            </SelectTrigger>
            <SelectContent>
              {campaigns.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.code ? `[${c.code}] ` : ""}{c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" size="sm" onClick={() => exportCsv(allSummaries)} disabled={allSummaries.length === 0}>
          <Download className="mr-2 h-4 w-4" />
          Export All (CSV)
        </Button>
      </div>

      {!s ? (
        <p className="text-muted-foreground">Select a campaign to view its report.</p>
      ) : (
        <div className="space-y-6">
          {/* Campaign header */}
          <div className="flex items-center gap-3">
            {s.campaign_code && (
              <Badge variant="outline" className="font-mono">{s.campaign_code}</Badge>
            )}
            {(s.start_date || s.end_date) && (
              <span className="text-sm text-muted-foreground">
                {formatDate(s.start_date)} – {formatDate(s.end_date)}
              </span>
            )}
          </div>

          {/* Coverage progress bar */}
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-muted-foreground">Component Coverage</span>
              <span className="font-medium">{coveragePct}%</span>
            </div>
            {(() => {
              const total = s.total_components || 0
              const singleCompletedPct = total > 0 ? (singleCompletedCount / total) * 100 : 0
              const multiCompletedPct = total > 0 ? (multiCompletedCount / total) * 100 : 0
              const inProgressPct = total > 0 ? (inProgressCount / total) * 100 : 0
              const noTesterCount = Math.max(s.total_components - s.components_with_testers, 0)
              const noTesterPct = total > 0 ? (noTesterCount / total) * 100 : 0

              return (
                <div className="flex gap-0.5 h-4 w-full rounded overflow-hidden bg-primary/10">
                  {multiCompletedPct > 0 && (
                    <div
                      className="h-full bg-green-400 transition-all"
                      title={`Completed by 2+ users: ${multiCompletedCount}`}
                      style={{ width: `${multiCompletedPct}%` }}
                    />
                  )}
                  {singleCompletedPct > 0 && (
                    <div
                      className="h-full bg-green-700 transition-all"
                      title={`Completed by 1 user: ${singleCompletedCount}`}
                      style={{ width: `${singleCompletedPct}%` }}
                    />
                  )}
                  {inProgressPct > 0 && (
                    <div
                      className="h-full bg-blue-400 transition-all"
                      title={`In progress: ${inProgressCount}`}
                      style={{ width: `${inProgressPct}%` }}
                    />
                  )}
                  {noTesterPct > 0 && (
                    <div
                      className="h-full bg-gray-300 dark:bg-gray-700 transition-all"
                      title={`No testers: ${noTesterCount}`}
                      style={{ width: `${noTesterPct}%` }}
                    />
                  )}
                </div>
              )
            })()}
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs">
              {multiCompletedCount > 0 && (
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-sm bg-green-400" />
                  Completed by 2+ users: {multiCompletedCount}
                </span>
              )}
              {singleCompletedCount > 0 && (
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-sm bg-green-700" />
                  Completed by 1 user: {singleCompletedCount}
                </span>
              )}
              {inProgressCount > 0 && (
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-sm bg-blue-400" />
                  In progress: {inProgressCount}
                </span>
              )}
              {s.total_components - s.components_with_testers > 0 && (
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-sm bg-primary/20" />
                  No testers: {s.total_components - s.components_with_testers}
                </span>
              )}
            </div>
          </div>

          {/* Detail grid */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Testing Coverage */}
            <div className="rounded-lg border p-4 space-y-3">
              <p className="text-sm font-medium">Testing Coverage</p>
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell className="py-1 pl-0 text-sm text-muted-foreground">Total components</TableCell>
                    <TableCell className="py-1 pr-0 text-right font-medium">{s.total_components}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="py-1 pl-0 text-sm text-muted-foreground">With testers assigned</TableCell>
                    <TableCell className="py-1 pr-0 text-right font-medium">{s.components_with_testers}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="py-1 pl-0 text-sm text-muted-foreground">Completed (≥1 tester)</TableCell>
                    <TableCell className="py-1 pr-0 text-right">
                      {s.components_completed > 0 ? (
                        <span className="text-green-600 font-medium">{s.components_completed}</span>
                      ) : (
                        "0"
                      )}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="py-1 pl-0 text-sm text-muted-foreground">Multi-tested (≥2 testers)</TableCell>
                    <TableCell className="py-1 pr-0 text-right">
                      {s.components_multi_tested > 0 ? (
                        <span className="text-green-600 font-medium">{s.components_multi_tested}</span>
                      ) : (
                        "0"
                      )}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="py-1 pl-0 text-sm text-muted-foreground">Avg completions / component</TableCell>
                    <TableCell className="py-1 pr-0 text-right font-medium">{Number(s.avg_completions_per_component).toFixed(1)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>

              <div className="border-t pt-3 space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Tester Activity</p>
                <Table>
                  <TableBody>
                    <TableRow>
                      <TableCell className="py-1 pl-0 text-sm text-muted-foreground">Active testers</TableCell>
                      <TableCell className="py-1 pr-0 text-right font-medium">{s.total_testers}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="py-1 pl-0 text-sm text-muted-foreground">Total selections</TableCell>
                      <TableCell className="py-1 pr-0 text-right">{s.total_selections}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="py-1 pl-0 text-sm text-muted-foreground">Completed</TableCell>
                      <TableCell className="py-1 pr-0 text-right">
                        {s.completed_selections > 0 ? (
                          <span className="text-green-600 font-medium">{s.completed_selections}</span>
                        ) : (
                          "0"
                        )}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="py-1 pl-0 text-sm text-muted-foreground">Blocked</TableCell>
                      <TableCell className="py-1 pr-0 text-right">
                        {s.blocked_selections > 0 ? (
                          <span className="text-red-600 font-medium">{s.blocked_selections}</span>
                        ) : (
                          "0"
                        )}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Bug Summary */}
            <div className="rounded-lg border p-4 space-y-3">
              <p className="text-sm font-medium">Bug Summary</p>
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell className="py-1 pl-0 text-sm text-muted-foreground">Total bugs</TableCell>
                    <TableCell className="py-1 pr-0 text-right font-medium">{s.total_bugs}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="py-1 pl-0 text-sm text-muted-foreground">Open</TableCell>
                    <TableCell className="py-1 pr-0 text-right">
                      {s.open_bugs > 0 ? (
                        <span className="text-orange-600 font-medium">{s.open_bugs}</span>
                      ) : (
                        "0"
                      )}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="py-1 pl-0 text-sm text-muted-foreground">Reported to JIRA</TableCell>
                    <TableCell className="py-1 pr-0 text-right">{s.reported_bugs}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="py-1 pl-0 text-sm text-muted-foreground">Fixed</TableCell>
                    <TableCell className="py-1 pr-0 text-right">
                      {s.fixed_bugs > 0 ? (
                        <span className="text-green-600 font-medium">{s.fixed_bugs}</span>
                      ) : (
                        "0"
                      )}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="py-1 pl-0 text-sm text-muted-foreground">Closed</TableCell>
                    <TableCell className="py-1 pr-0 text-right">{s.closed_bugs}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>

              {s.total_bugs > 0 && (
                <div className="border-t pt-3 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Severity Distribution</p>
                  <SeverityBar
                    critical={s.critical_bugs}
                    high={s.high_bugs}
                    medium={s.medium_bugs}
                    low={s.low_bugs}
                    total={s.total_bugs}
                  />
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                    {s.critical_bugs > 0 && (
                      <span className="flex items-center gap-1">
                        <span className="inline-block h-2 w-2 rounded-sm bg-red-500" />
                        Critical: {s.critical_bugs}
                      </span>
                    )}
                    {s.high_bugs > 0 && (
                      <span className="flex items-center gap-1">
                        <span className="inline-block h-2 w-2 rounded-sm bg-orange-500" />
                        High: {s.high_bugs}
                      </span>
                    )}
                    {s.medium_bugs > 0 && (
                      <span className="flex items-center gap-1">
                        <span className="inline-block h-2 w-2 rounded-sm bg-yellow-500" />
                        Medium: {s.medium_bugs}
                      </span>
                    )}
                    {s.low_bugs > 0 && (
                      <span className="flex items-center gap-1">
                        <span className="inline-block h-2 w-2 rounded-sm bg-gray-400" />
                        Low: {s.low_bugs}
                      </span>
                    )}
                  </div>
                  {s.total_votes > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {s.total_votes} vote{s.total_votes !== 1 ? "s" : ""} across all bugs
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
