CSL ERP — Agent Instructions

1. Project Identity

Project name: CSL ERP
Purpose: Internal ERP for Corporate Secretary & Legal (CSL).

Base project:

Existing project: gesit-erp

Repository: https://github.com/itdeptgesit/gesit-erp

The CSL ERP should reuse the existing project's UI patterns, architecture, authentication, permission model, Supabase approach, components, and reusable mechanisms wherever practical.

The goal is NOT to rebuild a generic ERP from zero.

The goal is to adapt the existing Gesit ERP foundation into a focused CSL workflow system.

2. Core Business Principle

Every activity must start from a Request.

The main lifecycle is:

Request
→ SLA / Target Time
→ CSL Assignment
→ Processing / Review
→ Document Collaboration
→ Response
→ Follow-up / OSS when applicable
→ Completion
→ Feedback
→ Reporting

Every request must have a permanent record and activity history.

Do not create isolated modules that lose the relationship to the original request.

3. Main Modules

The primary modules are:

Dashboard

Request

Agreement

Legal

OSS

Budgeting

Planner

Reports

Notifications

Document Management

Suggested navigation:

Dashboard

REQUEST
├── All Requests
├── My Requests
├── Create Request
└── Request Feedback

AGREEMENT
├── Agreement Register
├── Agreement Review
├── Agreement Monitoring
└── Agreement Expiry

LEGAL
├── Legal Requests
├── Legal Documents
└── Corporate Documents

OSS
├── OSS Requests
├── OSS Monitoring
└── OSS Deadline

BUDGET
├── Budget Plan
├── Budget Request
└── Budget Monitoring

PLANNER
├── My Planner
├── CSL Planner
└── Calendar

REPORT
├── Request Report
├── SLA Report
├── Agreement Report
├── OSS Report
├── Budget Report
└── Performance Report

Do not add unrelated IT modules such as asset management, IT helpdesk, IT activity, or network monitoring unless explicitly requested.

4. Existing Foundation to Reuse

Before implementing a feature, inspect the existing gesit-erp codebase.

Prefer reuse of:

Layout

Sidebar

Header

Authentication

User profile

Role/permission mechanisms

Supabase client

Database migration pattern

UI components

Tables

Forms

Dialogs

Filters

Search

Notifications

Activity logs

Planner mechanisms

Budget mechanisms

File-related UI patterns

Existing design tokens

Do not duplicate existing utilities or components when a suitable implementation already exists.

If the existing mechanism is good enough, extend it rather than replacing it.

5. Request System

The Request system is the central system of record.

Each request must have:

Unique request number

Request type

Requester

Requester department

Company/entity

Assigned CSL PIC

Priority

Created date/time

Required date

SLA target

SLA due date

Actual completion date

Status

Description

Attachments/documents

Activity history

Response history

Feedback

Related Agreement / Legal / OSS / Budget / Planner records when applicable

Example request IDs:

LEG-2026-0001
AGR-2026-0001
OSS-2026-0001

6. SLA / Target Time

SLA is a first-class feature.

The system must measure whether CSL completes requests within the estimated target time.

Example:

Agreement Review = 5 working days
NDA Review = 3 working days
Legal Consultation = 5 working days
Corporate Action = 7 working days
OSS Processing = configurable

Do not hard-code SLA values into frontend code.

Use configurable database data such as:

request_types
sla_configurations

The system should calculate:

Target duration

Due date

Elapsed working time

Remaining working time

Overdue duration

SLA status

SLA statuses should include:

ON_TRACK
DUE_SOON
DUE_TODAY
OVERDUE
COMPLETED_ON_TIME
COMPLETED_LATE

Working-day calculations should be designed so holidays/weekends can be configured later.

7. Request Workflow

Default request lifecycle:

DRAFT
SUBMITTED
ACKNOWLEDGED
IN_REVIEW
REVISION_REQUIRED
PROCESSING
COMPLETED
RESPONDED
CLOSED
REJECTED
CANCELLED

Not every request must use every status.

The workflow must remain configurable enough to support different request types.

Every status transition should create an activity record.

8. Agreement Workflow

Agreement is a major CSL module.

Suggested lifecycle:

DRAFT
SUBMITTED
UNDER_REVIEW
DRAFTING
INTERNAL_REVIEW
NEGOTIATION
FINAL_REVIEW
APPROVED
SIGNING
ACTIVE
EXPIRED
TERMINATED
REJECTED

Agreement data should support:

Agreement number

Agreement title

Agreement type

Requester

Company

Counterparty

Effective date

Expiry date

Value/currency where applicable

Status

PIC

Related request

Documents

Review history

Approval history

Activity history

Agreement expiry monitoring is mandatory.

Suggested reminders:

90 days

60 days

30 days

14 days

7 days

These values should be configurable.

9. Google Drive Document Architecture

Documents are confidential company information.

Google Drive is the source of truth for actual document files.

Supabase should store metadata only.

Do NOT store CSL documents in:

Supabase Storage

local server filesystem

application public folder

random external file hosting

public CDN

Supabase stores metadata such as:

file_name
file_type
file_size
google_drive_file_id
google_drive_url/reference
request_id
agreement_id
uploaded_by
uploaded_at
version
document_type

Actual files remain in the company's Google Drive / Google Workspace storage.

10. Google Drive Security

Documents must remain private.

Never use:

"Anyone with the link"

public Drive folders

public document URLs

client-side Google service credentials

The preferred architecture is:

Browser
  ↓
CSL ERP
  ↓
Authorization / Permission Check
  ↓
Backend
  ↓
Google Drive API
  ↓
Private Company Drive

Google Drive credentials must stay server-side.

If Google Workspace is available, prefer a dedicated Shared Drive for CSL confidential documents over a personal Gmail account.

Suggested structure:

CSL - Confidential Documents
├── 01 Agreement
│   └── 2026
│       └── AGR-2026-0001
│           ├── 01 Request
│           ├── 02 Draft
│           ├── 03 Review
│           ├── 04 Approval
│           └── 05 Signed
├── 02 Legal Request
├── 03 Corporate Documents
├── 04 Licensing
├── 05 Notary
└── 99 Archive

Folder creation should be automated when practical.

11. Document Access Rules

Document access is based on authorization.

At minimum:

Requester

Can access only documents belonging to requests they own.

CSL Team

Can access CSL documents according to CSL role/assignment.

Approver

Can access documents related to approvals assigned to them.

Super Admin

Can access all documents.

Another requester must NOT be able to access another requester's documents.

Never rely only on hiding buttons in the UI.

Enforce authorization at backend/database level.

12. Google Docs Collaboration

When a document requires review/comment:

The actual document should be edited in Google Docs.

Comments should be made in Google Docs.

Suggestions should be made in Google Docs.

Replies to comments should remain in Google Docs.

Do not create a second document-comment system in the ERP unless explicitly requested.

Separation of responsibilities:

Google Drive / Google Docs
= Document storage + document collaboration

CSL ERP
= Request + workflow + SLA + assignment + approval + response + audit + reporting

ERP should provide an "Open in Google Docs" action when the user has permission.

13. Requester Response

After CSL finishes review/processing, CSL must be able to respond to the original requester.

Response types may include:

COMPLETED
APPROVED
REVISION_REQUIRED
REJECTED
NEED_ADDITIONAL_INFORMATION

The ERP should support sending an email response based on the request.

Email is a notification/communication layer.

ERP remains the system of record.

Response history must be stored.

14. Email

Email notifications may be automated for events such as:

Request submitted

Request acknowledged

Request assigned

Revision required

Request completed

CSL response sent

SLA approaching

SLA overdue

OSS deadline approaching

Agreement expiry approaching

Do not hard-code recipient addresses.

Recipients should be determined from request ownership, CSL assignment, approval assignment, and configured notification rules.

15. OSS

OSS processing is a follow-up process that must be tracked against deadlines.

Example:

Request
→ CSL Processing
→ OSS Process
→ OSS Deadline
→ Completion

OSS record should include:

Related request

Company

Process type

PIC

Start date

Deadline

Status

Completion date

Notes

Documents

Activity history

OSS dashboard must show:

On schedule

Due soon

Due today

Overdue

Completed

16. Feedback

Every completed request should be able to receive requester feedback.

Feedback may include:

Overall rating

Response time rating

Service quality rating

Comment

Feedback should be linked to the request and included in reports.

17. Reporting

Required reports:

Request Report

Total requests

Open

Completed

Rejected

Cancelled

Overdue

SLA Report

Request type

SLA target

Actual completion

SLA achievement

On-time vs late

Agreement Report

Active

Under review

Signing

Expiring

Expired

OSS Report

Active

Due soon

Overdue

Completed

Performance Report

Requests by department

Requests by CSL PIC

Average completion time

SLA achievement

Feedback score

Reports should be based on actual database records, not manually entered dashboard numbers.

18. Audit Trail

All important actions must be auditable.

Record:

User

Timestamp

Action

Entity

Entity ID

Old status/value where useful

New status/value where useful

Relevant metadata

Examples:

Request submitted
Request assigned
Status changed
Document uploaded
Document version created
Review started
Response sent
OSS deadline changed
Agreement approved
Feedback submitted

Never silently mutate important workflow state without an activity/history record.

19. Roles

Initial roles:

SUPER_ADMIN
CSL_ADMIN
CSL_STAFF
REQUESTER
APPROVER

Do not assume all users have the same access.

Use permission checks for:

Viewing

Creating

Editing

Assigning

Approving

Uploading

Opening documents

Sending responses

Managing SLA

Reporting

20. Database Design Principles

Prefer normalized relational tables.

Potential core tables:

user_profiles
companies
departments

request_types
sla_configurations
requests
request_activities
request_assignments
request_responses
request_feedback
request_documents

agreement_types
agreements
agreement_parties
agreement_documents
agreement_reviews
agreement_approvals
agreement_activities

legal_requests
legal_request_documents
legal_request_activities

oss_requests
oss_activities

budgets
budget_items
budget_requests
budget_realizations

planners
planner_tasks

notifications

Do not create all tables blindly. Inspect the existing database first and reuse existing compatible structures.

21. UI / UX Rules

Use the existing Gesit ERP visual language.

Preferred characteristics:

Clean

Modern

Corporate

Responsive

Desktop-first for CSL operations

Mobile-friendly for requester/approval views

Consistent tables/forms/dialogs

Clear status badges

Clear SLA indicators

Minimal unnecessary decoration

Do not introduce a completely new visual system without a clear reason.

22. Implementation Rules

Before coding:

Inspect the repository.

Identify reusable components.

Identify existing database tables.

Identify existing auth/permission mechanisms.

Identify existing planner/budget mechanisms.

Identify existing notification mechanisms.

Plan migration impact.

For database changes:

Use Supabase migrations.

Do not manually alter production schema without a migration.

Include appropriate indexes.

Add Row Level Security where applicable.

Test policies with multiple roles.

For API/backend:

Validate input.

Enforce authorization server-side.

Never trust requester IDs or role values supplied by the browser.

Keep Google credentials server-side.

Do not expose service account secrets.

23. Scope Control

The agent must avoid scope drift.

When a request is ambiguous:

Stay within CSL ERP scope.

Prefer the simplest implementation consistent with the requirements.

Reuse existing architecture.

Do not invent unrelated features.

Do not refactor large parts of the project unless necessary.

Do not replace working libraries/frameworks without a concrete reason.

If a proposed feature affects security, document confidentiality, permissions, or database architecture, explain the impact before making a broad change.

24. Definition of Done

A feature is not considered complete merely because the UI exists.

A feature is complete when applicable:

UI works

Database schema exists

RLS/authorization is enforced

API/backend validation exists

Activity history is recorded

Error states are handled

Loading states exist

Empty states exist

Permission boundaries are tested

Related records are linked

Existing design system is followed

25. Agent Working Style

Always work incrementally.

Preferred sequence:

Inspect
→ Plan
→ Implement
→ Migrate
→ Test
→ Review

Do not make large unrelated changes in one step.

For each implementation:

State what will be changed.

Keep changes focused.

Preserve existing working features.

Verify after changes.

The most important priorities are:

Data confidentiality

Correct authorization

Request traceability

SLA accuracy

Document integrity

Workflow correctness

Maintainability

UI polish

26. Latest CSL Meeting Scope — 12 August 2026

The latest confirmed business requirements are based on the CSL meeting on 12 August 2026.

These requirements take priority over earlier assumptions if there is any conflict.

A. Routine

Routine activities are planned CSL activities that already have a timeline.

The system must support:

Activity with start date

Target completion date

PIC

Progress percentage

Status

Timeline

Monitoring

Overdue detection

Activity history

Routine is different from ticketing.

Routine = planned CSL work.

Example:

Annual Corporate Compliance
Start: 01 Aug 2026
Target: 31 Aug 2026
Progress: 65%
PIC: CSL Staff
Status: On Track

B. Non-Routine / Request Ticketing

All requests from other departments must be registered as tickets.

The ticketing system is the main intake channel for non-routine CSL work.

Every ticket must have:

Unique request/ticket number

Requester

Department

Company

Request category

Description

Priority

CSL PIC

Created date/time

Required date

SLA target

Due date

Status

Progress

Documents

Activity history

Response history

Feedback

Suggested categories:

Agreement
Legal Review
Corporate Secretary
OSS
Licensing
Notary
Legal Opinion
Document Request
Compliance
Other

Categories must be configurable through the database.

C. Ticket SLA

Every ticket must have a target completion time.

The system must monitor:

On Track

Due Soon

Due Today

Overdue

Completed On Time

Completed Late

SLA configuration must be based on request category/type and must not be hard-coded into the UI.

D. Documents

All CSL documents are confidential.

Actual files must be stored only in the company's Google Drive / Google Workspace storage.

Do not store actual CSL files in:

Supabase Storage

local server storage

public folders

public CDN

unrelated external storage

Supabase stores metadata only.

If Google Workspace is available, prefer a dedicated Shared Drive such as:

CSL - Confidential Documents
├── 01 Routine
├── 02 Requests
├── 03 Agreement
├── 04 Legal
├── 05 OSS
├── 06 Budget
└── 99 Archive

Actual folder structure can be refined during implementation.

E. Document Access

Documents must remain private.

Requester:

Can access only documents belonging to their own request.

CSL Team:

Can access authorized CSL documents.

Approver:

Can access documents related to approval assignments.

Super Admin:

Can access all documents.

Requester A must never be able to access Requester B's documents.

Permission must be enforced server-side and through database/RLS policies where applicable.

Do not rely only on frontend visibility.

F. Google Docs Review

If a document requires review:

Edit in Google Docs

Comment in Google Docs

Suggest in Google Docs

Reply to comments in Google Docs

Do not build a duplicate comment engine inside CSL ERP.

CSL ERP manages:

Request

Workflow

SLA

PIC

Approval

Response

Audit

Reporting

Google Drive/Docs manages:

Document storage

Document editing

Comments

Suggestions

Collaboration

G. Notifications

The system must provide both:

In-app notifications/pop-ups

Email notifications

Notify users when there are relevant updates such as:

New request

Request assigned

Request acknowledged

Status changed

Revision required

New document

Request completed

CSL response

SLA approaching

SLA overdue

OSS deadline approaching

Agreement expiry approaching

Email is a notification/communication layer.

CSL ERP remains the system of record.

H. CSL Response

After review/processing, CSL must be able to respond to the original requester.

Response types may include:

COMPLETED
APPROVED
REVISION_REQUIRED
REJECTED
NEED_ADDITIONAL_INFORMATION

The response must be stored as part of the request record.

Email can be sent automatically or manually from the ERP.

I. Feedback

Every completed request should support requester feedback.

Support:

Overall rating

Response time rating

Service quality rating

Comment

Feedback must be linked to the original ticket/request.

J. Budget & Cost

Budgeting is focused on CSL budget control, not full accounting.

Support:

Budget plan

Budget allocation

Budget request

Cost/expense

Budget realization

Budget monitoring

Dashboard/report should show:

Allocated
Committed
Actual
Available
Utilization %

K. Phone Directory

Create a dedicated external contact directory.

The focus is external contacts, not an employee directory.

Suggested categories:

Lawyer
Vendor
Government
Notary
Consultant
Business Partner
Other

Contact fields may include:

Organization

Contact name

Position

Category

Phone

Email

Address

Notes

Tags

L. Dashboard

The dashboard should focus on CSL operational control.

Minimum dashboard sections:

Routine Activity
Open Requests
SLA Performance
Budget Usage

Request Monitoring
Routine Monitoring
Upcoming Deadlines
Recent Requests
Notifications
My Tasks

Important status indicators:

On Track
Due Soon
Due Today
Overdue
Completed

M. Final Module Structure

The confirmed high-level navigation is:

Dashboard

ROUTINE
├── Activity
├── Timeline
├── My Activity
└── Monitoring

REQUEST / TICKETING
├── All Requests
├── My Requests
├── Create Request
├── My Tickets
└── Categories

DOCUMENT
├── Request Documents
├── Agreement
├── Legal Documents
└── Google Drive

BUDGET & COST
├── Budget Plan
├── Budget Request
├── Cost / Expense
└── Budget Monitoring

PHONE DIRECTORY
├── All Contacts
├── Lawyer
├── Vendor
├── Government
└── Other External

REPORT
├── Activity Report
├── Request Report
├── SLA Report
├── Budget Report
└── Performance Report

Agreement, Legal, and OSS should be treated as business processes/types that can be linked to the central Request/Ticket rather than forcing them to become unrelated top-level systems.

27. Scope Priority

The latest meeting changes the development priority.

Priority 1 — Request / Ticketing

Request intake

Categories

Requester

Department

CSL assignment

Status

Progress

SLA

Timeline

Activity history

Priority 2 — Notifications & Response

In-app notification

Email notification

CSL response

Requester feedback

Priority 3 — Google Drive / Google Docs

Secure document metadata

Google Drive integration

Private access

Google Docs review

Document version/reference

Priority 4 — Routine Activity

Planned activities

Timeline

Progress

Target monitoring

Priority 5 — Budget & Cost

Budget plan

Cost

Realization

Monitoring

Priority 6 — Phone Directory

External contacts

Categories

Search

Contact details

Priority 7 — Reports

Request

SLA

Routine

Budget

Performance

Do not build advanced Agreement/Legal/OSS standalone modules before the central Request/Ticketing foundation is stable.