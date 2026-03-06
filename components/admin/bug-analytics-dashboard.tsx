"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Bug, AlertCircle, CheckCircle2, Clock, Send } from "lucide-react"
import type { Campaign } from "@/lib/types"
import type { BugsByComponentRow, BugReporterRow } from "@/lib/analytics"

interface BugAnalyticsDashboardProps {
  campaigns: Campaign[]
  selectedCampaignId: string | null
  statusCounts: {
    open: number; reported: number; closed: number; fixed: number
    critical: number; high: number; medium: number; low: number; total: number
  }
  bugsByComponent: BugsByComponentRow[]
  reporters: BugReporterRow[]
}

function SeverityBar({ critical, high, medium, low, total }: {
  critical: number; high: number; medium: number; low: number; total: number
}) {
  if (total === 0) return <span className="text-muted-foreground/40">—</span>
  return (
    <div className="flex gap-0.5 h-5 w-full max-w-[200px] rounded overflow-hidden">
      {critical > 0 && (
        <div
          className="bg-red-500 h-full"
          style={{ width: `${(critical / total) * 100}%` }}
          title={`Critical: ${critical}`}
        />
      )}
      {high > 0 && (
        <div
          className="bg-orange-500 h-full"
          style={{ width: `${(high / total) * 100}%` }}
          title={`High: ${high}`}
        />
      )}
      {medium > 0 && (
        <div
          className="bg-yellow-500 h-full"
          style={{ width: `${(medium / total) * 100}%` }}
          title={`Medium: ${medium}`}
        />
      )}
      {low > 0 && (
        <div
          className="bg-gray-400 h-full"
          style={{ width: `${(low / total) * 100}%` }}
          title={`Low: ${low}`}
        />
      )}
    </div>
  )
}

export function BugAnalyticsDashboard({
  campaigns,
  selectedCampaignId,
  statusCounts,
  bugsByComponent,
  reporters,
}: BugAnalyticsDashboardProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get("tab")
  const activeTab =
    tabParam === "by-component" || tabParam === "reporters"
      ? tabParam
      : "by-component"

  const handleCampaignChange = (id: string) => {
    if (id !== "__all__") {
      document.cookie = `admin_campaign=${id};path=/admin;max-age=${60 * 60 * 24 * 30};samesite=lax`
    }
    const params = new URLSearchParams(searchParams.toString())
    if (id === "__all__") {
      params.delete("campaign")
    } else {
      params.set("campaign", id)
    }
    router.push(`/admin/bug-analytics?${params.toString()}`)
  }

  const handleTabChange = (tab: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("tab", tab)
    router.push(`/admin/bug-analytics?${params.toString()}`)
  }

  return (
    <div className="space-y-6">
      {/* Campaign selector */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">Campaign</span>
        <Select value={selectedCampaignId ?? "__all__"} onValueChange={handleCampaignChange}>
          <SelectTrigger className="w-[300px]">
            <SelectValue placeholder="All campaigns" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Campaigns</SelectItem>
            {campaigns.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.code ? `[${c.code}] ` : ""}{c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Status summary cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500/10">
                <Bug className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Open</p>
                <p className="text-2xl font-bold">{statusCounts.open}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10">
                <Send className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Reported to JIRA</p>
                <p className="text-2xl font-bold">{statusCounts.reported}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fixed</p>
                <p className="text-2xl font-bold">{statusCounts.fixed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-500/10">
                <Clock className="h-5 w-5 text-gray-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Closed</p>
                <p className="text-2xl font-bold">{statusCounts.closed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Severity breakdown */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-6">
            <p className="text-sm font-medium text-muted-foreground">Severity Breakdown</p>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-sm bg-red-500" />
                <span>Critical ({statusCounts.critical})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-sm bg-orange-500" />
                <span>High ({statusCounts.high})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-sm bg-yellow-500" />
                <span>Medium ({statusCounts.medium})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-sm bg-gray-400" />
                <span>Low ({statusCounts.low})</span>
              </div>
            </div>
          </div>
          <div className="mt-3">
            <SeverityBar {...statusCounts} total={statusCounts.total} />
          </div>
          <p className="text-xs text-muted-foreground mt-2">{statusCounts.total} total bugs</p>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="by-component">Bugs by Component</TabsTrigger>
          <TabsTrigger value="reporters">Bug Reporters</TabsTrigger>
        </TabsList>

        {/* Bugs by Component */}
        <TabsContent value="by-component">
          {bugsByComponent.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
              {selectedCampaignId
                ? "No bugs reported for this campaign yet."
                : "Select a campaign to see bugs by component."}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Component</TableHead>
                    <TableHead className="text-center">Total</TableHead>
                    <TableHead className="text-center">Open</TableHead>
                    <TableHead className="text-center">Reported</TableHead>
                    <TableHead className="text-center">Fixed</TableHead>
                    <TableHead className="text-center">Closed</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead className="text-center">Votes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bugsByComponent.map((row) => (
                    <TableRow key={row.component_id}>
                      <TableCell className="font-medium whitespace-normal break-words max-w-[250px]">
                        {row.component_name}
                      </TableCell>
                      <TableCell className="text-center font-medium">{row.total}</TableCell>
                      <TableCell className="text-center">
                        {row.open > 0 ? (
                          <span className="text-orange-600">{row.open}</span>
                        ) : (
                          <span className="text-muted-foreground/40">0</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {row.reported > 0 ? (
                          <span className="text-blue-600">{row.reported}</span>
                        ) : (
                          <span className="text-muted-foreground/40">0</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {row.fixed > 0 ? (
                          <span className="text-green-600">{row.fixed}</span>
                        ) : (
                          <span className="text-muted-foreground/40">0</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {row.closed > 0 ? row.closed : <span className="text-muted-foreground/40">0</span>}
                      </TableCell>
                      <TableCell>
                        <SeverityBar
                          critical={row.critical}
                          high={row.high}
                          medium={row.medium}
                          low={row.low}
                          total={row.total}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        {row.total_votes > 0 ? (
                          <Badge variant="secondary">+{row.total_votes}</Badge>
                        ) : (
                          <span className="text-muted-foreground/40">0</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* Bug Reporters */}
        <TabsContent value="reporters">
          {reporters.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
              No bug reports yet.
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead className="text-center">Bugs Reported</TableHead>
                    <TableHead className="text-center">Votes Received</TableHead>
                    <TableHead className="text-center">Comments Made</TableHead>
                    <TableHead className="text-center">Components Completed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reporters.map((r) => (
                    <TableRow key={r.user_id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{r.display_name || r.username || "—"}</p>
                          {r.organisation && (
                            <p className="text-xs text-muted-foreground">{r.organisation}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-medium">{r.bugs_reported}</TableCell>
                      <TableCell className="text-center">
                        {r.votes_received > 0 ? (
                          <Badge variant="secondary">+{r.votes_received}</Badge>
                        ) : (
                          <span className="text-muted-foreground/40">0</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {r.comments_made > 0 ? r.comments_made : <span className="text-muted-foreground/40">0</span>}
                      </TableCell>
                      <TableCell className="text-center">
                        {r.components_tested > 0 ? r.components_tested : <span className="text-muted-foreground/40">0</span>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
