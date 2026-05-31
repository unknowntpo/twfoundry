# Local Data Artifacts

Date: 2026-05-31

Status: local development hygiene note.

These paths are intentionally ignored because they are generated, large, or
machine-local:

```text
frontend/public/data/tdx-bus/baseline-archive/
frontend/screenshots/
screenshots/
notebooks/.venv/
notebooks/.ipynb_checkpoints/
```

## Baseline Archive

`frontend/public/data/tdx-bus/baseline-archive/` contains multi-day TDX bus
historical snapshots used for ghost-trace and delay-signal experiments. The
current local copy is about 125 MB and contains more than one thousand JSON
files.

Keep it local until the backend owns baseline storage or a small fixture subset
is explicitly curated for tests.

## Screenshots

`frontend/screenshots/` and `screenshots/` contain Playwright and manual visual
verification output. These are useful locally, but should not be committed
unless a specific image is promoted into documentation.

## Notebooks

Notebook source files can be tracked when they are small and explain a concrete
analysis. The Python virtual environment and checkpoint files are ignored.

Use the notebook files for research notes only. Production route matching,
geometry audit, and delay-signal logic should move into backend modules or
shared testable frontend modules.
