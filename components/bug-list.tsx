"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { Bug, BugSeverity, BugPriority, BugStatus } from "@/lib/types"
import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"
import { Pencil } from "lucide-react"
import { updateBug } from "@/lib/actions"

const severityConfig: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-yellow-500/10 text-yellow-700 border-yellow-200",
  high: "bg-orange-500/10 text-orange-700 border-orange-200",
  critical: "bg-red-500/10 text-red-700 border-red-200",
}

const statusConfig: Record<string, string> = {
  open: "bg-blue-500/10 text-blue-700 border-blue-200",
  reviewed: "bg-purple-500/10 text-purple-700 border-purple-200",
  fixed: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
  closed: "bg-muted text-muted-foreground",
}

interface BugListProps {
  bugs: (Bug & { profile: { display_name: string | null; email: string | null } | null })[]
  currentUserId: string
  isAdmin: boolean
  onBugUpdated: () => void
}

export function BugList({ bugs, currentUserId, isAdmin, onBugUpdated }: BugListProps) {
  const [editingBug, setEditingBug] = useState<Bug | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editSeverity, setEditSeverity] = useState<BugSeverity>("medium")
  const [editPriority, setEditPriority] = useState<BugPriority>("medium")
  const [editStatus, setEditStatus] = useState<BugStatus>("open")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const openEditDialog = (bug: Bug) => {
    setEditingBug(bug)
    setEditTitle(bug.title)
    setEditDescription(bug.description)
    setEditSeverity(bug.severity)
    setEditPriority(bug.priority)
    setEditStatus(bug.status)
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

  if (bugs.length === 0) {
    return <div className="rounded-md border p-8 text-center text-muted-foreground">No bugs reported yet.</div>
  }

  return (
    <>
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
                      <span className="font-medium">{bug.title}</span>
                      {isOwnBug && (
                        <Badge variant="outline" className="text-xs">
                          Yours
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1 max-w-[300px]">{bug.description}</p>
                  </TableCell>
                  <TableCell className="text-sm">
                    {bug.profile?.display_name || bug.profile?.email || "Unknown"}
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
                    {canEdit && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(bug)}>
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">Edit bug</span>
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* Edit Bug Dialog */}
      <Dialog open={!!editingBug} onOpenChange={(open) => !open && setEditingBug(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Edit Bug Report</DialogTitle>
            </DialogHeader>
            <div className="overflow-auto flex-1 space-y-4 py-4">
            <div className="grid gap-1.5">
              <Label htmlFor="edit-title">Title</Label>
              <Input id="edit-title" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                rows={4}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="max-h-[42vh] overflow-auto resize-y"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="edit-severity">Severity</Label>
                <Select value={editSeverity} onValueChange={(v) => setEditSeverity(v as BugSeverity)}>
                  <SelectTrigger id="edit-severity">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {isAdmin && (
                <div className="grid gap-1.5">
                  <Label htmlFor="edit-status">Status</Label>
                  <Select value={editStatus} onValueChange={(v) => setEditStatus(v as BugStatus)}>
                    <SelectTrigger id="edit-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="reviewed">Reviewed</SelectItem>
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
                <Select value={editPriority} onValueChange={(v) => setEditPriority(v as BugPriority)}>
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
          </div>
          <DialogFooter className="mt-auto">
            <Button variant="outline" onClick={() => setEditingBug(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
