# PostgreSQL Learning Journey 

A structured, self-documented journey through PostgreSQL and database engineering — from SQL fundamentals to production-grade system design for an SDE-2 role.

This repo contains my notes, diagrams, solved problems, and hands-on experiments as I learn PostgreSQL from 0 to 100.

---

## About

I'm learning PostgreSQL and relational database concepts end-to-end — not just syntax, but the internals: indexing, query optimization, transactions, replication, sharding, and how to actually run this in production (AWS RDS). This repo is my public learning log.

**Goal:** Be interview-ready and production-ready for an SDE-2 backend role.

---

## Repo Structure

```
postgres-learning/
├── 00-foundations/            # DBMS, RDBMS, ACID, CAP, client-server, keys
├── 01-core-sql/                # DDL, DML, DQL, DCL, TCL, constraints
├── 02-data-types/              # Numeric, JSONB, arrays, enums, ranges
├── 03-joins-set-ops/           # All join types, UNION/INTERSECT/EXCEPT
├── 04-subqueries-window-fns/   # CTEs, recursive CTEs, window functions
├── 05-functions-plpgsql/       # UDFs, PL/pgSQL, stored procedures, triggers
├── 06-indexing/                # B-Tree, GIN, GiST, BRIN, index decisions
├── 07-query-optimization/      # EXPLAIN ANALYZE, planner, ORMs, pooling
├── 08-transactions/            # Isolation levels, MVCC, locking
├── 09-schema-design/           # ER modeling, normalization, migrations
├── 10-scaling/                 # Partitioning, sharding, replication
├── 11-backup-recovery/         # pg_dump, PITR, WAL archiving
├── 12-security/                # Roles, RLS, encryption
├── 13-extensions/               # pg_stat_statements, pgcrypto, citus, etc.
├── 14-aws-rds/                  # RDS setup, Aurora, cost optimization
├── 15-monitoring-maintenance/   # Observability, bloat management
├── 16-system-design/            # CDC, outbox pattern, real-world designs
├── diagrams/                    # All ER diagrams, architecture diagrams (.png/.svg)
├── problems-solutions/          # Practice queries/problems + my solutions
└── resources.md                 # Useful links, docs, videos
```

Each topic folder contains a `notes.md` with my explanations/examples, and a `queries.sql` with hands-on queries I ran.

---

## Roadmap & Progress

Tracking my progress phase by phase. Check things off as I complete them.

- [ ] **Phase 0** — Foundations (DBMS vs RDBMS vs NoSQL, ACID, CAP, keys, client-server)
- [ ] **Phase 1** — Core SQL (DDL, DML, DQL, DCL, TCL, constraints)
- [ ] **Phase 2** — Data Types (deep dive)
- [ ] **Phase 3** — Joins & Set Operations
- [ ] **Phase 4** — Subqueries, CTEs & Window Functions
- [ ] **Phase 5** — Functions, PL/pgSQL, Triggers
- [ ] **Phase 6** — Indexing (deep dive)
- [ ] **Phase 7** — Query Optimization & Planner
- [ ] **Phase 8** — Transactions & Concurrency
- [ ] **Phase 9** — Schema Design & Normalization
- [ ] **Phase 10** — Partitioning, Sharding, Replication
- [ ] **Phase 11** — Backup & Recovery
- [ ] **Phase 12** — Security
- [ ] **Phase 13** — Extensions
- [ ] **Phase 14** — AWS RDS Hosting
- [ ] **Phase 15** — Monitoring & Maintenance
- [ ] **Phase 16** — SDE-2 System Design Application

---

## Setup (for anyone following along)

```bash
# Run Postgres locally via Docker
docker run --name pg-learning -e POSTGRES_PASSWORD=mypassword -p 5432:5432 -d postgres

# Connect using psql
psql -h localhost -U postgres -d postgres
```

---

## How I'm Using This Repo

- **`notes.md`** in each folder — concepts explained in my own words, with examples
- **`queries.sql`** in each folder — every SQL query I actually ran and tested
- **`diagrams/`** — ER diagrams, architecture diagrams, index structure visuals
- **`problems-solutions/`** — practice problems (LeetCode SQL, HackerRank, real-world scenarios) with my solutions and explanation of approach

---

## Resources

See [`resources.md`](./resources.md) for the full list of docs, articles, and videos I'm using.

Key references:
- [Official PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Use The Index, Luke](https://use-the-index-luke.com/) — indexing deep dive
- [PostgreSQL Exercises](https://pgexercises.com/)

---

## Notes

This is a personal learning repo — notes may be simplified or in-progress. Corrections and suggestions are welcome via issues/PRs.

---

⭐ If you're on a similar learning path, feel free to fork this and use the same structure.
