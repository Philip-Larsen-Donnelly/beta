"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
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

type TabKey = "guides" | "report" | "bugs"

export function ComponentDetailView({ component, userStatus, bugs, userId, isAdmin }: ComponentDetailViewProps) {
  const router = useRouter()
  const [status, setStatus] = useState<ComponentStatus>(userStatus?.status ?? "not_started")
  const [showOnlyMine, setShowOnlyMine] = useState(false)
  const [activeTab, setActiveTab] = useState<TabKey>("guides")

  useEffect(() => {
    const applyHashTab = () => {
      const hash = window.location.hash.replace("#", "")
      if (hash === "guides" || hash === "report" || hash === "bugs") {
        setActiveTab(hash)
      }
    }
    applyHashTab()
    window.addEventListener("hashchange", applyHashTab)
    return () => window.removeEventListener("hashchange", applyHashTab)
  }, [])

  const handleTabChange = (value: string) => {
    const next = (value as TabKey) || "guides"
    setActiveTab(next)
    const url = `${window.location.pathname}#${next}`
    window.history.replaceState(null, "", url)
  }

  const config = statusConfig[status]
  const StatusIcon = config.icon

  const filteredBugs = showOnlyMine ? bugs.filter((bug) => bug.user_id === userId) : bugs

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

      {/* Content */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList>
          <TabsTrigger value="guides">Guides</TabsTrigger>
          <TabsTrigger value="report">Report Bug</TabsTrigger>
          <TabsTrigger value="bugs" className="flex items-center gap-1.5">
            <Bug className="h-3.5 w-3.5" />
            Bugs ({bugs.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="guides">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Testing Resources and Guidance</CardTitle>
              {/* <CardDescription>You can use the following resources and guidance to test this component based on the use cases most important to you.</CardDescription> */}
            </CardHeader>
            <CardContent>
              {component.guides_markdown ? (
                <MarkdownContent content={component.guides_markdown} />
              ) : (
                <p className="text-sm text-muted-foreground">No testing guidelines available for this component.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="report">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Submit a Bug Report</CardTitle>
              <CardDescription>Found an issue? Report it here</CardDescription>
            </CardHeader>
            <CardContent>
              <BugSubmissionForm
                componentId={component.id}
                userId={userId}
                onSubmitted={handleBugSubmitted}
                isAdmin={isAdmin}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bugs" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {filteredBugs.length} bug{filteredBugs.length !== 1 ? "s" : ""} reported
            </p>
            <div className="flex items-center gap-2">
              <Switch id="show-mine" checked={showOnlyMine} onCheckedChange={setShowOnlyMine} />
              <Label htmlFor="show-mine" className="text-sm">
                Show only my bugs
              </Label>
            </div>
          </div>
          <BugList bugs={filteredBugs} currentUserId={userId} isAdmin={isAdmin} onBugUpdated={handleBugSubmitted} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
