# Team Roles & Ownership Matrix

## Matrix of Responsibilities

| Subsystem | Member 1 (FE-A) | Member 2 (FE-B) | Member 3 (BE-A) | Member 4 (BE-B) |
|---|---|---|---|---|
| **Repository & CI Foundation** | Reviewer | Reviewer | Lead | Lead |
| **Authentication Screens** | **Owner** | Consumer | - | - |
| **Auth & Session Backend** | Consumer | Consumer | **Owner** | Integration Test |
| **User, Team, Project Schemas** | Consumer | Consumer | **Owner** | Consumer/Double |
| **Student Dashboard UI** | **Owner** | - | - | Contract Provider |
| **Guide & Admin Dashboard UI**| - | **Owner** | - | Contract Provider |
| **Dashboard Read Aggregation API** | - | - | Router Mounter | **Owner** |
| **Audit Event Logging Service** | - | - | Mutation Caller | **Owner** |
| **Development Seed Fixtures** | - | - | CLI Invoker | **Owner** |
| **Integration & Security Tests** | Component Test | Component Test | API Test | **Owner / Lead** |

## Non-Interference Guidelines

1. **Schema & Model Ownership:** Member 3 exclusively defines schema validation, indexes, and write mutations for `User`, `Team`, and `Project`. Member 4 provides service doubles and schema requirements without directly creating competing schemas.
2. **Audit Logging Callers:** Member 4 supplies `auditService.record()`. Member 3 calls this method from administrative mutation handlers.
3. **Dashboard Route Mounting:** Member 4 exports `registerDashboardRoutes(router, { authenticate, service })`. Member 3 mounts this router into the Express application pipeline using live authentication middleware.
