# 10/10 Ventures Portal

## Team Presentation Report

**Prepared:** August 2026  
**Product:** 10/10 Ventures savings, investment, and governance portal  
**Primary users:** Members, Secretary, Treasurer, President, and Admin  
**Operating context:** Kigali / Rwanda  
**Tagline:** Save together. Build together.

---

## 1. Executive Summary

The 10/10 Ventures Portal is a role-based digital operating system for managing a savings and investment group. It brings the group's financial activity, governance records, member communication, documents, and accountability workflows into one authenticated workspace.

The portal is designed to replace fragmented spreadsheets, chat messages, paper records, and manual follow-up with a shared source of truth. Members can see their own participation and request services. Committee leaders receive dashboards and tools matched to their responsibilities. Administrators maintain the platform, users, roles, and operational oversight.

The system supports the group's operating model:

- Monthly member contributions of **100,000 RWF**.
- A contribution window running from the **1st to the 5th of the following month**.
- Late-payment penalties set at **10%** of the contribution amount.
- Member loans up to the member's accumulated savings, with a default **5% flat interest rate**.
- Loan disbursement targeted within **3 business days** after approval.
- Meeting participation, minutes, decisions, action tracking, and attendance records.
- Periodic financial review and audit preparation every **4 months**.
- A governance model based on a **two-thirds quorum** and the adopted **three-year officer/advisor succession model** defined in the 10/10 Ventures Statute.

The portal is therefore both a member service and an internal control system: it helps people know what they owe, what has been recorded, what decisions were made, and what must happen next.

---

## 2. The Problem It Solves

Before a centralized portal, a group of this kind commonly faces four operational risks:

1. **Financial uncertainty:** Members cannot easily confirm contribution status, receipts, penalties, loan balances, or fund position.
2. **Governance gaps:** Meeting decisions, attendance, minutes, and assigned follow-up tasks are difficult to track consistently.
3. **Communication fragmentation:** Announcements, support requests, and formal correspondence are spread across informal channels.
4. **Weak accountability:** It is difficult to see who recorded, approved, changed, or is responsible for a transaction or action.

The portal addresses these risks through authenticated records, role-specific access, workflow statuses, dashboards, notifications, reports, and exportable documents.

---

## 3. Value to the Organization

### For members

- A personal view of savings, contributions, receipts, penalties, loans, attendance, and assigned actions.
- Clear contribution-window reminders and payment status.
- Loan request submission and status tracking.
- Access to the constitution, policies, meeting minutes, announcements, and shared files.
- Profile, payout, notification, security, and session management.
- Digital membership card and downloadable records.

### For leadership

- Current operational visibility without manually consolidating reports.
- Clear separation of responsibilities between governance, finance, and platform administration.
- Better preparation for meetings, audits, approvals, and member communication.
- Traceable workflows for contributions, loans, expenses, receipts, and decisions.

### For the organization

- A foundation for transparent collective investment and future growth.
- More reliable records for audits, banking, formal registration, and stakeholder communication.
- A scalable platform that can support additional ventures and members if the operating model expands.

---

## 4. Role-Based Experience

| Role          | Main responsibility                                 | Portal experience                                                                                                                                                                       |
| ------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Member**    | Participate, save, request loans, and stay informed | Personal dashboard, savings, contributions, receipts, penalties, loans, share-out, meetings, attendance, action items, documents, announcements, support, profile, settings             |
| **Secretary** | Run meetings and maintain governance records        | Meeting scheduling, planned activities, minutes, attendance register, action tracker, announcements, messages, letters, documents, expenses                                             |
| **Treasurer** | Manage group finances                               | Contribution window, payment recording and verification, penalties, receipts, loans, disbursements, repayments, expenses, fund tracker, share-out, monthly reports, audits, projections |
| **President** | Lead governance and authorize key activity          | Governance dashboard, upcoming meetings, pending authorizations, member oversight, action items, announcements, finance overview, analytics, and meeting chairing                       |
| **Admin**     | Operate and protect the platform                    | Platform dashboard, users and roles, organization settings, finance and governance oversight, health monitoring, messages, documents, assets, and operational controls                  |

Access is enforced in both the user interface and server-side API routes. A user without a valid session is redirected to login, and a signed-in user without the required role is redirected away from restricted pages.

---

## 5. Main Capabilities

### 5.1 Member savings and contribution management

The financial workflow supports:

- Monthly contribution periods and contribution-window status.
- Contribution recording with amount, period, currency, due date, payment date, status, notes, and payment metadata.
- Status tracking for pending, confirmed, late, and waived contributions.
- Late-penalty calculation and penalty visibility.
- Receipt numbers, issued receipts, and supporting attachments.
- Contribution history and collection-rate reporting.
- Member-facing savings progress and year-end share-out views.

The expected monthly group target, based on the configured model, is **1,000,000 RWF** for ten members contributing 100,000 RWF each.

### 5.2 Loans and repayments

Members can submit loan requests with amount, purpose, and repayment details. The loan lifecycle supports:

`Requested -> Approved or Rejected -> Disbursed -> Repaying -> Repaid`

The system also identifies overdue loans. It records the approver, disburser, timestamps, amount, currency, interest rate, term, due date, repayment plan, and supporting notes.

Treasury and leadership views provide visibility into pending requests, approved and disbursed loans, active repayment, overdue loans, and outstanding balances. The member request form also checks whether payout details are available before disbursement.

### 5.3 Governance and meetings

The Secretary workflow turns meetings into accountable records:

- Schedule meetings with dates, locations, and agendas.
- Record attendance by member and status.
- Capture minutes, decisions, resolutions, and supporting documents.
- Create action items linked to meetings and minutes.
- Assign owners, due dates, priorities, and statuses.
- Track open, in-progress, blocked, and completed work.
- Publish minutes and make governance history available to members.

The President dashboard surfaces the governance pulse, upcoming meetings, high-priority actions, pending authorizations, and published announcements.

### 5.4 Expenses, assets, and documents

The portal includes operational-expense workflows for submission, review, approval, and tracking. It also provides:

- Financial files and supporting proofs.
- A document library for minutes, reports, letters, policies, and group records.
- Shared assets for photos, media, and files.
- Visibility levels such as public, authenticated members, committee-only, admin-only, and private.
- Upload and preview support for common document and media types.
- PDF exports for meeting minutes, audit reports, and membership cards.

### 5.5 Communication and notifications

Communication features include:

- Group announcements with draft, published, and pinned states.
- Member-to-committee messages and support inquiries.
- In-app notifications.
- Email notifications for account lifecycle, invitations, verification, password resets, password changes, loan events, contribution events, and other operational events.
- Invitation-based organization membership with role assignment.

### 5.6 Reporting and oversight

The system includes dashboards and reports for:

- Contribution collection and outstanding amounts.
- Loan portfolio and repayment status.
- Penalties and waivers.
- Fund position, income, expenses, and net balance.
- Monthly summaries.
- Four-month audit preparation packs.
- Compliance and forward-looking projections using conservative, realistic, and optimistic scenarios.
- Governance activity, attendance, meetings, announcements, messages, and action items.

Reports include refresh and export actions where implemented, allowing records to be shared beyond the portal.

---

## 6. Typical End-to-End Workflows

### Workflow A: Monthly contribution

1. The Treasurer opens or monitors the contribution window.
2. Members view the active period and payment deadline.
3. A contribution is recorded with amount and supporting information.
4. The Treasurer verifies it and issues or archives a receipt.
5. The system reflects confirmed, pending, late, or waived status.
6. Late amounts can produce a penalty record.
7. Dashboards update collection rates, outstanding amounts, and audit indicators.

### Workflow B: Member loan

1. A member reviews the loan policy and enters a request.
2. The member confirms the requested amount, purpose, term, and payout details.
3. The request enters committee review.
4. Authorized leadership approves or rejects the request.
5. Treasury records disbursement and monitors repayment.
6. Automated lifecycle handling identifies approaching due dates or overdue status.
7. The member and relevant leadership receive in-app and email notifications.

### Workflow C: Meeting to action

1. The Secretary schedules a meeting and shares the activity.
2. Attendance is recorded for participating members.
3. Minutes capture decisions, resolutions, and supporting files.
4. Action items are assigned to owners with due dates and priorities.
5. The action tracker highlights open, blocked, and due-soon work.
6. Members and leadership can review the published governance record.

### Workflow D: Audit preparation

1. The Treasurer opens the current audit period.
2. The system gathers contribution receipts, loan records, penalties, and expense summaries.
3. Exceptions such as pending contributions, active penalties, and overdue loans are surfaced.
4. The Treasurer refreshes and exports the audit report.
5. Leadership reviews the pack and follows up on outstanding items.

### Workflow E: New member onboarding

1. An authorized user sends an organization invitation by email.
2. The invitee logs in using the invited email address.
3. The invitee accepts the invitation.
4. The portal associates the active session with the organization and assigned role.
5. Welcome, verification, and onboarding communications are sent as configured.
6. The new member completes profile and payout details before using relevant services.

---

## 7. Security and Control Model

The portal uses Better Auth with a PostgreSQL/Drizzle adapter and organization membership support. The implementation includes:

- Session-based authentication.
- Email verification and password reset flows.
- Google sign-in / invitation guidance in the onboarding experience.
- Two-factor authentication support and email OTP components.
- Role and organization membership resolution.
- Account banning, suspension, and reinstatement workflows.
- Session metadata such as IP address, user agent, location, device, and last access.
- Audit-log data structures for important platform activity.
- API rate limiting on dashboard endpoints.
- Request IDs, structured request logging, timing information, and database health checks.
- Expired-session, verification-token, and invitation cleanup utilities.
- Validation through Zod-backed database schemas and form validation.
- Controlled asset visibility and signed/presigned file access patterns.

### Control principle

Financial and governance actions should be performed by the role responsible for them and reviewed through the relevant approval workflow. The portal makes that division visible and keeps a record of key actors and timestamps.

### Security items to confirm before production presentation

The current code should be reviewed before describing the platform as fully hardened:

- The auth configuration disables CSRF checks to support mobile clients; this requires compensating controls and a documented threat model.
- The trusted-source validation function exists, but the POST enforcement block is currently commented out.
- Production trusted domains, CORS behavior, cookie settings, and environment variables should be verified in the deployment environment.
- Rate limiting is visible on dashboard APIs, but coverage should be confirmed across every write endpoint.
- Sensitive banking and payout fields require production confirmation for encryption, access logging, retention, and masking.

These are production-readiness checks, not a reason to hide the portal's current capabilities.

---

## 8. Technical Architecture

### Application layer

- Next.js App Router with TypeScript.
- React 19 client and server components.
- Role-specific route groups for member, Secretary, Treasurer, President, and Admin experiences.
- Reusable UI built with Tailwind CSS, Radix-based components, Lucide icons, forms, dialogs, drawers, tabs, tables, charts, and responsive layouts.

### Data layer

- PostgreSQL accessed through Drizzle ORM.
- Organization-scoped records for contributions, loans, meetings, minutes, attendance, action items, announcements, messages, notifications, assets, documents, receipts, penalties, expenses, share-outs, and audit logs.
- Typed schemas and database operations grouped by domain.
- Indexed fields for organization, member, status, period, and timestamps to support operational queries.

### Service and integration layer

- Better Auth for authentication, sessions, organizations, invitations, roles, and security plugins.
- Resend for transactional email delivery.
- Inngest for event-driven and scheduled workflows such as notifications and loan lifecycle processing.
- Cloud/object storage integrations for uploaded assets and supporting documents.
- Recharts for financial and operational visualizations.
- jsPDF and table utilities for downloadable reports and records.
- Upstash Redis/rate-limiting dependencies for abuse protection and analytics.

### Operational tooling

- Database migration and schema commands through Drizzle Kit.
- Type checking, linting, formatting, dependency auditing, and environment validation scripts.
- Database health checks and scheduled cleanup utilities.
- Separate development commands for the web application and Inngest event development.

---

## 9. Suggested Live Demonstration

A 15-minute demonstration can follow this sequence:

1. **Open the landing page** and explain the group's mission and member invitation model.
2. **Log in as a member** and show the personal dashboard, contribution status, savings, loan request, meeting history, and profile payout details.
3. **Switch to Secretary** and demonstrate scheduling, recording minutes, registering attendance, and creating an action item.
4. **Switch to Treasurer** and show the contribution window, payment verification, receipt, loan queue, fund tracker, and audit preparation.
5. **Switch to President** and show pending authorizations, governance pulse, announcements, and finance overview.
6. **Show Admin** as the platform oversight view: users, roles, health, messages, documents, and organization controls.
7. **Close with an audit report export** and explain how the system creates a traceable record from contribution through governance review.

### Demonstration message

> Every important group activity has a place, an owner, a status, and a history. Members get clarity; leaders get control; the organization gets accountability.

---

## 10. What the Portal Is and Is Not

### It is

- A group savings and investment operations platform.
- A member self-service portal.
- A committee workflow and governance record system.
- A financial tracking and reporting system.
- A foundation for disciplined expansion into future ventures.

### It is not yet evidence of

- Actual profitability of the proposed ventures.
- Guaranteed investment returns or distributions.
- Formal legal registration unless separately completed.
- A replacement for bank controls, statutory accounting, independent audit, or legal advice.
- A completed mobile application, unless the mobile client and deployment are separately verified.

Business projections shown in the portal should be presented as scenarios or internal planning assumptions, not promises.

---

## 11. Important Items to Resolve Before External Use

The repository contains several conflicting organization facts that should be made consistent before presenting the portal to banks, regulators, investors, or new members:

- **Member count:** The README describes 10 members, the constitution view lists 11 founding members, and a brand asset references eight founding members.
- **Location:** Current references include Kigali/Kacyiru/Gasabo and Nyamata/Bugesera.
- **Establishment date:** References consistently place the organization’s start in September 2026.
- **Organization naming:** Some legacy strings refer to “Trustlink” or “Possocapital,” while the primary product name is 10/10 Ventures.
- **Business focus:** The README describes bakery, avocado, mushroom, and winery ventures, while the constitution and metadata emphasize a future dental clinic.
- **Contact details:** Multiple email addresses and phone numbers appear in configuration and brand assets.
- **Contribution window wording:** Configuration and constitution copy should use one consistent description of the period and deadline.

These inconsistencies do not change the portal architecture, but they can undermine trust during a team or stakeholder presentation. Establish one approved source of truth for organization identity, membership, dates, address, contacts, and business strategy.

---

## 12. Recommended Next Steps

### Immediate: presentation readiness

1. Confirm the official group name, address, founding-member count, date, contact details, and business focus.
2. Prepare a controlled demo dataset with representative members, contributions, loans, meetings, and reports.
3. Create demo accounts for each role and verify that each role sees only its intended routes and actions.
4. Validate email delivery, invitation acceptance, file upload, PDF export, and dashboard loading in the target environment.
5. Add a short “system status” slide distinguishing implemented features from planned business ventures and projections.

### Near term: production readiness

1. Complete the security review of CSRF, CORS, cookies, trusted origins, and write-endpoint rate limiting.
2. Confirm encryption, masking, retention, and audit access for payout and banking information.
3. Migrate remaining API endpoints to the centralized request-level session cache described in the query optimization guide.
4. Add automated tests for role access, contribution state transitions, loan authorization, receipt issuance, share-out calculations, and invitation acceptance.
5. Establish backup, recovery, monitoring, incident response, and audit procedures.

### Growth phase

1. Align portal reporting with the group's approved accounting and banking process.
2. Add formal approval policies for high-value expenses, loans, and fund movements.
3. Introduce multilingual support if members require English, Kinyarwanda, or French.
4. Connect approved venture-level accounting and performance reporting as investments launch.
5. Review the membership and organization model before expanding beyond the current group structure.

---

## 13. Closing Statement for the Team

10/10 Ventures is building more than a website. It is building the operating discipline required for a group to save together, make decisions together, invest responsibly, and grow with confidence.

The portal gives the group a practical foundation: each member can see their position, each leader can act within a defined responsibility, and the organization can preserve a reliable history of money, decisions, and outcomes.

The next stage is to finalize the organization's official facts, validate the production controls, and use the portal consistently as the single operational record for the group.

**Save together. Build together.**
