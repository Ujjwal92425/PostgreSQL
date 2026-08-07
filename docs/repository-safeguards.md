# Repository Safeguards

This repository is public. The files in this repo add CI, ownership, dependency review, security policy, and contribution rules. GitHub-side settings must also be enabled by the maintainer.

## Required GitHub Settings

Enable these in GitHub for `Ujjwal92425/PostgreSQL`.

## Branch Protection For `main`

Go to:

```txt
Settings -> Branches -> Add branch protection rule
```

Use:

```txt
Branch name pattern: main
```

Enable:

- Require a pull request before merging
- Require approvals
- Require review from Code Owners
- Dismiss stale pull request approvals when new commits are pushed
- Require status checks to pass before merging
- Require branches to be up to date before merging
- Require conversation resolution before merging
- Require signed commits, if you use commit signing
- Require linear history
- Do not allow bypassing the above settings
- Restrict who can push to matching branches
- Allow only Ujjwal92425 to push directly, if direct maintainer pushes are desired
- Block force pushes
- Block deletions

Required status checks:

```txt
CI / verify
Dependency Review / dependency-review
CodeQL / Analyze TypeScript
```

Do not add `Main Branch Guard / guard` as a required pull request check. It is a push safeguard for `main`, not a PR check.

## Rulesets Alternative

GitHub Rulesets can enforce the same policy:

```txt
Settings -> Rules -> Rulesets -> New branch ruleset
```

Target:

```txt
main
```

Rules:

- Restrict creations
- Restrict updates
- Restrict deletions
- Require pull request
- Require code scanning results
- Require status checks
- Block force pushes

## Security And Analysis

Go to:

```txt
Settings -> Code security and analysis
```

Enable:

- Dependency graph
- Dependabot alerts
- Dependabot security updates
- Secret scanning
- Push protection
- Code scanning
- Private vulnerability reporting

## Actions Permissions

Go to:

```txt
Settings -> Actions -> General
```

Recommended:

- Allow GitHub Actions and reusable workflows
- Allow actions created by GitHub
- Allow verified Marketplace actions
- Set workflow permissions to read repository contents by default
- Require approval for first-time contributors

## Current Repo Files Supporting This

- `.github/CODEOWNERS`
- `.github/PULL_REQUEST_TEMPLATE.md`
- `.github/dependabot.yml`
- `.github/workflows/ci.yml`
- `.github/workflows/dependency-review.yml`
- `.github/workflows/codeql.yml`
- `.github/workflows/main-guard.yml`
- `CONTRIBUTING.md`
- `SECURITY.md`
