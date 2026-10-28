# ADR 001: Initial Architecture, Tech Stack, and Branch Policy

## Status
Accepted

## Context
PROJEXA is an academic project management platform developed by a 4-developer team over a 30-day timeline across 4 sprints. The project requires reliable coordination between frontend and backend work streams while keeping a strict separation of module ownership.

## Decisions

1. **Stack Selection:**
   - Client: React 18+ with Vite for fast HMR and lightweight bundling, Tailwind CSS for modern utility-first responsive styling, and React Router v6 for client-side navigation.
   - Server: Node.js (v20+) with Express.js for REST endpoints.
   - Database: MongoDB with Mongoose ODM.
   - Zero AI Policy: In compliance with institutional project guidelines, no AI models, external LLM APIs, predictive scoring, or automated AI grading will be integrated into the application.

2. **Branching Model:**
   - `main` branch holds production-ready code.
   - `develop` branch holds integrated development work.
   - Each developer works on dedicated feature branches (`feature/fe1-*`, `feature/fe2-*`, `feature/be1-*`, `feature/be2-*`).
   - Direct pushes to `main` are prohibited after initial repository initialization.
   - Pull requests must include testing evidence and peer approval before merge.

3. **API Response Contract:**
   All endpoints follow a unified JSON envelope:
   - Success: `{ "success": true, "data": { ... } }`
   - Failure: `{ "success": false, "error": { "code": "...", "message": "..." } }`

4. **Security & Data Privacy:**
   - Role enforcement must occur on the server.
   - Never expose credentials, session secrets, or raw passwords.
   - Audit trail is append-only and captures modified field names only (never raw values).
   - Seed scripts enforce strict safety guards (`ALLOW_DEV_SEED`, database name checks).
