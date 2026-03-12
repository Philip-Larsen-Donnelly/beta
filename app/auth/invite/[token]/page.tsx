import { query } from "@/lib/db"
import InviteAcceptClient from "../InviteAcceptClient"

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const { rows } = await query<{ email: string | null }>(
    `SELECT p.email
     FROM invites i
     LEFT JOIN profiles p ON p.id = i.profile_id
     WHERE i.token = $1
     LIMIT 1`,
    [token],
  )
  const requireEmail = !rows[0]?.email

  return <InviteAcceptClient token={token} requireEmail={requireEmail} />
}
