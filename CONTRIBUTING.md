# Contributing Rules

This repository is maintained by `Ujjwal92425`.

## Main Branch Rules

- Do not push directly to `main`.
- All changes must go through a pull request.
- Only `Ujjwal92425` may push or commit directly to `main`.
- Contributors must create a feature branch and open a pull request into `main`.
- Pull requests should be small, focused, and easy to review.
- Pull requests must pass the project checks before merge.
- Do not force-push shared branches unless the maintainer explicitly approves it.
- Do not rewrite `main` history.
- Do not commit generated folders such as `.next/`, `out/`, or `node_modules/`.

## Required Checks Before Opening A PR

Run these locally:

```bash
npm run lint
npm run build
```

## Branch Naming

Use clear branch names:

```txt
feature/add-core-sql-notes
fix/sidebar-layout
docs/update-postgres-indexing
```

## Pull Request Expectations

Every pull request should include:

- What changed
- Why it changed
- How it was tested
- Screenshots for UI changes
- Notes about any risk or follow-up work

## Content Rules

- Keep notes beginner-friendly first, then go deeper.
- Use the shared PostgreSQL schema where possible.
- Include runnable SQL for database examples.
- Explain production tradeoffs and common mistakes.
- Do not add decorative UI that does not improve clarity.
- Keep the writing direct and useful.

## GitHub Branch Protection

Repository files can document and support these rules, but GitHub must enforce them in repository settings.

Recommended settings for `main`:

- Require a pull request before merging.
- Require approvals before merging.
- Require review from CODEOWNERS.
- Require status checks to pass.
- Require branches to be up to date before merging.
- Restrict who can push to matching branches.
- Add `Ujjwal92425` as the only direct push bypass actor.
- Block force pushes.
- Block branch deletion.

See `docs/repository-safeguards.md` for the full public-repository safeguard checklist.
