"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import type { BugSeverity, BugPriority, BugStatus } from "@/lib/types"
import { cn, formatBugRef } from "@/lib/utils"
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

interface BugDetailViewProps {
  bug: {
    id: string
    component_id: string
    user_id: string
    title: string
    description: string
    severity: string
    priority: string
    status: string
    bug_number: number | null
    campaign_code: string | null
    vote_count: number
    created_at: string
    updated_at: string
    component_name: string | null
    campaign_name: string | null
    profile_display_name: string | null
    profile_email: string | null
  }
  currentUserId: string
  isAdmin: boolean
}

export function BugDetailView({ bug, currentUserId, isAdmin }: BugDetailViewProps) {
  const router = useRouter()
  const canEditFields = isAdmin || bug.user_id === currentUserId
  const [viewMode, setViewMode] = useState<"edit" | "view">("view")
  const isEditingEnabled = canEditFields && viewMode === "edit"

  const [title, setTitle] = useState(bug.title)
  const [description, setDescription] = useState(bug.description)
  const [severity, setSeverity] = useState<BugSeverity>(bug.severity as BugSeverity)
  const [priority, setPriority] = useState<BugPriority>(bug.priority as BugPriority)
  const [status, setStatus] = useState<BugStatus>(bug.status as BugStatus)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [comments, setComments] = useState<BugCommentItem[]>([])
  const [commentsLoading, setCommentsLoading] = useState(true)
  const [commentText, setCommentText] = useState("")
  const [commentError, setCommentError] = useState<string | null>(null)
  const [hasExperienced, setHasExperienced] = useState(false)
  const [voteCount, setVoteCount] = useState(bug.vote_count)

  const descriptionRef = useRef<HTMLTextAreaElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const bugRef = formatBugRef(bug.bug_number, bug.campaign_code)

  useEffect(() => {
    let mounted = true
    Promise.all([
      fetch(`/api/bug-comments?bugId=${bug.id}`)
        .then((res) => (res.ok ? res.json() : Promise.reject(res)))
        .catch(() => []),
      fetch(`/api/bug-votes?bugId=${bug.id}`)
        .then((res) => (res.ok ? res.json() : Promise.reject(res)))
        .catch(() => ({ count: bug.vote_count, hasVoted: false })),
    ]).then(([commentRows, vote]) => {
      if (!mounted) return
      setComments(commentRows || [])
      setHasExperienced(Boolean(vote?.hasVoted))
      setVoteCount(Number(vote?.count ?? 0))
      setCommentsLoading(false)
    })
    return () => { mounted = false }
  }, [bug.id, bug.vote_count])

  const saveBug = async () => {
    setIsSubmitting(true)
    const updates: Record<string, unknown> = {
      title,
      description,
      severity,
    }
    if (isAdmin) {
      updates.priority = priority
      updates.status = status
    }
    await updateBug(bug.id, updates)
    setIsSubmitting(false)
    router.refresh()
  }

  const handleSave = async () => {
    await saveBug()
  }

  const uploadImage = async (file: File) => {
    const formData = new FormData()
    formData.append("file", file)
    const res = await fetch("/api/uploads", { method: "POST", body: formData })
    if (!res.ok) throw new Error("Failed to upload image")
    const data = await res.json()
    return data.url as string
  }

  const insertAtCursor = (text: string) => {
    const el = descriptionRef.current
    if (!el) {
      setDescription((prev) => prev + text)
      return
    }
    const start = el.selectionStart ?? description.length
    const end = el.selectionEnd ?? description.length
    setDescription((prev) => prev.slice(0, start) + text + prev.slice(end))
    window.requestAnimationFrame(() => {
      el.focus()
      const pos = start + text.length
      el.setSelectionRange(pos, pos)
    })
  }

  const handlePaste = async (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
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
        insertAtCursor(`![${safeFile.name}](${url})`)
        return
      }
    }
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!canEditFields) return
    const file = event.target.files?.[0]
    if (!file) return
    const url = await uploadImage(file)
    insertAtCursor(`![${file.name}](${url})`)
    event.target.value = ""
  }

  const handleAddComment = async () => {
    if (!commentText.trim()) return
    setCommentError(null)
    try {
      const res = await fetch("/api/bug-comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bugId: bug.id, content: commentText }),
      })
      if (!res.ok) throw new Error("Failed to add comment")
      const comment = await res.json()
      setComments((prev) => [...prev, comment])
      setCommentText("")
    } catch (error) {
      setCommentError(error instanceof Error ? error.message : "Failed to add comment")
    }
  }

  const handleToggleExperienced = async (checked: boolean) => {
    setHasExperienced(checked)
    try {
      const res = await fetch("/api/bug-votes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bugId: bug.id, hasExperienced: checked }),
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

  return (
    <Card className="max-w-4xl">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <BugIcon className="h-5 w-5 text-muted-foreground shrink-0" />
            {bugRef && (
              <span className="font-mono text-sm text-muted-foreground shrink-0">{bugRef}</span>
            )}
            {isEditingEnabled ? (
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-9 px-3 text-lg font-semibold flex-1"
              />
            ) : (
              <h1 className="text-lg font-semibold">{title}</h1>
            )}
          </div>
          {canEditFields && (
            <div className="inline-flex w-fit rounded-md border border-primary/30 bg-primary/5 p-1">
              <Button
                type="button"
                variant={viewMode === "edit" ? "default" : "ghost"}
                size="sm"
                className={cn("h-8 px-4 gap-1.5 font-medium", viewMode !== "edit" && "text-muted-foreground")}
                onClick={() => setViewMode("edit")}
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </Button>
              <Button
                type="button"
                variant={viewMode === "view" ? "default" : "ghost"}
                size="sm"
                className={cn("h-8 px-4 gap-1.5 font-medium", viewMode !== "view" && "text-muted-foreground")}
                onClick={async () => {
                  if (viewMode === "edit") {
                    await saveBug()
                  }
                  setViewMode("view")
                }}
              >
                <Eye className="h-3.5 w-3.5" />
                View
              </Button>
            </div>
          )}
        </div>
        {/* Meta info row */}
        <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
          <span>
            Reported by{" "}
            <span className="font-medium text-foreground">
              {bug.user_id === currentUserId
                ? "you"
                : bug.profile_display_name || bug.profile_email || "Unknown"}
            </span>
          </span>
          <span>·</span>
          <span>{formatDistanceToNow(new Date(bug.created_at), { addSuffix: true })}</span>
          {bug.component_name && (
            <>
              <span>·</span>
              <span>
                {bug.campaign_name && <>{bug.campaign_name} / </>}
                {bug.component_name}
              </span>
            </>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {/* Description */}
        <div className="grid gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <Label>Description</Label>
            {isEditingEnabled && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Insert image
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </>
            )}
          </div>
          {isEditingEnabled ? (
            <>
              <Textarea
                rows={6}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="max-h-[50vh] overflow-auto resize-y"
                onPaste={handlePaste}
                ref={descriptionRef}
              />
              <p className="text-xs text-muted-foreground">
                Paste an image or use &quot;Insert image&quot; to upload and embed it.
              </p>
            </>
          ) : (
            <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
              {description.trim().length > 0 ? (
                <MarkdownContent content={description} />
              ) : (
                <p className="text-muted-foreground">No description provided.</p>
              )}
            </div>
          )}
        </div>

        {/* Severity / Status */}
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-1.5">
            <Label>Severity</Label>
            {isEditingEnabled ? (
              <Select value={severity} onValueChange={(v) => setSeverity(v as BugSeverity)}>
                <SelectTrigger className="justify-start text-left">
                  <span>
                    {severityOptions.find((o) => o.value === severity)?.label ?? "Select severity"}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {severityOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex flex-col">
                        <span>{option.label}</span>
                        <span className="text-xs text-muted-foreground">{option.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Badge variant="outline" className={cn("w-fit", severityConfig[severity])}>
                {severity}
              </Badge>
            )}
          </div>
          <div className="grid gap-1.5">
            <Label>Status</Label>
            {isEditingEnabled && isAdmin ? (
              <Select value={status} onValueChange={(v) => setStatus(v as BugStatus)}>
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
            ) : (
              <Badge variant="outline" className={cn("w-fit", statusConfig[status])}>
                {status}
              </Badge>
            )}
          </div>
        </div>

        {/* Priority (admin only) */}
        {isAdmin && (
          <div className="grid gap-1.5">
            <Label>Priority</Label>
            {isEditingEnabled ? (
              <Select value={priority} onValueChange={(v) => setPriority(v as BugPriority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Badge variant="outline" className="w-fit">{priority}</Badge>
            )}
          </div>
        )}

        {/* Save button in edit mode */}
        {isEditingEnabled && (
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        )}

        {/* Reporters / voting */}
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
              onCheckedChange={(checked) => handleToggleExperienced(checked === true)}
              id="experienced-toggle"
              disabled={bug.user_id === currentUserId}
            />
            <Label htmlFor="experienced-toggle" className="text-sm">
              I&apos;ve experienced this bug too
            </Label>
          </div>
          {bug.user_id === currentUserId && (
            <p className="text-xs text-muted-foreground">
              You reported this bug, so your vote is already counted.
            </p>
          )}
        </div>

        {/* Comments */}
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
                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="mt-1 whitespace-pre-line">{comment.content}</p>
                </div>
              ))}
            </div>
          )}
          {commentError && <p className="text-sm text-destructive">{commentError}</p>}
          <div className="grid gap-2">
            <Textarea
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
      </CardContent>
    </Card>
  )
}
