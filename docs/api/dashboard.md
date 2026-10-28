# Projexa Phase 1 — Dashboard API contract (Member 4)

**Status:** Proposed integration contract; BE1, FE1 and FE2 must approve response fields before merge.

Mount the router at `/api/v1/dashboard`. All endpoints require a valid, unexpired authenticated session, an **active** account, and the exact matching role. All responses use the shared envelope.

## GET `/api/v1/dashboard/student`

Role: `student`. The team is resolved from the authenticated student's `_id`, never a user-supplied query parameter. A student with no team receives `null` fields.

```json
{
  "success": true,
  "data": {
    "userName": "Aarav Patel",
    "team": { "id": "690100000000000000000101", "name": "Projexa Demo Team", "memberCount": 4 },
    "project": { "id": "690100000000000000000201", "title": "Projexa Demo Capstone", "status": "active" },
    "guide": { "name": "Dr Ananya Shah" }
  }
}
```

No-team example: `{"success":true,"data":{"userName":"Kabir Sen","team":null,"project":null,"guide":null}}`.

## GET `/api/v1/dashboard/guide`

Role: `guide`. Only teams whose `guideId` matches the authenticated guide are included.

```json
{
  "success": true,
  "data": {
    "assignedTeamCount": 1,
    "projectCount": 1,
    "assignedTeams": [
      { "id": "690100000000000000000101", "name": "Projexa Demo Team", "projectTitle": "Projexa Demo Capstone" }
    ]
  }
}
```

An unassigned guide receives `assignedTeamCount:0`, `projectCount:0`, `assignedTeams:[]`.

## GET `/api/v1/dashboard/admin`

Role: `admin`. Counts for students and guides include **active accounts only**. Team and project counts include all records. Guide load includes active guides with zero assignments, sorted by name.

```json
{
  "success": true,
  "data": {
    "studentCount": 5,
    "guideCount": 2,
    "teamCount": 1,
    "projectCount": 1,
    "guideLoad": [
      { "guideId": "690100000000000000000011", "guideName": "Dr Ananya Shah", "teamCount": 1 },
      { "guideId": "690100000000000000000012", "guideName": "Dr Rohan Mehta", "teamCount": 0 }
    ]
  }
}
```

## Shared error shape

```json
{ "success": false, "error": { "code": "FORBIDDEN", "message": "Access denied" } }
```

- `401 UNAUTHENTICATED`: no session or expired session (BE1 middleware).
- `403 FORBIDDEN`: incorrect role or disabled account.
- `500 INTERNAL_ERROR`: unexpected database error; no secrets in response (BE1 central error handler).

## Queries and indexes

BE1 should add/verify indexes on `User.email` (unique), `User.role,status`, `Team.memberIds`, `Team.guideId`, and `Project.teamId` (unique **if** one project per team is approved). Member 4 creates audit indexes for target and actor by time.

**Open decisions:** The student endpoint currently assumes a student has one relevant team, and guide cards show one project title per team. Team/project uniqueness per academic session must be approved by the team. No pagination is needed for the three summary endpoints; BE1's `/teams` and `/projects` lists must paginate separately.
