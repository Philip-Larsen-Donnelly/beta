"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Circle, Clock, CheckCircle2, Ban, Bug } from "lucide-react"
import { updateComponentStatus } from "@/lib/actions"
import type { Component, UserComponentStatus, ComponentStatus, Bug as BugType } from "@/lib/types"
import { cn } from "@/lib/utils"
import { BugSubmissionForm } from "@/components/bug-submission-form"
import { BugList } from "@/components/bug-list"
import { MarkdownContent } from "@/components/markdown-content"

const statusConfig: Record<
  ComponentStatus,
  { label: string; icon: React.ElementType; className: string; selectClassName: string }
> = {
  not_started: {
    label: "Not Started",
    icon: Circle,
    className: "bg-muted text-muted-foreground",
    selectClassName: "border-muted",
  },
  in_progress: {
    label: "In Progress",
    icon: Clock,
    className: "bg-blue-500/10 text-blue-700 border-blue-200",
    selectClassName: "border-blue-300 bg-blue-500/10 text-blue-700",
  },
  completed: {
    label: "Completed",
    icon: CheckCircle2,
    className: "bg-green-500/10 text-green-700 border-green-200",
    selectClassName: "border-green-300 bg-green-500/10 text-green-700",
  },
  blocked: {
    label: "Blocked",
    icon: Ban,
    className: "bg-red-500/10 text-red-700 border-red-200",
    selectClassName: "border-red-300 bg-red-500/10 text-red-700",
  },
}

interface ComponentDetailViewProps {
  component: Component
  userStatus: UserComponentStatus | null
  bugs: (BugType & { profile: { display_name: string | null; email: string | null } | null })[]
  userId: string
  isAdmin: boolean
}

export function ComponentDetailView({ component, userStatus, bugs, userId, isAdmin }: ComponentDetailViewProps) {
  const router = useRouter()
  const [status, setStatus] = useState<ComponentStatus>(userStatus?.status ?? "not_started")
  const [showReportModal, setShowReportModal] = useState(false)

  const config = statusConfig[status]

  const myBugs = bugs.filter((bug) => bug.user_id === userId)

  const handleStatusChange = async (newStatus: ComponentStatus) => {
    setStatus(newStatus)

    await updateComponentStatus({
      userId,
      componentId: component.id,
      status: newStatus,
      existingStatusId: userStatus?.id,
    })
  }

  const handleBugSubmitted = () => {
    setShowReportModal(false)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">{component.name}</h1>
          <p className="text-muted-foreground">{component.description}</p>
        </div>
        <Select value={status} onValueChange={(value) => handleStatusChange(value as ComponentStatus)}>
          <SelectTrigger className={cn("w-40 h-9", config.selectClassName)}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(statusConfig).map(([key, { label, icon: Icon }]) => (
              <SelectItem key={key} value={key}>
                <div className="flex items-center gap-1.5">
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Guides */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Guides</h2>
          <Card>
            <CardContent className="pt-4">
              {component.guides_markdown ? (
                <MarkdownContent content={component.guides_markdown} />
              ) : (
                <p className="text-sm text-muted-foreground">No testing guidelines available for this component.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - My Bugs */}
        <div className="space-y-4">
          {/* Header with button */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">My Bugs</h2>
            <Button onClick={() => setShowReportModal(true)}>
              <Bug className="h-4 w-4 mr-2" />
              Report a Bug
            </Button>
          </div>

          {/* My bugs count */}
          <p className="text-sm text-muted-foreground">
            {myBugs.length} bug{myBugs.length !== 1 ? "s" : ""} reported by you
          </p>

          {/* My bugs list */}
          <BugList bugs={myBugs} currentUserId={userId} isAdmin={isAdmin} onBugUpdated={handleBugSubmitted} variant="cards" maxItems={3} />
        </div>
      </div>

      {/* Full-width All Bugs section */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">All bugs reported for this component</h2>
        <p className="text-sm text-muted-foreground">
          {bugs.length} bug{bugs.length !== 1 ? "s" : ""} total
        </p>
        <BugList bugs={bugs} currentUserId={userId} isAdmin={isAdmin} onBugUpdated={handleBugSubmitted} />
      </div>

      {/* Report Bug Modal */}
      <Dialog open={showReportModal} onOpenChange={setShowReportModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Submit a Bug Report</DialogTitle>
            <DialogDescription>Found an issue? Report it here</DialogDescription>
          </DialogHeader>
          <BugSubmissionForm
            componentId={component.id}
            userId={userId}
            onSubmitted={handleBugSubmitted}
            isAdmin={isAdmin}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
