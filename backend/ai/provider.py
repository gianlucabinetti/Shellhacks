"""Portfolio explanations from Amazon Bedrock, with an offline fallback."""
import logging
from abc import ABC, abstractmethod

from botocore.exceptions import BotoCoreError, ClientError

from .models import PortfolioAnalytics, PortfolioExplanation
from .explanations import create_fallback_explanation
from .prompts import SYSTEM_PROMPT

logger = logging.getLogger(__name__)
TOOL_NAME = "explain_portfolio"


def error_code(error: Exception) -> str:
    """Log an AWS error code, never credentials, prompts, or response bodies."""
    if isinstance(error, ClientError):
        return error.response.get("Error", {}).get("Code", "ClientError")
    return type(error).__name__


class ExplanationProvider(ABC):
    @abstractmethod
    def explain(self, analytics: PortfolioAnalytics) -> PortfolioExplanation:
        pass


class FallbackExplanationProvider(ExplanationProvider):
    def explain(self, analytics: PortfolioAnalytics) -> PortfolioExplanation:
        return create_fallback_explanation(analytics)


class BedrockExplanationProvider(ExplanationProvider):
    def __init__(self, client, model: str):
        self.client = client
        self.model = model

    def generate(self, analytics: PortfolioAnalytics) -> PortfolioExplanation:
        """Call Bedrock without fallback, also used by the connection checker."""
        # Nova 1 accepts type/properties/required at the schema's top level.
        # Use a tool for structured output, then validate its input locally.
        fields = PortfolioExplanation.model_fields
        response = self.client.converse(
            modelId=self.model,
            system=[{"text": SYSTEM_PROMPT}],
            messages=[{
                "role": "user",
                "content": [{
                    "text": (
                        "Explain this portfolio using the explain_portfolio tool. "
                        "Use nonempty strings for every field and include an "
                        "educational, not individualized financial advice disclaimer.\n"
                        + analytics.model_dump_json(indent=2)
                    )
                }],
            }],
            inferenceConfig={"maxTokens": 1200, "temperature": 0.2},
            toolConfig={
                "tools": [{
                    "toolSpec": {
                        "name": TOOL_NAME,
                        "description": "Return a structured educational portfolio explanation.",
                        "inputSchema": {"json": {
                            "type": "object",
                            "properties": {
                                name: {"type": "string"} for name in fields
                            },
                            "required": list(fields),
                        }},
                    }
                }],
                "toolChoice": {"tool": {"name": TOOL_NAME}},
            },
        )
        if response.get("stopReason") != "tool_use":
            raise ValueError("Bedrock did not finish the structured explanation.")
        for block in response["output"]["message"]["content"]:
            tool = block.get("toolUse")
            if tool and tool.get("name") == TOOL_NAME:
                explanation = PortfolioExplanation.model_validate(
                    tool["input"], strict=True
                )
                if not all(value.strip() for value in explanation.model_dump().values()):
                    raise ValueError("Bedrock returned an empty explanation field.")
                # Keep the team's educational disclaimer independent of model wording.
                explanation.disclaimer = create_fallback_explanation(analytics).disclaimer
                return explanation
        raise ValueError("Bedrock did not return the explanation tool.")

    def explain(self, analytics: PortfolioAnalytics) -> PortfolioExplanation:
        try:
            return self.generate(analytics)
        except (BotoCoreError, ClientError, ValueError, KeyError, TypeError) as error:
            logger.warning(
                "Bedrock explanation failed (%s); using deterministic fallback. "
                "Run python -m scripts.check_bedrock to diagnose AWS access.",
                error_code(error),
            )
            return create_fallback_explanation(analytics)
