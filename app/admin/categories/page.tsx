import { fetchCategories } from "@/lib/data"
import { CategoryList } from "@/components/admin/category-list"

export default async function AdminCategoriesPage() {
  const categories = await fetchCategories()

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Component Categories</h1>
        <p className="text-muted-foreground">Create, edit, and delete categories for components.</p>
      </div>

      <CategoryList categories={categories} />
    </div>
  )
}

