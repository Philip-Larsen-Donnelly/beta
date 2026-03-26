"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { ArrowDown, ArrowUp, ArrowUpDown, MessageSquare } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import type { Bug, BugSeverity, BugPriority, BugStatus } from "@/lib/types"
import { cn, formatBugRef, bugPermalink, formatCompactDateTime } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"
import { Bug as BugIcon, Eye, Pencil } from "lucide-react"
import { updateBug } from "@/lib/actions"
import { MarkdownContent } from "@/components/markdown-content"

type TableSortField = "title" | "reporter" | "status" | "severity" | "priority" | "comments" | "reported" | "last_updated"
type TableSortDirection = "asc" | "desc"

type BugCommentItem = {
  id: string
  bug_id: string
  user_id: string
  content: string
  created_at: string
  updated_at: string | null
  deleted_at: string | null
  profile: { display_name: string | null; email: string | null } | null
}

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

const severityOptions = [
  { value: "low", label: "Low", description: "Minor issue, cosmetic" },
  { value: "medium", label: "Medium", description: "Feature impaired" },
  { value: "high", label: "High", description: "Major feature broken" },
  { value: "critical", label: "Critical", description: "System crash, data loss" },
] as const

interface BugListProps {
  bugs: (Bug & {
    profile: { display_name: string | null; email: string | null } | null
    comment_count?: number
    last_activity_at?: string
  })[]
  currentUserId: string
  isAdmin: boolean
  onBugUpdated: () => void
  variant?: "table" | "cards"
  maxItems?: number
}

export function BugList({ bugs, currentUserId, isAdmin, onBugUpdated, variant = "table", maxItems }: BugListProps) {
  const [tableSortField, setTableSortField] = useState<TableSortField>("last_updated")
  const [tableSortDirection, setTableSortDirection] = useState<TableSortDirection>("desc")
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
  const [commentError, setCommentError] = useState<string | null>(null)
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [commentToDeleteId, setCommentToDeleteId] = useState<string | null>(null)
  const [isCommentActionSubmitting, setIsCommentActionSubmitting] = useState(false)
  const [editMediaError, setEditMediaError] = useState<string | null>(null)
  const [hasExperienced, setHasExperienced] = useState(false)
  const [voteCount, setVoteCount] = useState(0)
  const editDescriptionRef = useRef<HTMLTextAreaElement | null>(null)
  const editFileInputRef = useRef<HTMLInputElement | null>(null)
  const commentTextRef = useRef<HTMLTextAreaElement | null>(null)
  const commentFileInputRef = useRef<HTMLInputElement | null>(null)
  const editCommentRef = useRef<HTMLTextAreaElement | null>(null)
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
    setEditMediaError(null)
    setViewMode("view")
  }

  const saveBug = async () => {
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
    onBugUpdated()
  }

  const handleSaveEdit = async () => {
    await saveBug()
    setEditingBug(null)
  }

  useEffect(() => {
    if (!editingBug) return
    let mounted = true
    setComments([])
    setCommentError(null)
    setEditingCommentId(null)
    setCommentToDeleteId(null)
    if (commentTextRef.current) commentTextRef.current.value = ""
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
    const content = commentTextRef.current?.value?.trim()
    if (!editingBug || !content) return
    setCommentError(null)
    try {
      const res = await fetch("/api/bug-comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bugId: editingBug.id, content }),
      })
      if (!res.ok) throw new Error("Failed to add comment")
      const comment = await res.json()
      setComments((prev) => [...prev, comment])
      if (commentTextRef.current) commentTextRef.current.value = ""
    } catch (error) {
      setCommentError(
        error instanceof Error ? error.message : "Failed to add comment",
      )
    }
  }

  const getErrorMessage = async (res: Response, fallback: string) => {
    try {
      const data = await res.json()
      if (typeof data?.error === "string") return data.error
    } catch {}
    return fallback
  }

  const startEditingComment = (comment: BugCommentItem) => {
    setEditingCommentId(comment.id)
    setCommentError(null)
    requestAnimationFrame(() => {
      if (editCommentRef.current) editCommentRef.current.value = comment.content
    })
  }

  const saveCommentEdit = async (commentId: string) => {
    const content = editCommentRef.current?.value?.trim()
    if (!content) {
      setCommentError("Comment content cannot be empty")
      return
    }
    setIsCommentActionSubmitting(true)
    setCommentError(null)
    try {
      const res = await fetch("/api/bug-comments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId, content }),
      })
      if (!res.ok) {
        throw new Error(await getErrorMessage(res, "Failed to update comment"))
      }
      const updated = (await res.json()) as BugCommentItem
      setComments((prev) => prev.map((comment) => (comment.id === commentId ? updated : comment)))
      setEditingCommentId(null)
    } catch (error) {
      setCommentError(error instanceof Error ? error.message : "Failed to update comment")
    } finally {
      setIsCommentActionSubmitting(false)
    }
  }

  const softDeleteComment = async (commentId: string) => {
    setIsCommentActionSubmitting(true)
    setCommentError(null)
    try {
      const res = await fetch("/api/bug-comments", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId }),
      })
      if (!res.ok) {
        throw new Error(await getErrorMessage(res, "Failed to delete comment"))
      }
      const updated = (await res.json()) as BugCommentItem
      setComments((prev) => prev.map((comment) => (comment.id === commentId ? updated : comment)))
      setCommentToDeleteId(null)
      if (editingCommentId === commentId) {
        setEditingCommentId(null)
      }
    } catch (error) {
      setCommentError(error instanceof Error ? error.message : "Failed to delete comment")
    } finally {
      setIsCommentActionSubmitting(false)
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

  const uploadMedia = async (file: File) => {
    const formData = new FormData()
    formData.append("file", file)
    const res = await fetch("/api/uploads", {
      method: "POST",
      body: formData,
    })
    if (!res.ok) {
      let message = "Failed to upload media"
      try {
        const data = await res.json()
        if (typeof data?.error === "string") {
          message = data.error
        }
      } catch {}
      throw new Error(message)
    }
    const data = await res.json()
    return data.url as string
  }

  const buildEmbeddedMediaMarkdown = (file: File, url: string) => {
    if (file.type.startsWith("video/")) return `[${file.name}](${url})`
    return `![${file.name}](${url})`
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

  const insertCommentAtCursor = (text: string) => {
    const el = commentTextRef.current
    if (!el) return
    const start = el.selectionStart ?? el.value.length
    const end = el.selectionEnd ?? el.value.length
    el.value = el.value.slice(0, start) + text + el.value.slice(end)
    const pos = start + text.length
    el.focus()
    el.setSelectionRange(pos, pos)
  }

  const handleEditPaste = async (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (!canEditFields) return
    const items = event.clipboardData?.items
    if (!items) return
    for (const item of items) {
      if (item.type.startsWith("image/") || item.type.startsWith("video/")) {
        event.preventDefault()
        const file = item.getAsFile()
        if (!file) return
        const buffer = await file.arrayBuffer()
        const safeFile = new File([buffer], file.name || "pasted-image", {
          type: file.type || "image/png",
        })
        try {
          setEditMediaError(null)
          const url = await uploadMedia(safeFile)
          insertEditAtCursor(buildEmbeddedMediaMarkdown(safeFile, url))
        } catch (uploadError) {
          setEditMediaError(uploadError instanceof Error ? uploadError.message : "Failed to upload media")
        }
        return
      }
    }
  }

  const handleEditFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!canEditFields) return
    const file = event.target.files?.[0]
    if (!file) return
    try {
      setEditMediaError(null)
      const url = await uploadMedia(file)
      insertEditAtCursor(buildEmbeddedMediaMarkdown(file, url))
    } catch (uploadError) {
      setEditMediaError(uploadError instanceof Error ? uploadError.message : "Failed to upload media")
    }
    event.target.value = ""
  }

  const handleCommentPaste = async (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = event.clipboardData?.items
    if (!items) return
    for (const item of items) {
      if (item.type.startsWith("image/") || item.type.startsWith("video/")) {
        event.preventDefault()
        const file = item.getAsFile()
        if (!file) return
        const buffer = await file.arrayBuffer()
        const safeFile = new File([buffer], file.name || "pasted-image", {
          type: file.type || "image/png",
        })
        try {
          setCommentError(null)
          const url = await uploadMedia(safeFile)
          insertCommentAtCursor(buildEmbeddedMediaMarkdown(safeFile, url))
        } catch (uploadError) {
          setCommentError(uploadError instanceof Error ? uploadError.message : "Failed to upload media")
        }
        return
      }
    }
  }

  const handleCommentFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      setCommentError(null)
      const url = await uploadMedia(file)
      insertCommentAtCursor(buildEmbeddedMediaMarkdown(file, url))
    } catch (uploadError) {
      setCommentError(uploadError instanceof Error ? uploadError.message : "Failed to upload media")
    }
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
                    <div className="flex items-start gap-2 mb-1.5">
                      {formatBugRef(bug.bug_number, bug.campaign_code) && (
                        <a
                          href={bugPermalink(bug.bug_number, bug.campaign_code) || "#"}
                          onClick={(e) => e.stopPropagation()}
                          className="font-mono text-xs text-muted-foreground hover:text-primary shrink-0 mt-0.5"
                        >
                          {formatBugRef(bug.bug_number, bug.campaign_code)}
                        </a>
                      )}
                      <h3 className="text-sm font-medium">{bug.title}</h3>
                      {isOwnBug && (
                        <Badge variant="outline" className="text-xs shrink-0 mt-0.5">
                          Yours
                        </Badge>
                      )}
                    </div>
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

  const toggleTableSort = (field: TableSortField) => {
    if (tableSortField === field) {
      setTableSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))
    } else {
      setTableSortField(field)
      setTableSortDirection("asc")
    }
  }

  const TableSortIcon = ({ field }: { field: TableSortField }) => {
    if (tableSortField !== field) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
    return tableSortDirection === "asc" ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />
  }

  const sortedBugs = useMemo(() => {
    const next = [...bugs]
    next.sort((a, b) => {
      const valA: string | number = (() => {
        switch (tableSortField) {
          case "title":
            return a.title
          case "reporter":
            return a.profile?.display_name || a.profile?.email || ""
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
        switch (tableSortField) {
          case "title":
            return b.title
          case "reporter":
            return b.profile?.display_name || b.profile?.email || ""
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
        return tableSortDirection === "asc" ? valA - valB : valB - valA
      }
      const cmp = String(valA).localeCompare(String(valB))
      return tableSortDirection === "asc" ? cmp : -cmp
    })
    return next
  }, [bugs, tableSortField, tableSortDirection])

  // Table variant for full lists
  const renderTable = () => (
    <div className="rounded-md border">
      <Table className="table-fixed [&_th]:h-8 [&_th]:px-1 [&_th]:py-1 [&_th]:text-[12px] [&_td]:px-1 [&_td]:py-1 [&_td]:text-[12px] [&_th]:whitespace-normal [&_td]:whitespace-normal">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[35%] whitespace-normal">
              <button onClick={() => toggleTableSort("title")} className="flex items-center font-medium hover:text-foreground">
                Title
                <TableSortIcon field="title" />
              </button>
            </TableHead>
            <TableHead className="w-[12%]">
              <button onClick={() => toggleTableSort("reporter")} className="flex items-center font-medium hover:text-foreground">
                Reporter
                <TableSortIcon field="reporter" />
              </button>
            </TableHead>
            <TableHead className="w-[7%]">
              <button onClick={() => toggleTableSort("status")} className="flex items-center font-medium hover:text-foreground">
                Status
                <TableSortIcon field="status" />
              </button>
            </TableHead>
            <TableHead className="w-[7%]">
              <button onClick={() => toggleTableSort("severity")} className="flex items-center font-medium hover:text-foreground">
                Severity
                <TableSortIcon field="severity" />
              </button>
            </TableHead>
            <TableHead className="w-[7%]">
              <button onClick={() => toggleTableSort("priority")} className="flex items-center font-medium hover:text-foreground">
                Priority
                <TableSortIcon field="priority" />
              </button>
            </TableHead>
            <TableHead className="w-[6%] text-center">
              <button
                onClick={() => toggleTableSort("comments")}
                className="flex w-full items-center justify-center font-medium hover:text-foreground"
              >
                Comments
                <TableSortIcon field="comments" />
              </button>
            </TableHead>
            <TableHead className="w-[12%] text-right">
              <button
                onClick={() => toggleTableSort("reported")}
                className="ml-auto flex items-center font-medium hover:text-foreground"
              >
                Reported
                <TableSortIcon field="reported" />
              </button>
            </TableHead>
            <TableHead className="w-[14%] text-right">
              <button
                onClick={() => toggleTableSort("last_updated")}
                className="ml-auto flex items-center font-medium hover:text-foreground"
              >
                Last Updated
                <TableSortIcon field="last_updated" />
              </button>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedBugs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                No bugs reported yet.
              </TableCell>
            </TableRow>
          ) : (
            sortedBugs.map((bug) => {
              const isOwnBug = bug.user_id === currentUserId
              return (
                <TableRow
                  key={bug.id}
                  className={cn("cursor-pointer hover:bg-muted/50", isOwnBug && "bg-muted/30")}
                  onClick={() => openEditDialog(bug)}
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
                    <div className="flex items-center gap-1">
                      <span>{bug.profile?.display_name || bug.profile?.email || "Unknown"}</span>
                      {Number(bug.vote_count ?? 0) > 0 && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0">
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
              )
            })
          )}
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
                  <BugIcon className="h-5 w-5 text-muted-foreground shrink-0" />
                  {formatBugRef(editingBug?.bug_number, editingBug?.campaign_code) && (
                    <a
                      href={bugPermalink(editingBug?.bug_number, editingBug?.campaign_code) || "#"}
                      className="font-mono text-sm text-muted-foreground hover:text-primary shrink-0"
                      title="Open bug permalink"
                    >
                      {formatBugRef(editingBug?.bug_number, editingBug?.campaign_code)}
                    </a>
                  )}
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
                  <div className="inline-flex w-fit rounded-md border border-primary/30 bg-primary/5 p-1 mr-6">
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
            </DialogHeader>
            <div className="overflow-auto flex-1 space-y-4 py-4">
            <div className="grid gap-1.5">
              <Label htmlFor="edit-description">Description</Label>
              {isEditingEnabled ? (
                <>
                  <div className="relative">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="absolute right-0 top-0 z-10 h-8 rounded-none rounded-tr-md border-l border-b px-2 text-xs"
                      onClick={() => editFileInputRef.current?.click()}
                    >
                      Insert media
                    </Button>
                    <input
                      ref={editFileInputRef}
                      type="file"
                      accept="image/*,video/mp4,video/quicktime,.mov"
                      className="hidden"
                      onChange={handleEditFileChange}
                    />
                    <Textarea
                      id="edit-description"
                      rows={4}
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      className="max-h-[42vh] overflow-auto resize-y pr-32 pt-10"
                      onPaste={handleEditPaste}
                      ref={editDescriptionRef}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Paste an image or use “Insert media” to upload and embed images/video.
                  </p>
                  {editMediaError && (
                    <p className="text-xs text-destructive">{editMediaError}</p>
                  )}
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
                        <div className="flex items-center gap-2">
                          <span>
                            {formatDistanceToNow(new Date(comment.created_at), {
                              addSuffix: true,
                            })}
                            {comment.updated_at && comment.updated_at !== comment.created_at ? " (edited)" : ""}
                          </span>
                          {comment.user_id === currentUserId && !comment.deleted_at && (
                            <>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs"
                                disabled={isCommentActionSubmitting}
                                onClick={() => startEditingComment(comment)}
                              >
                                Edit
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs text-destructive"
                                disabled={isCommentActionSubmitting}
                                onClick={() => setCommentToDeleteId(comment.id)}
                              >
                                Delete
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                      {editingCommentId === comment.id ? (
                        <div className="mt-2 space-y-2">
                          <Textarea
                            rows={3}
                            defaultValue={comment.content}
                            ref={editCommentRef}
                            placeholder="Edit your comment..."
                          />
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingCommentId(null)}
                              disabled={isCommentActionSubmitting}
                            >
                              Cancel
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => saveCommentEdit(comment.id)}
                              disabled={isCommentActionSubmitting}
                            >
                              Save
                            </Button>
                          </div>
                        </div>
                      ) : comment.deleted_at ? (
                        <p className="mt-1 italic text-muted-foreground">Comment deleted by user.</p>
                      ) : (
                        <div className="mt-1">
                          <MarkdownContent content={comment.content} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {commentError && (
                <p className="text-sm text-destructive">{commentError}</p>
              )}
              <div className="group grid gap-2">
                <div className="relative">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="absolute right-0 top-0 z-10 h-8 rounded-none rounded-tr-md border-l border-b px-2 text-xs"
                    onClick={() => commentFileInputRef.current?.click()}
                  >
                    Insert media
                  </Button>
                  <input
                    ref={commentFileInputRef}
                    type="file"
                    accept="image/*,video/mp4,video/quicktime,.mov"
                    className="hidden"
                    onChange={handleCommentFileChange}
                  />
                  <Textarea
                    id="new-comment"
                    rows={3}
                    defaultValue=""
                    placeholder="Add a comment..."
                    className="pr-32 pt-10"
                    onPaste={handleCommentPaste}
                    ref={commentTextRef}
                  />
                </div>
                <p className="min-h-4 text-xs text-muted-foreground opacity-0 transition-opacity group-focus-within:opacity-100">
                  Paste an image or use &quot;Insert media&quot; to upload and embed images/video.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddComment}
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
      <AlertDialog
        open={commentToDeleteId !== null}
        onOpenChange={(open) => {
          if (!open) setCommentToDeleteId(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Comment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this comment? This will keep a deleted placeholder in the thread.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCommentActionSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isCommentActionSubmitting || !commentToDeleteId}
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => {
                if (commentToDeleteId) void softDeleteComment(commentToDeleteId)
              }}
            >
              {isCommentActionSubmitting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
