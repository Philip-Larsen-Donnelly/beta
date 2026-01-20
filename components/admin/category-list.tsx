"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plus, Pencil, Trash2, Palette } from "lucide-react"
import type { ComponentCategory } from "@/lib/types"
import { createCategory, updateCategory, deleteCategory } from "@/lib/actions"

interface CategoryListProps {
  categories: ComponentCategory[]
}

export function CategoryList({ categories: initialCategories }: CategoryListProps) {
  const router = useRouter()
  const [categories, setCategories] = useState(initialCategories)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [editing, setEditing] = useState<ComponentCategory | null>(null)

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this category? It will be removed from any components.")) return
    const result = await deleteCategory(id)
    if (result.success) {
      setCategories(categories.filter((c) => c.id !== id))
      router.refresh()
    }
  }

  const handleSave = async (data: { name: string; color: string }, id?: string) => {
    if (id) {
      const result = await updateCategory(id, data)
      if (result.success && result.category) {
        setCategories(categories.map((c) => (c.id === id ? result.category : c)))
        setEditing(null)
      }
    } else {
      const result = await createCategory(data)
      if (result.success && result.category) {
        setCategories([...categories, result.category])
        setIsAddOpen(false)
      }
    }
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[85vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>Add Category</DialogTitle>
              <DialogDescription>Create a new component category</DialogDescription>
            </DialogHeader>
            <CategoryForm onSave={(data) => handleSave(data)} onCancel={() => setIsAddOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        {categories.map((category) => (
          <Card key={category.id}>
            <CardHeader className="py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-6 w-6 rounded-full border" style={{ backgroundColor: category.color }} />
                  <CardTitle className="text-base">{category.name}</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Dialog open={editing?.id === category.id} onOpenChange={(open) => !open && setEditing(null)}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm" onClick={() => setEditing(category)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[85vh] overflow-auto">
                      <DialogHeader>
                        <DialogTitle>Edit Category</DialogTitle>
                        <DialogDescription>Update category name or color</DialogDescription>
                      </DialogHeader>
                      <CategoryForm
                        initialData={category}
                        onSave={(data) => handleSave(data, category.id)}
                        onCancel={() => setEditing(null)}
                      />
                    </DialogContent>
                  </Dialog>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(category.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}

        {categories.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">No categories yet.</CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

interface CategoryFormProps {
  initialData?: ComponentCategory
  onSave: (data: { name: string; color: string }) => void
  onCancel: () => void
}

function CategoryForm({ initialData, onSave, onCancel }: CategoryFormProps) {
  const [name, setName] = useState(initialData?.name || "")
  const [color, setColor] = useState(initialData?.color || "#16a34a")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({ name, color })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-1.5">
        <Label htmlFor="name">Name</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="grid gap-1.5">
        <Label className="flex items-center gap-2">
          <Palette className="h-4 w-4 text-muted-foreground" />
          Color
        </Label>
        <div className="flex items-center gap-3">
          <Input
            type="color"
            aria-label="Pick color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-9 w-14 p-1"
          />
          <Input
            id="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="font-mono"
            required
          />
          <div className="h-8 w-8 rounded border" style={{ backgroundColor: color }} />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">{initialData ? "Save Changes" : "Create Category"}</Button>
      </div>
    </form>
  )
}

