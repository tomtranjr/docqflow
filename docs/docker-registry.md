# Pushing the Docker Image to Google Artifact Registry

This guide walks you through tagging and pushing the docqflow Docker image to Google Artifact Registry.

## Prerequisites

- [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) installed
- Logged in with `gcloud auth login`
- Docker running locally
- The docqflow image already built (`docker build -t docqflow .`)

## Steps

### 1. Configure Docker authentication

This lets Docker push to your GCP registry:

```bash
gcloud auth configure-docker us-central1-docker.pkg.dev
```

### 2. Create the Artifact Registry repository (first time only)

```bash
gcloud artifacts repositories create docqflow \
  --repository-format=docker \
  --location=us-central1 \
  --project=docqflow
```

### 3. Tag the image

```bash
docker tag docqflow us-central1-docker.pkg.dev/docqflow/docqflow/docqflow:latest
```

### 4. Push the image

```bash
docker push us-central1-docker.pkg.dev/docqflow/docqflow/docqflow:latest
```

### 5. Verify

Check that the image shows up in the console:

https://console.cloud.google.com/artifacts/docker/docqflow/us-central1/docqflow

## Pulling the image (on another machine)

```bash
gcloud auth configure-docker us-central1-docker.pkg.dev
docker pull us-central1-docker.pkg.dev/docqflow/docqflow/docqflow:latest
docker run -p 8080:8080 us-central1-docker.pkg.dev/docqflow/docqflow/docqflow:latest
```
