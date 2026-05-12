# StaffStack — Contributing

## Workflow

1. Branch from **`dev`**: `feat/<short-topic>`.
2. Open a **pull request** into **`dev`**.
3. Ensure **CI** passes (lint, typecheck, tests).
4. Request review; merge with **squash** (preferred for readable history on OSS).

## Releases

- **`public`** is the production branch. Promote by merging **`dev` → `public`** when the maintainer approves a release (Vercel Production tracks `public`).
- **Hotfixes:** branch from `public` as `hotfix/<topic>`, PR to `public`, then backport to `dev`.

## Automation / LLM commits

- Default integration target for automated commits: **`dev`** or **`feat/*`** as requested by the maintainer.
- **Do not** push directly to **`public`** unless explicitly instructed for a release.

## Milestone gates

Large work should follow the milestone plan in the product spec:

1. Scope and deliverables defined for the milestone.
2. Tests and docs updated for the milestone.
3. Maintainer review and explicit approval before starting the next milestone.
4. Git checkpoint: tag or merge commit on **`dev`** at milestone completion (`milestone/Mn-complete` tags optional).

## Code style

- Run `npm run lint` and `npm run format` before push.
- Pre-commit hooks (Husky + lint-staged) run on staged files.

## Security reports

- Please report security issues privately to the maintainers (add contact when publishing).
