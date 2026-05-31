// backendApi.ts — re-export barrel. The implementation now lives in
// ./backend/* (split 2026-05-31); this preserves the public import path.

export type { SettingsPayload } from './backend/profile'
export { backendReadSelfProfile, backendFetchSelfProfile, backendSaveSelfProfile, backendSetLocalSelfProfile, backendResetLocalSelfProfile, purgeOtherSelfProfileCaches, purgeAllSelfProfileCaches, backendUploadProfilePhoto, backendUploadDataUrlPhotos, backendEnsureDiscoverableProfile, backendRepairDiscoverableProfile, backendSaveSettings, backendLoadSettings, backendLoadPreferences, backendSavePreferences } from './backend/profile'
export { getBackendMode } from './backend/client'
export { backendLogin, backendRegister, backendGuestLogin, backendSignOut, backendValidateInviteCode, backendDeleteSelfAccount } from './backend/auth'
export type { VerificationStatus, AdminVerificationRequest } from './backend/verification'
export { backendUploadVerificationSelfie, backendSubmitVerification, backendGetMyVerificationStatus, backendListVerifications, backendGetSelfieSignedUrl, backendReviewVerification } from './backend/verification'
export { backendLoadBlockedProfileIds, backendAddBlock, backendRemoveBlock, backendBackfillBlocks, backendSubmitReport, backendAdminSetProfileActive, backendRecordSwipe, backendLoadSwipeHistory } from './backend/social'
export type { WaitlistSubmission } from './backend/waitlist'
export { backendSubmitWaitlist, backendGetWaitlistQuestion, backendSubmitWaitlistReply } from './backend/waitlist'
export type { ClientErrorSeverity, ClientErrorRow } from './backend/telemetry'
export { backendListClientErrors, backendLogClientError } from './backend/telemetry'
export type { CloudChatMessage, LoadedChatMessage } from './backend/chat'
export { backendSendChatMessage, backendLoadChatHistory, backendSubscribeToInbox } from './backend/chat'
