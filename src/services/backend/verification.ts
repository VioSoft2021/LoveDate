// src/services/backend/verification.ts — split from backendApi.ts (2026-05-31).
import { supabase, getCurrentUserId, VERIFICATION_BUCKET, dataUrlToBlob, generatePhotoFilename } from './client'

// ── Selfie-pose verification (anti-fake, 2026-05-27) ──────────────

export type VerificationStatus = 'none' | 'pending' | 'approved' | 'rejected'
export type AdminVerificationRequest = {
  id: string
  userId: string
  name: string
  email: string
  photos: string[]
  pose: string
  selfiePath: string
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
}
/** Upload a live-camera selfie to the PRIVATE verification bucket.
 *  Returns the storage PATH (not a public URL — the bucket is private;
 *  admins fetch it later via a signed URL). */
export const backendUploadVerificationSelfie = async (
  dataUrl: string,
): Promise<string | null> => {
  if (!supabase) return null
  const userId = await getCurrentUserId()
  if (!userId) return null
  const decoded = dataUrlToBlob(dataUrl)
  if (!decoded) return null

  const path = `${userId}/${generatePhotoFilename(decoded.mimeType)}`
  const { error } = await supabase.storage
    .from(VERIFICATION_BUCKET)
    .upload(path, decoded.blob, {
      contentType: decoded.mimeType,
      cacheControl: '0',
      upsert: false,
    })
  if (error) {
    console.warn('Verification selfie upload failed:', error.message)
    return null
  }
  return path
}
/** Record a pending verification request for the current user. */
export const backendSubmitVerification = async (
  pose: string,
  selfiePath: string,
): Promise<boolean> => {
  if (!supabase) return false
  const { error } = await supabase.rpc('submit_verification', {
    p_pose: pose,
    p_selfie_path: selfiePath,
  })
  if (error) {
    throw new Error(error.message)
  }
  return true
}
/** The current user's own latest verification status, for UI state. */
export const backendGetMyVerificationStatus = async (): Promise<VerificationStatus> => {
  if (!supabase) return 'none'
  const userId = await getCurrentUserId()
  if (!userId) return 'none'
  const { data, error } = await supabase
    .from('verification_requests')
    .select('status, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error || !data) return 'none'
  const status = (data as { status?: unknown }).status
  return status === 'pending' || status === 'approved' || status === 'rejected'
    ? status
    : 'none'
}
/** Admin: list verification requests with the applicant's name + photos. */
export const backendListVerifications = async (
  status: 'pending' | 'approved' | 'rejected' | 'all' = 'pending',
): Promise<AdminVerificationRequest[]> => {
  if (!supabase) return []
  const { data, error } = await supabase.rpc('admin_list_verifications', {
    p_status: status,
  })
  if (error) throw new Error(error.message)
  if (!Array.isArray(data)) return []
  return (data as Array<Record<string, unknown>>).map((row) => ({
    id: String(row.id ?? ''),
    userId: String(row.user_id ?? ''),
    name: typeof row.name === 'string' ? row.name : '',
    email: typeof row.email === 'string' ? row.email : '',
    photos: Array.isArray(row.photos)
      ? (row.photos as unknown[]).filter((p): p is string => typeof p === 'string')
      : [],
    pose: typeof row.pose === 'string' ? row.pose : '',
    selfiePath: typeof row.selfie_path === 'string' ? row.selfie_path : '',
    status: (row.status as AdminVerificationRequest['status']) ?? 'pending',
    createdAt: String(row.created_at ?? ''),
  }))
}
/** Admin: create a short-lived signed URL to view a private selfie. */
export const backendGetSelfieSignedUrl = async (
  selfiePath: string,
): Promise<string | null> => {
  if (!supabase) return null
  const { data, error } = await supabase.storage
    .from(VERIFICATION_BUCKET)
    .createSignedUrl(selfiePath, 120)
  if (error || !data) return null
  return data.signedUrl
}
/** Admin: approve (→ verified badge) or reject a verification request. */
export const backendReviewVerification = async (
  id: string,
  approve: boolean,
): Promise<boolean> => {
  if (!supabase) return false
  const { error } = await supabase.rpc('admin_review_verification', {
    p_id: id,
    p_approve: approve,
  })
  if (error) throw new Error(error.message)
  return true
}
