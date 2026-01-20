import type {
  Bug,
  BugPriority,
  BugSeverity,
  BugStatus,
  Component,
  ComponentCategory,
  ComponentStatus,
  Profile,
  UserComponentStatus,
} from "./types"
import { query } from "./db"

export type BugWithRelations = Bug & {
  component: { name: string } | null
  profile: { display_name: string | null; email: string | null } | null
}

export async function fetchComponents(): Promise<Component[]> {
  const { rows } = await query<Component>(
    "SELECT * FROM components ORDER BY display_order ASC, created_at ASC",
  )
  return rows
}

export async function fetchCategories(): Promise<ComponentCategory[]> {
  const { rows } = await query<ComponentCategory>(
    "SELECT * FROM component_categories ORDER BY name ASC",
  )
  return rows
}

export async function fetchCampaigns() {
  const { rows } = await query(
    "SELECT * FROM campaigns ORDER BY start_date ASC NULLS LAST",
  )
  return rows
}

export async function fetchCampaignById(id: string) {
  const { rows } = await query("SELECT * FROM campaigns WHERE id = $1 LIMIT 1", [id])
  return rows[0] ?? null
}

export async function fetchComponentsForCampaign(campaignId: string) {
  const { rows } = await query<Component>(
    "SELECT * FROM components WHERE campaign_id = $1 ORDER BY display_order ASC",
    [campaignId],
  )
  return rows
}

export async function fetchCategoryMappingsForComponents(componentIds: string[]) {
  if (componentIds.length === 0) return [] as { component_id: string; category_id: string }[]
  const { rows } = await query<{ component_id: string; category_id: string }>(
    "SELECT component_id, category_id FROM component_category_map WHERE component_id = ANY($1::uuid[])",
    [componentIds],
  )
  return rows
}

export async function replaceComponentCategories(componentId: string, categoryIds: string[]) {
  await query("DELETE FROM component_category_map WHERE component_id = $1", [componentId])
  if (categoryIds.length === 0) return
  await query(
    `INSERT INTO component_category_map (component_id, category_id)
     SELECT $1, UNNEST($2::uuid[])`,
    [componentId, categoryIds],
  )
}

export async function fetchComponentCountsByCampaign() {
  const { rows } = await query<{ campaign_id: string | null }>(
    "SELECT campaign_id FROM components",
  )
  return rows
}

export async function fetchComponentById(id: string): Promise<Component | null> {
  const { rows } = await query<Component>("SELECT * FROM components WHERE id = $1 LIMIT 1", [id])
  return rows[0] ?? null
}

export async function fetchAdminCounts() {
  const [{ count: componentCount }] = (
    await query<{ count: string }>("SELECT COUNT(*) FROM components")
  ).rows
  const [{ count: bugCount }] = (await query<{ count: string }>("SELECT COUNT(*) FROM bugs")).rows
  const [{ count: openBugCount }] = (
    await query<{ count: string }>("SELECT COUNT(*) FROM bugs WHERE status = 'open'")
  ).rows
  const [{ count: userCount }] = (
    await query<{ count: string }>("SELECT COUNT(*) FROM profiles")
  ).rows

  return {
    componentCount: Number.parseInt(componentCount, 10) || 0,
    bugCount: Number.parseInt(bugCount, 10) || 0,
    openBugCount: Number.parseInt(openBugCount, 10) || 0,
    userCount: Number.parseInt(userCount, 10) || 0,
  }
}

export async function fetchBugsWithRelations(): Promise<BugWithRelations[]> {
  const { rows } = await query<
    Bug & { component_name: string | null; profile_display_name: string | null; profile_email: string | null }
  >(
    `SELECT b.*, c.name AS component_name, p.display_name AS profile_display_name, p.email AS profile_email
     FROM bugs b
     LEFT JOIN components c ON c.id = b.component_id
     LEFT JOIN profiles p ON p.id = b.user_id
     ORDER BY b.created_at DESC`,
  )

  return rows.map((row) => ({
    id: row.id,
    component_id: row.component_id,
    user_id: row.user_id,
    title: row.title,
    description: row.description,
    severity: row.severity as BugSeverity,
    priority: row.priority as BugPriority,
    status: row.status as BugStatus,
    created_at: row.created_at,
    updated_at: row.updated_at,
    component: row.component_name ? { name: row.component_name } : null,
    profile:
      row.profile_display_name !== null || row.profile_email !== null
        ? { display_name: row.profile_display_name, email: row.profile_email }
        : null,
  }))
}

export async function fetchComponentSelectOptions() {
  const { rows } = await query<{ id: string; name: string }>(
    "SELECT id, name FROM components ORDER BY name ASC",
  )
  return rows
}

export async function fetchStatusesForUser(userId: string): Promise<UserComponentStatus[]> {
  const { rows } = await query<UserComponentStatus>(
    "SELECT * FROM user_component_status WHERE user_id = $1",
    [userId],
  )
  return rows
}

export async function fetchAllStatuses() {
  const { rows } = await query<{ component_id: string; status: ComponentStatus }>(
    "SELECT component_id, status FROM user_component_status",
  )
  return rows
}

export async function fetchAllBugsMinimal() {
  const { rows } = await query<{ component_id: string; status: BugStatus }>(
    "SELECT component_id, status FROM bugs",
  )
  return rows
}

export async function fetchBugsForComponent(componentId: string) {
  const { rows } = await query<Bug>(
    "SELECT * FROM bugs WHERE component_id = $1 ORDER BY created_at DESC",
    [componentId],
  )
  return rows
}

export async function fetchBugsForComponents(componentIds: string[]) {
  if (componentIds.length === 0) return [] as Bug[]
  const { rows } = await query<Bug>(
    "SELECT * FROM bugs WHERE component_id = ANY($1::uuid[])",
    [componentIds],
  )
  return rows
}

export async function fetchResourcesForComponent(componentId: string) {
  const { rows } = await query<{
    id: string
    component_id: string
    name: string
    type: string
    content: string | null
    created_at: string
    updated_at: string
  }>("SELECT * FROM component_resources WHERE component_id = $1 ORDER BY created_at ASC", [componentId])
  return rows
}

export async function fetchStatusesForComponents(componentIds: string[]) {
  if (componentIds.length === 0) return [] as UserComponentStatus[]
  const { rows } = await query<UserComponentStatus>(
    "SELECT * FROM user_component_status WHERE component_id = ANY($1::uuid[])",
    [componentIds],
  )
  return rows
}

export async function fetchProfilesByIds(ids: string[]) {
  if (ids.length === 0) return [] as Profile[]

  const { rows } = await query<Profile>(
    "SELECT id, email, display_name, is_admin, created_at, updated_at FROM profiles WHERE id = ANY($1::uuid[])",
    [ids],
  )
  return rows
}

export async function fetchUserStatusForComponent(userId: string, componentId: string) {
  const { rows } = await query<UserComponentStatus>(
    "SELECT * FROM user_component_status WHERE user_id = $1 AND component_id = $2 LIMIT 1",
    [userId, componentId],
  )
  return rows[0] ?? null
}

export async function createBug({
  componentId,
  userId,
  title,
  description,
  severity,
  priority,
}: {
  componentId: string
  userId: string
  title: string
  description: string
  severity: BugSeverity
  priority: BugPriority
}) {
  const { rows } = await query<Bug>(
    `INSERT INTO bugs (component_id, user_id, title, description, severity, priority, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'open')
     RETURNING *`,
    [componentId, userId, title, description, severity, priority],
  )
  return rows[0]
}

export async function updateBugById(id: string, updates: Partial<Bug>) {
  const allowedKeys: (keyof Bug)[] = ["title", "description", "severity", "priority", "status"]
  const entries = Object.entries(updates).filter(([key, value]) => allowedKeys.includes(key as keyof Bug) && value !== undefined)

  if (entries.length === 0) {
    const { rows } = await query<Bug>("SELECT * FROM bugs WHERE id = $1 LIMIT 1", [id])
    return rows[0] ?? null
  }

  const setClauses: string[] = []
  const values: unknown[] = []

  entries.forEach(([key, value], idx) => {
    setClauses.push(`${key} = $${idx + 1}`)
    values.push(value)
  })

  const updatedAtIndex = entries.length + 1
  const idIndex = entries.length + 2

  const { rows } = await query<Bug>(
    `UPDATE bugs
     SET ${setClauses.join(", ")}, updated_at = $${updatedAtIndex}
     WHERE id = $${idIndex}
     RETURNING *`,
    [...values, new Date().toISOString(), id],
  )

  return rows[0] ?? null
}

export async function setComponentSelection({
  userId,
  componentId,
  isSelected,
  existingStatusId,
}: {
  userId: string
  componentId: string
  isSelected: boolean
  existingStatusId?: string
}) {
  if (existingStatusId) {
    const { rows } = await query<UserComponentStatus>(
      `UPDATE user_component_status
       SET is_selected = $1, updated_at = $2
       WHERE id = $3
       RETURNING *`,
      [isSelected, new Date().toISOString(), existingStatusId],
    )
    return rows[0] ?? null
  }

  const { rows } = await query<UserComponentStatus>(
    `INSERT INTO user_component_status (user_id, component_id, is_selected, status)
     VALUES ($1, $2, $3, 'not_started')
     ON CONFLICT (user_id, component_id) DO UPDATE SET
       is_selected = EXCLUDED.is_selected,
       updated_at = NOW()
     RETURNING *`,
    [userId, componentId, isSelected],
  )
  return rows[0] ?? null
}

export async function setComponentStatus({
  userId,
  componentId,
  status,
  existingStatusId,
}: {
  userId: string
  componentId: string
  status: ComponentStatus
  existingStatusId?: string
}) {
  if (existingStatusId) {
    const { rows } = await query<UserComponentStatus>(
      `UPDATE user_component_status
       SET status = $1, is_selected = true, updated_at = $2
       WHERE id = $3
       RETURNING *`,
      [status, new Date().toISOString(), existingStatusId],
    )
    return rows[0] ?? null
  }

  const { rows } = await query<UserComponentStatus>(
    `INSERT INTO user_component_status (user_id, component_id, status, is_selected)
     VALUES ($1, $2, $3, true)
     ON CONFLICT (user_id, component_id) DO UPDATE SET
       status = EXCLUDED.status,
       is_selected = true,
       updated_at = NOW()
     RETURNING *`,
    [userId, componentId, status],
  )
  return rows[0] ?? null
}

export async function createComponent(data: {
  name: string
  description: string
  guides_markdown: string
  display_order: number
}) {
  const { rows } = await query<Component>(
    `INSERT INTO components (name, description, guides_markdown, display_order)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [data.name, data.description, data.guides_markdown, data.display_order],
  )
  return rows[0]
}

export async function updateComponent(id: string, data: {
  name: string
  description: string
  guides_markdown: string
  display_order: number
}) {
  const { rows } = await query<Component>(
    `UPDATE components
     SET name = $1,
         description = $2,
         guides_markdown = $3,
         display_order = $4,
         updated_at = $5
     WHERE id = $6
     RETURNING *`,
    [data.name, data.description, data.guides_markdown, data.display_order, new Date().toISOString(), id],
  )
  return rows[0]
}

export async function deleteComponent(id: string) {
  await query("DELETE FROM components WHERE id = $1", [id])
}

