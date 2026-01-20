export type ComponentStatus = "not_started" | "in_progress" | "completed" | "blocked"
export type BugSeverity = "low" | "medium" | "high" | "critical"
export type BugPriority = "low" | "medium" | "high"
export type BugStatus = "open" | "reviewed" | "closed" | "fixed"

export interface Profile {
  id: string
  email: string | null
  display_name: string | null
  username: string | null
  organisation: string | null
  is_admin: boolean
  created_at: string
  updated_at: string
}

export interface Component {
  id: string
  name: string
  description: string | null
  guides_markdown: string | null
  display_order: number
  campaign_id: string | null
  created_at: string
  updated_at: string
}

export interface UserComponentStatus {
  id: string
  user_id: string
  component_id: string
  is_selected: boolean
  status: ComponentStatus
  created_at: string
  updated_at: string
}

export interface Bug {
  id: string
  component_id: string
  user_id: string
  title: string
  description: string
  severity: BugSeverity
  priority: BugPriority
  status: BugStatus
  created_at: string
  updated_at: string
  // Joined fields
  component?: Component
  profile?: Profile
}

export interface Campaign {
  id: string
  name: string
  description: string | null
  start_date: string | null
  end_date: string | null
  details: string | null
  created_at: string
  updated_at: string
}

export interface ComponentCategory {
  id: string
  name: string
  color: string
}

export interface ComponentResource {
  id: string
  component_id: string
  name: string
  type: "testpad" | "markdown"
  content: string | null
  created_at: string
  updated_at: string
}
