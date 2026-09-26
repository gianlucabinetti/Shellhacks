"""Run with python -m scripts.check_bedrock from the project root.

Makes one real, small Bedrock request. Never reports success for a fallback.
"""
import json

from botocore.exceptions import BotoCoreError, ClientError

from backend.ai.provider import error_code
from backend.services.ai_client import create_bedrock_provider, _to_portfolio_analytics


def main() -> int:
    try:
        provider = create_bedrock_provider()
        # Use a supplied fictional fixture so this check needs no analytics service.
        from pathlib import Path
        fixture = Path(__file__).resolve().parents[1] / (
            "backend/services/fixtures/portfolio_moderate.json"
        )
        analytics = _to_portfolio_analytics(json.loads(fixture.read_text(encoding="utf-8")))
        explanation = provider.generate(analytics)
    except (BotoCoreError, ClientError, ValueError, KeyError, TypeError) as error:
        code = error_code(error)
        print(f"Bedrock check FAILED ({code}). No fallback counted as success.")
        if code in {"NoCredentialsError", "PartialCredentialsError", "ProfileNotFound"}:
            print("Use the workshop IAM role, or its temporary CLI credentials including AWS_SESSION_TOKEN.")
        elif code in {"AccessDeniedException", "UnauthorizedException"}:
            print("Ask the event organizer to allow bedrock:InvokeModel for Amazon Nova Lite in us-east-1.")
        elif code in {"ExpiredTokenException", "ExpiredToken", "UnrecognizedClientException", "InvalidClientTokenId"}:
            print("Refresh the workshop credentials (all three values) and check whether the event has expired.")
        elif code in {"ValidationException", "ResourceNotFoundException"}:
            print("Check BEDROCK_MODEL_ID and AWS_REGION. Do not use a cross-region profile without organizer approval.")
        elif code in {"ThrottlingException", "ServiceQuotaExceededException"}:
            print("The account is throttled or has no available model quota. Retry later or ask the organizer.")
        else:
            print("Check connectivity, model response format, and the setup guide in AWS_SETUP.md.")
        return 1
    print(f"Bedrock check PASSED: model={provider.model}, region={provider.client.meta.region_name}")
    print(explanation.model_dump_json(indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
