# PROJEXA — Monorepo Architecture

## 1. Architectural Philosophy

PROJEXA is built as a **MERN Modular Monolith** within a single version-controlled repository. The monorepo structure allows our 4-member team to:
- Maintain synchronized API contracts and frontend client types.
- Ensure unified CI/CD quality gates across both frontend and backend.
- Avoid multi-repository dependency synchronization overhead while keeping strict module boundaries between developer domains.

```
+-----------------------------------------------------------------------+
|                              PROJEXA                                  |
+-----------------------------------+-----------------------------------+
|              CLIENT               |              SERVER               |
|       (React 18, Vite, Tailwind)  |       (Express, Node, Mongoose)   |
|                                   |                                   |
|   +---------------------------+   |   +---------------------------+   |
|   | Member 1 (Frontend A):    |   |   | Member 3 (Backend A):     |   |
|   | - Student Dashboard       |   |   | - Server Foundation & DB  |   |
|   | - Auth Screens            |   |   | - Auth & Role Middleware  |   |
|   | - Shared UI Design System |   |   | - User/Team/Project CRUD  |   |
|   +---------------------------+   |   +---------------------------+   |
|   | Member 2 (Frontend B):    |   |   | Member 4 (Backend B):     |   |
|   | - Guide Dashboard         |   |   | - Dashboard Aggregations  |   |
|   | - Admin Dashboard         |   |   | - Audit Event Service     |   |
|   | - Team/Project Management |   |   | - Dev Seed Fixtures       |   |
|   +---------------------------+   |   | - Security / QA Tests     |   |
|                                   |   +---------------------------+   |
+-----------------------------------+-----------------------------------+
|               SHARED API CONTRACTS (/api/v1, JSON Envelope)           |
+-----------------------------------------------------------------------+
```

## 2. Directory Separation

- `client/`: Self-contained React SPA. Consumes backend REST endpoints via standard `fetch` or Axios services.
- `server/`: Express backend providing REST endpoints under `/api/v1`. Houses business logic, MongoDB Mongoose models, and transactional audit logging.
- `docs/`: Centralized single source of truth for architectural decisions, API schemas, and team handoffs.
- `.github/`: Repository automation, issue templates, PR review guidelines, and CI pipelines.
