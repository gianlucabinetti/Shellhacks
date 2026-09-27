/**
 * Real risk scoring for the quiz: answers are mapped onto the backend's
 * deterministic scorer (POST /api/risk/assess), so the result depends on them.
 */
import type { ExperienceLevel, RiskFactor, RiskProfile } from '@/types/api'
import { request } from './http'

export type QuizAnswers = Record<string, string>

export interface QuizResult {
  profile: RiskProfile
  explanation: string
  allocation: { stocks: number; bonds: number; cash: number }
  experience: ExperienceLevel
  factors: RiskFactor[]
}

const EXPERIENCE: Record<string, ExperienceLevel> = { none: 'beginner', some: 'intermediate', experienced: 'experienced' }
const HORIZON_YEARS: Record<string, number> = { lt3: 2, '3to7': 5, gt7: 10 }
// The backend's goal scale is preservation < income < growth; "balance" is the middle step.
const GOAL: Record<string, 'preservation' | 'income' | 'growth'> = { preserve: 'preservation', balance: 'income', grow: 'growth' }
const LEVEL: Record<string, number> = {
  loss5: 0, loss15: 1, loss30: 2,
  sell: 0, hold: 1, buy: 2,
  stable: 0, mixed: 1, growth: 2,
}

/**
 * Loss tolerance combines three answers. The explicit "largest loss" question counts
 * double; the drop reaction and the steady-vs-swings preference refine it.
 */
export function lossTolerance(a: QuizAnswers): 'low' | 'medium' | 'high' {
  const score = (2 * LEVEL[a.loss] + LEVEL[a.decline] + LEVEL[a.preference]) / 4
  return score < 0.75 ? 'low' : score < 1.5 ? 'medium' : 'high'
}

const FACTORS: Record<string, Record<string, Omit<RiskFactor, 'questionId'>>> = {
  horizon: {
    lt3: { label: 'Needs the money within 3 years', impact: 'lower_risk' },
    '3to7': { label: 'Medium time horizon of 3 to 7 years', impact: 'neutral' },
    gt7: { label: 'Long time horizon of more than 7 years', impact: 'higher_risk' },
  },
  goal: {
    preserve: { label: 'Main goal is keeping money safe', impact: 'lower_risk' },
    balance: { label: 'Wants a balance of growth and stability', impact: 'neutral' },
    grow: { label: 'Main goal is growth', impact: 'higher_risk' },
  },
  decline: {
    sell: { label: 'Would sell after a 20% drop', impact: 'lower_risk' },
    hold: { label: 'Would hold steady through a 20% drop', impact: 'neutral' },
    buy: { label: 'Would invest more after a 20% drop', impact: 'higher_risk' },
  },
  loss: {
    loss5: { label: 'Could accept a yearly loss of about 5%', impact: 'lower_risk' },
    loss15: { label: 'Could accept a yearly loss of about 15%', impact: 'neutral' },
    loss30: { label: 'Could accept a yearly loss of 30% or more', impact: 'higher_risk' },
  },
  preference: {
    stable: { label: 'Prefers steady, predictable results', impact: 'lower_risk' },
    mixed: { label: 'Accepts some ups and downs for growth', impact: 'neutral' },
    growth: { label: 'Accepts big swings for growth potential', impact: 'higher_risk' },
  },
}

export async function assessRisk(answers: QuizAnswers): Promise<QuizResult> {
  const body = {
    experience: EXPERIENCE[answers.experience],
    investment_horizon_years: HORIZON_YEARS[answers.horizon],
    loss_tolerance: lossTolerance(answers),
    goal: GOAL[answers.goal],
  }
  const result = await request<{ risk_profile: RiskProfile; explanation: string; allocation: QuizResult['allocation'] }>(
    '/api/risk/assess', { method: 'POST', body: JSON.stringify(body) })
  return {
    profile: result.risk_profile,
    explanation: result.explanation,
    allocation: result.allocation,
    experience: body.experience,
    factors: Object.entries(FACTORS).map(([questionId, options]) => ({ questionId, ...options[answers[questionId]] })),
  }
}

/**
 * Turns the stock/bond/cash split into real, tradable funds so it can be backtested:
 * stocks 70% US (VTI) / 30% international (VXUS), bonds in BND, cash in short Treasuries (SGOV).
 */
export function allocationToMix(allocation: QuizResult['allocation']): Record<string, number> {
  const mix: Record<string, number> = {
    VTI: allocation.stocks * 70, VXUS: allocation.stocks * 30, BND: allocation.bonds * 100, SGOV: allocation.cash * 100,
  }
  return Object.fromEntries(Object.entries(mix).filter(([, w]) => w > 0).map(([s, w]) => [s, Math.round(w * 100) / 100]))
}
