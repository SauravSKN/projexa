# Member 4 — Phase 1 integration and quality handoff

## Ownership boundary

- **BE2 owns:** dashboard service/routes, `AuditEvent` schema/service, deterministic seed function, read contract, backend tests and performance review.
- **BE1 owns:** User/Team/Project models, Express app/routers, login/session validation, authorization for team/project routes, admin mutations, shared error handler and database connection.
- **FE1 consumes:** student dashboard JSON. **FE2 consumes:** guide/admin dashboard JSON.
- **Not in Phase 1:** task workflows, uploads, meeting/attendance logic, score engine, notifications, project archive and AI.

## BE1 integration checklist

1. Install BE2 files into the same `server/src` tree. Import `createDashboardService` and `registerDashboardRoutes`; create the service with BE1 Mongoose models and mount the router on `/api/v1/dashboard` with BE1's session-authentication middleware.
2. Authentication must populate `req.user` with `_id`, `role` and current `status`, reject disabled/expired sessions, and never allow the client to choose its identity.
3. Register `AuditEvent` once with the shared Mongoose connection. Call `auditService.record()` server-side from every permitted admin team/project create/edit/assignment. Pass the same MongoDB transaction `session` as the mutation when available; do not silently swallow audit failures.
4. Call `seedDevelopment()` from a BE1-controlled CLI with BE1's actual `hashPassword` function, explicit `dbName`, and environment guards. It is insert-only and must never be run against real institution data.
5. Approve one-team-per-student and one-project-per-team session policies. BE1 and FE owners must approve the current response field names.
6. Add BE1's real Express/Supertest/MongoDB integration tests for login, resource ownership (`/teams/:id` and `/projects`), invalid IDs, admin mutations, audit persistence, and disabled sessions. The included tests validate BE2 read/role/seed/audit behavior with in-memory model doubles only.

## Acceptance gates not yet met without BE1

- Actual session cookies, login and resource-scoped team/project endpoints are not present in this handoff.
- No real MongoDB/HTTP integration or query-performance benchmarks have been run.
- No admin write flows exist in this module; BE1 must call the audit utility transactionally.

## Performance sanity checklist

After BE1 models are merged, run MongoDB `explain('executionStats')` for student member lookup, guide teams lookup, project by team lookup, and the admin team load aggregation. Capture document counts, indexes, execution time, hardware and database topology. Test 100, 1,000, then 10,000 teams in a **test** database only. Check index scans against collection scans and paginate all full directory lists. Admin guide load remains a summary and can be expensive at scale; evaluate caching only after measuring correctness and freshness.
