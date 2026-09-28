# RSO Attendance Tracker
## Project Specification, Architecture, Security, and Development Guide

**Version:** 1.0  
**Status:** MVP Specification  
**Target development time:** 2–3 weeks, approximately 1–2 hours/day  
**Development model:** Open source, AI-assisted development  
**Primary deployment:** AWS  
**Primary database:** PostgreSQL  

---

# 1. Project Overview

The RSO Attendance Tracker is a web application for a university Registered Student Organization (RSO).

The application will allow students to authenticate using their university Google account, maintain a basic member profile, view attendance history, and check into events.

Executive board members will have access to an administrative dashboard where they can create and manage events, open and close attendance, view attendees, and export attendance data.

The application is intentionally scoped as an MVP. The goal is to produce a secure, maintainable, deployable application in approximately 2–3 weeks rather than attempting to build a complete RSO management platform.

The system should be designed so that future students can maintain and extend it without requiring a complete rewrite.

---

# 2. Primary Goals

Version 1 must provide:

1. Google SSO using the university's Google Workspace.
2. Student account creation on first login.
3. Student profile management.
4. Executive board role-based access.
5. Event creation and management.
6. QR-code attendance.
7. Attendance timestamps.
8. Student attendance history.
9. Executive attendance reports.
10. CSV export.
11. Audit logging.
12. AWS deployment.
13. Basic security appropriate for an open-source application.

---

# 3. Explicitly Out of Scope for Version 1

Do not implement these unless specifically requested later:

- RSVP system
- Waitlists
- Email notification system
- Push notifications
- Mobile application
- NFC attendance
- Geofencing
- Payment processing
- Budget management
- Sponsor CRM
- Complex analytics
- Multiple organizations
- Faculty administration
- University-wide account provisioning
- Microservice architecture
- Kubernetes
- Redis
- Event recommendation systems
- AI features

The application should remain a focused attendance tracker.

---

# 4. Technology Stack

## Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS

## Backend

- Python 3.12+
- FastAPI
- SQLAlchemy
- Alembic
- Pydantic

## Database

PostgreSQL.

Development may use a local PostgreSQL instance or Docker.

Production should use Amazon RDS for PostgreSQL.

## Authentication

Google OAuth 2.0 / OpenID Connect.

Only users with the university's approved Google Workspace domain may authenticate.

## AWS

Initial production architecture:

- AWS Amplify for frontend hosting
- AWS App Runner for FastAPI backend
- Amazon RDS for PostgreSQL
- AWS Secrets Manager for production secrets
- Amazon CloudWatch for application logs and monitoring

Additional AWS services should only be introduced when there is a concrete requirement.

---

# 5. Architecture

The initial architecture should be a simple three-tier web application.

```text
                         Students
                            |
                            v
                     Google SSO / OAuth
                            |
                            v
                  +--------------------+
                  |    Next.js App     |
                  |  AWS Amplify       |
                  +--------------------+
                            |
                         HTTPS
                            |
                            v
                  +--------------------+
                  |    FastAPI API     |
                  |    AWS App Runner  |
                  +--------------------+
                            |
                            v
                  +--------------------+
                  | PostgreSQL / RDS   |
                  +--------------------+
```

Application logs should be sent to CloudWatch.

Business audit logs should be stored in PostgreSQL.

---

# 6. Design Principles

The project should follow these principles:

## Keep it simple

Prefer a small, understandable system over unnecessary abstractions.

## Security by design

Assume the source code is publicly available.

Security must never depend on hiding implementation details.

## Backend is authoritative

The frontend is not trusted.

Authentication, authorization, validation, and business rules must be enforced by the backend.

## Database integrity matters

Important rules should be enforced both in application logic and with database constraints where practical.

## Maintainability

The application will eventually be maintained by future students.

Code should therefore favor:

- Readability
- Documentation
- Consistent naming
- Small functions
- Clear separation of concerns
- Straightforward architecture

---

# 7. User Roles

Version 1 has two primary roles.

## Member

Members can:

- Sign in
- View their profile
- Edit permitted profile information
- View their attendance history
- Check into active events

Members cannot:

- Create events
- Edit events
- Delete events
- View other members' attendance
- Modify attendance records
- View audit logs
- Manage roles

## Executive Board

Executive board members can:

- Create events
- Edit events
- Delete/archive events
- Publish events
- Open attendance
- Close attendance
- View event attendance
- Manually add attendance
- Remove attendance when necessary
- Export attendance
- View audit logs

Role permissions must be enforced by the backend.

---

# 8. Database Schema

The initial database should contain the following tables:

```text
users
roles
user_roles
events
attendance
audit_logs
```

Additional tables should not be introduced unless required.

---

## 8.1 Users

```text
users

id                  UUID PRIMARY KEY
google_id           VARCHAR UNIQUE NOT NULL
email               VARCHAR UNIQUE NOT NULL
first_name          VARCHAR NOT NULL
last_name           VARCHAR NOT NULL
major               VARCHAR
year                VARCHAR
pronouns            VARCHAR
created_at          TIMESTAMP NOT NULL
updated_at          TIMESTAMP NOT NULL
```

The Google `sub` identifier should be stored as `google_id`.

Do not use email as the permanent external identity because email addresses can change.

---

## 8.2 Roles

```text
roles

id                  UUID PRIMARY KEY
name                VARCHAR UNIQUE NOT NULL
```

Initial roles:

```text
Member
ExecutiveBoard
```

---

## 8.3 User Roles

```text
user_roles

user_id             UUID REFERENCES users(id)
role_id             UUID REFERENCES roles(id)

PRIMARY KEY (user_id, role_id)
```

A separate role table is preferred over an `is_admin` boolean.

This allows future roles to be added without changing the user schema.

---

## 8.4 Events

```text
events

id                  UUID PRIMARY KEY
title               VARCHAR NOT NULL
description         TEXT
date                DATE NOT NULL
start_time          TIME NOT NULL
end_time            TIME
location            VARCHAR NOT NULL
guest               VARCHAR
sponsor             VARCHAR
status              VARCHAR NOT NULL
created_by          UUID REFERENCES users(id)
created_at          TIMESTAMP NOT NULL
updated_at          TIMESTAMP NOT NULL
deleted_at          TIMESTAMP
deleted_by          UUID REFERENCES users(id)
```

Valid event statuses:

```text
DRAFT
PUBLISHED
ACTIVE
CLOSED
```

Events should normally be soft-deleted instead of permanently deleted.

---

## 8.5 Attendance

```text
attendance

id                  UUID PRIMARY KEY
event_id            UUID REFERENCES events(id)
user_id             UUID REFERENCES users(id)
check_in_time       TIMESTAMP NOT NULL
method              VARCHAR NOT NULL
created_at          TIMESTAMP NOT NULL
```

Valid methods:

```text
QR
MANUAL
```

There must be a database constraint preventing duplicate attendance:

```text
UNIQUE(event_id, user_id)
```

A user may only have one attendance record for an event.

---

## 8.6 Audit Logs

```text
audit_logs

id                  UUID PRIMARY KEY
timestamp           TIMESTAMP NOT NULL
actor_user_id       UUID REFERENCES users(id)
action              VARCHAR NOT NULL
entity_type         VARCHAR NOT NULL
entity_id           UUID
old_values          JSONB
new_values          JSONB
ip_address          VARCHAR
user_agent          TEXT
notes               TEXT
```

Audit logs should be append-only.

Normal application users must not be able to modify or delete audit records.

---

# 9. Authentication

Authentication must use Google OAuth 2.0 / OpenID Connect.

Authentication flow:

```text
User
 |
 v
Google Login
 |
 v
Google authenticates user
 |
 v
Backend verifies Google identity
 |
 v
Check university email domain
 |
 v
Find user by Google subject
 |
 +--> Existing user -> Sign in
 |
 +--> New user -> Create account
```

The backend must verify the Google token.

The frontend must never be trusted to provide:

- User identity
- Email
- Google subject
- Role
- Permissions

The backend should derive the authenticated identity from the verified Google authentication result.

---

# 10. University Email Restriction

Only approved university Google Workspace accounts should be permitted.

For example:

```text
@university.edu
```

The actual domain must be configured through environment variables rather than hard-coded throughout the application.

Do not accept arbitrary email addresses supplied by the client.

---

# 11. Session Management

Use secure server-managed sessions or a properly implemented token-based authentication system.

If cookies are used:

- Secure
- HttpOnly
- SameSite
- Appropriate expiration

Authentication cookies must never be accessible through normal frontend JavaScript.

Sessions should have a reasonable expiration time.

Logout must invalidate the session.

---

# 12. Authorization

Authentication determines who the user is.

Authorization determines what the user can do.

Every protected backend endpoint must verify authorization.

Example:

```text
POST /api/events

1. Verify authentication
2. Identify user
3. Retrieve user's roles
4. Verify ExecutiveBoard permission
5. Validate request
6. Execute operation
7. Create audit record
```

The frontend may hide the "Create Event" button from members, but this is not a security control.

The backend must reject unauthorized requests with HTTP 403.

---

# 13. API Design

Use REST-style JSON APIs.

Suggested endpoints:

```text
GET    /api/me

GET    /api/events
GET    /api/events/{event_id}

POST   /api/events
PUT    /api/events/{event_id}
DELETE /api/events/{event_id}

POST   /api/events/{event_id}/publish
POST   /api/events/{event_id}/open-attendance
POST   /api/events/{event_id}/close-attendance

POST   /api/attendance/checkin
GET    /api/events/{event_id}/attendance

POST   /api/events/{event_id}/attendance/manual
DELETE /api/attendance/{attendance_id}

GET    /api/me/attendance

GET    /api/admin/audit
GET    /api/admin/users
GET    /api/admin/attendance/export
```

Administrative endpoints must require the appropriate role.

---

# 14. Event Lifecycle

Events should follow a predictable lifecycle.

```text
DRAFT
  |
  v
PUBLISHED
  |
  v
ACTIVE
  |
  v
CLOSED
```

Meaning:

### DRAFT

Event is being planned.

Students should not necessarily see it.

### PUBLISHED

Event information is visible to students.

Attendance has not opened.

### ACTIVE

Attendance is currently available.

QR check-in is permitted.

### CLOSED

Attendance is no longer accepted.

The event remains available for historical reporting.

---

# 15. QR Attendance

When an executive opens attendance, the system should generate a short-lived signed token.

The QR code should contain a URL similar to:

```text
https://attendance.example.edu/checkin?token=<SIGNED_TOKEN>
```

Do not use an unsigned event ID as the only authentication mechanism.

The token should contain enough information to determine:

- Event
- Expiration
- Token purpose

The backend must verify the token before accepting attendance.

The token should expire after a short period.

The QR code can be refreshed periodically.

---

# 16. Attendance Check-In Flow

```text
Student scans QR code
        |
        v
Check-in page
        |
        v
Google authentication if needed
        |
        v
Backend verifies session
        |
        v
Backend verifies QR token
        |
        v
Backend verifies event is ACTIVE
        |
        v
Database checks duplicate attendance
        |
        v
Attendance inserted
        |
        v
Audit record created
```

If the user already has attendance for the event, return an appropriate message instead of creating another record.

The database's unique constraint is the final protection against duplicates.

---

# 17. Student Dashboard

The student dashboard should display:

```text
Name
Major
Year
Pronouns
Total Events Attended
```

Attendance history:

```text
Event
Date
Check-in Time
```

The total attendance count should initially be calculated from the attendance table.

Do not store a separate `total_events_attended` counter unless a future performance requirement justifies it.

---

# 18. Executive Dashboard

The executive dashboard should contain:

```text
Upcoming Events
Past Events

Create Event

Manage Events

Attendance

Export CSV

Audit Log
```

The dashboard should only be accessible to ExecutiveBoard users.

---

# 19. Audit Logging

Audit logging should be implemented as a reusable backend service.

The service should be responsible for recording:

- Actor
- Action
- Entity
- Entity ID
- Timestamp
- Previous values
- New values
- IP address where available
- User agent where available
- Optional notes

Examples:

```text
CREATE_EVENT
UPDATE_EVENT
DELETE_EVENT
OPEN_ATTENDANCE
CLOSE_ATTENDANCE
ATTENDANCE_ADD
ATTENDANCE_REMOVE
ROLE_CHANGE
```

Data-changing operations should automatically generate audit records.

Do not rely on developers remembering to manually add audit logging to every route.

---

# 20. Audit Log Examples

Creating an event:

```json
{
  "action": "CREATE_EVENT",
  "entity_type": "Event",
  "entity_id": "uuid",
  "old_values": null,
  "new_values": {
    "title": "General Meeting",
    "location": "ECEB 3017",
    "date": "2026-09-10"
  }
}
```

Changing an event location:

```json
{
  "action": "UPDATE_EVENT",
  "entity_type": "Event",
  "entity_id": "uuid",
  "old_values": {
    "location": "ECEB 3017"
  },
  "new_values": {
    "location": "Siebel 1404"
  }
}
```

Promoting a user:

```json
{
  "action": "ROLE_CHANGE",
  "entity_type": "User",
  "entity_id": "uuid",
  "old_values": {
    "role": "Member"
  },
  "new_values": {
    "role": "ExecutiveBoard"
  }
}
```

---

# 21. Security Requirements

The source code is public.

Assume an attacker can read the entire repository.

Security must therefore rely on proper controls rather than obscurity.

---

## 21.1 Secrets

Never commit:

- Google client secrets
- Database passwords
- JWT secrets
- AWS credentials
- Encryption keys
- API keys

Development secrets should be stored in `.env`.

`.env` must be included in `.gitignore`.

Provide:

```text
.env.example
```

with placeholder values.

Production secrets should use AWS Secrets Manager or the appropriate AWS runtime secret mechanism.

---

## 21.2 AWS Credentials

Do not put AWS access keys in the repository.

Prefer AWS IAM roles for AWS-hosted services.

Each AWS service should have only the permissions it needs.

Follow least privilege.

---

## 21.3 Database Security

The application should not connect using the PostgreSQL superuser.

Create an application-specific database user.

Production RDS should:

- Require SSL connections
- Use strong credentials
- Restrict network access
- Avoid public database access where practical
- Use automated backups

The backend should be the only application component that directly accesses PostgreSQL.

The frontend must never connect directly to RDS.

---

# 22. SQL Injection

Use SQLAlchemy and parameterized queries.

Never construct SQL using string interpolation with user input.

Bad:

```python
query = f"SELECT * FROM users WHERE id = '{user_id}'"
```

Good:

```python
session.get(User, user_id)
```

or an equivalent parameterized SQLAlchemy query.

---

# 23. Input Validation

Validate every API request.

Use Pydantic schemas.

Validate:

- UUIDs
- Dates
- Times
- Strings
- Maximum lengths
- Required fields
- Enumerated values

Frontend validation is for usability.

Backend validation is for security.

---

# 24. Cross-Site Scripting

Treat all user-provided content as untrusted.

Potentially user-controlled fields include:

- Event titles
- Event descriptions
- Guest names
- Sponsor names
- Notes

Do not render arbitrary HTML.

Escape or sanitize content when necessary.

Use a Content Security Policy where practical.

---

# 25. CSRF

If cookie-based authentication is used, implement appropriate CSRF protections.

Cookies should use:

```text
Secure
HttpOnly
SameSite
```

The exact CSRF strategy should match the authentication architecture selected during implementation.

---

# 26. Rate Limiting

Rate-limit endpoints that could be abused.

At minimum consider:

```text
Authentication endpoints
QR check-in
Administrative endpoints
```

Return HTTP 429 when limits are exceeded.

Do not implement an unnecessarily complex distributed rate-limiting system for Version 1.

Use the simplest appropriate mechanism.

---

# 27. QR Security

QR tokens must:

- Be cryptographically signed
- Have short expiration periods
- Be tied to a specific event
- Be validated server-side

Do not trust data contained in the QR code without signature verification.

A copied QR code should only remain useful for the short period for which its token is valid.

---

# 28. Duplicate Attendance

Enforce uniqueness at the database level:

```text
UNIQUE(event_id, user_id)
```

Application logic should also check for an existing record so the user receives a clean response.

The database constraint remains the authoritative protection.

---

# 29. XSS, CSRF, and HTTP Security Headers

Production should use HTTPS exclusively.

Configure appropriate HTTP security headers, including where applicable:

```text
Strict-Transport-Security
Content-Security-Policy
X-Content-Type-Options: nosniff
X-Frame-Options
Referrer-Policy
Permissions-Policy
```

Do not use headers that break required application functionality.

---

# 30. Error Handling

Production responses must not expose:

- Stack traces
- SQL statements
- Database credentials
- Internal file paths
- OAuth secrets
- AWS credentials

Return a safe error message to the client.

Detailed errors should be recorded in server-side logs.

---

# 31. Logging

Operational logs should be sent to CloudWatch.

Useful information includes:

- Request failures
- Authentication failures
- Authorization failures
- Application errors
- Database errors
- Deployment errors

Never log:

- Passwords
- OAuth tokens
- Session secrets
- Database passwords
- AWS credentials

Business-level changes belong in the PostgreSQL audit log.

---

# 32. Dependency Security

Use maintained dependencies.

Run dependency vulnerability checks periodically.

Keep:

- Python dependencies
- npm dependencies
- Docker base images, if used
- AWS runtime dependencies

reasonably up to date.

Do not blindly update all dependencies in production without testing.

---

# 33. Soft Deletion

Important records such as events should generally be soft-deleted.

Instead of:

```sql
DELETE FROM events;
```

set:

```text
deleted_at
deleted_by
```

This preserves historical attendance data and allows recovery from accidental deletion.

Normal application queries should exclude deleted events.

---

# 34. Data Privacy

The application stores personally identifiable information.

Keep stored information limited to what is actually needed.

Initial profile fields:

- Name
- University email
- Major
- Year
- Pronouns
- Attendance history

Do not collect unrelated personal information.

Access to attendance data should be restricted according to role.

Members should only be able to view their own attendance.

Executives may view attendance data required for organizational administration.

---

# 35. Backups

Production PostgreSQL should use automated RDS backups.

The system should support recovery from accidental deletion or database failure.

Backups should be encrypted.

Restore procedures should be documented.

A backup that has never been tested should not be assumed to be recoverable.

---

# 36. Development Environment

Developers should be able to run the application locally without access to production.

Recommended local environment:

```text
Next.js
    |
FastAPI
    |
Local PostgreSQL
```

Docker Compose may be used for local PostgreSQL if convenient.

Development credentials must be separate from production credentials.

---

# 37. Repository Structure

Recommended repository:

```text
rso-attendance-tracker/

├── frontend/
│   ├── app/
│   ├── components/
│   ├── hooks/
│   ├── services/
│   ├── types/
│   └── package.json
│
├── backend/
│   ├── api/
│   ├── auth/
│   ├── database/
│   ├── middleware/
│   ├── models/
│   ├── repositories/
│   ├── schemas/
│   ├── services/
│   ├── tests/
│   └── requirements.txt
│
├── migrations/
│
├── docs/
│   ├── architecture.md
│   ├── database.md
│   ├── deployment.md
│   └── development.md
│
├── .github/
│   └── workflows/
│
├── .env.example
├── .gitignore
├── README.md
└── PROJECT_SPEC.md
```

The exact structure may be adjusted if the chosen framework requires a different convention.

Do not create unnecessary abstractions simply to match this structure.

---

# 38. Backend Architecture

Use a simple layered structure:

```text
HTTP Request
     |
     v
API Route
     |
     v
Authentication / Authorization
     |
     v
Service
     |
     v
Repository / SQLAlchemy
     |
     v
PostgreSQL
```

API routes should remain relatively thin.

Business logic should reside in services.

Database access should be handled consistently through SQLAlchemy.

---

# 39. Frontend Architecture

The frontend should contain:

```text
Public pages
Authentication
Student dashboard
Executive dashboard
Event pages
Check-in page
Reusable UI components
API service layer
```

Do not duplicate API logic throughout individual components.

---

# 40. API Error Format

Use a consistent error response.

Example:

```json
{
  "success": false,
  "message": "Attendance has already been recorded."
}
```

Do not expose internal exception details.

Use standard HTTP status codes.

Examples:

```text
200 OK
201 Created
400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
409 Conflict
429 Too Many Requests
500 Internal Server Error
```

---

# 41. Testing Requirements

Version 1 should include basic tests for important business logic.

At minimum test:

- Authentication domain restriction
- Role authorization
- Event creation
- Event editing
- Event deletion
- Attendance check-in
- Duplicate attendance
- Closed-event check-in rejection
- QR token expiration
- Audit log creation

Tests should focus on behavior rather than implementation details.

---

# 42. Development Workflow

Development should be incremental.

Recommended milestones:

## Milestone 1: Project Setup

- Repository
- Next.js
- FastAPI
- PostgreSQL
- SQLAlchemy
- Alembic
- Basic deployment configuration

## Milestone 2: Authentication

- Google OAuth
- University domain restriction
- User creation
- Session management

## Milestone 3: Events

- Event model
- Event CRUD
- Executive authorization
- Executive dashboard

## Milestone 4: Attendance

- Attendance model
- QR generation
- QR verification
- Check-in
- Duplicate protection

## Milestone 5: Student Experience

- Student dashboard
- Attendance history
- Profile information

## Milestone 6: Audit and Reports

- Audit service
- Audit database table
- Audit viewer
- CSV export

## Milestone 7: Production

- AWS deployment
- HTTPS
- Secrets
- RDS
- CloudWatch
- Production testing

---

# 43. Git Workflow

Use Git throughout development.

Recommended branch pattern:

```text
main

feature/google-auth
feature/events
feature/attendance
feature/audit-log
feature/admin-dashboard
```

Use pull requests for significant changes.

Do not commit directly to `main` once multiple developers are contributing.

---

# 44. AI Coding Agent Guidelines

AI coding agents may be used extensively.

Agents must follow the project specification.

Before making changes, agents should:

1. Inspect the existing project structure.
2. Read relevant documentation.
3. Identify existing patterns.
4. Make the smallest reasonable change.
5. Avoid rewriting unrelated code.
6. Run relevant tests.
7. Report failures clearly.

Agents should not:

- Invent credentials
- Commit secrets
- Disable security checks to make tests pass
- Remove authorization checks
- Replace the architecture without explicit approval
- Add unnecessary dependencies
- Implement out-of-scope features
- Delete existing functionality without confirmation

When uncertain, prefer the simplest implementation consistent with this specification.

---

# 45. AI Agent Development Strategy

Do not give an AI agent the entire project as one enormous prompt.

Use small tasks.

Example:

```text
Implement the SQLAlchemy User, Role, and UserRole models.

Requirements:
- Follow PROJECT_SPEC.md.
- Use UUID primary keys.
- Add created_at and updated_at where appropriate.
- Add required uniqueness constraints.
- Create an Alembic migration.
- Add basic model tests.
- Do not implement authentication yet.
```

Then review and test the result before moving to the next feature.

---

# 46. Definition of Done

Version 1 is complete when:

### Authentication

- [ ] University Google accounts can sign in.
- [ ] Non-university accounts are rejected.
- [ ] Users are created automatically on first login.
- [ ] Sessions are securely managed.

### Authorization

- [ ] Members cannot access executive endpoints.
- [ ] Executive board members can access administrative functionality.
- [ ] Authorization is enforced server-side.

### Events

- [ ] Executives can create events.
- [ ] Executives can edit events.
- [ ] Executives can publish events.
- [ ] Executives can open attendance.
- [ ] Executives can close attendance.
- [ ] Events can be archived/soft-deleted.

### Attendance

- [ ] Students can scan a QR code.
- [ ] QR tokens expire.
- [ ] Attendance records include timestamps.
- [ ] Duplicate attendance is prevented.
- [ ] Closed events reject check-ins.

### Student Dashboard

- [ ] Students can view their profile.
- [ ] Students can view attendance history.
- [ ] Students can view total attendance.

### Executive Dashboard

- [ ] Executives can view event attendance.
- [ ] Executives can manually correct attendance.
- [ ] Executives can export attendance CSV.

### Audit

- [ ] Event changes are logged.
- [ ] Attendance changes are logged.
- [ ] Role changes are logged.
- [ ] Audit records cannot be modified by normal users.

### Security

- [ ] No secrets exist in Git.
- [ ] Production uses HTTPS.
- [ ] API input is validated.
- [ ] SQL injection protections are in place.
- [ ] Authorization is server-side.
- [ ] Security headers are configured.
- [ ] Production errors do not expose internal information.
- [ ] Dependencies have been checked for known vulnerabilities.

### Deployment

- [ ] Frontend runs on AWS.
- [ ] Backend runs on AWS.
- [ ] PostgreSQL runs on RDS.
- [ ] Production secrets are managed securely.
- [ ] CloudWatch logging works.
- [ ] Database backups are enabled.

---

# 47. Future Expansion

The system should be extensible without implementing future functionality now.

Potential future features include:

- Multiple RSOs
- RSVP
- Email notifications
- Event reminders
- Semester statistics
- Sponsor management
- Officer-specific permissions
- Faculty advisor accounts
- Advanced analytics
- Mobile application
- NFC check-in
- University ID integration

These should be treated as separate future projects.

---

# 48. Final Implementation Philosophy

The first version should be boring.

Prefer:

```text
One frontend
One backend
One database
Simple REST API
Simple RBAC
Simple audit system
```

Avoid:

```text
Microservices
Kubernetes
Complex event buses
Unnecessary caching
Multiple databases
Custom authentication
Over-engineered abstractions
```

The goal is a reliable application that can be completed, deployed, understood, and maintained by future students.

The architecture should provide a clean foundation for expansion without requiring that expansion in Version 1.
