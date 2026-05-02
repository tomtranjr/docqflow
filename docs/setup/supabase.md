# Supabase Setup

This guide walks you through getting Supabase running for docqflow dev.

## Prerequisites

- [Supabase CLI](https://supabase.com/docs/guides/cli) installed (`brew install supabase/tap/supabase`)
- Docker running locally (the CLI uses it for the local Postgres)
- Access to the team secret store

## Steps

### 1. Get credentials

Ask the project owner for access if you don't have it yet.

You need four values:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`

Never commit these. The `.env` file is gitignored.

### 2. Set up your local env

Copy the example file and fill in the real values:

```bash
cp .env.example .env
```

### 3. Run migrations locally

Start the local Supabase stack (Postgres + Studio in Docker):

```bash
supabase start
```

Apply all migrations from a clean slate:

```bash
supabase db reset
```

This wipes the local DB and re-runs every file in `supabase/migrations/` in order. Use it whenever you pull new migrations.

The CLI prints local URLs when it starts. Studio is usually at `http://localhost:54323`.

### 4. Point the backend at the dev project

The backend reads `.env` at startup. With the file populated from step 2, just start FastAPI:

```bash
uv run uvicorn src.main:app --reload
```

The backend will use the cloud dev project. To use your local Supabase instead, swap `SUPABASE_URL` and `DATABASE_URL` for the local values printed by `supabase start`.

## Adding a new migration

```bash
supabase migration new <short_name>
```

Edit the generated SQL file under `supabase/migrations/`, then:

```bash
supabase db reset       # verify it applies cleanly locally
supabase db push        # apply to the cloud dev project
```

Commit the migration file. Never edit a migration after it has been pushed.