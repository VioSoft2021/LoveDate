// src/services/backend/social.ts — split from backendApi.ts (2026-05-31).
import { supabase, getCurrentUserId } from './client'

/**
 * Walks an array of photo strings and replaces any data URLs with uploaded
 * Storage URLs. Items already at https:// or any non-data URL pass through.
 * Failed uploads keep their original data URL — the caller's persistence
 * still proceeds rather than blocking the save.
 */
/**
 * Phase B3: load the cloud-side block list for the current user. Returns
 * an empty array on any failure (offline, unauthed) so the caller can fall
 * back to its local cache.
 */
export const backendLoadBlockedProfileIds = async (): Promise<number[]> => {
  if (!supabase) {
    return []
  }
  const userId = await getCurrentUserId()
  if (!userId) {
    return []
  }
  const { data, error } = await supabase
    .from('user_blocks')
    .select('blocked_profile_id')
    .eq('user_id', userId)
  if (error || !data) {
    return []
  }
  return data
    .map((row) => Number(row.blocked_profile_id))
    .filter((id) => Number.isInteger(id))
}
export const backendAddBlock = async (profileId: number): Promise<void> => {
  if (!supabase) {
    return
  }
  const userId = await getCurrentUserId()
  if (!userId) {
    return
  }
  const { error } = await supabase
    .from('user_blocks')
    .upsert(
      { user_id: userId, blocked_profile_id: profileId },
      { onConflict: 'user_id,blocked_profile_id' },
    )
  if (error) {
     
    console.warn('Block sync failed:', error.message)
  }
}
export const backendRemoveBlock = async (profileId: number): Promise<void> => {
  if (!supabase) {
    return
  }
  const userId = await getCurrentUserId()
  if (!userId) {
    return
  }
  const { error } = await supabase
    .from('user_blocks')
    .delete()
    .eq('user_id', userId)
    .eq('blocked_profile_id', profileId)
  if (error) {
     
    console.warn('Unblock sync failed:', error.message)
  }
}
/**
 * Bulk-push a local block list to the cloud — used once on first authed
 * app load to migrate existing localStorage entries. Each row uses
 * upsert-on-conflict so re-running is safe.
 */
export const backendBackfillBlocks = async (profileIds: number[]): Promise<void> => {
  if (!supabase || profileIds.length === 0) {
    return
  }
  const userId = await getCurrentUserId()
  if (!userId) {
    return
  }
  const rows = profileIds.map((id) => ({ user_id: userId, blocked_profile_id: id }))
  const { error } = await supabase
    .from('user_blocks')
    .upsert(rows, { onConflict: 'user_id,blocked_profile_id' })
  if (error) {
     
    console.warn('Block backfill failed:', error.message)
  }
}
/**
 * Phase C2 — cloud insert for a profile safety report. Fire-and-forget: the
 * UI flow already updates the local moderation queue immediately, so failures
 * here only forfeit cloud durability, not the user's feedback. Falls silent
 * when running without Supabase credentials.
 */
export const backendSubmitReport = async (input: {
  reportedProfileId: number
  reportedProfileName: string
  category: string
  details: string
  profileSnapshot: {
    age: number
    city: string
    vibe: string
    bio: string
    relationshipGoal: string
    photoUrl: string
  }
}): Promise<{ reportId: string } | null> => {
  if (!supabase) {
    return null
  }

  const userId = await getCurrentUserId()
  if (!userId) {
    return null
  }

  const { data, error } = await supabase
    .from('safety_reports')
    .insert({
      reporter_id: userId,
      reported_profile_id: input.reportedProfileId,
      profile_snapshot: {
        name: input.reportedProfileName,
        ...input.profileSnapshot,
      },
      category: input.category,
      details: input.details,
      status: 'open',
    })
    .select('id')
    .single()

  if (error || !data?.id) {
     
    console.warn('Safety report cloud insert skipped:', error?.message ?? 'no row id')
    return null
  }

  return { reportId: String(data.id) }
}
// Note: invite-code generation lives in the LoveDateInviteAdmin app
// (sophisticated cryptographic formatter + audit log). Approval of a
// waitlist request is therefore a two-step flow handled there:
//   1. InviteAdmin calls its own create-invite-code Edge Function with
//      label = requester's email + note. That inserts into beta_invites.
//   2. InviteAdmin calls admin_approve_waitlist(id, code) (still exists)
//      to mark the Privé waitlist row approved and link it to the code.
// Privé's own admin UI for approval was removed (commit replaces an
// earlier in-Privé approve button with this handoff).
//
// Decline is also delegated to InviteAdmin (or to direct SQL by Master
// if a request is spam). The admin_decline_waitlist RPC remains in SQL
// for InviteAdmin to call; the Privé client no longer wraps it.

/**
 * D5 — admin moderation action: flip a profile's is_active flag.
 * Server-side gated by public.is_admin() (checks public.admins table).
 * When set to false, the profile disappears from every user's Discover
 * deck immediately because getProfiles filters by is_active = true.
 * Returns true on success, false on any failure (auth, no-such-profile,
 * RPC unavailable). Caller surfaces an error toast on false.
 */
export const backendAdminSetProfileActive = async (
  profileId: number,
  active: boolean,
): Promise<boolean> => {
  if (!supabase) return false
  const { data, error } = await supabase.rpc('admin_set_profile_active', {
    p_profile_id: profileId,
    p_active: active,
  })
  if (error) {

    console.warn('admin_set_profile_active failed:', error.message)
    return false
  }
  return data === true
}
/**
 * Phase C3 — record a swipe in the cloud ledger so users_are_matched() can
 * verify mutual interest before allowing chat. Fire-and-forget: the in-app
 * deck state is updated synchronously by the caller; this is the durable
 * record. Idempotent at the table level via the (liker_id, target_id)
 * primary key.
 */
export const backendRecordSwipe = async (
  targetProfileId: number,
  direction: 'right' | 'left',
): Promise<void> => {
  if (!supabase) {
    return
  }
  const userId = await getCurrentUserId()
  if (!userId) {
    return
  }
  const { error } = await supabase.from('swipes').upsert(
    {
      liker_id: userId,
      target_id: targetProfileId,
      direction,
    },
    { onConflict: 'liker_id,target_id' },
  )
  if (error) {

    console.warn('Swipe cloud record skipped:', error.message)
  }
}
// D2 — hydrate the local swipe history from the cloud on auth.
// Before this, `swipedIds` lived only in localStorage scoped per origin.
// Effect: every domain change, every device change, every site-data clear
// reset the user's "already swiped" memory — so previously-passed profiles
// re-appeared and the deck was inconsistent across sessions.
// The `swipes` table has always been written; now it's also read.
export const backendLoadSwipeHistory = async (): Promise<{
  likedIds: number[]
  passedIds: number[]
}> => {
  if (!supabase) {
    return { likedIds: [], passedIds: [] }
  }
  const userId = await getCurrentUserId()
  if (!userId) {
    return { likedIds: [], passedIds: [] }
  }
  const { data, error } = await supabase
    .from('swipes')
    .select('target_id, direction')
    .eq('liker_id', userId)
  if (error || !data) {
    if (error) {

      console.warn('Swipe history hydration failed:', error.message)
    }
    return { likedIds: [], passedIds: [] }
  }
  const likedIds: number[] = []
  const passedIds: number[] = []
  for (const row of data) {
    const id = Number((row as { target_id?: unknown }).target_id)
    if (!Number.isInteger(id)) continue
    const direction = (row as { direction?: unknown }).direction
    if (direction === 'right') {
      likedIds.push(id)
    } else if (direction === 'left') {
      passedIds.push(id)
    }
  }
  return { likedIds, passedIds }
}
