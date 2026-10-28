# PROJEXA — Academic Project Management Platform

PROJEXA is a web application designed for final-year academic project management across universities and colleges. It coordinates workflows between **Students**, **Faculty Guides**, and **Department Administrators** to ensure clear milestone tracking, team collaboration, and compliance with academic requirements.

---

## 1. Technology Stack

- **Frontend:** React.js (v18+), Vite, Tailwind CSS, React Router (v6+)
- **Backend:** Node.js (v20+), Express.js
- **Database:** MongoDB, Mongoose ODM
- **Architecture:** MERN Modular Monolith
- **API Convention:** RESTful JSON with `/api/v1` prefix
- **Version Control:** Git & GitHub Monorepo

> **Important Note:** In compliance with project guidelines, PROJEXA does **not** use AI-powered features, AI APIs, LLM integrations, AI grading, or predictive analytics.

---

## 2. Team Structure & Module Ownership

| Role | Developer | Module Ownership & Responsibilities |
|---|---|---|
| **Member 1** | Frontend A | React app foundation, Auth screens (Login/Register), Student Dashboard UI, Shared UI design system & components |
| **Member 2** | Frontend B | Guide Dashboard UI, Admin Dashboard UI, Team & Project management interfaces |
| **Member 3** | Backend A | Express server foundation, MongoDB connection, Authentication & RBAC, User/Team/Project Mongoose schemas & CRUD APIs |
| **Member 4** | Backend B | Role-scoped Dashboard aggregation APIs (`/api/v1/dashboard/*`), Append-only Audit Event Service, Dev seed fixtures, Security/Integration tests, Performance benchmarks |

*Module ownership is strictly enforced to prevent merge conflicts and maintain separation of concerns.*

---

## 3. Monorepo Directory Layout

```text
projexa/
├── client/                     # Frontend application (React + Vite + Tailwind)
│   ├── public/
│   ├── src/
│   │   ├── components/         # Shared UI components (Member 1)
│   │   ├── layouts/            # Role-based dashboard layouts
│   │   ├── pages/
│   │   │   ├── student/        # Student views (Member 1)
│   │   │   ├── guide/          # Guide views (Member 2)
│   │   │   └── admin/          # Admin views (Member 2)
│   │   ├── hooks/              # Custom React hooks
│   │   ├── routes/             # App routing configuration
│   │   └── services/           # Frontend API client services
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
├── server/                     # Backend application (Express + MongoDB)
│   ├── src/
│   │   ├── models/             # Mongoose schemas (User, Team, Project - Member 3)
│   │   ├── controllers/        # Route controllers (Member 3)
│   │   ├── routes/             # Express route definitions (Member 3 & 4)
│   │   ├── middleware/         # Auth, validation, RBAC middleware (Member 3)
│   │   ├── services/
│   │   │   ├── dashboard/      # Dashboard aggregation services (Member 4)
│   │   │   └── audit/          # Append-only audit logging service (Member 4)
│   │   ├── seeds/              # Deterministic dev seed fixtures (Member 4)
│   │   ├── app.js              # Express app factory & middleware pipeline
│   │   └── index.js            # Server entrypoint & port listener
│   ├── tests/                  # Integration & unit test suites (Member 4)
│   └── package.json
├── docs/                       # Project documentation
│   ├── api/                    # API contracts and endpoint documentation
│   ├── architecture/           # Monorepo architecture and component flow
│   └── decisions/              # Architecture Decision Records (ADRs)
├── .github/
│   ├── workflows/              # GitHub Actions CI/CD workflows
│   ├── ISSUE_TEMPLATE/         # GitHub issue templates
│   └── pull_request_template.md
├── .gitignore
├── .env.example
├── package.json                # Root workspace configuration
└── README.md
```

---

## 4. Branch Management Strategy

All collaborative development follows a structured Git branching strategy:

- **`main`**: Production-ready, stable releases only. Direct commits are restricted. All merges must go through reviewed Pull Requests.
- **`develop`**: The primary integration branch. Feature branches branch off and merge back into `develop`.
- **`feature/fe1-*`**: Tasks assigned to Member 1 (Frontend A).
- **`feature/fe2-*`**: Tasks assigned to Member 2 (Frontend B).
- **`feature/be1-*`**: Tasks assigned to Member 3 (Backend A).
- **`feature/be2-*`**: Tasks assigned to Member 4 (Backend B).
  - Current Phase 1 branch: `feature/be2-phase1-dashboard-audit`
- **`fix/*`**: Hotfixes and targeted bug fixes.

**Rules:**
- Never force-push (`git push --force`) to shared branches.
- Never rewrite shared commit history.
- Pull Requests require passing CI checks and a peer review from another team member.

---

## 5. Development Timeline (30 Days / 4 Sprints)

- **Sprint 1 (Days 1–7): Foundation & Core Authentication**
  - Monorepo setup, Express foundation, MongoDB setup, User/Team/Project schemas.
  - Phase 1 Dashboard read APIs, Audit service, and Seed fixtures.
  - Initial student, guide, and admin dashboard UI scaffolds.
- **Sprint 2 (Days 8–15): Team & Project Management**
  - Team creation, membership assignment, guide allocations.
  - Project registration, milestone declarations, and CRUD APIs.
- **Sprint 3 (Days 16–22): Submission & Review Workflows**
  - Document uploads, review workflows, guide approvals, and feedback loops.
- **Sprint 4 (Days 23–30): Testing, Hardening & Final Presentation**
  - End-to-end integration testing, security audits, performance profiling, final bug fixes.

---

## 6. Local Setup & Getting Started

### Prerequisites
- **Node.js**: v20.0.0 or higher
- **npm**: v10.0.0 or higher
- **MongoDB**: v6.0 or higher (local or MongoDB Atlas connection)

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/SauravSKN/projexa.git
   cd projexa
   ```

2. Configure environment variables:
   ```bash
   cp .env.example .env
   # Update MongoDB URI and secrets as needed in .env
   ```

3. Install dependencies:
   ```bash
   # From root monorepo
   npm --prefix server install
   npm --prefix client install
   ```

4. Run Backend in development mode:
   ```bash
   npm run dev:server
   # Server runs at http://localhost:5000
   # Health check at http://localhost:5000/api/health
   ```

5. Run Frontend in development mode:
   ```bash
   npm run dev:client
   # Vite development server runs at http://localhost:5173
   ```

6. Run Backend Tests:
   ```bash
   npm test
   # Executes Node native test runner (zero external dependencies required)
   ```

---

## 7. API Conventions

All API responses strictly adhere to standard JSON envelopes:

### Success Response
```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description"
  }
}
```

### Core Phase 1 Endpoints
- `GET /api/health` — Public service health check
- `GET /api/v1/dashboard/student` — Student dashboard summary (requires `student` role)
- `GET /api/v1/dashboard/guide` — Guide dashboard summary (requires `guide` role)
- `GET /api/v1/dashboard/admin` — Admin dashboard summary (requires `admin` role)

---

## 8. Engineering & Security Standards

- **Server-Side Authorization**: Roles are validated strictly on the server via session/token identity; client cannot specify or override user identity.
- **Append-Only Audit Logging**: System mutations are tracked via `AuditEvent` records with restricted change field names. Audit logs cannot be updated or deleted.
- **Safe Development Seeding**: Seed scripts enforce environment safeguards (`ALLOW_DEV_SEED=true`, database name verification, minimum password length) and never run against production.
- **Credential Protection**: Password hashes, session tokens, and sensitive student records are never logged, audited, or returned in API responses.
