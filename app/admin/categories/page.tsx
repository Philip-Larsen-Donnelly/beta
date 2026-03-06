import Link from "next/link"
import { fetchCategories } from "@/lib/data"
import { Button } from "@/components/ui/button"
import { ChevronLeft } from "lucide-react"
import { CategoryList } from "@/components/admin/category-list"

export default async function AdminCategoriesPage() {
  const categories = await fetchCategories()

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link href="/admin">
          <Button variant="ghost" size="sm">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Admin Dashboard
          </Button>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Component Categories</h1>
        <p className="text-muted-foreground">Create, edit, and delete categories for components.</p>
      </div>

      <CategoryList categories={categories} />
    </div>
  )
}

