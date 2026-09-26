import type { RiskAssessmentResult, RiskProfile, UserProfile } from '@/types/api'

/** In-memory stand-in for the user's saved profile; resets on page reload. */
let profile: UserProfile = {
  userId: 'demo-user',
  displayName: 'Demo Investor',
  riskProfile: null,
  experienceLevel: null,
  assessmentId: null,
  updatedAt: '2026-09-26T00:00:00Z',
}

export function getMockUserProfile(): UserProfile {
  return profile
}

export function applyMockAssessment(result: RiskAssessmentResult): void {
  profile = {
    ...profile,
    riskProfile: result.riskProfile,
    experienceLevel: result.experienceLevel,
    assessmentId: result.assessmentId,
    updatedAt: new Date().toISOString(),
  }
}

export function setMockRiskProfile(riskProfile: RiskProfile): UserProfile {
  profile = { ...profile, riskProfile, updatedAt: new Date().toISOString() }
  return profile
}

