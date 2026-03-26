"use client"

import { useEffect, useMemo, useState } from "react"
import { ArrowDown, ArrowUp, ArrowUpDown, MessageSquare, Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { bugPermalink, cn, formatBugRef, formatCompactDateTime } from "@/lib/utils"
import type { Bug } from "@/lib/types"
import { BugDetailView } from "@/components/bug-detail-view"

type MyBugRow = Bug & {
  component_name: string | null
  campaign_name: string | null
  profile_display_name: string | null
  profile_email: string | null
  vote_count: number
  comment_count: number
  last_activity_at: string
}

type SortField =
  | "title"
  | "component"
  | "reporter"
  | "status"
  | "severity"
  | "priority"
  | "comments"
  | "reported"
  | "last_updated"
type SortDirection = "asc" | "desc"

const SHOW_ALL_KEY = "myBugsTable_showAll"

const severityConfig: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-500/30",
  high: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-500/30",
  critical: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/30",
}

const statusConfig: Record<string, string> = {
  open: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/30",
  reported: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-500/30",
  fixed: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30",
  closed: "bg-muted text-muted-foreground",
}

interface MyBugsTableProps {
  bugs: MyBugRow[]
  currentUserId: string
  isAdmin: boolean
}

export function MyBugsTable({ bugs, currentUserId, isAdmin }: MyBugsTableProps) {
  const [search, setSearch] = useState("")
  const [filterCampaign, setFilterCampaign] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [filterSeverity, setFilterSeverity] = useState<string>("all")
  const [sortField, setSortField] = useState<SortField>("last_updated")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")
  const [selectedBug, setSelectedBug] = useState<MyBugRow | null>(null)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SHOW_ALL_KEY)
      if (stored === "true") setShowAll(true)
    } catch {}
  }, [])

  const handleToggleShowAll = (v: boolean) => {
    setShowAll(v)
    try {
      localStorage.setItem(SHOW_ALL_KEY, String(v))
    } catch {}
  }

  const campaignNames = useMemo(() => {
    return Array.from(new Set(bugs.map((b) => b.campaign_name).filter((v): v is string => Boolean(v)))).sort((a, b) =>
      a.localeCompare(b),
    )
  }, [bugs])

  const visibleBugCount = useMemo(
    () => (showAll ? bugs.length : bugs.filter((b) => b.user_id === currentUserId).length),
    [bugs, showAll, currentUserId],
  )

  const filteredBugs = useMemo(() => {
    const q = search.trim().toLowerCase()
    return bugs.filter((bug) => {
      if (!showAll && bug.user_id !== currentUserId) return false
      if (q) {
        const ref = formatBugRef(bug.bug_number, bug.campaign_code) || ""
        const reporter = bug.profile_display_name || bug.profile_email || ""
        const haystack = `${bug.title} ${bug.campaign_name || ""} ${bug.component_name || ""} ${reporter} ${ref}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }
      if (filterCampaign !== "all" && bug.campaign_name !== filterCampaign) return false
      if (filterStatus !== "all" && bug.status !== filterStatus) return false
      if (filterSeverity !== "all" && bug.severity !== filterSeverity) return false
      return true
    })
  }, [bugs, search, filterCampaign, filterStatus, filterSeverity, showAll, currentUserId])

  const sortedBugs = useMemo(() => {
    const next = [...filteredBugs]
    next.sort((a, b) => {
      const valA: string | number = (() => {
        switch (sortField) {
          case "title":
            return a.title
          case "component":
            return a.component_name || ""
          case "reporter":
            return a.profile_display_name || a.profile_email || ""
          case "status":
            return a.status
          case "severity":
            return a.severity
          case "priority":
            return a.priority
          case "comments":
            return Number(a.comment_count ?? 0)
          case "reported":
            return new Date(a.created_at).getTime()
          case "last_updated":
            return new Date(a.last_activity_at || a.updated_at).getTime()
        }
      })()
      const valB: string | number = (() => {
        switch (sortField) {
          case "title":
            return b.title
          case "component":
            return b.component_name || ""
          case "reporter":
            return b.profile_display_name || b.profile_email || ""
          case "status":
            return b.status
          case "severity":
            return b.severity
          case "priority":
            return b.priority
          case "comments":
            return Number(b.comment_count ?? 0)
          case "reported":
            return new Date(b.created_at).getTime()
          case "last_updated":
            return new Date(b.last_activity_at || b.updated_at).getTime()
        }
      })()
      if (typeof valA === "number" && typeof valB === "number") {
        return sortDirection === "asc" ? valA - valB : valB - valA
      }
      const cmp = String(valA).localeCompare(String(valB))
      return sortDirection === "asc" ? cmp : -cmp
    })
    return next
  }, [filteredBugs, sortField, sortDirection])

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
    return sortDirection === "asc" ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />
  }

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">{showAll ? "All Bugs" : "All My Bugs"}</h2>
          <p className="text-sm text-muted-foreground">
            {sortedBugs.length} of {visibleBugCount} bug{visibleBugCount !== 1 ? "s" : ""} shown
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="show-all-bugs" checked={showAll} onCheckedChange={handleToggleShowAll} />
          <Label htmlFor="show-all-bugs" className="text-sm">Show bugs from all users</Label>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={showAll ? "Search all bugs..." : "Search your bugs..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterCampaign} onValueChange={setFilterCampaign}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Campaign" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Campaigns</SelectItem>
            {campaignNames.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="reported">Valid: Reported to JIRA</SelectItem>
            <SelectItem value="fixed">Fixed</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterSeverity} onValueChange={setFilterSeverity}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severity</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table className="table-fixed [&_th]:h-8 [&_th]:px-1 [&_th]:py-1 [&_th]:text-[12px] [&_td]:px-1 [&_td]:py-1 [&_td]:text-[12px] [&_th]:whitespace-normal [&_td]:whitespace-normal">
          <TableHeader>
            <TableRow>
              <TableHead className={showAll ? "w-[33%] whitespace-normal" : "w-[42%] whitespace-normal"}>
                <button onClick={() => toggleSort("title")} className="flex items-center font-medium hover:text-foreground">
                  Title
                  <SortIcon field="title" />
                </button>
              </TableHead>
              <TableHead className={showAll ? "w-[10%]" : "w-[11%]"}>
                <button onClick={() => toggleSort("component")} className="flex items-center font-medium hover:text-foreground">
                  Component
                  <SortIcon field="component" />
                </button>
              </TableHead>
              {showAll && (
                <TableHead className="w-[10%]">
                  <button onClick={() => toggleSort("reporter")} className="flex items-center font-medium hover:text-foreground">
                    Reporter
                    <SortIcon field="reporter" />
                  </button>
                </TableHead>
              )}
              <TableHead className="w-[7%]">
                <button onClick={() => toggleSort("status")} className="flex items-center font-medium hover:text-foreground">
                  Status
                  <SortIcon field="status" />
                </button>
              </TableHead>
              <TableHead className="w-[7%]">
                <button onClick={() => toggleSort("severity")} className="flex items-center font-medium hover:text-foreground">
                  Severity
                  <SortIcon field="severity" />
                </button>
              </TableHead>
              <TableHead className="w-[6%]">
                <button onClick={() => toggleSort("priority")} className="flex items-center font-medium hover:text-foreground">
                  Priority
                  <SortIcon field="priority" />
                </button>
              </TableHead>
              <TableHead className="w-[6%] text-center">
                <button
                  onClick={() => toggleSort("comments")}
                  className="flex w-full items-center justify-center font-medium hover:text-foreground"
                >
                  Comments
                  <SortIcon field="comments" />
                </button>
              </TableHead>
              <TableHead className="w-[10%] text-right">
                <button
                  onClick={() => toggleSort("reported")}
                  className="ml-auto flex items-center font-medium hover:text-foreground"
                >
                  Reported
                  <SortIcon field="reported" />
                </button>
              </TableHead>
              <TableHead className="w-[11%] text-right">
                <button
                  onClick={() => toggleSort("last_updated")}
                  className="ml-auto flex items-center font-medium hover:text-foreground"
                >
                  Last Updated
                  <SortIcon field="last_updated" />
                </button>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedBugs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={showAll ? 9 : 8} className="h-24 text-center text-muted-foreground">
                  No bugs found matching your filters.
                </TableCell>
              </TableRow>
            ) : (
              sortedBugs.map((bug) => (
                <TableRow
                  key={bug.id}
                  className={cn(
                    "cursor-pointer hover:bg-muted/50",
                    showAll && bug.user_id === currentUserId && "bg-muted/30",
                  )}
                  onClick={() => setSelectedBug(bug)}
                >
                  <TableCell>
                    <div className="flex w-full items-start gap-2">
                      {formatBugRef(bug.bug_number, bug.campaign_code) && (
                        <a
                          href={bugPermalink(bug.bug_number, bug.campaign_code) || "#"}
                          onClick={(e) => e.stopPropagation()}
                          className="shrink-0 font-mono text-xs text-muted-foreground hover:text-primary"
                        >
                          {formatBugRef(bug.bug_number, bug.campaign_code)}
                        </a>
                      )}
                      <span className="block min-w-0 flex-1 whitespace-normal break-words text-[12px] font-medium">
                        {bug.title}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-normal break-words leading-tight">
                    {bug.component_name || "—"}
                  </TableCell>
                  {showAll && (
                    <TableCell className="whitespace-normal break-words leading-tight">
                      {bug.profile_display_name || bug.profile_email || "—"}
                    </TableCell>
                  )}
                  <TableCell>
                    <Badge variant="outline" className={cn("text-xs", statusConfig[bug.status])}>
                      {bug.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("text-xs", severityConfig[bug.severity])}>
                      {bug.severity}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {bug.priority}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {Number(bug.comment_count ?? 0) > 0 ? (
                      <Badge variant="secondary" className="text-xs">
                        <MessageSquare className="mr-1 h-3 w-3" />
                        {bug.comment_count}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground/50">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground whitespace-nowrap">
                    {formatCompactDateTime(bug.created_at)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground whitespace-nowrap">
                    {formatCompactDateTime(bug.last_activity_at || bug.updated_at)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!selectedBug} onOpenChange={(open) => !open && setSelectedBug(null)}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-auto [&_[data-slot=card]]:max-w-none [&_[data-slot=card]]:w-full">
          <DialogTitle className="sr-only">Bug details</DialogTitle>
          {selectedBug && (
            <BugDetailView
              bug={{
                id: selectedBug.id,
                component_id: selectedBug.component_id,
                user_id: selectedBug.user_id,
                title: selectedBug.title,
                description: selectedBug.description,
                severity: selectedBug.severity,
                priority: selectedBug.priority,
                status: selectedBug.status,
                bug_number: selectedBug.bug_number,
                campaign_code: selectedBug.campaign_code ?? null,
                vote_count: Number(selectedBug.vote_count ?? 0),
                created_at: selectedBug.created_at,
                updated_at: selectedBug.updated_at,
                component_name: selectedBug.component_name ?? null,
                campaign_name: selectedBug.campaign_name ?? null,
                profile_display_name: selectedBug.profile_display_name ?? null,
                profile_email: selectedBug.profile_email ?? null,
              }}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
