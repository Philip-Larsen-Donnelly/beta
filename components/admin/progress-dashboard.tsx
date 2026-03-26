"use client"

import { useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Layers, AlertTriangle, Clock, Bug } from "lucide-react"
import type { Campaign } from "@/lib/types"
import type {
  UserProgressRow,
  ComponentCoverageRow,
  StaleItem,
  UnresolvedBugRow,
} from "@/lib/analytics"
import { formatBugRef, formatCompactDateTime } from "@/lib/utils"

interface ProgressDashboardProps {
  campaigns: Campaign[]
  selectedCampaignId: string | null
  userProgress: UserProgressRow[]
  componentCoverage: ComponentCoverageRow[]
  staleItems: StaleItem[]
  unresolvedBugs: UnresolvedBugRow[]
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    not_started: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    in_progress: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    blocked: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
    completed: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  }
  const labels: Record<string, string> = {
    not_started: "Not Started",
    in_progress: "In Progress",
    blocked: "Blocked",
    completed: "Completed",
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${variants[status] || ""}`}>
      {labels[status] || status}
    </span>
  )
}

function SeverityBadge({ severity }: { severity: string }) {
  const variants: Record<string, string> = {
    critical: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
    high: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
    medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
    low: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${variants[severity] || ""}`}>
      {severity}
    </span>
  )
}

export function ProgressDashboard({
  campaigns,
  selectedCampaignId,
  userProgress,
  componentCoverage,
  staleItems,
  unresolvedBugs,
}: ProgressDashboardProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get("tab")
  const activeTab =
    tabParam === "users" || tabParam === "components" || tabParam === "stale" || tabParam === "bugs"
      ? tabParam
      : "users"

  const handleCampaignChange = (id: string) => {
    document.cookie = `admin_campaign=${id};path=/admin;max-age=${60 * 60 * 24 * 30};samesite=lax`
    const params = new URLSearchParams(searchParams.toString())
    params.set("campaign", id)
    router.push(`/admin/progress?${params.toString()}`)
  }

  const handleTabChange = (tab: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("tab", tab)
    router.push(`/admin/progress?${params.toString()}`)
  }

  const staleUsers = useMemo(() => {
    const grouped = new Map<string, {
      user_id: string
      display_name: string | null
      username: string | null
      organisation: string | null
      last_campaign_activity: string
      days_inactive: number
      total_selected: number
      completed: number
      components: { component_id: string; component_name: string; status: string; status_updated_at: string; days_since_status_update: number }[]
    }>()
    for (const item of staleItems) {
      let user = grouped.get(item.user_id)
      if (!user) {
        user = {
          user_id: item.user_id,
          display_name: item.display_name,
          username: item.username,
          organisation: item.organisation,
          last_campaign_activity: item.last_campaign_activity,
          days_inactive: item.days_inactive,
          total_selected: item.total_selected,
          completed: item.completed,
          components: [],
        }
        grouped.set(item.user_id, user)
      }
      user.components.push({
        component_id: item.component_id,
        component_name: item.component_name,
        status: item.status,
        status_updated_at: item.status_updated_at,
        days_since_status_update: item.days_since_status_update,
      })
    }
    return Array.from(grouped.values())
  }, [staleItems])

  const totalTesters = userProgress.length
  const totalComponents = componentCoverage.length
  const componentsWithNoTesters = componentCoverage.filter((c) => c.testers_assigned === 0).length
  const overallCompleted = userProgress.reduce((s, u) => s + u.completed, 0)
  const overallTotal = userProgress.reduce((s, u) => s + u.selected, 0)
  const overallPct = overallTotal > 0 ? Math.round((overallCompleted / overallTotal) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Campaign selector */}
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

      {!selectedCampaignId ? (
        <p className="text-muted-foreground">Select a campaign to view progress.</p>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10">
                    <Users className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Active Testers</p>
                    <p className="text-2xl font-bold">{totalTesters}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/10">
                    <Layers className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Components</p>
                    <p className="text-2xl font-bold">{totalComponents}</p>
                    {componentsWithNoTesters > 0 && (
                      <p className="text-xs text-orange-500">{componentsWithNoTesters} with no testers</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10">
                    <Layers className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Completion Rate</p>
                    <p className="text-2xl font-bold">{overallPct}%</p>
                  </div>
                </div>
                <Progress value={overallPct} className="mt-3" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500/10">
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Needs Follow-up</p>
                    <p className="text-2xl font-bold">{staleUsers.length + unresolvedBugs.length}</p>
                    <p className="text-xs text-muted-foreground">
                      {staleUsers.length} inactive user{staleUsers.length !== 1 ? "s" : ""} · {unresolvedBugs.length} unresolved bugs
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList>
              <TabsTrigger value="users">Per-User Progress</TabsTrigger>
              <TabsTrigger value="components">Per-Component Coverage</TabsTrigger>
              <TabsTrigger value="stale">
                Inactive Users
                {staleUsers.length > 0 && (
                  <Badge variant="destructive" className="ml-1.5 h-5 px-1.5 text-xs">
                    {staleUsers.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="bugs">
                Unresolved Bugs
                {unresolvedBugs.length > 0 && (
                  <Badge variant="destructive" className="ml-1.5 h-5 px-1.5 text-xs">
                    {unresolvedBugs.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Per-User Progress */}
            <TabsContent value="users">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead className="text-center">Selected</TableHead>
                      <TableHead className="text-center">Not Started</TableHead>
                      <TableHead className="text-center">In Progress</TableHead>
                      <TableHead className="text-center">Completed</TableHead>
                      <TableHead className="text-center">Blocked</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead className="text-center">Bugs</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userProgress.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                          No testers have selected components in this campaign yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      userProgress.map((u) => {
                        const pct = u.selected > 0 ? Math.round((u.completed / u.selected) * 100) : 0
                        return (
                          <TableRow key={u.user_id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{u.display_name || u.username || "—"}</p>
                                {u.organisation && (
                                  <p className="text-xs text-muted-foreground">{u.organisation}</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">{u.selected}</TableCell>
                            <TableCell className="text-center">
                              {u.not_started > 0 ? (
                                <span className="text-gray-500">{u.not_started}</span>
                              ) : (
                                <span className="text-muted-foreground/40">0</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {u.in_progress > 0 ? (
                                <span className="text-blue-600">{u.in_progress}</span>
                              ) : (
                                <span className="text-muted-foreground/40">0</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {u.completed > 0 ? (
                                <span className="text-green-600 font-medium">{u.completed}</span>
                              ) : (
                                <span className="text-muted-foreground/40">0</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {u.blocked > 0 ? (
                                <span className="text-red-600 font-medium">{u.blocked}</span>
                              ) : (
                                <span className="text-muted-foreground/40">0</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2 min-w-[120px]">
                                <Progress value={pct} className="flex-1" />
                                <span className="text-xs text-muted-foreground w-8 text-right">{pct}%</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              {u.bugs_reported > 0 ? (
                                <Badge variant="secondary">{u.bugs_reported}</Badge>
                              ) : (
                                <span className="text-muted-foreground/40">0</span>
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* Per-Component Coverage */}
            <TabsContent value="components">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Component</TableHead>
                      <TableHead className="text-center">Testers</TableHead>
                      <TableHead className="text-center">Not Started</TableHead>
                      <TableHead className="text-center">In Progress</TableHead>
                      <TableHead className="text-center">Completed</TableHead>
                      <TableHead className="text-center">Blocked</TableHead>
                      <TableHead className="text-center">Bugs</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {componentCoverage.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                          No components in this campaign.
                        </TableCell>
                      </TableRow>
                    ) : (
                      componentCoverage.map((c) => (
                        <TableRow
                          key={c.component_id}
                          className={c.testers_assigned === 0 ? "bg-orange-50/50 dark:bg-orange-950/10" : undefined}
                        >
                          <TableCell className="font-medium whitespace-normal break-words max-w-[300px]">
                            {c.component_name}
                            {c.testers_assigned === 0 && (
                              <span className="ml-2 text-xs text-orange-500">No testers</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">{c.testers_assigned}</TableCell>
                          <TableCell className="text-center">
                            {c.not_started > 0 ? c.not_started : <span className="text-muted-foreground/40">0</span>}
                          </TableCell>
                          <TableCell className="text-center">
                            {c.in_progress > 0 ? (
                              <span className="text-blue-600">{c.in_progress}</span>
                            ) : (
                              <span className="text-muted-foreground/40">0</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {c.completed > 0 ? (
                              <span className="text-green-600 font-medium">{c.completed}</span>
                            ) : (
                              <span className="text-muted-foreground/40">0</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {c.blocked > 0 ? (
                              <span className="text-red-600 font-medium">{c.blocked}</span>
                            ) : (
                              <span className="text-muted-foreground/40">0</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {c.bugs_found > 0 ? (
                              <Badge variant="secondary">{c.bugs_found}</Badge>
                            ) : (
                              <span className="text-muted-foreground/40">0</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* Inactive Users */}
            <TabsContent value="stale">
              {staleUsers.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                  <Clock className="mx-auto h-8 w-8 mb-2 opacity-50" />
                  <p>No inactive users found. All testers have had activity within the last 3 days.</p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground mb-3">
                    Users with no campaign activity (status changes, bug reports, or comments) in the last 3 days who still have incomplete components.
                  </p>
                  <div className="rounded-md border">
                    <Table className="[&_th]:text-[12px] [&_td]:text-[12px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[22%]">User</TableHead>
                          <TableHead className="w-[30%]">Component</TableHead>
                          <TableHead className="w-[10%]">Status</TableHead>
                          <TableHead className="w-[14%]">Last Active</TableHead>
                          <TableHead className="w-[10%] text-center">Inactive</TableHead>
                          <TableHead className="w-[14%]">Progress</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {staleUsers.map((user) => (
                          user.components.map((comp, ci) => (
                            <TableRow
                              key={`${user.user_id}-${comp.component_id}`}
                              className={ci === 0 ? "border-t-2" : undefined}
                            >
                              {ci === 0 ? (
                                <TableCell rowSpan={user.components.length} className="align-top font-medium">
                                  <div>
                                    <p>{user.display_name || user.username || "—"}</p>
                                    {user.organisation && (
                                      <p className="text-xs text-muted-foreground">{user.organisation}</p>
                                    )}
                                  </div>
                                </TableCell>
                              ) : null}
                              <TableCell className="whitespace-normal break-words">
                                {comp.component_name}
                              </TableCell>
                              <TableCell>
                                <StatusBadge status={comp.status} />
                              </TableCell>
                              {ci === 0 ? (
                                <TableCell rowSpan={user.components.length} className="align-top text-muted-foreground whitespace-nowrap">
                                  {formatCompactDateTime(user.last_campaign_activity)}
                                </TableCell>
                              ) : null}
                              {ci === 0 ? (
                                <TableCell rowSpan={user.components.length} className="align-top text-center">
                                  <span className={user.days_inactive >= 7 ? "text-red-600 font-medium" : "text-orange-600"}>
                                    {user.days_inactive}d
                                  </span>
                                </TableCell>
                              ) : null}
                              {ci === 0 ? (
                                <TableCell rowSpan={user.components.length} className="align-top">
                                  <div className="flex items-center gap-2">
                                    <Progress
                                      value={user.total_selected > 0 ? Math.round((user.completed / user.total_selected) * 100) : 0}
                                      className="flex-1"
                                    />
                                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                                      {user.completed}/{user.total_selected}
                                    </span>
                                  </div>
                                </TableCell>
                              ) : null}
                            </TableRow>
                          ))
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Unresolved Bugs */}
            <TabsContent value="bugs">
              {unresolvedBugs.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                  <Bug className="mx-auto h-8 w-8 mb-2 opacity-50" />
                  <p>No unresolved bugs for this campaign.</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ref</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Component</TableHead>
                        <TableHead>Severity</TableHead>
                        <TableHead>Reporter</TableHead>
                        <TableHead className="text-center">Votes</TableHead>
                        <TableHead className="text-center">Comments</TableHead>
                        <TableHead className="text-center">Days Open</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {unresolvedBugs.map((bug) => {
                        const ref = formatBugRef(bug.bug_number, bug.campaign_code)
                        return (
                          <TableRow key={bug.id}>
                            <TableCell className="font-mono text-xs whitespace-nowrap">
                              {ref ? (
                                <Link href={`/bugs/${ref}`} className="text-primary hover:underline">
                                  {ref}
                                </Link>
                              ) : (
                                "—"
                              )}
                            </TableCell>
                            <TableCell className="font-medium whitespace-normal break-words max-w-[250px]">
                              {bug.title}
                            </TableCell>
                            <TableCell className="text-sm whitespace-normal break-words max-w-[180px]">
                              {bug.component_name}
                            </TableCell>
                            <TableCell>
                              <SeverityBadge severity={bug.severity} />
                            </TableCell>
                            <TableCell className="text-sm">{bug.reporter_name || "—"}</TableCell>
                            <TableCell className="text-center">
                              {bug.vote_count > 0 ? (
                                <Badge variant="secondary">+{bug.vote_count}</Badge>
                              ) : (
                                <span className="text-muted-foreground/40">0</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {bug.comment_count > 0 ? bug.comment_count : <span className="text-muted-foreground/40">0</span>}
                            </TableCell>
                            <TableCell className="text-center">
                              <span className={bug.days_open >= 7 ? "text-red-600 font-medium" : ""}>
                                {bug.days_open}d
                              </span>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}
