"use server"

import { query } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { hashPassword, verifyPassword, requireProfile } from "@/lib/auth"
import type { Bug, BugPriority, BugSeverity, ComponentStatus } from "@/lib/types"

export async function submitBug(data: {
  componentId: string
  userId: string
  title: string
  description: string
  severity: BugSeverity
  priority: BugPriority
  isAdmin?: boolean
}) {
  await query(
    `INSERT INTO bugs (component_id, user_id, title, description, severity, priority, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'open')`,
    [data.componentId, data.userId, data.title, data.description, data.severity, data.priority],
  )
  revalidatePath("/testing")
  revalidatePath("/testing/campaign")
  return { success: true }
}

export async function updateComponentSelection(data: {
  userId: string
  componentId: string
  isSelected: boolean
  existingStatusId?: string
}) {
  if (data.existingStatusId) {
    const { rows } = await query(
      `UPDATE user_component_status
       SET is_selected = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [data.isSelected, data.existingStatusId],
    )
    return rows[0] ?? null
  }

  const { rows } = await query(
    `INSERT INTO user_component_status (user_id, component_id, is_selected, status)
     VALUES ($1, $2, $3, 'not_started')
     ON CONFLICT (user_id, component_id) DO UPDATE
       SET is_selected = EXCLUDED.is_selected,
           updated_at = NOW()
     RETURNING *`,
    [data.userId, data.componentId, data.isSelected],
  )
  revalidatePath("/testing")
  revalidatePath("/testing/campaign")
  return rows[0] ?? null
}

export async function updateComponentStatus(data: {
  userId: string
  componentId: string
  status: ComponentStatus
  existingStatusId?: string
}) {
  if (data.existingStatusId) {
    const { rows } = await query(
      `UPDATE user_component_status
       SET status = $1, is_selected = true, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [data.status, data.existingStatusId],
    )
    return rows[0] ?? null
  }

  const { rows } = await query(
    `INSERT INTO user_component_status (user_id, component_id, status, is_selected)
     VALUES ($1, $2, $3, true)
     ON CONFLICT (user_id, component_id) DO UPDATE
       SET status = EXCLUDED.status,
           is_selected = true,
           updated_at = NOW()
     RETURNING *`,
    [data.userId, data.componentId, data.status],
  )
  revalidatePath("/testing")
  revalidatePath("/testing/campaign")
  return rows[0] ?? null
}

export async function updateBug(id: string, updates: Partial<Bug>) {
  const fields: string[] = []
  const values: unknown[] = []
  const allowed: (keyof Bug)[] = ["title", "description", "severity", "priority", "status", "component_id"]

  Object.entries(updates).forEach(([k, v]) => {
    if (allowed.includes(k as keyof Bug) && v !== undefined) {
      fields.push(`${k} = $${fields.length + 1}`)
      values.push(v)
    }
  })

  if (fields.length === 0) {
    const { rows } = await query<Bug>("SELECT * FROM bugs WHERE id = $1", [id])
    return { success: true, bug: rows[0] }
  }

  values.push(new Date().toISOString(), id)
  const { rows } = await query<Bug>(
    `UPDATE bugs
     SET ${fields.join(", ")}, updated_at = $${fields.length + 1}
     WHERE id = $${fields.length + 2}
     RETURNING *`,
    values,
  )

  return { success: true, bug: rows[0] }
}

export async function createCampaign(data: {
  name: string
  description: string
  start_date: string | null
  end_date: string | null
  details: string | null
}) {
  const { rows } = await query(
    `INSERT INTO campaigns (name, description, start_date, end_date, details)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [data.name, data.description, data.start_date, data.end_date, data.details],
  )
  return { success: true, campaign: rows[0] }
}

export async function updateCampaign(
  id: string,
  data: {
    name: string
    description: string
    start_date: string | null
    end_date: string | null
    details: string | null
  },
) {
  const { rows } = await query(
    `UPDATE campaigns
     SET name = $1,
         description = $2,
         start_date = $3,
         end_date = $4,
         details = $5,
         updated_at = NOW()
     WHERE id = $6
     RETURNING *`,
    [data.name, data.description, data.start_date, data.end_date, data.details, id],
  )
  return { success: true, campaign: rows[0] }
}

export async function deleteCampaign(id: string) {
  await query("DELETE FROM campaigns WHERE id = $1", [id])
  return { success: true }
}

export async function createComponent(data: {
  name: string
  description: string
  guides_markdown: string
  display_order: number
  campaign_id: string
  categoryIds?: string[]
}) {
  const { rows } = await query(
    `INSERT INTO components (name, description, guides_markdown, display_order, campaign_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [data.name, data.description, data.guides_markdown, data.display_order, data.campaign_id],
  )
  const component = rows[0]
  if (component && data.categoryIds) {
    await query("DELETE FROM component_category_map WHERE component_id = $1", [component.id])
    if (data.categoryIds.length > 0) {
      await query(
        `INSERT INTO component_category_map (component_id, category_id)
         SELECT $1, UNNEST($2::uuid[])`,
        [component.id, data.categoryIds],
      )
    }
  }
  return { success: true, component: rows[0] }
}

export async function updateComponent(
  id: string,
  data: {
    name: string
    description: string
    guides_markdown: string
    display_order: number
    categoryIds?: string[]
  },
) {
  const { rows } = await query(
    `UPDATE components
     SET name = $1,
         description = $2,
         guides_markdown = $3,
         display_order = $4,
         updated_at = NOW()
     WHERE id = $5
     RETURNING *`,
    [data.name, data.description, data.guides_markdown, data.display_order, id],
  )
  if (data.categoryIds) {
    await query("DELETE FROM component_category_map WHERE component_id = $1", [id])
    if (data.categoryIds.length > 0) {
      await query(
        `INSERT INTO component_category_map (component_id, category_id)
         SELECT $1, UNNEST($2::uuid[])`,
        [id, data.categoryIds],
      )
    }
  }
  return { success: true, component: rows[0] }
}

export async function deleteComponent(id: string) {
  await query("DELETE FROM components WHERE id = $1", [id])
  return { success: true }
}

export async function deleteComponents(ids: string[]) {
  await query("DELETE FROM components WHERE id = ANY($1::uuid[])", [ids])
  return { success: true }
}

export async function copyComponentToCampaign(componentId: string, targetCampaignId: string) {
  const { rows: originals } = await query(
    "SELECT * FROM components WHERE id = $1 LIMIT 1",
    [componentId],
  )
  const original = originals[0]
  if (!original) return { success: false, error: "Component not found" }

  const { rows: maxRows } = await query(
    `SELECT COALESCE(MAX(display_order), -1) AS max_order
     FROM components WHERE campaign_id = $1`,
    [targetCampaignId],
  )
  const newOrder = Number(maxRows[0]?.max_order ?? -1) + 1

  const { rows } = await query(
    `INSERT INTO components (name, description, guides_markdown, display_order, campaign_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [original.name, original.description, original.guides_markdown, newOrder, targetCampaignId],
  )
  const newComponent = rows[0]

  const { rows: existingCategories } = await query<{ category_id: string }>(
    "SELECT category_id FROM component_category_map WHERE component_id = $1",
    [componentId],
  )
  if (existingCategories.length > 0) {
    await query(
      `INSERT INTO component_category_map (component_id, category_id)
       SELECT $1, UNNEST($2::uuid[])`,
      [newComponent.id, existingCategories.map((c) => c.category_id)],
    )
  }

  return { success: true, component: newComponent }
}

export async function copyComponentsToCampaign(componentIds: string[], targetCampaignId: string) {
  const results = await Promise.all(componentIds.map((id) => copyComponentToCampaign(id, targetCampaignId)))
  const failed = results.filter((r) => !r.success)
  if (failed.length > 0) return { success: false, error: `Failed to copy ${failed.length} component(s)` }
  return { success: true }
}

export async function reorderComponents(campaignId: string, orderedIds: string[]) {
  await Promise.all(
    orderedIds.map((id, index) =>
      query("UPDATE components SET display_order = $1, updated_at = NOW() WHERE id = $2 AND campaign_id = $3", [
        index,
        id,
        campaignId,
      ]),
    ),
  )
  return { success: true }
}

export async function deleteUser(userId: string) {
  await query("DELETE FROM profiles WHERE id = $1", [userId])
  return { success: true }
}

export async function deleteUsers(userIds: string[]) {
  await query("DELETE FROM profiles WHERE id = ANY($1::uuid[])", [userIds])
  return { success: true }
}

export async function adminChangeUserPassword(userId: string, newPassword: string) {
  const hashed = await hashPassword(newPassword)
  await query("UPDATE profiles SET password_hash = $1, updated_at = NOW() WHERE id = $2", [hashed, userId])
  return { success: true }
}

export async function changeOwnPassword(currentPassword: string, newPassword: string) {
  const profile = await requireProfile()
  const { rows } = await query<{ password_hash: string }>(
    "SELECT password_hash FROM profiles WHERE id = $1",
    [profile.id],
  )
  const record = rows[0]
  if (!record) return { success: false, error: "User not found" }

  const valid = await verifyPassword(currentPassword, record.password_hash)
  if (!valid) return { success: false, error: "Current password is incorrect" }

  const hashed = await hashPassword(newPassword)
  await query("UPDATE profiles SET password_hash = $1, updated_at = NOW() WHERE id = $2", [hashed, profile.id])
  return { success: true }
}

export async function updateUser(userId: string, updates: { is_admin?: boolean }) {
  const fields: string[] = []
  const values: unknown[] = []
  if (updates.is_admin !== undefined) {
    fields.push(`is_admin = $${fields.length + 1}`)
    values.push(updates.is_admin)
  }
  if (fields.length === 0) return { success: true }
  values.push(userId)
  await query(`UPDATE profiles SET ${fields.join(", ")}, updated_at = NOW() WHERE id = $${values.length}`, values)
  return { success: true }
}

export async function deleteBug(bugId: string) {
  await query("DELETE FROM bugs WHERE id = $1", [bugId])
  return { success: true }
}

export async function deleteBugs(bugIds: string[]) {
  await query("DELETE FROM bugs WHERE id = ANY($1::uuid[])", [bugIds])
  return { success: true }
}

export async function attachBugToComponent(bugId: string, componentId: string) {
  await query("UPDATE bugs SET component_id = $1, updated_at = NOW() WHERE id = $2", [componentId, bugId])
  return { success: true }
}

export async function attachBugsToComponent(bugIds: string[], componentId: string) {
  await query("UPDATE bugs SET component_id = $1, updated_at = NOW() WHERE id = ANY($2::uuid[])", [
    componentId,
    bugIds,
  ])
  return { success: true }
}

export async function createCategory(data: { name: string; color: string }) {
  const { rows } = await query(
    `INSERT INTO component_categories (name, color)
     VALUES ($1, $2)
     RETURNING *`,
    [data.name, data.color],
  )
  return { success: true, category: rows[0] }
}

export async function updateCategory(id: string, data: { name: string; color: string }) {
  const { rows } = await query(
    `UPDATE component_categories
     SET name = $1, color = $2, updated_at = NOW()
     WHERE id = $3
     RETURNING *`,
    [data.name, data.color, id],
  )
  return { success: true, category: rows[0] }
}

export async function deleteCategory(id: string) {
  await query("DELETE FROM component_categories WHERE id = $1", [id])
  return { success: true }
}

