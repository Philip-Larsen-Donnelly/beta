"use client"

import type React from "react"
import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Plus, Pencil, Trash2, LayoutGrid, Calendar, History, Lock } from "lucide-react"
import { createCampaign, updateCampaign, deleteCampaign } from "@/lib/actions"
import type { Campaign } from "@/lib/types"
import { formatDateRange } from "@/lib/utils"

interface AdminCampaignListProps {
  campaigns: Campaign[]
  componentCounts: Record<string, number>
}

export function AdminCampaignList({ campaigns: initialCampaigns, componentCounts }: AdminCampaignListProps) {
  const router = useRouter()
  const [campaigns, setCampaigns] = useState(initialCampaigns)
  const [showCompleted, setShowCompleted] = useState(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null)

  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const getStatus = (campaign: Campaign) => {
    const startDate = campaign.start_date ? new Date(campaign.start_date) : null
    const endDate = campaign.end_date ? new Date(campaign.end_date) : null
    const active = (!startDate || startDate <= today) && (!endDate || endDate >= today)
    const upcoming = startDate && startDate > today
    const completed = endDate && endDate < today
    return { active, upcoming, completed }
  }

  const visibleCampaigns = campaigns.filter((c) => {
    const status = getStatus(c)
    if (status.completed && !showCompleted) return false
    return true
  })

  const handleDelete = async (id: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this campaign? All components and bugs in this campaign will also be deleted.",
      )
    )
      return

    const result = await deleteCampaign(id)

    if (result.success) {
      setCampaigns(campaigns.filter((c) => c.id !== id))
    }
  }

  const handleSave = async (
    data: {
      name: string
      description: string
      start_date: string | null
      end_date: string | null
      details: string | null
    },
    id?: string,
  ) => {
    if (id) {
      const result = await updateCampaign(id, data)

      if (result.success && result.campaign) {
        setCampaigns(campaigns.map((c) => (c.id === id ? result.campaign : c)))
        setEditingCampaign(null)
      }
    } else {
      const result = await createCampaign(data)

      if (result.success && result.campaign) {
        setCampaigns([...campaigns, result.campaign])
        setIsAddDialogOpen(false)
      }
    }

    router.refresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2">
          <History className="h-4 w-4 text-muted-foreground" />
          <Label htmlFor="show-completed" className="text-sm cursor-pointer whitespace-nowrap">
            Show completed campaigns
          </Label>
          <Switch id="show-completed" checked={showCompleted} onCheckedChange={setShowCompleted} />
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Campaign
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[85vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>Add New Campaign</DialogTitle>
              <DialogDescription>Create a new testing campaign</DialogDescription>
            </DialogHeader>
            <CampaignForm onSave={(data) => handleSave(data)} onCancel={() => setIsAddDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        {visibleCampaigns.map((campaign) => {
          const status = getStatus(campaign)
          const statusLabel = status.completed ? "Completed" : status.upcoming ? "Upcoming" : "Active"
          const statusVariant = status.completed ? "outline" : status.upcoming ? "secondary" : "default"
          const statusIcon = status.completed ? <Lock className="h-3 w-3" /> : null

          return (
          <Card key={campaign.id}>
            <CardHeader className="py-3">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                  <CardTitle className="text-base">{campaign.name}</CardTitle>
                      <Badge variant={statusVariant} className="h-5 px-2 text-[11px] font-medium">
                        {statusIcon}
                        {statusIcon && <span className="ml-1" />}
                        {statusLabel}
                      </Badge>
                    </div>
                  {campaign.description && <p className="text-sm text-muted-foreground">{campaign.description}</p>}
                  {formatDateRange(campaign.start_date, campaign.end_date) && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDateRange(campaign.start_date, campaign.end_date)}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {componentCounts[campaign.id] || 0} component{(componentCounts[campaign.id] || 0) !== 1 ? "s" : ""}
                  </span>
                  <Link href={`/admin/campaigns/${campaign.id}/components`}>
                    <Button variant="outline" size="sm">
                      <LayoutGrid className="h-4 w-4 mr-1" />
                      Components
                    </Button>
                  </Link>
                  <Dialog
                    open={editingCampaign?.id === campaign.id}
                    onOpenChange={(open) => !open && setEditingCampaign(null)}
                  >
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm" onClick={() => setEditingCampaign(campaign)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[85vh] overflow-auto">
                      <DialogHeader>
                        <DialogTitle>Edit Campaign</DialogTitle>
                        <DialogDescription>Update campaign details</DialogDescription>
                      </DialogHeader>
                      <CampaignForm
                        initialData={campaign}
                        onSave={(data) => handleSave(data, campaign.id)}
                        onCancel={() => setEditingCampaign(null)}
                      />
                    </DialogContent>
                  </Dialog>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(campaign.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>
          )
        })}

        {visibleCampaigns.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              {showCompleted
                ? "No campaigns to display."
                : "No active or upcoming campaigns. Toggle to show completed campaigns."}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

interface CampaignFormProps {
  initialData?: Campaign
  onSave: (data: {
    name: string
    description: string
    start_date: string | null
    end_date: string | null
    details: string | null
  }) => void
  onCancel: () => void
}

function CampaignForm({ initialData, onSave, onCancel }: CampaignFormProps) {
  const [name, setName] = useState(initialData?.name || "")
  const [description, setDescription] = useState(initialData?.description || "")
  const [startDate, setStartDate] = useState(initialData?.start_date || "")
  const [endDate, setEndDate] = useState(initialData?.end_date || "")
  const [details, setDetails] = useState(initialData?.details || "")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      name,
      description,
      start_date: startDate || null,
      end_date: endDate || null,
      details: details || null,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-1.5">
        <Label htmlFor="name">Name</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="Brief description of this testing campaign..."
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="start_date">Start Date</Label>
          <Input id="start_date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="end_date">End Date</Label>
          <Input id="end_date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="details">Campaign Details (Markdown)</Label>
        <Textarea
          id="details"
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          rows={8}
          placeholder="# Campaign Details&#10;&#10;Add detailed information, instructions, or resources for testers...&#10;&#10;## Getting Started&#10;- Step 1&#10;- Step 2&#10;&#10;## Important Links&#10;- [Documentation](https://...)"
          className="font-mono text-sm max-h-[35vh] overflow-auto resize-y"
        />
        <p className="text-xs text-muted-foreground">
          Supports Markdown: headings (#, ##, ###), lists (- or 1.), **bold**, and `code`
        </p>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">{initialData ? "Save Changes" : "Create Campaign"}</Button>
      </div>
    </form>
  )
}
