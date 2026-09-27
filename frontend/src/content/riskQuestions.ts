import type { Question } from '@/types/api'

/** Risk quiz questions. Answers are scored by the backend (POST /api/risk/assess) via services/riskQuiz. */
export const RISK_QUESTIONS: Question[] = [
  {
    id: 'experience',
    category: 'experience',
    prompt: 'How much investing experience do you have?',
    helpText: 'This helps us pitch explanations at the right level. It does not change your risk profile.',
    options: [
      { id: 'none', label: "None yet: I'm just getting started" },
      { id: 'some', label: "Some: I've bought a fund or a few stocks" },
      { id: 'experienced', label: 'Experienced: I invest regularly' },
    ],
  },
  {
    id: 'horizon',
    category: 'risk_tolerance',
    prompt: 'When do you expect to need this money?',
    options: [
      { id: 'lt3', label: 'In less than 3 years' },
      { id: '3to7', label: 'In 3 to 7 years' },
      { id: 'gt7', label: 'In more than 7 years' },
    ],
  },
  {
    id: 'goal',
    category: 'risk_tolerance',
    prompt: 'What is your main goal for this money?',
    options: [
      { id: 'preserve', label: 'Keep it safe, even if it grows slowly' },
      { id: 'balance', label: 'A balance of growth and stability' },
      { id: 'grow', label: 'Grow it as much as possible over time' },
    ],
  },
  {
    id: 'decline',
    category: 'risk_tolerance',
    prompt: 'Imagine your investments drop 20% in one month. What would you most likely do?',
    helpText: 'There is no right answer. Market declines like this have happened several times in history.',
    options: [
      { id: 'sell', label: 'Sell everything to avoid further losses' },
      { id: 'hold', label: 'Wait and do nothing' },
      { id: 'buy', label: 'Invest more while prices are lower' },
    ],
  },
  {
    id: 'loss',
    category: 'risk_tolerance',
    prompt: 'What is the largest one-year loss you could accept without losing sleep?',
    options: [
      { id: 'loss5', label: 'About 5%' },
      { id: 'loss15', label: 'About 15%' },
      { id: 'loss30', label: '30% or more, if long-term growth is higher' },
    ],
  },
  {
    id: 'preference',
    category: 'risk_tolerance',
    prompt: 'Which would you prefer?',
    options: [
      { id: 'stable', label: 'Steady, predictable results' },
      { id: 'mixed', label: 'Some ups and downs for better growth' },
      { id: 'growth', label: 'Big swings for the highest growth potential' },
    ],
  },
]
