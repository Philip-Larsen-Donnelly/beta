"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent } from "@/components/ui/card"
import { ClipboardList, Users, CheckCircle2, XCircle } from "lucide-react"
import type { Campaign } from "@/lib/types"
import type { TestpadCoverageRow, UserTestpadRow } from "@/lib/analytics"

interface TestpadCoverageDashboardProps {
  campaigns: Campaign[]
  selectedCampaignId: string | null
  testpadCoverage: TestpadCoverageRow[]
  userTestpadProgress: UserTestpadRow[]
}

function ResultBar({ pass, fail, blocked, total }: {
  pass: number; fail: number; blocked: number; total: number
}) {
  if (total === 0) return <span className="text-muted-foreground/40">—</span>
  return (
    <div className="flex gap-0.5 h-5 w-full max-w-[160px] rounded overflow-hidden">
      {pass > 0 && (
        <div
          className="bg-green-500 h-full"
          style={{ width: `${(pass / total) * 100}%` }}
          title={`Pass: ${pass}`}
        />
      )}
      {fail > 0 && (
        <div
          className="bg-red-500 h-full"
          style={{ width: `${(fail / total) * 100}%` }}
          title={`Fail: ${fail}`}
        />
      )}
      {blocked > 0 && (
        <div
          className="bg-yellow-500 h-full"
          style={{ width: `${(blocked / total) * 100}%` }}
          title={`Blocked: ${blocked}`}
        />
      )}
    </div>
  )
}

export function TestpadCoverageDashboard({
  campaigns,
  selectedCampaignId,
  testpadCoverage,
  userTestpadProgress,
}: TestpadCoverageDashboardProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get("tab")
  const activeTab =
    tabParam === "resources" || tabParam === "users"
      ? tabParam
      : "resources"

  const handleCampaignChange = (id: string) => {
    document.cookie = `admin_campaign=${id};path=/admin;max-age=${60 * 60 * 24 * 30};samesite=lax`
    const params = new URLSearchParams(searchParams.toString())
    params.set("campaign", id)
    router.push(`/admin/testpad-coverage?${params.toString()}`)
  }

  const handleTabChange = (tab: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("tab", tab)
    router.push(`/admin/testpad-coverage?${params.toString()}`)
  }

  const totalTestpads = testpadCoverage.length
  const totalAttempted = testpadCoverage.filter((t) => t.users_attempted > 0).length
  const totalResults = testpadCoverage.reduce((s, t) => s + t.total_results, 0)
  const totalPass = testpadCoverage.reduce((s, t) => s + t.pass_count, 0)
  const totalFail = testpadCoverage.reduce((s, t) => s + t.fail_count, 0)
  const totalBlocked = testpadCoverage.reduce((s, t) => s + t.blocked_count, 0)
  const passRate = totalResults > 0 ? Math.round((totalPass / totalResults) * 100) : 0

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
        <p className="text-muted-foreground">Select a campaign to view testpad coverage.</p>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/10">
                    <ClipboardList className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Testpads</p>
                    <p className="text-2xl font-bold">{totalTestpads}</p>
                    <p className="text-xs text-muted-foreground">{totalAttempted} attempted</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10">
                    <Users className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Step Results</p>
                    <p className="text-2xl font-bold">{totalResults}</p>
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
                    <p className="text-sm text-muted-foreground">Pass Rate</p>
                    <p className="text-2xl font-bold">{passRate}%</p>
                  </div>
                </div>
                <Progress value={passRate} className="mt-3" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10">
                    <XCircle className="h-5 w-5 text-red-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Failures / Blocked</p>
                    <p className="text-2xl font-bold">{totalFail + totalBlocked}</p>
                    <p className="text-xs text-muted-foreground">{totalFail} fail · {totalBlocked} blocked</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-sm bg-green-500" />
              <span>Pass</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-sm bg-red-500" />
              <span>Fail</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-sm bg-yellow-500" />
              <span>Blocked</span>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList>
              <TabsTrigger value="resources">Per Testpad</TabsTrigger>
              <TabsTrigger value="users">Per User</TabsTrigger>
            </TabsList>

            {/* Per Resource */}
            <TabsContent value="resources">
              {testpadCoverage.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                  No testpads found in this campaign.
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Testpad</TableHead>
                        <TableHead>Component</TableHead>
                        <TableHead className="text-center">Users</TableHead>
                        <TableHead className="text-center">Results</TableHead>
                        <TableHead className="text-center">Pass</TableHead>
                        <TableHead className="text-center">Fail</TableHead>
                        <TableHead className="text-center">Blocked</TableHead>
                        <TableHead>Distribution</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {testpadCoverage.map((t) => (
                        <TableRow
                          key={t.resource_id}
                          className={t.users_attempted === 0 ? "bg-orange-50/50 dark:bg-orange-950/10" : undefined}
                        >
                          <TableCell className="font-medium whitespace-normal break-words max-w-[200px]">
                            {t.resource_name}
                            {t.users_attempted === 0 && (
                              <span className="ml-2 text-xs text-orange-500">Not attempted</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm whitespace-normal break-words max-w-[180px]">
                            {t.component_name}
                          </TableCell>
                          <TableCell className="text-center">{t.users_attempted}</TableCell>
                          <TableCell className="text-center">{t.total_results}</TableCell>
                          <TableCell className="text-center">
                            {t.pass_count > 0 ? (
                              <span className="text-green-600">{t.pass_count}</span>
                            ) : (
                              <span className="text-muted-foreground/40">0</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {t.fail_count > 0 ? (
                              <span className="text-red-600 font-medium">{t.fail_count}</span>
                            ) : (
                              <span className="text-muted-foreground/40">0</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {t.blocked_count > 0 ? (
                              <span className="text-yellow-600 font-medium">{t.blocked_count}</span>
                            ) : (
                              <span className="text-muted-foreground/40">0</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <ResultBar
                              pass={t.pass_count}
                              fail={t.fail_count}
                              blocked={t.blocked_count}
                              total={t.total_results}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            {/* Per User */}
            <TabsContent value="users">
              {userTestpadProgress.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                  No testpad results recorded yet.
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Testpad</TableHead>
                        <TableHead>Component</TableHead>
                        <TableHead className="text-center">Steps</TableHead>
                        <TableHead className="text-center">Pass</TableHead>
                        <TableHead className="text-center">Fail</TableHead>
                        <TableHead className="text-center">Blocked</TableHead>
                        <TableHead>Results</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {userTestpadProgress.map((u, i) => (
                        <TableRow key={`${u.user_id}-${u.resource_id}-${i}`}>
                          <TableCell className="font-medium">
                            {u.display_name || u.username || "—"}
                          </TableCell>
                          <TableCell className="text-sm whitespace-normal break-words max-w-[180px]">
                            {u.resource_name}
                          </TableCell>
                          <TableCell className="text-sm whitespace-normal break-words max-w-[150px]">
                            {u.component_name}
                          </TableCell>
                          <TableCell className="text-center">{u.steps_completed}</TableCell>
                          <TableCell className="text-center">
                            {u.pass_count > 0 ? (
                              <span className="text-green-600">{u.pass_count}</span>
                            ) : (
                              <span className="text-muted-foreground/40">0</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {u.fail_count > 0 ? (
                              <span className="text-red-600">{u.fail_count}</span>
                            ) : (
                              <span className="text-muted-foreground/40">0</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {u.blocked_count > 0 ? (
                              <span className="text-yellow-600">{u.blocked_count}</span>
                            ) : (
                              <span className="text-muted-foreground/40">0</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <ResultBar
                              pass={u.pass_count}
                              fail={u.fail_count}
                              blocked={u.blocked_count}
                              total={u.steps_completed}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
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
