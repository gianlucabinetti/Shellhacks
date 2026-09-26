/**
 * The single data-access layer for the UI. Components call these functions and never
 * know whether data comes from src/mocks (VITE_USE_MOCKS=true) or the backend.
 */
import type {
  PerformanceHistory,
  PerformanceRange,
  PortfolioAnalytics,
  Portfolio,
  Questionnaire,
  RiskAssessmentRequest,
  RiskAssessmentResult,
  RiskProfile,
  UpdateRiskProfileRequest,
  UserProfile,
} from '@/types/api'
import {
  applyMockAssessment,
  getMockUserProfile,
  mockAnalytics,
  mockDelay,
  mockPerformance,
  mockPortfolio,
  mockQuestionnaire,
  mockRiskAssessment,
  setMockRiskProfile,
} from '@/mocks'
import { request } from './http'

export const USE_MOCKS = import.meta.env.VITE_USE_MOCKS !== 'false'

export function getQuestionnaire(): Promise<Questionnaire> {
  if (USE_MOCKS) return mockDelay(mockQuestionnaire)
  return request<Questionnaire>('/api/questionnaire')
}

export async function submitRiskAssessment(
  body: RiskAssessmentRequest,
): Promise<RiskAssessmentResult> {
  if (USE_MOCKS) {
    applyMockAssessment(mockRiskAssessment)
    return mockDelay(mockRiskAssessment, 900)
  }
  return request<RiskAssessmentResult>('/api/risk-assessment', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function getUserProfile(): Promise<UserProfile> {
  if (USE_MOCKS) return mockDelay(getMockUserProfile())
  return request<UserProfile>('/api/user/profile')
}

export function updateRiskProfile(riskProfile: RiskProfile): Promise<UserProfile> {
  if (USE_MOCKS) return mockDelay(setMockRiskProfile(riskProfile), 600)
  const body: UpdateRiskProfileRequest = { riskProfile, acknowledged: true }
  return request<UserProfile>('/api/user/risk-profile', {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

export function getPortfolio(riskProfile: RiskProfile): Promise<Portfolio> {
  if (USE_MOCKS) return mockDelay(mockPortfolio(riskProfile))
  return request<Portfolio>(`/api/portfolios/${riskProfile}`)
}

export function getPerformance(
  riskProfile: RiskProfile,
  range: PerformanceRange = '5Y',
): Promise<PerformanceHistory> {
  if (USE_MOCKS) return mockDelay(mockPerformance(riskProfile, range))
  return request<PerformanceHistory>(`/api/portfolios/${riskProfile}/performance?range=${range}`)
}

export function getAnalytics(riskProfile: RiskProfile): Promise<PortfolioAnalytics> {
  if (USE_MOCKS) return mockDelay(mockAnalytics(riskProfile))
  return request<PortfolioAnalytics>(`/api/portfolios/${riskProfile}/analytics`)
}

