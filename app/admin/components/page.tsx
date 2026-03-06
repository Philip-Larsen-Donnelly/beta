import Link from "next/link"
import { fetchComponents } from "@/lib/data"
import { Button } from "@/components/ui/button"
import { ChevronLeft } from "lucide-react"
import { AdminComponentList } from "@/components/admin/component-list"

export default async function AdminComponentsPage() {
  const components = await fetchComponents()

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link href="/admin">
          <Button variant="ghost" size="sm">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Admin Dashboard
          </Button>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Manage Components</h1>
        <p className="text-muted-foreground">Configure the components available for testing</p>
      </div>

      <AdminComponentList components={components || []} />
    </div>
  )
}
