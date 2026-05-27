import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { VerificationQueue } from './VerificationQueue'
import {
  backendListVerifications,
  backendGetSelfieSignedUrl,
  backendReviewVerification,
  type AdminVerificationRequest,
} from '../services/backendApi'

// Smoke tests for the admin review wiring. The camera-capture side
// (SelfieVerification) uses getUserMedia and is verified by hand; here
// we prove the review queue loads requests, shows them, and approves/
// rejects through the backend.

vi.mock('../services/backendApi', () => ({
  backendListVerifications: vi.fn(),
  backendGetSelfieSignedUrl: vi.fn(),
  backendReviewVerification: vi.fn(),
}))

const mockList = vi.mocked(backendListVerifications)
const mockSigned = vi.mocked(backendGetSelfieSignedUrl)
const mockReview = vi.mocked(backendReviewVerification)

const sampleRequest = (over: Partial<AdminVerificationRequest> = {}): AdminVerificationRequest => ({
  id: 'req-1',
  userId: 'user-1',
  name: 'Ana',
  email: 'ana@example.com',
  photos: ['https://example.com/p1.jpg'],
  pose: 'Hold up three fingers next to your face',
  selfiePath: 'user-1/selfie.jpg',
  status: 'pending',
  createdAt: '2026-05-27T10:00:00.000Z',
  ...over,
})

beforeEach(() => {
  vi.clearAllMocks()
  mockSigned.mockResolvedValue('https://signed.example.com/selfie.jpg')
  mockReview.mockResolvedValue(true)
})

describe('<VerificationQueue />', () => {
  it('renders the empty state when there are no pending requests', async () => {
    mockList.mockResolvedValue([])
    render(<VerificationQueue appLanguage="en" />)
    expect(await screen.findByText(/no pending verifications/i)).toBeTruthy()
  })

  it('renders a pending request with the applicant + the prompted pose', async () => {
    mockList.mockResolvedValue([sampleRequest()])
    render(<VerificationQueue appLanguage="en" />)
    expect(await screen.findByText('Ana')).toBeTruthy()
    expect(screen.getByText(/hold up three fingers/i)).toBeTruthy()
    // The selfie signed URL is fetched for display.
    await waitFor(() => {
      expect(mockSigned).toHaveBeenCalledWith('user-1/selfie.jpg')
    })
  })

  it('approves a request → calls backendReviewVerification(id, true) and removes it', async () => {
    mockList.mockResolvedValue([sampleRequest()])
    render(<VerificationQueue appLanguage="en" />)
    const approve = await screen.findByRole('button', { name: /approve/i })
    fireEvent.click(approve)
    await waitFor(() => {
      expect(mockReview).toHaveBeenCalledWith('req-1', true)
    })
    await waitFor(() => {
      expect(screen.queryByText('Ana')).toBeNull()
    })
  })

  it('rejects a request → calls backendReviewVerification(id, false)', async () => {
    mockList.mockResolvedValue([sampleRequest()])
    render(<VerificationQueue appLanguage="en" />)
    const reject = await screen.findByRole('button', { name: /reject/i })
    fireEvent.click(reject)
    await waitFor(() => {
      expect(mockReview).toHaveBeenCalledWith('req-1', false)
    })
  })
})
