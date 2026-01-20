"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { submitBug } from "@/lib/actions"
import type { BugSeverity, BugPriority } from "@/lib/types"

interface BugSubmissionFormProps {
  componentId: string
  userId: string
  onSubmitted: () => void
  isAdmin: boolean
}

export function BugSubmissionForm({ componentId, userId, onSubmitted, isAdmin }: BugSubmissionFormProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [severity, setSeverity] = useState<BugSeverity>("medium")
  const [priority, setPriority] = useState<BugPriority>("medium")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    setSuccess(false)

    const result = await submitBug({
      componentId,
      userId,
      title,
      description,
      severity,
      priority,
      isAdmin,
    })

    setIsSubmitting(false)

    if (!result.success) {
      setError(result.error || "Failed to submit bug")
    } else {
      setSuccess(true)
      setTitle("")
      setDescription("")
      setSeverity("medium")
      setPriority("medium")
      onSubmitted()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-1.5">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          placeholder="Brief description of the bug"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Steps to reproduce, expected vs actual behavior..."
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="severity">Severity</Label>
          <Select value={severity} onValueChange={(v) => setSeverity(v as BugSeverity)}>
            <SelectTrigger id="severity">
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
            <Label htmlFor="priority">Priority</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as BugPriority)}>
              <SelectTrigger id="priority">
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

      {error && <p className="text-sm text-destructive">{error}</p>}
      {success && <p className="text-sm text-green-600">Bug submitted successfully!</p>}

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Severity legend</p>
        <div className="flex flex-col gap-2 text-xs text-muted-foreground">
          <div className="inline-flex items-center gap-2 whitespace-nowrap">
            <Badge variant="outline" className="bg-red-500/10 text-red-700 border-red-200">
              Critical
            </Badge>
            <span>System crash, data loss</span>
          </div>
          <div className="inline-flex items-center gap-2 whitespace-nowrap">
            <Badge variant="outline" className="bg-orange-500/10 text-orange-700 border-orange-200">
              High
            </Badge>
            <span>Major feature broken</span>
          </div>
          <div className="inline-flex items-center gap-2 whitespace-nowrap">
            <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700 border-yellow-200">
              Medium
            </Badge>
            <span>Feature impaired</span>
          </div>
          <div className="inline-flex items-center gap-2 whitespace-nowrap">
            <Badge variant="outline" className="bg-muted">
              Low
            </Badge>
            <span>Minor issue, cosmetic</span>
          </div>
        </div>
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Submitting..." : "Submit Bug Report"}
      </Button>
    </form>
  )
}
