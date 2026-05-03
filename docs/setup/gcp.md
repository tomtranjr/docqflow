# GCP Setup

This guide walks you through getting GCP set up for docqflow dev. The bucket holds uploaded PDFs; Workload Identity Federation lets GitHub Actions and Cloud Run authenticate without static JSON keys.

## Prerequisites

- [`gcloud` CLI](https://cloud.google.com/sdk/docs/install) installed and on your PATH
- Owner or editor access to the `docqflow` GCP project
- A GitHub account with push access to `tomtranjr/docqflow`

## Naming convention

The GCP project is `docqflow`. Every resource inside it uses a `-dev` suffix to mark the dev environment.

| Thing | Name |
|---|---|
| Project | `docqflow` |
| Bucket | `docqflow-pdfs-dev` |
| Service account | `docqflow-api-dev@docqflow.iam.gserviceaccount.com` |
| WIF pool | `github-pool-dev` |
| WIF provider | `github-provider-dev` |

## Steps

### 1. Set the active project and enable APIs

```bash
gcloud config set project docqflow
gcloud services enable \
  storage.googleapis.com \
  iam.googleapis.com \
  iamcredentials.googleapis.com \
  secretmanager.googleapis.com \
  run.googleapis.com \
  artifactregistry.googleapis.com
```

### 2. Create the bucket

```bash
gcloud storage buckets create gs://docqflow-pdfs-dev \
  --location=us-west1 \
  --uniform-bucket-level-access \
  --public-access-prevention
```

### 3. Apply the 30-day lifecycle rule

Create `lifecycle.json`:

```json
{"lifecycle":{"rule":[{"action":{"type":"Delete"},"condition":{"age":30}}]}}
```

Apply it:

```bash
gcloud storage buckets update gs://docqflow-pdfs-dev --lifecycle-file=lifecycle.json
```

### 4. CORS (optional)

Only needed if the frontend fetches signed URLs directly from GCS. Skip if the API streams PDFs through FastAPI.

Create `cors.json`:

```json
[{"origin":["https://docqflow.vercel.app","http://localhost:3000"],
  "method":["GET"],"responseHeader":["Content-Type"],"maxAgeSeconds":3600}]
```

Apply it:

```bash
gcloud storage buckets update gs://docqflow-pdfs-dev --cors-file=cors.json
```

### 5. Create the service account and grant bucket-scoped IAM

```bash
gcloud iam service-accounts create docqflow-api-dev \
  --display-name="DocQFlow API (dev)"

gcloud storage buckets add-iam-policy-binding gs://docqflow-pdfs-dev \
  --member="serviceAccount:docqflow-api-dev@docqflow.iam.gserviceaccount.com" \
  --role="roles/storage.objectAdmin"
```

The IAM binding is scoped to the bucket, not the project, so the SA can only touch this bucket.

### 6. Configure Workload Identity Federation for GitHub Actions

```bash
gcloud iam workload-identity-pools create github-pool-dev \
  --location=global --display-name="GitHub Actions (dev)"

gcloud iam workload-identity-pools providers create-oidc github-provider-dev \
  --location=global --workload-identity-pool=github-pool-dev \
  --display-name="GitHub OIDC (dev)" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
  --attribute-condition="assertion.repository=='tomtranjr/docqflow'" \
  --issuer-uri="https://token.actions.githubusercontent.com"

PROJECT_NUMBER=$(gcloud projects describe docqflow --format='value(projectNumber)')

gcloud iam service-accounts add-iam-policy-binding \
  docqflow-api-dev@docqflow.iam.gserviceaccount.com \
  --role=roles/iam.workloadIdentityUser \
  --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/github-pool-dev/attribute.repository/tomtranjr/docqflow"
```

Save the provider resource name. GitHub Actions workflows reference it as `workload_identity_provider`.

### 7. Local dev access

```bash
gcloud auth application-default login
```

This writes credentials to `~/.config/gcloud/application_default_credentials.json`. The Google Cloud client libraries pick them up automatically. No JSON key files in the repo.

### 8. Set local env vars

Copy the example file if you haven't already, then confirm the GCP block is present:

```bash
cp .env.example .env
```

```env
GCP_PROJECT=docqflow
GCS_BUCKET=docqflow-pdfs-dev
```

## Smoke test

```bash
echo "test" > /tmp/test.txt
gcloud storage cp /tmp/test.txt gs://docqflow-pdfs-dev/test.txt
gcloud storage rm gs://docqflow-pdfs-dev/test.txt
```

If both commands succeed, your local credentials and the bucket IAM binding are working.
