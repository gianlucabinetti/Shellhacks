# Run Portfolio X-Ray with AWS

This copy replaces the OpenAI integration with Amazon Nova Lite on Amazon
Bedrock. No OpenAI key or package is needed. The React screens and the four
explanation response fields stay the same.

## 1. Confirm the event account can invoke Bedrock

The event information lists EC2, SageMaker and S3. That does **not** establish
that its role is permitted to use Bedrock. The connection check below is the
decisive test; a working dashboard alone is not, because the backend can fall
back to deterministic explanations.

Default: `AWS_REGION=us-east-1`, `BEDROCK_MODEL_ID=amazon.nova-lite-v1:0`.
This uses an in-region model ID. Do not switch to a `us.` or `global.`
inference profile unless the organizers allow its destination regions.

The workshop code-editor password is only for signing in to the editor.
It is not an AWS access key or a Bedrock API key. This package contains no
workshop password, token, account-specific URL, or AWS credentials.

## 2. Set up the backend

Use Python 3.10+ and run these commands from the extracted project directory.
On the AWS workshop's Linux code editor:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
cp .env.example .env
python -m scripts.check_bedrock
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

On your Windows laptop (PowerShell):

```powershell
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env
.\.venv\Scripts\python.exe -m scripts.check_bedrock
.\.venv\Scripts\python.exe -m uvicorn backend.main:app --reload --port 8000
```

The root `.env` loads automatically. Existing process environment variables
take precedence. On an AWS machine, boto3 uses the attached IAM role if one
is available and authorized. Run the check there first.

On a laptop, use the event portal's temporary AWS CLI credentials if it
provides them: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` and
`AWS_SESSION_TOKEN`. Put them in the ignored root `.env` or export them
in your backend terminal. A configured AWS profile also works via
`AWS_PROFILE`. Do not put credentials in React or any `VITE_*` variable.
Do not reuse unrelated personal-account credentials for this event.

`check_bedrock` makes one real model call against a fictional portfolio and
consumes a small amount of the event's usage allowance. It exits nonzero on
failure and never substitutes a fallback. This copy has been prepared for AWS;
live permission/model access must still be checked in your event account.

## 3. Run the frontend

In a second terminal:

```bash
cd frontend
npm ci
npm run dev
```

Open the URL printed by Vite. The existing UI demo keeps `VITE_USE_MOCKS=true`.
The ZIP's frontend and backend have different route/field contracts, and the
frontend does not yet display AI explanations. Changing that flag to false
alone will break its quiz/dashboard flow. Completing that adapter is separate
from replacing the backend AI provider.

To demonstrate AWS explanations now, open the backend's `/docs` page, expand
`POST /api/ai/explain`, click **Try it out**, and send:

```json
{"profile": "moderate", "experience": "beginner"}
```

You can also use `GET /api/dashboard/moderate`, which combines the backend's
portfolio fixture with its explanation. The connection checker must pass to
confirm a real AWS call; endpoint success alone can be the fallback.

For a workshop editor, use its port forwarding for both servers. Run Vite
with `npm run dev -- --host 0.0.0.0` if required. If the browser receives a
forwarded HTTPS backend URL, put that URL in `frontend/.env.local` as
`VITE_API_BASE_URL`, and put the frontend's exact forwarded origin in the
backend's `CORS_ORIGINS`. Restart both servers after changing environment
files. A browser's localhost refers to the browser's computer, not the remote
workshop machine. Use the workshop's normal authenticated forwarding flow.

The analytics data remains the original fictional fixtures. Real Bedrock
explanations do not make those figures live market data.

## Troubleshooting and offline mode

- **AccessDeniedException:** Ask the organizer to enable the model and the
  event role's `bedrock:InvokeModel` permission. A workshop service restriction
  cannot be fixed by changing the app's key. The minimum policy example below
  is for the organizer to review; it is not applied by this project.
- **ExpiredToken / UnrecognizedClient:** Refresh the event's temporary
  credentials, including the session token. Access is temporary (the provided
  event lasts 48 hours); confirm the current end time in the portal.
- **ValidationException / ResourceNotFound:** Check the region and model ID.
  Keep the in-region Nova Lite default for an event limited to us-east-1.
- **Throttling / quota:** Retry later or ask the organizer about model quota.
- **Frontend still shows fixture data:** Expected in this migration. The UI
  still runs its existing mock demo; test AWS via `/docs` or the checker until
  the team's frontend/backend adapter and AI panel are implemented.
- **App works but check fails:** Backend errors log an error code and use the
  built-in deterministic fallback. That fallback is not an AWS-generated
  explanation.
- **No cloud access:** Set `AI_PROVIDER=fallback` in the root `.env` to
  use the backend offline. The frontend remains on its separate mock demo via
  `VITE_USE_MOCKS=true`.

Example IAM permission for the default model:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": "bedrock:InvokeModel",
    "Resource": "arn:aws:bedrock:us-east-1::foundation-model/amazon.nova-lite-v1:0"
  }]
}
```

No EC2 instances, SageMaker endpoints, IAM policies, or S3 resources are
created by this migration. If Bedrock is excluded by the event, ask which
hosted model or existing SageMaker endpoint is allowed before deploying a
separate inference service.

## Tests

```bash
python -m pytest
```

Tests use deterministic fixtures and mocked/stubbed AWS responses. They do
not make live AWS calls. The connection checker is separate.

AWS references:
- [Nova via Converse](https://docs.aws.amazon.com/bedrock/latest/userguide/bedrock-runtime_example_bedrock-runtime_Converse_AmazonNovaText_section.html)
- [Nova structured tool choice](https://docs.aws.amazon.com/nova/latest/userguide/tool-choice.html)
- [Regional availability](https://docs.aws.amazon.com/bedrock/latest/userguide/models-region-compatibility.html)
- [Bedrock model access](https://docs.aws.amazon.com/bedrock/latest/userguide/model-access.html)
