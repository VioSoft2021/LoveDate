// src/services/backend/waitlist.ts — split from backendApi.ts (2026-05-31).
import { supabase } from './client'

/**
 * Public waitlist — strangers visiting prive-app.club submit a 7-field
 * mini-questionnaire to request access (v2, 2026-05-27). Server-side
 * spam guard limits 3 attempts per email per 24h + validates every
 * field. Returns true on success or throws on validation/rate-limit
 * failures so the form can show a clear message.
 */
export type WaitlistSubmission = {
  email: string
  firstName: string
  age: number
  gender: 'Man' | 'Woman' | 'Other'
  city: string
  lookingFor: 'Long-term' | 'Open' | 'Not sure'
  why: string
}
export const backendSubmitWaitlist = async (
  submission: WaitlistSubmission,
): Promise<boolean> => {
  if (!supabase) return false
  const { error } = await supabase.rpc('submit_waitlist', {
    p_email: submission.email,
    p_first_name: submission.firstName,
    p_age: submission.age,
    p_gender: submission.gender,
    p_city: submission.city,
    p_looking_for: submission.lookingFor,
    p_note: submission.why,
  })
  if (error) {
    throw new Error(error.message)
  }
  return true
}
/**
 * Magic-link follow-up (v2, 2026-05-27). When Master marks a request
 * "needs info" in InviteAdmin, the applicant gets a link to
 * prive-app.club/#/waitlist-reply/<token>. That page reads the
 * question via this function (token-only, no auth, no PII beyond first
 * name + the question itself).
 */
export const backendGetWaitlistQuestion = async (
  token: string,
): Promise<{ firstName: string; question: string } | null> => {
  if (!supabase) return null
  const { data, error } = await supabase.rpc('get_waitlist_question', {
    p_token: token,
  })
  if (error || !Array.isArray(data) || data.length === 0) {
    return null
  }
  const row = data[0] as { first_name?: unknown; question?: unknown }
  return {
    firstName: typeof row.first_name === 'string' ? row.first_name : '',
    question: typeof row.question === 'string' ? row.question : '',
  }
}
/** Submit the applicant's answer to the follow-up question. Flips the
 *  row back to 'pending' server-side and burns the token. */
export const backendSubmitWaitlistReply = async (
  token: string,
  reply: string,
): Promise<boolean> => {
  if (!supabase) return false
  const { error } = await supabase.rpc('submit_waitlist_reply', {
    p_token: token,
    p_reply: reply,
  })
  if (error) {
    throw new Error(error.message)
  }
  return true
}
