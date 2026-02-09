"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Pencil, Trash2, Copy, MoreHorizontal, GripVertical } from "lucide-react"
import {
  createComponent,
  updateComponent,
  deleteComponent,
  deleteComponents,
  copyComponentsToCampaign,
  reorderComponents,
} from "@/lib/actions"
import type { Component, Campaign } from "@/lib/types"

interface AdminComponentListProps {
  components: Component[]
  campaignId: string
  otherCampaigns: Campaign[]
  categories: { id: string; name: string; color: string }[]
  categoryMap: Record<string, string[]>
}

export function AdminComponentList({
  components: initialComponents,
  campaignId,
  otherCampaigns,
  categories,
  categoryMap,
}: AdminComponentListProps) {
  const router = useRouter()
  const [components, setComponents] = useState(initialComponents)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingComponent, setEditingComponent] = useState<Component | null>(null)
  const [isCopyDialogOpen, setIsCopyDialogOpen] = useState(false)
  const [copyTargetCampaign, setCopyTargetCampaign] = useState<string>("")
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [selectedCategories, setSelectedCategories] = useState<Record<string, string[]>>(categoryMap)

  const allSelected = components.length > 0 && selectedIds.size === components.length
  const someSelected = selectedIds.size > 0

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(components.map((c) => c.id)))
    } else {
      setSelectedIds(new Set())
    }
  }

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSet = new Set(selectedIds)
    if (checked) {
      newSet.add(id)
    } else {
      newSet.delete(id)
    }
    setSelectedIds(newSet)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this component?")) return

    const result = await deleteComponent(id)

    if (result.success) {
      setComponents(components.filter((c) => c.id !== id))
      setSelectedIds((prev) => {
        const newSet = new Set(prev)
        newSet.delete(id)
        return newSet
      })
    }
  }

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} component(s)?`)) return

    const result = await deleteComponents(Array.from(selectedIds))

    if (result.success) {
      setComponents(components.filter((c) => !selectedIds.has(c.id)))
      setSelectedIds(new Set())
    }
  }

  const handleBulkCopy = async () => {
    if (!copyTargetCampaign) return

    const result = await copyComponentsToCampaign(Array.from(selectedIds), copyTargetCampaign)

    if (result.success) {
      setIsCopyDialogOpen(false)
      setCopyTargetCampaign("")
      setSelectedIds(new Set())
      alert("Components copied successfully!")
    } else {
      alert(result.error || "Failed to copy components")
    }
  }

  const moveComponent = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return components
    const list = [...components]
    const fromIndex = list.findIndex((c) => c.id === sourceId)
    const toIndex = list.findIndex((c) => c.id === targetId)
    if (fromIndex === -1 || toIndex === -1) return components
    const [moved] = list.splice(fromIndex, 1)
    list.splice(toIndex, 0, moved)
    return list
  }

  const handleDrop = async (targetId: string) => {
    if (!draggingId) return
    const newComponents = moveComponent(draggingId, targetId)
    if (newComponents !== components) {
      setComponents(newComponents)
      await reorderComponents(
        campaignId,
        newComponents.map((c) => c.id),
      )
      router.refresh()
    }
    setDraggingId(null)
  }

  const handleSave = async (
    data: { name: string; description: string; guides_markdown: string; categories: string[] },
    id?: string,
  ) => {
    if (id) {
      const component = components.find((c) => c.id === id)
      const result = await updateComponent(id, {
        ...data,
        display_order: component?.display_order || 0,
        categoryIds: data.categories,
      })

      if (result.success && result.component) {
        setComponents(components.map((c) => (c.id === id ? result.component : c)))
        setEditingComponent(null)
        setSelectedCategories((prev) => ({ ...prev, [id]: data.categories }))
      }
    } else {
      const maxOrder = components.length > 0 ? Math.max(...components.map((c) => c.display_order)) + 1 : 0
      const result = await createComponent({
        ...data,
        display_order: maxOrder,
        campaign_id: campaignId,
        categoryIds: data.categories,
      })

      if (result.success && result.component) {
        setComponents([...components, result.component])
        setSelectedCategories((prev) => ({ ...prev, [result.component.id]: data.categories }))
        setIsAddDialogOpen(false)
      }
    }

    router.refresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {someSelected && (
            <>
              <span className="text-sm text-muted-foreground">{selectedIds.size} selected</span>
              <Button variant="outline" size="sm" onClick={handleBulkDelete}>
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
              {otherCampaigns.length > 0 && (
                <Dialog open={isCopyDialogOpen} onOpenChange={setIsCopyDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Copy className="h-4 w-4 mr-1" />
                      Copy to...
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Copy Components to Campaign</DialogTitle>
                      <DialogDescription>
                        Select a campaign to copy {selectedIds.size} component(s) to.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <Select value={copyTargetCampaign} onValueChange={setCopyTargetCampaign}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select campaign" />
                        </SelectTrigger>
                        <SelectContent>
                          {otherCampaigns.map((campaign) => (
                            <SelectItem key={campaign.id} value={campaign.id}>
                              {campaign.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsCopyDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleBulkCopy} disabled={!copyTargetCampaign}>
                          Copy Components
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </>
          )}
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Component
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[85vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>Add New Component</DialogTitle>
              <DialogDescription>Create a new component for testers</DialogDescription>
            </DialogHeader>
            <ComponentForm
              onSave={(data) => handleSave(data)}
              onCancel={() => setIsAddDialogOpen(false)}
              categoryOptions={categories}
              selectedCategoryIds={[]}
            />
          </DialogContent>
        </Dialog>
      </div>

      {components.length === 0 ? (
        <div className="rounded-md border p-8 text-center text-muted-foreground">
          No components yet. Add your first component to get started.
        </div>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox checked={allSelected} onCheckedChange={handleSelectAll} aria-label="Select all" />
                </TableHead>
                <TableHead className="w-20">Order</TableHead>
                <TableHead>Component</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
        {components.map((component) => (
                <TableRow
                  key={component.id}
                  draggable
                  onDragStart={() => setDraggingId(component.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDrop(component.id)}
                  onDragEnd={() => setDraggingId(null)}
                  className={draggingId === component.id ? "opacity-50" : undefined}
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(component.id)}
                      onCheckedChange={(checked) => handleSelectOne(component.id, checked === true)}
                      aria-label={`Select ${component.name}`}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <GripVertical className="h-4 w-4" />
                      <span className="text-xs">Drag</span>
                    </div>
                  </TableCell>
                  <TableCell>
                  <div>
                      <div className="font-medium">{component.name}</div>
                  <div className="text-sm text-muted-foreground line-clamp-1">{component.description}</div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(selectedCategories[component.id] || []).map((catId) => {
                      const cat = categories.find((c) => c.id === catId)
                      if (!cat) return null
                      return (
                        <span
                          key={cat.id}
                          className="px-2 py-0.5 rounded text-xs font-medium border"
                          style={{ backgroundColor: `${cat.color}1A`, borderColor: cat.color, color: cat.color }}
                        >
                          {cat.name}
                        </span>
                      )
                    })}
                  </div>
                </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                  <Dialog
                    open={editingComponent?.id === component.id}
                    onOpenChange={(open) => !open && setEditingComponent(null)}
                  >
                    <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setEditingComponent(component)}
                          >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[85vh] overflow-auto">
                      <DialogHeader>
                        <DialogTitle>Edit Component</DialogTitle>
                        <DialogDescription>Update component details</DialogDescription>
                      </DialogHeader>
                      <ComponentForm
                        initialData={component}
                        onSave={(data) => handleSave(data, component.id)}
                        onCancel={() => setEditingComponent(null)}
                          categoryOptions={categories}
                          selectedCategoryIds={selectedCategories[component.id] || []}
                      />
                    </DialogContent>
                  </Dialog>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                  </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {otherCampaigns.length > 0 && (
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedIds(new Set([component.id]))
                                setIsCopyDialogOpen(true)
                              }}
                            >
                              <Copy className="h-4 w-4 mr-2" />
                              Copy to...
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(component.id)}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
              </div>
        )}
    </div>
  )
}

interface ComponentFormProps {
  initialData?: Component
  onSave: (data: { name: string; description: string; guides_markdown: string; categories: string[] }) => void
  onCancel: () => void
  categoryOptions: { id: string; name: string; color: string }[]
  selectedCategoryIds?: string[]
}

function ComponentForm({ initialData, onSave, onCancel, categoryOptions, selectedCategoryIds = [] }: ComponentFormProps) {
  const [name, setName] = useState(initialData?.name || "")
  const [description, setDescription] = useState(initialData?.description || "")
  const [guidesMarkdown, setGuidesMarkdown] = useState(initialData?.guides_markdown || "")
  const [categories, setCategories] = useState<string[]>(selectedCategoryIds)
  const [resources, setResources] = useState<
    { id: string; name: string; type: string; content: string | null }[]
  >([])
  const [resourceModalOpen, setResourceModalOpen] = useState(false)
  const [editingResource, setEditingResource] = useState<
    { id: string; name: string; type: string; content: string | null } | null
  >(null)

  // fetch resources when editing an existing component
  useEffect(() => {
    if (!initialData) return
    let mounted = true
    fetch(`/api/resources?componentId=${initialData.id}`)
      .then((r) => r.json())
      .then((rows) => mounted && setResources(rows || []))
      .catch(() => {})
    return () => {
      mounted = false
    }
  }, [initialData?.id])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({ name, description, guides_markdown: guidesMarkdown, categories })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-1.5">
          <Label htmlFor="name">Name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="description">Description</Label>
        <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>

      <div className="grid gap-1.5">
        <Label>Categories</Label>
        <div className="flex flex-wrap gap-2">
          {categoryOptions.map((cat) => {
            const checked = categories.includes(cat.id)
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() =>
                  setCategories((prev) =>
                    prev.includes(cat.id) ? prev.filter((c) => c !== cat.id) : [...prev, cat.id],
                  )
                }
                className={`px-2 py-1 rounded border text-xs font-medium transition ${
                  checked ? "" : "opacity-70"
                }`}
                style={{
                  backgroundColor: checked ? `${cat.color}1A` : undefined,
                  borderColor: cat.color,
                  color: cat.color,
                }}
              >
                {cat.name}
              </button>
            )
          })}
          {categoryOptions.length === 0 && <span className="text-xs text-muted-foreground">No categories defined.</span>}
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="guides">Testing Guidelines (Markdown)</Label>
        <Textarea
          id="guides"
          value={guidesMarkdown}
          onChange={(e) => setGuidesMarkdown(e.target.value)}
          rows={10}
          placeholder="## What to Test&#10;- Feature 1&#10;- Feature 2&#10;&#10;## Test Scenarios&#10;1. Do this&#10;2. Then that"
          className="font-mono text-sm max-h-[35vh] overflow-auto resize-y"
        />
      </div>

      <div className="grid gap-1.5">
        <Label>Resources</Label>
        {initialData ? (
          <div className="space-y-2">
            {resources.length === 0 ? (
              <div className="text-xs text-muted-foreground">No resources yet.</div>
            ) : (
              <ul className="space-y-1">
                {resources.map((r) => (
                  <li key={r.id} className="flex items-center justify-between rounded border p-2">
                    <div className="text-sm font-medium">{r.name}</div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingResource(r)
                          setResourceModalOpen(true)
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={async () => {
                          if (!confirm("Delete this resource?")) return
                          const res = await fetch(`/api/resources/${r.id}`, { method: "DELETE" })
                          if (res.ok) setResources((prev) => prev.filter((p) => p.id !== r.id))
                          else alert("Failed to delete resource")
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="pt-2 border-t flex justify-end">
              <Button
                type="button"
                onClick={() => {
                  setEditingResource(null)
                  setResourceModalOpen(true)
                }}
              >
                Add Resource
              </Button>
            </div>

            <Dialog open={resourceModalOpen} onOpenChange={setResourceModalOpen}>
              <DialogContent className="max-w-2xl max-h-[85vh] overflow-auto">
                <DialogHeader>
                  <DialogTitle>{editingResource ? "Edit Resource" : "Add Resource"}</DialogTitle>
                  <DialogDescription>
                    {editingResource ? "Update resource details" : "Create a resource for this component"}
                  </DialogDescription>
                </DialogHeader>
                <ResourceForm
                  initial={editingResource}
                  componentId={initialData.id}
                  onSave={(res) => {
                    if (editingResource) {
                      setResources((prev) => prev.map((p) => (p.id === res.id ? res : p)))
                    } else {
                      setResources((prev) => [...prev, res])
                    }
                    setResourceModalOpen(false)
                  }}
                  onCancel={() => setResourceModalOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">Resources are available after creating the component.</div>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">{initialData ? "Save Changes" : "Create Component"}</Button>
      </div>
    </form>
  )
}

  interface ResourceFormProps {
    initial?: { id: string; name: string; type: string; content: string | null } | null
    componentId: string
    onSave: (res: { id: string; name: string; type: string; content: string | null }) => void
    onCancel: () => void
  }

  function ResourceForm({ initial, componentId, onSave, onCancel }: ResourceFormProps) {
    const [name, setName] = useState(initial?.name || "")
    const [type, setType] = useState<"markdown" | "testpad" | "video">(
      (initial?.type as any) || "markdown",
    )
    const [content, setContent] = useState(initial?.content || "")
    const [saving, setSaving] = useState(false)

    const handleSave = async () => {
      setSaving(true)
      try {
        if (initial?.id) {
          const res = await fetch(`/api/resources/${initial.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, type, content }),
          })
          if (res.ok) {
            const updated = await res.json()
            onSave(updated)
          } else {
            alert("Failed to update resource")
          }
        } else {
          const res = await fetch(`/api/resources`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ component_id: componentId, name, type, content }),
          })
          if (res.ok) {
            const created = await res.json()
            onSave(created)
          } else {
            alert("Failed to create resource")
          }
        }
      } catch (e) {
        alert("Error saving resource")
      } finally {
        setSaving(false)
      }
    }

    return (
      <div className="space-y-4">
        <div className="grid gap-1.5">
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="grid gap-1.5">
          <Label>Type</Label>
          <Select value={type} onValueChange={(v) => setType(v as any)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="markdown">markdown</SelectItem>
              <SelectItem value="testpad">testpad</SelectItem>
              <SelectItem value="video">video</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-1.5">
          <Label>Content</Label>
          <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={8} className="max-h-[35vh] overflow-auto resize-y" />
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !name.trim()}>
            {initial?.id ? "Save" : "Create"}
          </Button>
        </div>
      </div>
    )
  }
