# Contributing

## Setup

1. Install [uv](https://docs.astral.sh/uv/getting-started/installation/) if you haven't already.

2. Install dependencies (includes dev tools like pre-commit and pytest):

   ```bash
   uv sync
   ```

3. Install the pre-commit hooks:

   ```bash
   uv run pre-commit install
   ```

   This sets up Git hooks that automatically check your code before each commit.

## Pre-commit hooks

This project uses [pre-commit](https://pre-commit.com/) to run code checks automatically when you `git commit`. The hooks run [ruff](https://docs.astral.sh/ruff/), a fast Python linter and formatter.

Two hooks run on every commit:

- **ruff-check** — checks for common Python errors, unused imports, and import ordering, and auto-fixes issues where possible (runs with `--fix`)
- **ruff-format** — reformats code to follow consistent style

Both hooks modify your files in place when they find something to fix. Pre-commit then fails the commit so you can review the changes. Review the diff, `git add` the updated files, and commit again.

### Running checks manually

Run the hooks on all files (not just staged changes):

```bash
uv run pre-commit run --all-files
```

Run only the linter:

```bash
uv run ruff check .
```

Auto-fix formatting:

```bash
uv run ruff format .
```

Auto-fix lint issues where possible:

```bash
uv run ruff check --fix .
```

## Running tests

```bash
uv run pytest
```