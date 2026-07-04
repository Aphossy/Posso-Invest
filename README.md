# TrustLink Group - Ikimina Platform            
 
TrustLink Group is a role-based Ikimina savings platform for Dental Therapy graduates in Rwanda. It tracks contributions, loans, meetings, penalties, and committee governance inside a secure, organization-scoped workspace.

> **Tagline:** Save together. Build together.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript |
| Auth | Better Auth v1.6.9 (email/password, OTP, 2FA, admin + organization plugins) |
| Database | Neon PostgreSQL via Drizzle ORM |
| Background Jobs | Inngest (event-driven, cron-scheduled functions) |
| Email | Resend + React Email |
| File Storage | Cloudinary · AWS S3 · Cloudflare R2 |
| Rate Limiting | Upstash Redis |
| State / Data Fetching | TanStack Query v5 |
| Tables | TanStack Table v8 |
| UI / Components | Radix UI · shadcn/ui · Base UI |
| Charts | Recharts 3.7 |
| Animation | Framer Motion · Motion · Animated icon set |
| Forms | React Hook Form + Zod v4 |
| Exports | jspdf-autotable (PDF) · xlsx (Excel) |
| Linting | OxLint · Prettier · Commitlint |
| Runtime | Bun |

---

## Ikimina Business Rules

Defined in `constants/site-config.ts`:

| Rule | Value |
|---|---|
| Monthly contribution | 80,000 RWF |
| Contribution window | 25th → 6th of the following month |
| Late penalty | 10% |
| Loan cap | 1× total savings |
| Loan interest | 5% |
| Disbursement | Within 3 days |
| Default dismissal | 3 missed months |
| Meeting host contribution | 10,000 RWF |
| Audit cadence | Every 4 months |
| Membership count | 11 members |
| Quorum | 2/3 of members |
| Leadership term | 12 months |

---

## Roles and Access

Role routing is based on the **organization member role** (not the global user role).

| Role | Scope |
|---|---|
| `admin` | Full access — member management, financials, system settings |
| `president` | Governance oversight, financial dual-authorization, penalties, health monitoring |
| `treasurer` | Contributions, loans, receipts, financial reports |
| `secretary` | Meetings, minutes, attendance, announcements |
| `member` | Personal dashboard, contributions calendar, savings, support |

Default role for new invited members: `member`.

Primary dashboards:

- `/admin/dashboard`
- `/president/dashboard`
- `/treasurer/dashboard`
- `/secretary/dashboard`
- `/member/dashboard`

---

## Routing and Middleware

- Server-side role redirect runs on `/login` and `/dashboard` via `/api/auth/organization/get-active-member-role`.
- Access control is enforced in `proxy.ts`.
- All dashboard layouts are role-scoped under `app/(dashboard)/[role]/`.

---

## Project Structure

```
app/                  Next.js App Router (public + dashboard)
components/           UI + per-role dashboard components
constants/            Navigation config, site config, org constants
db/                   Drizzle schemas + operations
emails/               React Email templates
hooks/                Client-side data hooks and auth hooks
inngest/              Event-driven background functions and cron jobs
lib/                  Auth setup, rate limiter, S3/R2 clients, API client
providers/            App-level context and provider tree
styles/               Global CSS
utils/                Export helpers, formatting, auth utilities
```

---

## Route Overview

### Member (`/member`)

- `/member/dashboard`
- `/member/contributions` · `/member/contributions/calendar`
- `/member/savings`
- `/member/loans`
- `/member/penalties`
- `/member/meetings` · `/member/meetings/minutes`
- `/member/attendance` · `/member/actions` · `/member/announcements`
- `/member/messages` · `/member/support`
- `/member/payments`
- `/member/assets` · `/member/documents/files` · `/member/documents/constitution`
- `/member/leadership`
- `/member/card`
- `/member/profile` · `/member/settings`

### Treasurer (`/treasurer`)

- `/treasurer/dashboard`
- `/treasurer/contributions` · `/treasurer/contributions/window` · `/treasurer/contributions/penalties` · `/treasurer/contributions/receipts`
- `/treasurer/loans/requests` · `/treasurer/loans/disbursements` · `/treasurer/loans/repayments`
- `/treasurer/reports/monthly` · `/treasurer/reports/audit`
- `/treasurer/assets` · `/treasurer/documents`
- `/treasurer/announcements`
- `/treasurer/profile` · `/treasurer/settings`

### President (`/president`)

- `/president/dashboard`
- `/president/meetings`
- `/president/governance`
- `/president/members` · `/president/attendance` · `/president/actions`
- `/president/financial/approvals` · `/president/financial/overview` · `/president/financial/contributions`
- `/president/financial/penalties`
- `/president/loans`
- `/president/health`
- `/president/announcements` · `/president/messages`
- `/president/documents/constitution` · `/president/documents/letters`
- `/president/assets`
- `/president/profile` · `/president/settings`

### Secretary (`/secretary`)

- `/secretary/dashboard`
- `/secretary/meetings` · `/secretary/minutes`
- `/secretary/attendance` · `/secretary/actions`
- `/secretary/members` · `/secretary/requests`
- `/secretary/announcements` · `/secretary/messages`
- `/secretary/documents/constitution` · `/secretary/documents/letters` · `/secretary/documents/files`
- `/secretary/assets`
- `/secretary/profile` · `/secretary/settings`

### Admin (`/admin`)

- `/admin/dashboard`
- `/admin/members` · `/admin/members/invitations`
- `/admin/financial/contributions` · `/admin/financial/loans` · `/admin/financial/audits` · `/admin/financial/penalties`
- `/admin/announcements` · `/admin/attendance` · `/admin/actions`
- `/admin/messages` · `/admin/payments` · `/admin/assets` · `/admin/files`
- `/admin/leadership` · `/admin/team` · `/admin/roles`
- `/admin/banking` · `/admin/legal`
- `/admin/profile` · `/admin/settings`

### Public

- `/` · `/about` · `/constitution` · `/minutes` · `/contact` · `/faqs`
- Auth: `/login` · `/register` · `/accept-invitation` · `/verify-email` · `/forgot-password` · `/reset-password`

---

## Background Jobs — Inngest

All automated notifications and scheduled jobs run through **Inngest** (`inngest/functions/`):

| Function | Trigger |
|---|---|
| `organizationMemberJoinedEmailNotifier` | Member accepted invitation |
| `contributionRecordedEmailNotifier` | Contribution recorded |
| `penaltyRecordedEmailNotifier` | Penalty recorded |
| `loanRequestedEmailNotifier` | Loan request submitted |
| `announcementPublishedEmailNotifier` | Announcement published |
| `actionItemCreatedEmailNotifier` | Action item created |
| `actionItemStatusChangedEmailNotifier` | Action item status updated |
| `contributionWindowOpenedNotifier` | Cron — window opens on the 25th |
| `contributionWindowReminderNotifier` | Cron — mid-window reminder |
| `contributionWindowLastDayNotifier` | Cron — last day alert (6th) |
| `contributionDeadlinePassedNotifier` | Cron — deadline passed |
| `monthlyComplianceDispatcher` | Cron — monthly compliance summary dispatch |
| `monthlyMemberSummaryEmailSender` | Fanned out per member from dispatcher |
| `systemFunctionFailureAlert` | Inngest function failure fallback |

Email delivery is tracked via `inngest/email-log-helpers.ts` with structured event logging per recipient.

---

## Recent Upgrades

### President Role Enhancements

- **Penalties page** (`/president/financial/penalties`) — group-wide penalty oversight with extended read/write permissions, including member filtering and contribution period context.
- **Contributions page** (`/president/financial/contributions`) — president can view all contribution records and filter by member.
- **Loans page** (`/president/loans`) — loan overview for governance reporting.
- **Health dashboard** (`/president/health`) — real-time contribution health card showing: active period window, per-period compliance rate, total expected vs. received RWF, penalty exposure, and member compliance badges. Includes contribution trend indicators and progress bars.
- **Active member count** — president dashboard now displays live active member count sourced from the organization member list.

### Contribution Window System

- Smart window logic determines the active contribution period based on the current date (25th → 6th cycle), handling month-boundary gaps correctly.
- Window open/reminder/last-day/deadline events are fired via Inngest on a cron schedule.
- Leadership (president, treasurer, secretary) receives window open email notifications with period details.
- Late contribution alert shown inline with penalty amount calculated in real time.

### Monthly Compliance Emails

- On the 1st of each month, `monthlyComplianceDispatcher` fans out to all active members.
- Each member receives a personalized summary: contribution status, penalty status, loan balance, and compliance standing for the period.
- President, treasurer, and secretary each receive a leadership summary with group-wide metrics.

### PDF Exports

- Contribution exports now generate PDF documents with a summary header (period, total expected, total received, compliance rate, penalty total) followed by a per-member detail table.
- Export utilities live in `utils/` and support both PDF (jspdf-autotable) and Excel (xlsx) formats.
- Rwandan locale date formatting applied across all export outputs.

### UI and Animation

- **Animated icon set** — custom animated Lucide-based icons for common actions (copy, delete, download, refresh, settings, upload, user actions, etc.) under `components/ui/animated-icons/`.
- **Reduced motion support** — dashboard animation effects respect the `prefers-reduced-motion` media query.
- **MemberAvatar component** — consistent avatar rendering across contributions, attendance, and penalties forms with role-aware display.
- **ResponsiveModal pattern** — dialogs across admin members, 2FA, and account management now use `ResponsiveModal` (drawer on mobile, dialog on desktop).
- **Late contribution alert** — inline alert with penalty breakdown shown on member contribution views when a late payment is detected.
- **AuthErrorToast** — global auth error handler with toast notifications for session and permission errors.
- **Profile picture options dialog** — members can choose or preview a profile image with crop support.

### Admin Members Revamp

- Invitation management split into a dedicated `/admin/members/invitations` page with delete support via server action.
- User table includes conditional row actions gated by member status.
- Modals use `ResponsiveModal` across all dialogs: invite, edit, ban, delete, set role, set password, session management.

### Auth and Session

- Better Auth upgraded to v1.6.9.
- User impersonation now redirects to `/login` on start and stop.
- Google One Tap `AbortError` handled gracefully without console noise.
- Session management dialog available to admin for per-user session revocation.

---

## API Overview

### Core Resources

- `/api/contributions`
- `/api/loans`
- `/api/meetings`
- `/api/minutes`
- `/api/announcements`
- `/api/attendance`
- `/api/action-items`

### Files and Assets

- `/api/assets`
- `/api/files`
- `/api/upload/cloudinary`
- `/api/upload/r2` · `/api/upload/r2/files`
- `/api/upload/aws` · `/api/upload/aws-2`

### Messaging and Notifications

- `/api/message`
- `/api/notification`

### Background Jobs (Inngest)

- `/api/inngest` — Inngest serve handler (GET, POST, PUT)
- `/api/inngest/monthly-reports/trigger` — manual trigger endpoint for monthly compliance dispatch

### User and Payments

- `/api/user/payment`
- `/api/profile`
- `/api/settings`

### Auth

- `/api/auth/[...all]` — Better Auth core handler
- `/api/authentication/*` — custom wrappers (login, logout, signup, verify, sessions, change-password, set-password, social-signin)

---

## API Endpoints (Full List)

| Route | Methods |
|---|---|
| `/api/action-items` | `GET`, `POST` |
| `/api/action-items/[id]` | `GET`, `PUT`, `DELETE` |
| `/api/announcements` | `GET`, `POST` |
| `/api/announcements/[id]` | `GET`, `PUT`, `DELETE` |
| `/api/assets` | `GET`, `POST` |
| `/api/assets/[id]/download` | `GET` |
| `/api/assets/[id]/view` | `POST` |
| `/api/assets/stats` | `GET` |
| `/api/assets/user` | `GET`, `POST` |
| `/api/assets/user/[id]` | `GET`, `PATCH`, `DELETE` |
| `/api/assets/user/[id]/download` | `GET` |
| `/api/assets/user/stats` | `GET` |
| `/api/attendance` | `GET`, `POST` |
| `/api/attendance/[id]` | `GET`, `PUT`, `DELETE` |
| `/api/auth/[...all]` | `GET`, `POST`, `OPTIONS` |
| `/api/authentication/change-password` | `POST` |
| `/api/authentication/login` | `POST` |
| `/api/authentication/logout` | `POST` |
| `/api/authentication/logout-all` | `POST` |
| `/api/authentication/logout-other` | `POST` |
| `/api/authentication/sessions` | `GET` |
| `/api/authentication/sessions/[sessionId]` | `DELETE` |
| `/api/authentication/set-password` | `POST` |
| `/api/authentication/signup` | `POST` |
| `/api/authentication/social-signin` | `POST` |
| `/api/authentication/verify` | `GET`, `POST` |
| `/api/contributions` | `GET`, `POST` |
| `/api/contributions/[id]` | `GET`, `PUT`, `DELETE` |
| `/api/files` | `GET` |
| `/api/files/delete` | `POST` |
| `/api/inngest` | `GET`, `POST`, `PUT` |
| `/api/inngest/monthly-reports/trigger` | `POST` |
| `/api/loans` | `GET`, `POST` |
| `/api/loans/[id]` | `GET`, `PUT`, `DELETE` |
| `/api/meetings` | `GET`, `POST` |
| `/api/meetings/[id]` | `GET`, `PUT`, `DELETE` |
| `/api/message` | `GET`, `POST` |
| `/api/message/[id]` | `GET`, `PATCH`, `DELETE` |
| `/api/message/stats` | `GET` |
| `/api/minutes` | `GET`, `POST` |
| `/api/minutes/[id]` | `GET`, `PUT`, `DELETE` |
| `/api/notification` | `GET`, `PATCH`, `DELETE` |
| `/api/notification/[id]` | `GET`, `PATCH`, `DELETE` |
| `/api/profile` | `GET`, `PATCH` |
| `/api/settings` | `GET`, `PATCH` |
| `/api/upload/aws` | `POST` |
| `/api/upload/aws-2` | `POST` |
| `/api/upload/cloudinary` | `GET`, `POST`, `PUT`, `DELETE` |
| `/api/upload/r2` | `GET`, `POST`, `DELETE` |
| `/api/upload/r2/files` | `GET`, `POST`, `DELETE` |
| `/api/user/payment` | `GET` |
| `/api/user/payment/[id]` | `GET`, `PATCH`, `DELETE` |
| `/api/user/payment/send-email` | `POST` |
| `/api/user/payment/stats` | `GET` |

---

## Message Categories

Shared across database enums, API validation, and client forms via `createMessageApiSchema`:

| Value | Label |
|---|---|
| `contributions-savings` | Contributions & Savings |
| `loans-repayments` | Loans & Repayments |
| `meetings-minutes` | Meetings & Minutes |
| `penalties-compliance` | Penalties & Compliance |
| `member-account` | Member Account |
| `access-technical` | Access & Technical |
| `other` | General Inquiry |

Client forms validate with React Hook Form + Zod using the same schema as the API. Validation errors are returned as structured `validationErrors` and displayed inline.

---

## Schema to API Mapping

| Schema | Purpose | API Routes |
|---|---|---|
| `action-item-schema` | Meeting action items | `/api/action-items`, `/api/action-items/[id]` |
| `announcement-schema` | Member announcements | `/api/announcements`, `/api/announcements/[id]` |
| `asset-schema` | Files and assets | `/api/assets/*`, `/api/assets/user/*` |
| `attendance-schema` | Meeting attendance | `/api/attendance`, `/api/attendance/[id]` |
| `audit-log-schema` | Audit logging | Internal, no public API |
| `auth-schema` | Users, sessions, accounts | `/api/auth/*`, `/api/authentication/*` |
| `contribution-schema` | Monthly contributions | `/api/contributions`, `/api/contributions/[id]` |
| `loan-schema` | Member loans | `/api/loans`, `/api/loans/[id]` |
| `meeting-schema` | Meeting records | `/api/meetings`, `/api/meetings/[id]` |
| `message-schema` | Messages and contact | `/api/message`, `/api/message/[id]`, `/api/message/stats` |
| `minutes-schema` | Meeting minutes | `/api/minutes`, `/api/minutes/[id]` |
| `notification-schema` | Notifications | `/api/notification`, `/api/notification/[id]` |
| `payment-schema` | Payment tracking | `/api/user/payment/*` |
| `subscriber-schema` | Newsletter subscribers | Internal, no public API |

---

## Database

Drizzle schemas live in `db/schemas/`:

- action-items, announcements, attendance
- contributions, loans, meetings, minutes
- messages, notifications, payments, assets
- audit logs, subscribers, auth schemas

Operations in `db/operations/` map 1:1 with each resource.

---

## Auth and Organization

Powered by **Better Auth v1.6.9**:

- Email/password authentication with verification
- Email OTP and two-factor authentication (TOTP + backup codes)
- Admin plugin for privileged operations and user impersonation
- Organization plugin for roles, membership, invitations
- Rate limiting on auth endpoints via Upstash Redis
- Structured session management with per-session revocation

User onboarding is **invite-only** via the Admin Members page.

---

## Emails

All emails use **React Email** templates and are sent via **Resend**:

- Email verification and password reset/change
- Welcome email on first login
- Login alert (new device/location)
- Invitation emails
- Banned user notification
- Contribution recorded confirmation
- Penalty recorded notification
- Loan request notification
- Announcement published notification
- Action item created / status changed
- Contribution window: opened · reminder · last day · deadline passed
- Monthly compliance summary (per member + leadership summary)

---

## Exports and Reports

Export utilities in `utils/`:

| Resource | PDF | Excel |
|---|---|---|
| Contributions | Yes (with summary header) | Yes |
| Loans | Yes | Yes |
| Meetings | Yes | Yes |
| Minutes | Yes | Yes |
| Attendance | Yes | Yes |
| Announcements | Yes | Yes |
| Action items | Yes | Yes |
| Users | Yes | Yes |
| Payments | Yes | Yes |

---

## Environment Variables

Copy `.env.example` to `.env.local`:

```
# App
DATABASE_URL
NEXT_PUBLIC_DOMAIN
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_API_URL

# Email
RESEND_API_KEY
SENDER_EMAIL
SUPPORT_EMAIL
ADMIN_EMAIL
SENDER_NAME

# Auth
AUTH_SECRET
PASSWORD_EXPIRATION_DAYS
PASSWORD_HASH_ROUNDS

# File Storage
CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_SECRET

# Rate Limiting
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
REDIS_URL

# Developer Access
DEVELOPER_EMAIL
ALLOWLISTED_DEVELOPER_EMAILS
```

---

## Scripts

```bash
# Development
bun run dev              # Start dev server with Turbopack
bun run build            # Production build
bun run start            # Start production server
bun run preview          # Build + start

# Quality
bun run typecheck        # TypeScript type check
bun run lint             # OxLint
bun run lint:fix         # OxLint with auto-fix
bun run format:write     # Prettier format
bun run validate         # lint + typecheck + format check

# Database
bun run db:generate      # Generate Drizzle migration
bun run db:push          # Push schema to database
bun run db:studio        # Open Drizzle Studio
bun run db:check         # Check migration state

# Email
bun run email            # Preview emails at localhost:3000

# Background Jobs
bun run inngest:dev      # Start Inngest dev server

# Environment
bun run env:validate     # Validate environment variables
```

---

## Setup

```bash
bun install
cp .env.example .env.local
# fill in .env.local values
bun run db:push
bun run dev
```

Optional: start the Inngest dev server in a second terminal to run background job functions locally:

```bash
bun run inngest:dev
```
