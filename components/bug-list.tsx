"use client"

import { useEffect, useRef, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import type { Bug, BugSeverity, BugPriority, BugStatus } from "@/lib/types"
import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"
import { Bug as BugIcon, Eye, Pencil } from "lucide-react"
import { updateBug } from "@/lib/actions"
import { MarkdownContent } from "@/components/markdown-content"

type BugCommentItem = {
  id: string
  bug_id: string
  user_id: string
  content: string
  created_at: string
  profile: { display_name: string | null; email: string | null } | null
}

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

interface BugListProps {
  bugs: (Bug & { profile: { display_name: string | null; email: string | null } | null })[]
  currentUserId: string
  isAdmin: boolean
  onBugUpdated: () => void
  variant?: "table" | "cards"
  maxItems?: number
}

export function BugList({ bugs, currentUserId, isAdmin, onBugUpdated, variant = "table", maxItems }: BugListProps) {
  const [editingBug, setEditingBug] = useState<Bug | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editSeverity, setEditSeverity] = useState<BugSeverity>("medium")
  const [editPriority, setEditPriority] = useState<BugPriority>("medium")
  const [editStatus, setEditStatus] = useState<BugStatus>("open")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [comments, setComments] = useState<BugCommentItem[]>([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [commentText, setCommentText] = useState("")
  const [commentError, setCommentError] = useState<string | null>(null)
  const [hasExperienced, setHasExperienced] = useState(false)
  const [voteCount, setVoteCount] = useState(0)
  const editDescriptionRef = useRef<HTMLTextAreaElement | null>(null)
  const editFileInputRef = useRef<HTMLInputElement | null>(null)
  const [viewMode, setViewMode] = useState<"edit" | "view">("edit")
  const canEditFields = editingBug
    ? isAdmin || editingBug.user_id === currentUserId
    : false
  const isEditingEnabled = canEditFields && viewMode === "edit"

  const openEditDialog = (bug: Bug) => {
    setEditingBug(bug)
    setEditTitle(bug.title)
    setEditDescription(bug.description)
    setEditSeverity(bug.severity)
    setEditPriority(bug.priority)
    setEditStatus(bug.status)
    setViewMode("view")
  }

  const handleSaveEdit = async () => {
    if (!editingBug) return
    setIsSubmitting(true)

    const updates: Partial<Bug> = {
      title: editTitle,
      description: editDescription,
      severity: editSeverity,
    }

    if (isAdmin) {
      updates.priority = editPriority
      updates.status = editStatus
    }

    await updateBug(editingBug.id, updates)
    setIsSubmitting(false)
    setEditingBug(null)
    onBugUpdated()
  }

  useEffect(() => {
    if (!editingBug) return
    let mounted = true
    setComments([])
    setCommentText("")
    setCommentError(null)
    setHasExperienced(false)
    setVoteCount(0)
    setCommentsLoading(true)

    Promise.all([
      fetch(`/api/bug-comments?bugId=${editingBug.id}`)
        .then((res) => (res.ok ? res.json() : Promise.reject(res)))
        .catch(() => []),
      fetch(`/api/bug-votes?bugId=${editingBug.id}`)
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
  }, [editingBug?.id])

  const handleAddComment = async () => {
    if (!editingBug || !commentText.trim()) return
    setCommentError(null)
    try {
      const res = await fetch("/api/bug-comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bugId: editingBug.id, content: commentText }),
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
    if (!editingBug) return
    setHasExperienced(checked)
    try {
      const res = await fetch("/api/bug-votes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bugId: editingBug.id, hasExperienced: checked }),
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

  const uploadImage = async (file: File) => {
    const formData = new FormData()
    formData.append("file", file)
    const res = await fetch("/api/uploads", {
      method: "POST",
      body: formData,
    })
    if (!res.ok) {
      throw new Error("Failed to upload image")
    }
    const data = await res.json()
    return data.url as string
  }

  const insertEditAtCursor = (text: string) => {
    const el = editDescriptionRef.current
    if (!el) {
      setEditDescription((prev) => prev + text)
      return
    }
    const start = el.selectionStart ?? editDescription.length
    const end = el.selectionEnd ?? editDescription.length
    setEditDescription((prev) => prev.slice(0, start) + text + prev.slice(end))
    window.requestAnimationFrame(() => {
      el.focus()
      const pos = start + text.length
      el.setSelectionRange(pos, pos)
    })
  }

  const handleEditPaste = async (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (!canEditFields) return
    const items = event.clipboardData?.items
    if (!items) return
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        event.preventDefault()
        const file = item.getAsFile()
        if (!file) return
        const buffer = await file.arrayBuffer()
        const safeFile = new File([buffer], file.name || "pasted-image", {
          type: file.type || "image/png",
        })
        const url = await uploadImage(safeFile)
        insertEditAtCursor(`![${safeFile.name}](${url})`)
        return
      }
    }
  }

  const handleEditFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!canEditFields) return
    const file = event.target.files?.[0]
    if (!file) return
    const url = await uploadImage(file)
    insertEditAtCursor(`![${file.name}](${url})`)
    event.target.value = ""
  }

  if (bugs.length === 0) {
    return (
      <div className="rounded-md border border-dashed bg-muted/30 p-8 text-center text-muted-foreground shadow-none">
        No bugs reported yet.
      </div>
    )
  }

  // Card variant for personal/compact views
  const renderCards = () => {
    const hasMore = maxItems !== undefined && bugs.length > maxItems
    const visibleBugs = hasMore && !isExpanded ? bugs.slice(0, maxItems) : bugs
    const hiddenCount = bugs.length - (maxItems ?? bugs.length)

    return (
      <div className="space-y-2">
        {visibleBugs.map((bug) => {
          const isOwnBug = bug.user_id === currentUserId
          const canEdit = isAdmin || isOwnBug

          return (
            <Card
              key={bug.id}
              className="overflow-hidden py-0 cursor-pointer"
              role="button"
              tabIndex={0}
              onClick={() => openEditDialog(bug)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault()
                  openEditDialog(bug)
                }
              }}
            >
              <CardContent className="py-2.5 px-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium truncate">{bug.title}</h3>
                      {isOwnBug && (
                        <Badge variant="outline" className="text-xs shrink-0">
                          Yours
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-1.5">{bug.description}</p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <div className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <span className="font-medium">Status</span>
                        <Badge variant="outline" className={cn("text-xs", statusConfig[bug.status])}>
                          {bug.status}
                        </Badge>
                      </div>
                      <div className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <span className="font-medium">Severity</span>
                        <Badge variant="outline" className={cn("text-xs", severityConfig[bug.severity])}>
                          {bug.severity}
                        </Badge>
                      </div>
                      <div className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <span className="font-medium">Priority</span>
                        <Badge variant="outline" className="text-xs">
                          {bug.priority}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(bug.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0">
                    {canEdit ? (
                      <Pencil className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
        {hasMore && (
          <Button
            variant="ghost"
            className="w-full text-muted-foreground"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? "Show less" : `Show ${hiddenCount} more`}
          </Button>
        )}
      </div>
    )
  }

  // Table variant for full lists
  const renderTable = () => (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Reporter</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Severity</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead className="text-right">Reported</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bugs.map((bug) => {
            const isOwnBug = bug.user_id === currentUserId
            const canEdit = isAdmin || isOwnBug

            return (
              <TableRow key={bug.id} className={cn(isOwnBug && "bg-primary/5")}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-medium block max-w-[260px] truncate">
                      {bug.title}
                    </span>
                    {isOwnBug && (
                      <Badge variant="outline" className="text-xs">
                        Yours
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1 max-w-[300px]">{bug.description}</p>
                </TableCell>
                <TableCell className="text-sm">
                  <div className="flex items-center gap-2">
                    <span>{bug.profile?.display_name || bug.profile?.email || "Unknown"}</span>
                    {Number(bug.vote_count ?? 0) > 0 && (
                      <Badge variant="outline" className="text-sm">
                        +{bug.vote_count}
                      </Badge>
                    )}
                  </div>
                </TableCell>
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
                <TableCell className="text-right text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(bug.created_at), { addSuffix: true })}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => openEditDialog(bug)}
                  >
                    {canEdit ? (
                      <Pencil className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                    <span className="sr-only">
                      {canEdit ? "Edit bug" : "View bug"}
                    </span>
                  </Button>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )

  return (
    <>
      {variant === "cards" ? renderCards() : renderTable()}

      {/* Edit Bug Dialog */}
      <Dialog open={!!editingBug} onOpenChange={(open) => !open && setEditingBug(null)}>
          <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
            <DialogHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <BugIcon className="h-5 w-5 text-muted-foreground" />
                  {isEditingEnabled ? (
                    <Input
                      id="edit-title"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="h-9 px-3 text-lg font-semibold flex-1"
                    />
                  ) : (
                    <DialogTitle className="truncate">{editTitle}</DialogTitle>
                  )}
                </div>
                {canEditFields && (
                  <div className="inline-flex w-fit rounded-md border bg-muted/30 p-1 mr-6">
                  <Button
                    type="button"
                    variant={viewMode === "edit" ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 px-3"
                    onClick={() => setViewMode("edit")}
                  >
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant={viewMode === "view" ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 px-3"
                    onClick={() => setViewMode("view")}
                  >
                    View
                  </Button>
                  </div>
                )}
              </div>
            </DialogHeader>
            <div className="overflow-auto flex-1 space-y-4 py-4">
            <div className="grid gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="edit-description">Description</Label>
                {isEditingEnabled && (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => editFileInputRef.current?.click()}
                    >
                      Insert image
                    </Button>
                    <input
                      ref={editFileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleEditFileChange}
                    />
                  </>
                )}
              </div>
              {isEditingEnabled ? (
                <>
                  <Textarea
                    id="edit-description"
                    rows={4}
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="max-h-[42vh] overflow-auto resize-y"
                    onPaste={handleEditPaste}
                    ref={editDescriptionRef}
                  />
                  <p className="text-xs text-muted-foreground">
                    Paste an image or use “Insert image” to upload and embed it.
                  </p>
                </>
              ) : (
                <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                  {editDescription.trim().length > 0 ? (
                    <MarkdownContent content={editDescription} />
                  ) : (
                    <p className="text-muted-foreground">No description provided.</p>
                  )}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="edit-severity">Severity</Label>
                <Select
                  value={editSeverity}
                  onValueChange={(v) => setEditSeverity(v as BugSeverity)}
                  disabled={!isEditingEnabled}
                >
                  <SelectTrigger id="edit-severity" className="justify-start text-left">
                    <span>
                      {severityOptions.find((option) => option.value === editSeverity)?.label ??
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
              {isAdmin && (
                <div className="grid gap-1.5">
                  <Label htmlFor="edit-status">Status</Label>
                  <Select
                    value={editStatus}
                    onValueChange={(v) => setEditStatus(v as BugStatus)}
                    disabled={!isEditingEnabled}
                  >
                    <SelectTrigger id="edit-status">
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
              )}
            </div>
            {/* Only show priority selector for admin users */}
            {isAdmin && (
              <div className="grid gap-1.5">
                <Label htmlFor="edit-priority">Priority</Label>
                <Select
                  value={editPriority}
                  onValueChange={(v) => setEditPriority(v as BugPriority)}
                  disabled={!isEditingEnabled}
                >
                  <SelectTrigger id="edit-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
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
                  id="experienced-toggle"
                  disabled={editingBug?.user_id === currentUserId}
                />
                <Label
                  htmlFor="experienced-toggle"
                  className="text-sm"
                >
                  I&apos;ve experienced this bug too
                </Label>
              </div>
              {editingBug?.user_id === currentUserId && (
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
                  id="new-comment"
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
          </div>
          <DialogFooter className="mt-auto">
            <Button variant="outline" onClick={() => setEditingBug(null)}>
              {isEditingEnabled ? "Cancel" : "Close"}
            </Button>
            {isEditingEnabled && (
              <Button onClick={handleSaveEdit} disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
