"use client"

import type React from "react"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { submitBug } from "@/lib/actions"
import type { BugSeverity, BugPriority } from "@/lib/types"

interface BugSubmissionFormProps {
  componentId: string
  userId: string
  onSubmitted: () => void
  isAdmin: boolean
}

export function BugSubmissionForm({ componentId, userId, onSubmitted, isAdmin }: BugSubmissionFormProps) {
  const severityOptions = [
    { value: "low", label: "Low", description: "Minor issue, cosmetic" },
    { value: "medium", label: "Medium", description: "Feature impaired" },
    { value: "high", label: "High", description: "Major feature broken" },
    { value: "critical", label: "Critical", description: "System crash, data loss" },
  ] as const
  const descriptionTemplate = `# Steps to Reproduce

Write down a specific step-by-step scenario to reproduce this issue. Include any attachments that may be relevant like screenshots, logs or files unless they contain personally identifiable information. 

# Actual Result

What was the outcome of those steps? 

# Expected Result

What was the behaviour that you expected?`
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState(descriptionTemplate)
  const [severity, setSeverity] = useState<BugSeverity>("medium")
  const [priority, setPriority] = useState<BugPriority>("medium")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const descriptionRef = useRef<HTMLTextAreaElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

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

  const handlePaste = async (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
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
    const file = event.target.files?.[0]
    if (!file) return
    const url = await uploadImage(file)
    insertAtCursor(`![${file.name}](${url})`)
    event.target.value = ""
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    setSuccess(false)

    try {
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
        setError("Failed to submit bug")
        return
      }
      setSuccess(true)
      setTitle("")
      setDescription(descriptionTemplate)
      setSeverity("medium")
      setPriority("medium")
      onSubmitted()
    } catch (submitError) {
      setIsSubmitting(false)
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to submit bug",
      )
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
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="description">Description</Label>
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
        </div>
        <Textarea
          id="description"
          rows={12}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onPaste={handlePaste}
          ref={descriptionRef}
          required
        />
        <p className="text-xs text-muted-foreground">
          Paste an image or use “Insert image” to upload and embed it.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="severity">Severity</Label>
          <Select value={severity} onValueChange={(v) => setSeverity(v as BugSeverity)}>
            <SelectTrigger id="severity" className="justify-start text-left">
              <span>
                {severityOptions.find((option) => option.value === severity)?.label ??
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
            <Label htmlFor="priority">Priority</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as BugPriority)}>
              <SelectTrigger id="priority" className="justify-start text-left">
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

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Submitting..." : "Submit Bug Report"}
      </Button>
    </form>
  )
}
