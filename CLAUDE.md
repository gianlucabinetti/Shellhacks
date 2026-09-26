
# Claude Code — Project Instructions

## Project
Educational portfolio analysis platform for a
four-person hackathon team.

## Architecture
- Frontend: React + TypeScript
- Backend: FastAPI
- Analytics: Python modules
- AI: Server-side LLM integration

## Development conventions
- Use TypeScript for frontend code.
- Use Python type hints and Pydantic models.
- Keep financial calculations in analytics/.
- Keep AI explanations in ai/.
- Never expose API keys in frontend code.
- Use environment variables for configuration.
- Write small, independently testable functions.

## Mocking strategy
Every component must work before its
dependencies are implemented.

Frontend:
Use JSON fixtures that match the API contracts.

Backend:
Return mock responses until analytics and
AI services are available.

Analytics:
Use fixed fictional portfolios as inputs.
Use real historical prices when available.

AI:
Use fixture analytics responses.
Provide deterministic fallback explanations.

## Integration rules
1. Agree on contracts before implementation.
2. Do not modify another member's API contract
   without discussing the change.
3. Preserve mock mode after real integration.
4. Validate API responses against Pydantic models.
5. Include tests for calculations and endpoints.

## Scope restrictions
Do not add brokerage integration, trading,
complex authentication or advanced ML unless
the core MVP is complete.

Always prioritize a working demonstration.

