"""AWS integration tests: no live model calls or real credentials."""
import json
from unittest.mock import Mock

import boto3
import pytest
from botocore.exceptions import ClientError, NoCredentialsError, ReadTimeoutError
from botocore.stub import ANY, Stubber

from backend.ai.explanations import create_fallback_explanation
from backend.ai.provider import BedrockExplanationProvider, FallbackExplanationProvider, TOOL_NAME
from backend.services import ai_client
from backend.tests.test_ai_explanations import make_analytics
from scripts import check_bedrock

MODEL = "amazon.nova-lite-v1:0"
PAYLOAD = {
    "summary": "A moderate portfolio.",
    "allocation_explanation": "Stocks are 60% of the portfolio.",
    "risk_explanation": "The portfolio can lose value.",
    "beginner_tip": "Diversification spreads exposure.",
    "disclaimer": "Educational example.",
}


def response_for(payload=None):
    return {
        "output": {"message": {
            "role": "assistant",
            "content": [{"toolUse": {
                "toolUseId": "explanation-1",
                "name": TOOL_NAME,
                "input": PAYLOAD.copy() if payload is None else payload,
            }}],
        }},
        "stopReason": "tool_use",
        "usage": {"inputTokens": 50, "outputTokens": 100, "totalTokens": 150},
        "metrics": {"latencyMs": 1},
    }


def test_converse_uses_valid_aws_request_and_structured_output():
    session = boto3.Session(
        aws_access_key_id="test", aws_secret_access_key="test", region_name="us-east-1"
    )
    client = session.client("bedrock-runtime")
    with Stubber(client) as stub:
        stub.add_response("converse", response_for(), {
            "modelId": MODEL,
            "system": ANY,
            "messages": ANY,
            "inferenceConfig": {"maxTokens": 1200, "temperature": 0.2},
            "toolConfig": ANY,
        })
        result = BedrockExplanationProvider(client, MODEL).generate(make_analytics())
        assert result.summary == PAYLOAD["summary"]
        assert result.beginner_tip == PAYLOAD["beginner_tip"]
        assert result.disclaimer == create_fallback_explanation(make_analytics()).disclaimer
        stub.assert_no_pending_responses()


def test_request_contains_analytics_and_forces_only_explanation_tool():
    client = Mock()
    client.converse.return_value = response_for()
    BedrockExplanationProvider(client, MODEL).generate(make_analytics())
    request = client.converse.call_args.kwargs
    text = request["messages"][0]["content"][0]["text"]
    analytics = json.loads(text[text.index("{"):])
    assert analytics["risk_profile"] == "moderate"
    assert analytics["allocation"]["stocks"] == 0.6
    config = request["toolConfig"]
    assert config["toolChoice"] == {"tool": {"name": TOOL_NAME}}
    schema = config["tools"][0]["toolSpec"]["inputSchema"]["json"]
    assert set(schema) == {"type", "properties", "required"}
    assert set(schema["required"]) == set(PAYLOAD)


@pytest.mark.parametrize("code", [
    "AccessDeniedException", "ExpiredTokenException", "ThrottlingException",
    "ValidationException", "ServiceUnavailableException",
])
def test_aws_errors_fall_back_and_log_only_error_code(code, caplog):
    client = Mock()
    client.converse.side_effect = ClientError(
        {"Error": {"Code": code, "Message": "sensitive upstream details"}}, "Converse"
    )
    result = BedrockExplanationProvider(client, MODEL).explain(make_analytics())
    assert result == create_fallback_explanation(make_analytics())
    assert code in caplog.text
    assert "sensitive upstream details" not in caplog.text


@pytest.mark.parametrize("error", [
    NoCredentialsError(),
    ReadTimeoutError(endpoint_url="https://bedrock-runtime.us-east-1.amazonaws.com"),
])
def test_credentials_and_timeouts_fall_back(error):
    client = Mock()
    client.converse.side_effect = error
    assert BedrockExplanationProvider(client, MODEL).explain(make_analytics()) == (
        create_fallback_explanation(make_analytics())
    )


@pytest.mark.parametrize("payload", [
    {},
    {**PAYLOAD, "summary": ""},
    {**PAYLOAD, "risk_explanation": "   "},
    {**PAYLOAD, "beginner_tip": 42},
])
def test_invalid_model_fields_fall_back(payload):
    client = Mock()
    client.converse.return_value = response_for(payload)
    assert BedrockExplanationProvider(client, MODEL).explain(make_analytics()) == (
        create_fallback_explanation(make_analytics())
    )


@pytest.mark.parametrize("stop_reason", ["max_tokens", "guardrail_intervened", "end_turn"])
def test_incomplete_or_blocked_output_is_not_treated_as_success(stop_reason):
    client = Mock()
    client.converse.return_value = {**response_for(), "stopReason": stop_reason}
    provider = BedrockExplanationProvider(client, MODEL)
    with pytest.raises(ValueError):
        provider.generate(make_analytics())
    assert provider.explain(make_analytics()) == create_fallback_explanation(make_analytics())


def test_unexpected_tool_is_not_accepted():
    response = response_for()
    response["output"]["message"]["content"][0]["toolUse"]["name"] = "another_tool"
    client = Mock()
    client.converse.return_value = response
    assert BedrockExplanationProvider(client, MODEL).explain(make_analytics()) == (
        create_fallback_explanation(make_analytics())
    )


def test_offline_mode_does_not_initialize_aws(monkeypatch):
    client_factory = Mock(side_effect=AssertionError("Offline mode touched AWS"))
    monkeypatch.setattr(ai_client.boto3, "client", client_factory)
    monkeypatch.delenv("AI_PROVIDER", raising=False)
    assert isinstance(ai_client._get_provider(), FallbackExplanationProvider)
    monkeypatch.setenv("AI_PROVIDER", "fallback")
    assert isinstance(ai_client._get_provider(), FallbackExplanationProvider)
    client_factory.assert_not_called()


def test_bedrock_configuration_uses_iam_credential_chain(monkeypatch):
    monkeypatch.setenv("AI_PROVIDER", "bedrock")
    monkeypatch.setenv("AWS_REGION", "us-east-1")
    monkeypatch.setenv("BEDROCK_MODEL_ID", MODEL)
    factory = Mock()
    monkeypatch.setattr(ai_client.boto3, "client", factory)
    provider = ai_client._get_provider()
    assert isinstance(provider, BedrockExplanationProvider)
    assert provider.model == MODEL
    assert factory.call_args.args == ("bedrock-runtime",)
    kwargs = factory.call_args.kwargs
    assert set(kwargs) == {"region_name", "config"}  # no hardcoded credentials
    assert kwargs["region_name"] == "us-east-1"
    assert kwargs["config"].read_timeout == 20
    assert kwargs["config"].retries["total_max_attempts"] == 1


def test_model_and_region_overrides_are_respected(monkeypatch):
    monkeypatch.setenv("AI_PROVIDER", "bedrock")
    monkeypatch.setenv("AWS_REGION", "us-east-1")
    monkeypatch.setenv("AWS_DEFAULT_REGION", "us-west-2")
    monkeypatch.setenv("BEDROCK_MODEL_ID", "amazon.nova-micro-v1:0")
    factory = Mock()
    monkeypatch.setattr(ai_client.boto3, "client", factory)
    assert ai_client._get_provider().model == "amazon.nova-micro-v1:0"
    assert factory.call_args.kwargs["region_name"] == "us-east-1"


def test_client_initialization_failure_keeps_demo_working(monkeypatch, caplog):
    monkeypatch.setenv("AI_PROVIDER", "bedrock")
    monkeypatch.setattr(ai_client, "create_bedrock_provider", Mock(side_effect=NoCredentialsError()))
    assert isinstance(ai_client._get_provider(), FallbackExplanationProvider)
    assert "NoCredentialsError" in caplog.text


def test_unknown_provider_is_an_explicit_configuration_error(monkeypatch):
    monkeypatch.setenv("AI_PROVIDER", "typo")
    with pytest.raises(ValueError, match="AI_PROVIDER"):
        ai_client._get_provider()


def test_ai_and_dashboard_keep_frontend_contract_with_bedrock(client, monkeypatch):
    monkeypatch.setenv("AI_PROVIDER", "bedrock")
    aws_client = Mock()
    aws_client.converse.return_value = response_for()
    provider = BedrockExplanationProvider(aws_client, MODEL)
    monkeypatch.setattr(ai_client, "create_bedrock_provider", lambda: provider)
    explanation = client.post("/api/ai/explain", json={
        "profile": "moderate", "experience": "beginner",
    })
    assert explanation.status_code == 200
    body = explanation.json()
    assert set(body) == {"summary", "risk_explanation", "educational_tip", "disclaimer"}
    assert body["summary"] == PAYLOAD["summary"] + " " + PAYLOAD["allocation_explanation"]
    assert body["educational_tip"] == PAYLOAD["beginner_tip"]
    dashboard = client.get("/api/dashboard/moderate")
    assert dashboard.status_code == 200
    assert dashboard.json()["explanation"] == body
    assert aws_client.converse.call_count == 2


def test_dashboard_without_explanation_never_calls_aws(client, monkeypatch):
    monkeypatch.setenv("AI_PROVIDER", "bedrock")
    factory = Mock(side_effect=AssertionError("Unrequested AI call"))
    monkeypatch.setattr(ai_client, "create_bedrock_provider", factory)
    response = client.get("/api/dashboard/moderate?include_explanation=false")
    assert response.status_code == 200
    assert response.json()["explanation"] is None
    factory.assert_not_called()


def test_connection_checker_success_requires_real_provider_output(monkeypatch, capsys):
    client = Mock()
    client.meta.region_name = "us-east-1"
    client.converse.return_value = response_for()
    monkeypatch.setattr(
        check_bedrock, "create_bedrock_provider",
        lambda: BedrockExplanationProvider(client, MODEL),
    )
    assert check_bedrock.main() == 0
    assert "PASSED" in capsys.readouterr().out
    client.converse.assert_called_once()


def test_connection_checker_reports_denial_instead_of_fallback(monkeypatch, capsys):
    client = Mock()
    client.converse.side_effect = ClientError(
        {"Error": {"Code": "AccessDeniedException", "Message": "private details"}}, "Converse"
    )
    monkeypatch.setattr(
        check_bedrock, "create_bedrock_provider",
        lambda: BedrockExplanationProvider(client, MODEL),
    )
    assert check_bedrock.main() == 1
    output = capsys.readouterr().out
    assert "FAILED (AccessDeniedException)" in output
    assert "PASSED" not in output
    assert "private details" not in output
