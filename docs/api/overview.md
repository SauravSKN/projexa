# PROJEXA API Overview & Standards

## Base URL
All API endpoints are mounted under the `/api/v1` prefix, with the exception of the root health check at `/api/health`.

- Health Check: `GET /api/health`
- Versioned Health Check: `GET /api/v1/health`

## Standard Envelope

### Successful Response (HTTP 200/201)
```json
{
  "success": true,
  "data": {}
}
```

### Failed Response (HTTP 4xx / 5xx)
```json
{
  "success": false,
  "error": {
    "code": "STRING_ERROR_CODE",
    "message": "Human-readable description of error"
  }
}
```

## Standard Error Codes
- `UNAUTHENTICATED` (401): Missing, invalid, or expired session token.
- `FORBIDDEN` (403): User lacks permissions or account is disabled.
- `NOT_FOUND` (404): Resource or route does not exist.
- `VALIDATION_ERROR` (400): Invalid request parameters or body.
- `CONFLICT` (409): Resource already exists (e.g. duplicate email/team name).
- `INTERNAL_ERROR` (500): Server-side unexpected failure (sanitized; no secrets exposed).

## Phase 1 Endpoints
- `GET /api/v1/dashboard/student` — (Role: student) Retrieves current student's team, project, and guide.
- `GET /api/v1/dashboard/guide` — (Role: guide) Retrieves assigned teams and project status.
- `GET /api/v1/dashboard/admin` — (Role: admin) Retrieves system summary metrics and guide workload.
