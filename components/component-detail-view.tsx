"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Circle, Clock, CheckCircle2, Ban, Bug } from "lucide-react"
import { updateComponentStatus } from "@/lib/actions"
import { CompletionConfirmationDialog } from "@/components/completion-confirmation-dialog"
import type {
  Component,
  UserComponentStatus,
  ComponentStatus,
  Bug as BugType,
  ComponentResource,
} from "@/lib/types"
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
  resources: ComponentResource[]
  userId: string
  isAdmin: boolean
}

export function ComponentDetailView({
  component,
  userStatus,
  bugs,
  resources,
  userId,
  isAdmin,
}: ComponentDetailViewProps) {
  const router = useRouter()
  const [status, setStatus] = useState<ComponentStatus>(userStatus?.status ?? "not_started")
  const [showReportModal, setShowReportModal] = useState(false)
  const [showCompleteModal, setShowCompleteModal] = useState(false)

  const config = statusConfig[status]

  const myBugs = bugs.filter((bug) => bug.user_id === userId)
  const testpadResources = resources.filter((resource) => resource.type === "testpad")
  const videoResources = resources.filter((resource) => resource.type === "video")
  const markdownResources = resources.filter((resource) => resource.type === "markdown")

  const resourceBadgeClass = (type: ComponentResource["type"]) =>
    cn(
      "text-xs hover:bg-muted/60 cursor-pointer",
      type === "testpad" && "bg-blue-500/10 text-blue-700 border-blue-200",
      type === "video" && "bg-purple-500/10 text-purple-700 border-purple-200",
      type === "markdown" && "bg-muted text-muted-foreground",
    )

  const handleStatusChange = async (newStatus: ComponentStatus) => {
    // If switching to completed, require confirmation first
    if (newStatus === "completed") {
      setShowCompleteModal(true)
      return
    }

    setStatus(newStatus)

    await updateComponentStatus({
      userId,
      componentId: component.id,
      status: newStatus,
      existingStatusId: userStatus?.id,
    })
  }

  const confirmComplete = async () => {
    setShowCompleteModal(false)
    setStatus("completed")

    await updateComponentStatus({
      userId,
      componentId: component.id,
      status: "completed",
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
        <CompletionConfirmationDialog
          open={showCompleteModal}
          onOpenChange={setShowCompleteModal}
          componentName={component.name}
          onConfirm={confirmComplete}
        />
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Guides */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Guides</h2>
          <Card
            className={
              !component.guides_markdown
                ? "border-dashed bg-muted/30 shadow-none"
                : undefined
            }
          >
            <CardContent className="pt-4">
              {component.guides_markdown ? (
                <MarkdownContent content={component.guides_markdown} />
              ) : (
                <p className="text-sm text-muted-foreground">No testing guidelines available for this component.</p>
              )}
            </CardContent>
          </Card>
          <h2 className="text-lg font-semibold">Resources</h2>
          <Card
            className={
              testpadResources.length === 0 &&
              videoResources.length === 0 &&
              markdownResources.length === 0
                ? "border-dashed bg-muted/30 shadow-none"
                : undefined
            }
          >
            <CardContent className="pt-4 space-y-4">
              {testpadResources.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    This component has premade test examples to follow or use as inspiration for your own tests
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {testpadResources.map((resource) => (
                      <Badge
                        key={resource.id}
                        asChild
                        variant="outline"
                        className={resourceBadgeClass(resource.type)}
                      >
                        <Link href={`/testing/resources/${resource.id}`}>
                          {resource.name}
                        </Link>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {videoResources.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Screencasts and feature demos
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {videoResources.map((resource) => (
                      <Badge
                        key={resource.id}
                        asChild
                        variant="outline"
                        className={resourceBadgeClass(resource.type)}
                      >
                        <Link href={`/testing/resources/${resource.id}`}>
                          {resource.name}
                        </Link>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {markdownResources.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Other useful resources
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {markdownResources.map((resource) => (
                      <Badge
                        key={resource.id}
                        asChild
                        variant="outline"
                        className={resourceBadgeClass(resource.type)}
                      >
                        <Link href={`/testing/resources/${resource.id}`}>
                          {resource.name}
                        </Link>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {testpadResources.length === 0 &&
                videoResources.length === 0 &&
                markdownResources.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No resources added for this component yet.
                  </p>
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
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Submit a Bug Report</DialogTitle>
            <DialogDescription>Found an issue? Report it here</DialogDescription>
          </DialogHeader>
          <div className="overflow-auto flex-1 space-y-4 py-4">
            <BugSubmissionForm
              componentId={component.id}
              userId={userId}
              onSubmitted={handleBugSubmitted}
              isAdmin={isAdmin}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
