"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { MarkdownContent } from "@/components/markdown-content"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Search, Trash2, Link2, MoreHorizontal, AlertTriangle } from "lucide-react"
import { updateBug, deleteBug, deleteBugs, attachBugToComponent, attachBugsToComponent } from "@/lib/actions"
import type { Bug, BugStatus, BugSeverity, BugPriority } from "@/lib/types"
import { cn, formatDateTime, formatBugRef, bugPermalink } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"

const severityConfig: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-yellow-500/10 text-yellow-700 border-yellow-200",
  high: "bg-orange-500/10 text-orange-700 border-orange-200",
  critical: "bg-red-500/10 text-red-700 border-red-200",
}

const statusConfig: Record<string, string> = {
  open: "bg-blue-500/10 text-blue-700 border-blue-200",
  reported: "bg-purple-500/10 text-purple-700 border-purple-200",
  fixed: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
  closed: "bg-muted text-muted-foreground",
}

const severityOptions = [
  { value: "low", label: "Low", description: "Minor issue, cosmetic" },
  { value: "medium", label: "Medium", description: "Feature impaired" },
  { value: "high", label: "High", description: "Major feature broken" },
  { value: "critical", label: "Critical", description: "System crash, data loss" },
] as const

type BugRow = Bug & {
  component: { name: string; campaign_id: string | null; campaign: { name: string } | null } | null
  profile: { display_name: string | null; email: string | null } | null
}

interface AdminBugListProps {
  bugs: BugRow[]
  components: { id: string; name: string; campaign_id: string | null; campaign: { name: string } | null }[]
  campaigns: { id: string; name: string; start_date: string | null; end_date: string | null }[]
  currentUserId: string
}

type BugCommentItem = {
  id: string
  bug_id: string
  user_id: string
  content: string
  created_at: string
  profile: { display_name: string | null; email: string | null } | null
}

export function AdminBugList({
  bugs: initialBugs,
  components,
  campaigns,
  currentUserId,
}: AdminBugListProps) {
  const router = useRouter()
  const [bugs, setBugs] = useState(initialBugs)
  const [search, setSearch] = useState("")
  const [filterCampaign, setFilterCampaign] = useState<string>("active")
  const [filterComponent, setFilterComponent] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [filterSeverity, setFilterSeverity] = useState<string>("all")
  const [selectedBug, setSelectedBug] = useState<(typeof bugs)[0] | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isDeleting, setIsDeleting] = useState(false)
  const [attachDialogOpen, setAttachDialogOpen] = useState(false)
  const [attachTargetCampaign, setAttachTargetCampaign] = useState<string>("")
  const [attachTargetComponent, setAttachTargetComponent] = useState<string>("")
  const [bugsToAttach, setBugsToAttach] = useState<string[]>([])
  const [comments, setComments] = useState<BugCommentItem[]>([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [commentText, setCommentText] = useState("")
  const [commentError, setCommentError] = useState<string | null>(null)
  const [hasExperienced, setHasExperienced] = useState(false)
  const [voteCount, setVoteCount] = useState(0)

  const isCampaignActive = (campaign: { start_date: string | null; end_date: string | null }) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const startDate = campaign.start_date ? new Date(campaign.start_date) : null
    const endDate = campaign.end_date ? new Date(campaign.end_date) : null

    if (startDate && startDate > today) return false
    if (endDate && endDate < today) return false
    return true
  }

  const activeCampaignIds = campaigns.filter(isCampaignActive).map((c) => c.id)

  const filteredBugs = bugs.filter((bug) => {
    if (search && !bug.title.toLowerCase().includes(search.toLowerCase())) return false

    // Handle orphaned filter
    if (filterCampaign === "orphaned") {
      return bug.component_id === null
    }

    // Skip orphaned bugs for other filters unless explicitly showing all
    if (filterCampaign !== "all" && bug.component_id === null) return false

    if (filterCampaign === "active") {
      if (!bug.component?.campaign_id || !activeCampaignIds.includes(bug.component.campaign_id)) return false
    } else if (filterCampaign !== "all" && bug.component?.campaign_id !== filterCampaign) {
      return false
    }
    if (filterComponent !== "all" && bug.component_id !== filterComponent) return false
    if (filterStatus !== "all" && bug.status !== filterStatus) return false
    if (filterSeverity !== "all" && bug.severity !== filterSeverity) return false
    return true
  })

  const filteredComponents =
    filterCampaign === "all" || filterCampaign === "orphaned"
      ? components
      : filterCampaign === "active"
        ? components.filter((c) => c.campaign_id && activeCampaignIds.includes(c.campaign_id))
        : components.filter((c) => c.campaign_id === filterCampaign)

  const orphanedCount = bugs.filter((b) => b.component_id === null).length

  const handleUpdateBug = async (id: string, updates: Partial<Bug>) => {
    const result = await updateBug(id, updates)
    if (result.success && result.bug) {
      const existingBug = bugs.find((b) => b.id === id)
      const updatedBug: BugRow = {
        ...result.bug,
        component: existingBug?.component ?? null,
        profile: existingBug?.profile ?? null,
      }
      setBugs((prev) => prev.map((b) => (b.id === id ? updatedBug : b)))
      setSelectedBug(updatedBug)
      router.refresh()
    }
  }

  useEffect(() => {
    if (!selectedBug) return
    let mounted = true
    setComments([])
    setCommentText("")
    setCommentError(null)
    setHasExperienced(false)
    setVoteCount(0)
    setCommentsLoading(true)

    Promise.all([
      fetch(`/api/bug-comments?bugId=${selectedBug.id}`)
        .then((res) => (res.ok ? res.json() : Promise.reject(res)))
        .catch(() => []),
      fetch(`/api/bug-votes?bugId=${selectedBug.id}`)
        .then((res) => (res.ok ? res.json() : Promise.reject(res)))
        .catch(() => ({ count: 0, hasVoted: false })),
    ])
      .then(([commentRows, vote]) => {
        if (!mounted) return
        setComments(commentRows || [])
        setHasExperienced(Boolean(vote?.hasVoted))
        setVoteCount(Number(vote?.count ?? 0))
      })
      .finally(() => mounted && setCommentsLoading(false))

    return () => {
      mounted = false
    }
  }, [selectedBug?.id])

  const handleAddComment = async () => {
    if (!selectedBug || !commentText.trim()) return
    setCommentError(null)
    try {
      const res = await fetch("/api/bug-comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bugId: selectedBug.id, content: commentText }),
      })
      if (!res.ok) throw new Error("Failed to add comment")
      const comment = await res.json()
      setComments((prev) => [...prev, comment])
      setCommentText("")
    } catch (error) {
      setCommentError(
        error instanceof Error ? error.message : "Failed to add comment",
      )
    }
  }

  const handleToggleExperienced = async (checked: boolean) => {
    if (!selectedBug) return
    setHasExperienced(checked)
    try {
      const res = await fetch("/api/bug-votes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bugId: selectedBug.id, hasExperienced: checked }),
      })
      if (res.ok) {
        const data = await res.json()
        setHasExperienced(Boolean(data?.hasVoted))
        setVoteCount(Number(data?.count ?? 0))
      }
    } catch (error) {
      console.error("Failed to update bug vote", error)
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredBugs.map((b) => b.id)))
    } else {
      setSelectedIds(new Set())
    }
  }

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSet = new Set(selectedIds)
    if (checked) {
      newSet.add(id)
    } else {
      newSet.delete(id)
    }
    setSelectedIds(newSet)
  }

  const handleDeleteBug = async (id: string) => {
    setIsDeleting(true)
    const result = await deleteBug(id)
    if (result.success) {
      setBugs(bugs.filter((b) => b.id !== id))
      setSelectedBug(null)
    }
    setIsDeleting(false)
    router.refresh()
  }

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    setIsDeleting(true)
    const result = await deleteBugs(Array.from(selectedIds))
    if (result.success) {
      setBugs(bugs.filter((b) => !selectedIds.has(b.id)))
      setSelectedIds(new Set())
    }
    setIsDeleting(false)
    router.refresh()
  }

  const openAttachDialog = (bugIds: string[]) => {
    setBugsToAttach(bugIds)
    setAttachTargetCampaign("")
    setAttachTargetComponent("")
    setAttachDialogOpen(true)
  }

  const handleAttach = async () => {
    if (!attachTargetComponent || bugsToAttach.length === 0) return

    const result =
      bugsToAttach.length === 1
        ? await attachBugToComponent(bugsToAttach[0], attachTargetComponent)
        : await attachBugsToComponent(bugsToAttach, attachTargetComponent)

    if (result.success) {
      // Update local state with new component info
      const targetComp = components.find((c) => c.id === attachTargetComponent)
      setBugs(
        bugs.map((b) => {
          if (bugsToAttach.includes(b.id)) {
            return {
              ...b,
              component_id: attachTargetComponent,
              component: targetComp
                ? {
                    name: targetComp.name,
                    campaign_id: targetComp.campaign_id,
                    campaign: targetComp.campaign,
                  }
                : null,
            } as BugRow
          }
          return b
        }),
      )
      setSelectedIds(new Set())
      setAttachDialogOpen(false)
      router.refresh()
    }
  }

  const componentsForAttach = attachTargetCampaign
    ? components.filter((c) => c.campaign_id === attachTargetCampaign)
    : []

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search bugs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={filterCampaign}
          onValueChange={(v) => {
            setFilterCampaign(v)
            setFilterComponent("all")
            setSelectedIds(new Set())
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Campaign" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active Campaigns</SelectItem>
            <SelectItem value="all">All Campaigns</SelectItem>
            <SelectItem value="orphaned">Orphaned Bugs {orphanedCount > 0 && `(${orphanedCount})`}</SelectItem>
            {campaigns.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {filterCampaign !== "orphaned" && (
          <Select value={filterComponent} onValueChange={setFilterComponent}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Component" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Components</SelectItem>
              {filteredComponents.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
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

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {filteredBugs.length} of {bugs.length} bugs
          {selectedIds.size > 0 && ` · ${selectedIds.size} selected`}
        </p>
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2">
            {filterCampaign === "orphaned" && (
              <Button variant="outline" size="sm" onClick={() => openAttachDialog(Array.from(selectedIds))}>
                <Link2 className="h-4 w-4 mr-2" />
                Attach to Component
              </Button>
            )}
            <Button variant="destructive" size="sm" onClick={handleBulkDelete} disabled={isDeleting}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete ({selectedIds.size})
            </Button>
          </div>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={filteredBugs.length > 0 && selectedIds.size === filteredBugs.length}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Campaign</TableHead>
              <TableHead>Component</TableHead>
              <TableHead>Reporter</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead className="text-right">Reported</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredBugs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                  {filterCampaign === "orphaned" ? "No orphaned bugs found." : "No bugs found matching your filters."}
                </TableCell>
              </TableRow>
            ) : (
              filteredBugs.map((bug) => (
                <TableRow
                  key={bug.id}
                  className={cn("cursor-pointer hover:bg-muted/50", selectedIds.has(bug.id) && "bg-primary/5")}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.has(bug.id)}
                      onCheckedChange={(checked) => handleSelectOne(bug.id, !!checked)}
                    />
                  </TableCell>
                  <TableCell onClick={() => setSelectedBug(bug)}>
                    <div className="flex items-center gap-2">
                      {formatBugRef(bug.bug_number, bug.campaign_code) && (
                        <a
                          href={bugPermalink(bug.bug_number, bug.campaign_code) || "#"}
                          onClick={(e) => e.stopPropagation()}
                          className="font-mono text-xs text-muted-foreground hover:text-primary shrink-0"
                        >
                          {formatBugRef(bug.bug_number, bug.campaign_code)}
                        </a>
                      )}
                      <span className="text-sm font-medium block max-w-[260px] break-words whitespace-normal">
                        {bug.title}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell onClick={() => setSelectedBug(bug)} className="text-sm text-muted-foreground">
                    {bug.component?.campaign?.name || "—"}
                  </TableCell>
                  <TableCell onClick={() => setSelectedBug(bug)} className="text-sm">
                    {bug.component?.name || (
                      <span className="flex items-center gap-1 text-amber-600">
                        <AlertTriangle className="h-3 w-3" />
                        Orphaned
                      </span>
                    )}
                  </TableCell>
                  <TableCell onClick={() => setSelectedBug(bug)} className="text-sm">
                    <div className="flex items-center gap-2">
                      <span>{bug.profile?.display_name || bug.profile?.email || "Unknown"}</span>
                      {Number(bug.vote_count ?? 0) > 0 && (
                        <Badge variant="outline" className="text-sm">
                          +{bug.vote_count}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell onClick={() => setSelectedBug(bug)}>
                    <Badge variant="outline" className={cn("text-xs", statusConfig[bug.status])}>
                      {bug.status}
                    </Badge>
                  </TableCell>
                  <TableCell onClick={() => setSelectedBug(bug)}>
                    <Badge variant="outline" className={cn("text-xs", severityConfig[bug.severity])}>
                      {bug.severity}
                    </Badge>
                  </TableCell>
                  <TableCell onClick={() => setSelectedBug(bug)}>
                    <Badge variant="outline" className="text-xs">
                      {bug.priority}
                    </Badge>
                  </TableCell>
                  <TableCell onClick={() => setSelectedBug(bug)} className="text-right text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(bug.created_at), { addSuffix: true })}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setSelectedBug(bug)}>View Details</DropdownMenuItem>
                        {bug.component_id === null && (
                          <DropdownMenuItem onClick={() => openAttachDialog([bug.id])}>
                            <Link2 className="h-4 w-4 mr-2" />
                            Attach to Component
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteBug(bug.id)}>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Bug Detail Dialog */}
      <Dialog open={!!selectedBug} onOpenChange={(open) => !open && setSelectedBug(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-auto">
          {selectedBug && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {formatBugRef(selectedBug.bug_number, selectedBug.campaign_code) && (
                    <a
                      href={bugPermalink(selectedBug.bug_number, selectedBug.campaign_code) || "#"}
                      className="font-mono text-sm text-muted-foreground hover:text-primary mr-2"
                      title="Open bug permalink"
                    >
                      {formatBugRef(selectedBug.bug_number, selectedBug.campaign_code)}
                    </a>
                  )}
                  {selectedBug.title}
                </DialogTitle>
                <DialogDescription>
                  {selectedBug.component ? (
                    <>
                      {selectedBug.component.campaign?.name && `${selectedBug.component.campaign.name} · `}
                      {selectedBug.component.name}
                    </>
                  ) : (
                    <span className="text-amber-600">Orphaned bug - no component attached</span>
                  )}
                  {" · Reported by "}
                  {selectedBug.profile?.display_name || selectedBug.profile?.email}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid gap-1.5">
                  <Label className="text-xs text-muted-foreground">Description</Label>
                  <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                    {selectedBug.description?.trim()?.length ? (
                      <MarkdownContent content={selectedBug.description} />
                    ) : (
                      <p className="text-muted-foreground">No description provided.</p>
                    )}
                  </div>
                </div>

                {selectedBug.component_id === null && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <p className="text-sm text-amber-800 mb-2">
                      This bug is orphaned. Attach it to a component to include it in reports.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedBug(null)
                        openAttachDialog([selectedBug.id])
                      }}
                    >
                      <Link2 className="h-4 w-4 mr-2" />
                      Attach to Component
                    </Button>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label>Status</Label>
                    <Select
                      value={selectedBug.status}
                      onValueChange={(v) => handleUpdateBug(selectedBug.id, { status: v as BugStatus })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="reported">Valid: Reported to JIRA</SelectItem>
                        <SelectItem value="fixed">Fixed</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Severity</Label>
                    <Select
                      value={selectedBug.severity}
                      onValueChange={(v) => handleUpdateBug(selectedBug.id, { severity: v as BugSeverity })}
                    >
                    <SelectTrigger className="justify-start text-left">
                      <span>
                        {severityOptions.find((option) => option.value === selectedBug.severity)?.label ??
                          "Select severity"}
                      </span>
                      </SelectTrigger>
                      <SelectContent>
                      {severityOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex flex-col">
                            <span>{option.label}</span>
                            <span className="text-xs text-muted-foreground">
                              {option.description}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Priority</Label>
                    <Select
                      value={selectedBug.priority}
                      onValueChange={(v) => handleUpdateBug(selectedBug.id, { priority: v as BugPriority })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-2">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="rounded border px-2 py-0.5 text-sm font-semibold">
                        {voteCount + 1}
                      </span>
                      <span className="text-sm text-muted-foreground">reporters</span>
                    </div>
                    <Checkbox
                      checked={hasExperienced}
                      onCheckedChange={(checked) =>
                        handleToggleExperienced(checked === true)
                      }
                      id="admin-experienced-toggle"
                      disabled={selectedBug.user_id === currentUserId}
                    />
                    <Label htmlFor="admin-experienced-toggle" className="text-sm">
                      I&apos;ve experienced this bug too
                    </Label>
                  </div>
                  {selectedBug.user_id === currentUserId && (
                    <p className="text-xs text-muted-foreground">
                      You reported this bug, so your vote is already counted.
                    </p>
                  )}
                </div>

                <div className="grid gap-3">
                  <Label>Comments</Label>
                  {commentsLoading ? (
                    <p className="text-sm text-muted-foreground">Loading comments...</p>
                  ) : comments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No comments yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {comments.map((comment) => (
                        <div key={comment.id} className="rounded-md border px-3 py-2 text-sm">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>
                              {comment.user_id === currentUserId
                                ? "You"
                                : comment.profile?.display_name ||
                                  comment.profile?.email ||
                                  "Unknown user"}
                            </span>
                            <span>
                              {formatDistanceToNow(new Date(comment.created_at), {
                                addSuffix: true,
                              })}
                            </span>
                          </div>
                          <p className="mt-1 whitespace-pre-line">{comment.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {commentError && (
                    <p className="text-sm text-destructive">{commentError}</p>
                  )}
                  <div className="grid gap-2">
                    <Textarea
                      id="admin-new-comment"
                      rows={3}
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Add a comment..."
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAddComment}
                      disabled={!commentText.trim()}
                    >
                      Add Comment
                    </Button>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground">
                  Created: {formatDateTime(selectedBug.created_at)}
                  {selectedBug.updated_at !== selectedBug.created_at && (
                    <> · Updated: {formatDateTime(selectedBug.updated_at)}</>
                  )}
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="destructive" onClick={() => handleDeleteBug(selectedBug.id)} disabled={isDeleting}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Bug
                </Button>
                <Button variant="outline" onClick={() => setSelectedBug(null)}>
                  Close
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={attachDialogOpen} onOpenChange={setAttachDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Attach Bug{bugsToAttach.length > 1 ? "s" : ""} to Component</DialogTitle>
            <DialogDescription>
              Select a campaign and component to attach {bugsToAttach.length} bug{bugsToAttach.length > 1 ? "s" : ""}{" "}
              to.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Campaign</Label>
              <Select
                value={attachTargetCampaign}
                onValueChange={(v) => {
                  setAttachTargetCampaign(v)
                  setAttachTargetComponent("")
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select campaign..." />
                </SelectTrigger>
                <SelectContent>
                  {campaigns.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Component</Label>
              <Select
                value={attachTargetComponent}
                onValueChange={setAttachTargetComponent}
                disabled={!attachTargetCampaign}
              >
                <SelectTrigger>
                  <SelectValue placeholder={attachTargetCampaign ? "Select component..." : "Select campaign first"} />
                </SelectTrigger>
                <SelectContent>
                  {componentsForAttach.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setAttachDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAttach} disabled={!attachTargetComponent}>
              Attach
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
