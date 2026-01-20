import { fetchComponents } from "@/lib/data"
import { AdminComponentList } from "@/components/admin/component-list"

export default async function AdminComponentsPage() {
  const components = await fetchComponents()

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Manage Components</h1>
        <p className="text-muted-foreground">Configure the components available for testing</p>
      </div>

      <AdminComponentList components={components || []} />
    </div>
  )
}
