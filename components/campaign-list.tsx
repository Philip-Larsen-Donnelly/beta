"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { FolderOpen, Calendar, Lock, History } from "lucide-react"
import { cn, formatDate } from "@/lib/utils"
import type { Campaign } from "@/lib/types"

interface CampaignListProps {
  campaigns: Campaign[]
  componentCounts: Record<string, number>
}

export function CampaignList({ campaigns, componentCounts }: CampaignListProps) {
  const [showRecentlyClosed, setShowRecentlyClosed] = useState(false)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const thirtyDaysAgo = new Date(today)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const getCampaignStatus = (campaign: Campaign) => {
    const startDate = campaign.start_date ? new Date(campaign.start_date) : null
    const endDate = campaign.end_date ? new Date(campaign.end_date) : null

    if (endDate && endDate < today) {
      const isRecentlyClosed = endDate >= thirtyDaysAgo
      return { active: false, reason: "Campaign ended", recentlyClosed: isRecentlyClosed }
    }
    if (startDate && startDate > today) {
      return { active: false, reason: "Campaign not started", recentlyClosed: false }
    }
    return { active: true, reason: null, recentlyClosed: false }
  }

  // Filter campaigns based on toggle
  const filteredCampaigns = campaigns.filter((campaign) => {
    const status = getCampaignStatus(campaign)

    // Always show active campaigns and upcoming campaigns
    if (status.active || status.reason === "Campaign not started") {
      return true
    }

    // Show recently closed only if toggle is on
    if (status.recentlyClosed && showRecentlyClosed) {
      return true
    }

    // Hide old closed campaigns
    return false
  })

  // Check if there are any recently closed campaigns to show the toggle
  const hasRecentlyClosed = campaigns.some((campaign) => {
    const status = getCampaignStatus(campaign)
    return status.recentlyClosed
  })

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Testing Campaigns</h1>
          <p className="text-muted-foreground">Select an active campaign to view its components and start testing</p>
        </div>

        {hasRecentlyClosed && (
          <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2">
            <History className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="show-recent" className="text-sm cursor-pointer whitespace-nowrap">
              Show recently completed campaigns
            </Label>
            <Switch id="show-recent" checked={showRecentlyClosed} onCheckedChange={setShowRecentlyClosed} />
          </div>
        )}
      </div>

      {filteredCampaigns.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredCampaigns.map((campaign) => {
            const status = getCampaignStatus(campaign)
            const CardWrapper = status.active ? Link : "div"

            return (
              <CardWrapper
                key={campaign.id}
                href={status.active ? `/testing/campaign/${campaign.id}` : undefined}
                className={cn(!status.active && "cursor-not-allowed")}
              >
                <Card
                  className={cn(
                    "h-full transition-colors",
                    status.active && "cursor-pointer hover:bg-muted/50",
                    !status.active && "opacity-50",
                  )}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {status.active ? (
                        <FolderOpen className="h-5 w-5" />
                      ) : (
                        <Lock className="h-5 w-5 text-muted-foreground" />
                      )}
                      {campaign.name}
                    </CardTitle>
                    {campaign.description && <CardDescription>{campaign.description}</CardDescription>}
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      {componentCounts[campaign.id] || 0} component
                      {(componentCounts[campaign.id] || 0) !== 1 ? "s" : ""}
                    </p>
                    {(campaign.start_date || campaign.end_date) && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {formatDate(campaign.start_date) || "No start"} – {formatDate(campaign.end_date) || "No end"}
                      </div>
                    )}
                    {!status.active && <p className="text-xs font-medium text-destructive">{status.reason}</p>}
                  </CardContent>
                </Card>
              </CardWrapper>
            )
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No campaigns available yet. Check back later or contact an administrator.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
