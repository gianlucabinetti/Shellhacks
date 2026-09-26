import type { RiskAssessmentResult } from '@/types/api'

/**
 * Predefined result: mock mode always returns Moderate, whatever the answers.
 * Real scoring belongs to the backend.
 */
export const mockRiskAssessment: RiskAssessmentResult = {
  assessmentId: 'assess-mock-001',
  riskProfile: 'moderate',
  riskScore: 54,
  experienceLevel: 'beginner',
  summary:
    'Your answers suggest you are comfortable with some ups and downs in exchange for long-term growth, but would prefer to avoid very large losses.',
  factors: [
    { questionId: 'horizon', label: 'Medium-to-long time horizon', impact: 'higher_risk' },
    { questionId: 'decline', label: 'Would hold steady during a market drop', impact: 'neutral' },
    { questionId: 'loss', label: 'Prefers to limit yearly losses to around 15%', impact: 'lower_risk' },
  ],
  disclaimer:
    'This risk profile is for educational purposes only and is not personalized financial advice.',
}

