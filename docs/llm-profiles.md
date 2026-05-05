# LLM profiles

Named LLM configurations used by the app. Each profile pins a provider, model, and rough latency/cost expectations so calling code can pick a profile by name instead of hard-coding model strings.

## cloud-fast

Default profile for dev. Cheap, fast, good enough for extraction and summarization smoke tests.

| Field | Value |
|---|---|
| Provider | OpenAI |
| Model | `gpt-4o-mini` |
| Expected latency | ~1–3s for short prompts |
| Expected cost | ~$0.15 / 1M input tokens, ~$0.60 / 1M output tokens |
| Selected via | `LLM_DEFAULT_PROFILE=cloud-fast` |

## Credentials

`OPENAI_API_KEY` lives in Google Secret Manager (`openai-api-key`, project `docqflow`). Cloud Run reads it via the `docqflow-api-dev` service account. For local dev:

```bash
echo "OPENAI_API_KEY=$(gcloud secrets versions access latest --secret=openai-api-key --project=docqflow)" >> .env
```

Never paste the key on the command line or commit it.

## Verifying setup

```bash
python scripts/check_llm_profiles.py
```

Checks that `OPENAI_API_KEY` is present in the environment. Does not call OpenAI.
