import { query } from "./db"

export interface UserProgressRow {
  user_id: string
  username: string | null
  display_name: string | null
  email: string | null
  organisation: string | null
  selected: number
  not_started: number
  in_progress: number
  completed: number
  blocked: number
  bugs_reported: number
  last_activity: string | null
}

export interface ComponentCoverageRow {
  component_id: string
  component_name: string
  testers_assigned: number
  not_started: number
  in_progress: number
  completed: number
  blocked: number
  bugs_found: number
}

export interface StaleItem {
  user_id: string
  username: string | null
  display_name: string | null
  component_id: string
  component_name: string
  status: string
  updated_at: string
  days_stale: number
}

export interface UnresolvedBugRow {
  id: string
  title: string
  severity: string
  status: string
  bug_number: number | null
  campaign_code: string | null
  component_name: string | null
  reporter_name: string | null
  vote_count: number
  comment_count: number
  created_at: string
  updated_at: string
  days_open: number
}

export interface BugsByComponentRow {
  component_id: string
  component_name: string
  total: number
  open: number
  reported: number
  closed: number
  fixed: number
  critical: number
  high: number
  medium: number
  low: number
  total_votes: number
}

export interface BugReporterRow {
  user_id: string
  username: string | null
  display_name: string | null
  organisation: string | null
  bugs_reported: number
  votes_received: number
  comments_made: number
  components_tested: number
}

export interface TestpadCoverageRow {
  resource_id: string
  resource_name: string
  component_id: string
  component_name: string
  total_steps: number
  users_attempted: number
  total_results: number
  pass_count: number
  fail_count: number
  blocked_count: number
}

export interface UserTestpadRow {
  user_id: string
  username: string | null
  display_name: string | null
  resource_id: string
  resource_name: string
  component_name: string
  steps_completed: number
  total_steps: number
  pass_count: number
  fail_count: number
  blocked_count: number
}

export interface UserActivityRow {
  user_id: string
  username: string | null
  display_name: string | null
  email: string | null
  organisation: string | null
  is_admin: boolean
  created_at: string
  last_session: string | null
  components_selected: number
  components_completed: number
  components_blocked: number
  bugs_submitted: number
  votes_cast: number
  comments_made: number
  testpad_steps: number
}

export interface CampaignSummaryRow {
  campaign_id: string
  campaign_name: string
  campaign_code: string | null
  start_date: string | null
  end_date: string | null
  total_components: number
  total_testers: number
  components_with_testers: number
  components_completed: number
  components_multi_tested: number
  avg_completions_per_component: number
  total_selections: number
  completed_selections: number
  blocked_selections: number
  total_bugs: number
  open_bugs: number
  reported_bugs: number
  closed_bugs: number
  fixed_bugs: number
  critical_bugs: number
  high_bugs: number
  medium_bugs: number
  low_bugs: number
  total_votes: number
}

// -- Testing Progress --

export async function fetchUserProgress(campaignId: string): Promise<UserProgressRow[]> {
  const { rows } = await query<UserProgressRow>(
    `SELECT
       p.id AS user_id,
       p.username,
       p.display_name,
       p.email,
       p.organisation,
       COUNT(ucs.id)::int AS selected,
       COUNT(ucs.id) FILTER (WHERE ucs.status = 'not_started')::int AS not_started,
       COUNT(ucs.id) FILTER (WHERE ucs.status = 'in_progress')::int AS in_progress,
       COUNT(ucs.id) FILTER (WHERE ucs.status = 'completed')::int AS completed,
       COUNT(ucs.id) FILTER (WHERE ucs.status = 'blocked')::int AS blocked,
       COALESCE(bug_counts.cnt, 0)::int AS bugs_reported,
       GREATEST(MAX(ucs.updated_at), COALESCE(MAX(bug_counts.last_bug), 'epoch'::timestamptz)) AS last_activity
     FROM profiles p
     INNER JOIN user_component_status ucs ON ucs.user_id = p.id AND ucs.is_selected = true
     INNER JOIN components comp ON comp.id = ucs.component_id AND comp.campaign_id = $1
     LEFT JOIN LATERAL (
       SELECT COUNT(*)::int AS cnt, MAX(b.created_at) AS last_bug
       FROM bugs b
       INNER JOIN components bc ON bc.id = b.component_id AND bc.campaign_id = $1
       WHERE b.user_id = p.id
     ) bug_counts ON true
     GROUP BY p.id, p.username, p.display_name, p.email, p.organisation, bug_counts.cnt, bug_counts.last_bug
     ORDER BY completed ASC, selected DESC`,
    [campaignId],
  )
  return rows
}

export async function fetchComponentCoverage(campaignId: string): Promise<ComponentCoverageRow[]> {
  const { rows } = await query<ComponentCoverageRow>(
    `SELECT
       comp.id AS component_id,
       comp.name AS component_name,
       COUNT(DISTINCT ucs.user_id)::int AS testers_assigned,
       COUNT(ucs.id) FILTER (WHERE ucs.status = 'not_started')::int AS not_started,
       COUNT(ucs.id) FILTER (WHERE ucs.status = 'in_progress')::int AS in_progress,
       COUNT(ucs.id) FILTER (WHERE ucs.status = 'completed')::int AS completed,
       COUNT(ucs.id) FILTER (WHERE ucs.status = 'blocked')::int AS blocked,
       COALESCE(bug_counts.cnt, 0)::int AS bugs_found
     FROM components comp
     LEFT JOIN user_component_status ucs ON ucs.component_id = comp.id AND ucs.is_selected = true
     LEFT JOIN LATERAL (
       SELECT COUNT(*)::int AS cnt FROM bugs WHERE component_id = comp.id
     ) bug_counts ON true
     WHERE comp.campaign_id = $1
     GROUP BY comp.id, comp.name, bug_counts.cnt
     ORDER BY comp.display_order ASC, comp.name ASC`,
    [campaignId],
  )
  return rows
}

// -- Stale Work Tracker --

export async function fetchStaleItems(campaignId: string, staleDays: number = 3): Promise<StaleItem[]> {
  const { rows } = await query<StaleItem>(
    `SELECT
       p.id AS user_id,
       p.username,
       p.display_name,
       comp.id AS component_id,
       comp.name AS component_name,
       ucs.status,
       ucs.updated_at,
       EXTRACT(DAY FROM NOW() - ucs.updated_at)::int AS days_stale
     FROM user_component_status ucs
     INNER JOIN profiles p ON p.id = ucs.user_id
     INNER JOIN components comp ON comp.id = ucs.component_id AND comp.campaign_id = $1
     WHERE ucs.is_selected = true
       AND ucs.status IN ('not_started', 'in_progress', 'blocked')
       AND ucs.updated_at < NOW() - MAKE_INTERVAL(days => $2)
     ORDER BY days_stale DESC, ucs.status ASC`,
    [campaignId, staleDays],
  )
  return rows
}

export async function fetchUnresolvedBugs(campaignId: string): Promise<UnresolvedBugRow[]> {
  const { rows } = await query<UnresolvedBugRow>(
    `SELECT
       b.id,
       b.title,
       b.severity,
       b.status,
       b.bug_number,
       camp.code AS campaign_code,
       comp.name AS component_name,
       COALESCE(p.display_name, p.username) AS reporter_name,
       COALESCE(vote_counts.cnt, 0)::int AS vote_count,
       COALESCE(comment_counts.cnt, 0)::int AS comment_count,
       b.created_at,
       b.updated_at,
       EXTRACT(DAY FROM NOW() - b.created_at)::int AS days_open
     FROM bugs b
     INNER JOIN components comp ON comp.id = b.component_id AND comp.campaign_id = $1
     LEFT JOIN campaigns camp ON camp.id = comp.campaign_id
     LEFT JOIN profiles p ON p.id = b.user_id
     LEFT JOIN LATERAL (
       SELECT COUNT(*)::int AS cnt FROM bug_votes WHERE bug_id = b.id
     ) vote_counts ON true
     LEFT JOIN LATERAL (
       SELECT COUNT(*)::int AS cnt FROM bug_comments WHERE bug_id = b.id
     ) comment_counts ON true
     WHERE b.status IN ('open', 'reported')
     ORDER BY
       CASE b.severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END ASC,
       vote_counts.cnt DESC,
       b.created_at ASC`,
    [campaignId],
  )
  return rows
}

// -- Bug Analytics --

export async function fetchBugStatusCounts(campaignId: string | null) {
  const where = campaignId
    ? "INNER JOIN components comp ON comp.id = b.component_id AND comp.campaign_id = $1"
    : ""
  const params = campaignId ? [campaignId] : []
  const { rows } = await query<{
    open: number; reported: number; closed: number; fixed: number;
    critical: number; high: number; medium: number; low: number; total: number
  }>(
    `SELECT
       COUNT(*) FILTER (WHERE b.status = 'open')::int AS open,
       COUNT(*) FILTER (WHERE b.status = 'reported')::int AS reported,
       COUNT(*) FILTER (WHERE b.status = 'closed')::int AS closed,
       COUNT(*) FILTER (WHERE b.status = 'fixed')::int AS fixed,
       COUNT(*) FILTER (WHERE b.severity = 'critical')::int AS critical,
       COUNT(*) FILTER (WHERE b.severity = 'high')::int AS high,
       COUNT(*) FILTER (WHERE b.severity = 'medium')::int AS medium,
       COUNT(*) FILTER (WHERE b.severity = 'low')::int AS low,
       COUNT(*)::int AS total
     FROM bugs b
     ${where}`,
    params,
  )
  return rows[0]
}

export async function fetchBugsByComponent(campaignId: string): Promise<BugsByComponentRow[]> {
  const { rows } = await query<BugsByComponentRow>(
    `SELECT
       comp.id AS component_id,
       comp.name AS component_name,
       COUNT(b.id)::int AS total,
       COUNT(b.id) FILTER (WHERE b.status = 'open')::int AS open,
       COUNT(b.id) FILTER (WHERE b.status = 'reported')::int AS reported,
       COUNT(b.id) FILTER (WHERE b.status = 'closed')::int AS closed,
       COUNT(b.id) FILTER (WHERE b.status = 'fixed')::int AS fixed,
       COUNT(b.id) FILTER (WHERE b.severity = 'critical')::int AS critical,
       COUNT(b.id) FILTER (WHERE b.severity = 'high')::int AS high,
       COUNT(b.id) FILTER (WHERE b.severity = 'medium')::int AS medium,
       COUNT(b.id) FILTER (WHERE b.severity = 'low')::int AS low,
       COALESCE(SUM(vote_counts.cnt), 0)::int AS total_votes
     FROM components comp
     LEFT JOIN bugs b ON b.component_id = comp.id
     LEFT JOIN LATERAL (
       SELECT COUNT(*)::int AS cnt FROM bug_votes WHERE bug_id = b.id
     ) vote_counts ON true
     WHERE comp.campaign_id = $1
     GROUP BY comp.id, comp.name
     HAVING COUNT(b.id) > 0
     ORDER BY COUNT(b.id) DESC`,
    [campaignId],
  )
  return rows
}

export async function fetchBugReporters(campaignId: string | null): Promise<BugReporterRow[]> {
  const campaignJoin = campaignId
    ? "INNER JOIN components comp ON comp.id = b.component_id AND comp.campaign_id = $1"
    : ""
  const params = campaignId ? [campaignId] : []
  const { rows } = await query<BugReporterRow>(
    `SELECT
       p.id AS user_id,
       p.username,
       p.display_name,
       p.organisation,
       COALESCE(bug_data.bugs_reported, 0)::int AS bugs_reported,
       COALESCE(bug_data.votes_received, 0)::int AS votes_received,
       COALESCE(comment_data.comments_made, 0)::int AS comments_made,
       COALESCE(component_data.components_tested, 0)::int AS components_tested
     FROM profiles p
     LEFT JOIN LATERAL (
       SELECT
         COUNT(DISTINCT b.id)::int AS bugs_reported,
         COALESCE(SUM((SELECT COUNT(*) FROM bug_votes bv WHERE bv.bug_id = b.id)), 0)::int AS votes_received
       FROM bugs b
       ${campaignJoin}
       WHERE b.user_id = p.id
     ) bug_data ON true
     LEFT JOIN LATERAL (
       SELECT COUNT(*)::int AS comments_made
       FROM bug_comments bc
       ${campaignId ? "INNER JOIN bugs b2 ON b2.id = bc.bug_id INNER JOIN components comp2 ON comp2.id = b2.component_id AND comp2.campaign_id = $1" : ""}
       WHERE bc.user_id = p.id
     ) comment_data ON true
     LEFT JOIN LATERAL (
       SELECT COUNT(DISTINCT ucs.component_id)::int AS components_tested
       FROM user_component_status ucs
       ${campaignId ? "INNER JOIN components comp3 ON comp3.id = ucs.component_id AND comp3.campaign_id = $1" : ""}
       WHERE ucs.user_id = p.id AND ucs.is_selected = true AND ucs.status = 'completed'
     ) component_data ON true
     WHERE COALESCE(bug_data.bugs_reported, 0) > 0
        OR COALESCE(comment_data.comments_made, 0) > 0
     ORDER BY COALESCE(bug_data.bugs_reported, 0) DESC`,
    params,
  )
  return rows
}

// -- Testpad Coverage --

export async function fetchTestpadCoverage(campaignId: string): Promise<TestpadCoverageRow[]> {
  const { rows } = await query<TestpadCoverageRow>(
    `SELECT
       cr.id AS resource_id,
       cr.name AS resource_name,
       comp.id AS component_id,
       comp.name AS component_name,
       COALESCE(step_data.total_steps, 0)::int AS total_steps,
       COALESCE(step_data.users_attempted, 0)::int AS users_attempted,
       COALESCE(step_data.total_results, 0)::int AS total_results,
       COALESCE(step_data.pass_count, 0)::int AS pass_count,
       COALESCE(step_data.fail_count, 0)::int AS fail_count,
       COALESCE(step_data.blocked_count, 0)::int AS blocked_count
     FROM component_resources cr
     INNER JOIN components comp ON comp.id = cr.component_id AND comp.campaign_id = $1
     LEFT JOIN LATERAL (
       SELECT
         COUNT(DISTINCT tr.step_index)::int AS total_steps,
         COUNT(DISTINCT tr.user_id)::int AS users_attempted,
         COUNT(*)::int AS total_results,
         COUNT(*) FILTER (WHERE tr.result = 'pass')::int AS pass_count,
         COUNT(*) FILTER (WHERE tr.result = 'fail')::int AS fail_count,
         COUNT(*) FILTER (WHERE tr.result = 'blocked')::int AS blocked_count
       FROM testpad_results tr
       WHERE tr.resource_id = cr.id
     ) step_data ON true
     WHERE cr.type = 'testpad'
     ORDER BY comp.display_order ASC, cr.name ASC`,
    [campaignId],
  )
  return rows
}

export async function fetchUserTestpadProgress(campaignId: string): Promise<UserTestpadRow[]> {
  const { rows } = await query<UserTestpadRow>(
    `SELECT
       p.id AS user_id,
       p.username,
       p.display_name,
       cr.id AS resource_id,
       cr.name AS resource_name,
       comp.name AS component_name,
       COUNT(tr.id)::int AS steps_completed,
       (SELECT COUNT(DISTINCT step_index) FROM testpad_results WHERE resource_id = cr.id)::int AS total_steps,
       COUNT(tr.id) FILTER (WHERE tr.result = 'pass')::int AS pass_count,
       COUNT(tr.id) FILTER (WHERE tr.result = 'fail')::int AS fail_count,
       COUNT(tr.id) FILTER (WHERE tr.result = 'blocked')::int AS blocked_count
     FROM testpad_results tr
     INNER JOIN profiles p ON p.id = tr.user_id
     INNER JOIN component_resources cr ON cr.id = tr.resource_id
     INNER JOIN components comp ON comp.id = cr.component_id AND comp.campaign_id = $1
     GROUP BY p.id, p.username, p.display_name, cr.id, cr.name, comp.name
     ORDER BY p.display_name ASC, comp.name ASC`,
    [campaignId],
  )
  return rows
}

// -- User Activity --

export async function fetchUserActivity(): Promise<UserActivityRow[]> {
  const { rows } = await query<UserActivityRow>(
    `SELECT
       p.id AS user_id,
       p.username,
       p.display_name,
       p.email,
       p.organisation,
       p.is_admin,
       p.created_at,
       session_data.last_session,
       COALESCE(comp_data.components_selected, 0)::int AS components_selected,
       COALESCE(comp_data.components_completed, 0)::int AS components_completed,
       COALESCE(comp_data.components_blocked, 0)::int AS components_blocked,
       COALESCE(bug_data.bugs_submitted, 0)::int AS bugs_submitted,
       COALESCE(vote_data.votes_cast, 0)::int AS votes_cast,
       COALESCE(comment_data.comments_made, 0)::int AS comments_made,
       COALESCE(testpad_data.testpad_steps, 0)::int AS testpad_steps
     FROM profiles p
     LEFT JOIN LATERAL (
       SELECT MAX(s.created_at) AS last_session FROM sessions s WHERE s.user_id = p.id
     ) session_data ON true
     LEFT JOIN LATERAL (
       SELECT
         COUNT(*) FILTER (WHERE ucs.is_selected = true)::int AS components_selected,
         COUNT(*) FILTER (WHERE ucs.status = 'completed' AND ucs.is_selected = true)::int AS components_completed,
         COUNT(*) FILTER (WHERE ucs.status = 'blocked' AND ucs.is_selected = true)::int AS components_blocked
       FROM user_component_status ucs WHERE ucs.user_id = p.id
     ) comp_data ON true
     LEFT JOIN LATERAL (
       SELECT COUNT(*)::int AS bugs_submitted FROM bugs WHERE user_id = p.id
     ) bug_data ON true
     LEFT JOIN LATERAL (
       SELECT COUNT(*)::int AS votes_cast FROM bug_votes WHERE user_id = p.id
     ) vote_data ON true
     LEFT JOIN LATERAL (
       SELECT COUNT(*)::int AS comments_made FROM bug_comments WHERE user_id = p.id
     ) comment_data ON true
     LEFT JOIN LATERAL (
       SELECT COUNT(*)::int AS testpad_steps FROM testpad_results WHERE user_id = p.id
     ) testpad_data ON true
     ORDER BY p.created_at DESC`,
  )
  return rows
}

// -- Campaign Summary --

export async function fetchCampaignSummaries(): Promise<CampaignSummaryRow[]> {
  const { rows } = await query<CampaignSummaryRow>(
    `SELECT
       c.id AS campaign_id,
       c.name AS campaign_name,
       c.code AS campaign_code,
       c.start_date,
       c.end_date,
       COALESCE(comp_data.total_components, 0)::int AS total_components,
       COALESCE(tester_data.total_testers, 0)::int AS total_testers,
       COALESCE(comp_data.components_with_testers, 0)::int AS components_with_testers,
       COALESCE(comp_data.components_completed, 0)::int AS components_completed,
       COALESCE(comp_data.components_multi_tested, 0)::int AS components_multi_tested,
       COALESCE(comp_data.avg_completions, 0)::numeric AS avg_completions_per_component,
       COALESCE(tester_data.total_selections, 0)::int AS total_selections,
       COALESCE(tester_data.completed_selections, 0)::int AS completed_selections,
       COALESCE(tester_data.blocked_selections, 0)::int AS blocked_selections,
       COALESCE(bug_data.total_bugs, 0)::int AS total_bugs,
       COALESCE(bug_data.open_bugs, 0)::int AS open_bugs,
       COALESCE(bug_data.reported_bugs, 0)::int AS reported_bugs,
       COALESCE(bug_data.closed_bugs, 0)::int AS closed_bugs,
       COALESCE(bug_data.fixed_bugs, 0)::int AS fixed_bugs,
       COALESCE(bug_data.critical_bugs, 0)::int AS critical_bugs,
       COALESCE(bug_data.high_bugs, 0)::int AS high_bugs,
       COALESCE(bug_data.medium_bugs, 0)::int AS medium_bugs,
       COALESCE(bug_data.low_bugs, 0)::int AS low_bugs,
       COALESCE(bug_data.total_votes, 0)::int AS total_votes
     FROM campaigns c
     LEFT JOIN LATERAL (
       SELECT
         COUNT(*)::int AS total_components,
         COUNT(*) FILTER (WHERE EXISTS (
           SELECT 1 FROM user_component_status ucs WHERE ucs.component_id = comp.id AND ucs.is_selected = true
         ))::int AS components_with_testers,
         COUNT(*) FILTER (WHERE (
           SELECT COUNT(*) FROM user_component_status ucs
           WHERE ucs.component_id = comp.id AND ucs.status = 'completed'
         ) >= 1)::int AS components_completed,
         COUNT(*) FILTER (WHERE (
           SELECT COUNT(*) FROM user_component_status ucs
           WHERE ucs.component_id = comp.id AND ucs.status = 'completed'
         ) >= 2)::int AS components_multi_tested,
         COALESCE(ROUND(AVG(NULLIF((
           SELECT COUNT(*) FROM user_component_status ucs
           WHERE ucs.component_id = comp.id AND ucs.status = 'completed'
         ), 0)), 1), 0) AS avg_completions
       FROM components comp WHERE comp.campaign_id = c.id
     ) comp_data ON true
     LEFT JOIN LATERAL (
       SELECT
         COUNT(DISTINCT ucs.user_id)::int AS total_testers,
         COUNT(*)::int AS total_selections,
         COUNT(*) FILTER (WHERE ucs.status = 'completed')::int AS completed_selections,
         COUNT(*) FILTER (WHERE ucs.status = 'blocked')::int AS blocked_selections
       FROM user_component_status ucs
       INNER JOIN components comp ON comp.id = ucs.component_id AND comp.campaign_id = c.id
       WHERE ucs.is_selected = true
     ) tester_data ON true
     LEFT JOIN LATERAL (
       SELECT
         COUNT(*)::int AS total_bugs,
         COUNT(*) FILTER (WHERE b.status = 'open')::int AS open_bugs,
         COUNT(*) FILTER (WHERE b.status = 'reported')::int AS reported_bugs,
         COUNT(*) FILTER (WHERE b.status = 'closed')::int AS closed_bugs,
         COUNT(*) FILTER (WHERE b.status = 'fixed')::int AS fixed_bugs,
         COUNT(*) FILTER (WHERE b.severity = 'critical')::int AS critical_bugs,
         COUNT(*) FILTER (WHERE b.severity = 'high')::int AS high_bugs,
         COUNT(*) FILTER (WHERE b.severity = 'medium')::int AS medium_bugs,
         COUNT(*) FILTER (WHERE b.severity = 'low')::int AS low_bugs,
         COALESCE((SELECT SUM(cnt) FROM (
           SELECT (SELECT COUNT(*) FROM bug_votes bv WHERE bv.bug_id = b2.id) AS cnt
           FROM bugs b2
           INNER JOIN components comp2 ON comp2.id = b2.component_id AND comp2.campaign_id = c.id
         ) vote_sub), 0)::int AS total_votes
       FROM bugs b
       INNER JOIN components comp ON comp.id = b.component_id AND comp.campaign_id = c.id
     ) bug_data ON true
     ORDER BY c.start_date DESC NULLS LAST`,
  )
  return rows
}
