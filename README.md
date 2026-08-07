# PostgreSQL Learning Journey

A Next.js notes app for learning PostgreSQL from first principles to production-grade backend engineering.

The project is designed like a clean notepad/docs experience: collapsible topic navigation, one page per subtopic, responsive layouts, SQL examples, tables, and interactive walkthroughs for dynamic database behavior.

## What This Is

- PostgreSQL notes from beginner to deep production level.
- A shared production-style schema used across the whole curriculum.
- Separate pages for every subtopic.
- Interactive examples for locking, indexing, MVCC, query planning, replication, and system design patterns.
- Static export support for GitHub Pages.

## Tech Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Lucide icons
- Static export for GitHub Pages

## Local Development

```bash
npm install
npm run dev
```

Open:

```txt
http://localhost:3000
```

## Production Build

```bash
npm run build
```

The static site is exported into:

```txt
out/
```

## Curriculum Shape

The notes are driven by:

```txt
lib/curriculum.ts
content/notes.ts
lib/schema.ts
```

Every note page follows this learning flow:

1. Definition in simple English
2. Why it matters
3. Mental model
4. Core concept breakdown
5. Schema used in the page
6. Query examples
7. Example output
8. PostgreSQL internals
9. Common mistakes
10. Production considerations
11. Interview angle
12. Practice tasks
13. Further reading

## Shared Schema Domains

The schema intentionally mixes multiple production use cases:

- Identity: users, sessions, roles, permissions
- Catalog: products, variants, prices, inventory
- Orders: carts, orders, order items, status history
- Payments: attempts, refunds, invoices, ledger entries
- Seat booking: venues, events, seats, holds, reservations, tickets
- Shipping: addresses, shipments, shipment events
- Operations: audit logs, outbox events, idempotency keys
- Analytics: page views, impressions, search events

This lets the notes cover locking, indexes, decimal money values, transactions, normalization, partitioning, security, CDC, and real system design scenarios without changing domains every page.

## GitHub Pages

This app is configured for static export in `next.config.mjs`.

The workflow in `.github/workflows/deploy.yml` builds the app and publishes the `out/` directory to GitHub Pages on pushes to `main`.

In the repository settings, set GitHub Pages source to **GitHub Actions**.

## Repository Rules

Do not push directly to `main` unless you are `Ujjwal92425`.

All other changes must be made through a pull request. See [CONTRIBUTING.md](./CONTRIBUTING.md) and the pull request template for the full rules.

For public-repository protection, also enable the GitHub settings listed in [docs/repository-safeguards.md](./docs/repository-safeguards.md).
