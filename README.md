# HQNATEX

NextGen Connect

HQNATEX is a production-grade enterprise platform for telecom and ISP operations. The target stack is FastAPI, PostgreSQL, SQLAlchemy, Alembic, Redis, Celery, React, TypeScript, Vite, TailwindCSS, Docker and Nginx.

## Current Stage

Stage: `PY_STAGE2`

This stage creates the production-oriented scaffold only. It does not implement fake dashboards, fake reports, demo finance, seeded companies, seeded partners or hardcoded ISP identities.

## Architecture Rules

- Tenant isolation is a first-class rule, not only a UI filter.
- Operational tables must be tenant scoped unless explicitly global.
- Financial records must be auditable and corrected by reversal or adjustment after posting.
- Company, ISP, partner, agency, service and package names must come from the database.
- Background jobs must carry tenant context for tenant-owned work.
- Reports must be source-backed and permission-scoped.

## Repository Layout

```text
hqnatex/
  backend/       FastAPI, SQLAlchemy, Alembic, tests
  frontend/      React, TypeScript, Vite, TailwindCSS
  nginx/         reverse proxy config
  docs/          stage review and architecture notes
```

## Local Development

```bash
cp .env.example .env
docker compose up --build
```

Backend API:

```text
http://localhost:8000/api/v1/health/live
```

Frontend:

```text
http://localhost:5173
```

## Stage Gate

Every stage must end with:

- Architecture Review
- Database Review
- API Review
- UI Review
- Security Review
- Testing Review
- Documentation Update

