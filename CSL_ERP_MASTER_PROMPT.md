CSL ERP — Master Build Prompt

You are working on the CSL ERP (Corporate Secretary & Legal ERP) based on the existing gesit-erp project.

Repository:
https://github.com/itdeptgesit/gesit-erp

Read and follow AGENT.md before making any implementation.

Objective

Transform the existing Gesit ERP foundation into a focused internal ERP for Corporate Secretary & Legal.

Do NOT rebuild the application from zero.

Reuse the existing:

UI

layout

components

authentication

permission system

Supabase architecture

database migration pattern

planner

budgeting

notification

activity log

reusable utilities

Only add or modify what is required for CSL.

Business Requirements

1. Central Request System

Every request from another department must become a permanent record in the system.

Each request must have:

Request number

Request type

Requester

Department

Company

CSL PIC

Priority

Requested date

Required date

SLA target

SLA due date

Status

Description

Documents

Activity history

Response history

Feedback

The request is the central relationship for downstream processes.

2. SLA / Target Time

CSL needs to measure whether every request is completed within its target time.

SLA must be configurable by request type.

Examples:

NDA: 3 working days

Agreement Review: 5 working days

Legal Consultation: 5 working days

Corporate Action: 7 working days

OSS Processing: configurable

Do not hard-code these values into frontend code.

Show:

Target

Due date

Elapsed time

Remaining time

Overdue time

SLA status

Dashboard must clearly show:

On Track

Due Soon

Due Today

Overdue

Completed On Time

Completed Late

Use working-day calculations and design the system so company holidays can be configured.

3. Request Workflow

Use a flexible workflow based on request type.

Default statuses:

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

Every important status transition must create an activity log.

4. Agreement

Agreement is a primary CSL module.

Support:

Agreement register

Agreement type

Counterparty

Company

Effective date

Expiry date

Value/currency

Requester

CSL PIC

Documents

Review

Approval

Signing

Active status

Expiry monitoring

Agreement workflow:

DRAFT
→ SUBMITTED
→ UNDER_REVIEW
→ DRAFTING
→ INTERNAL_REVIEW
→ NEGOTIATION
→ FINAL_REVIEW
→ APPROVED
→ SIGNING
→ ACTIVE
→ EXPIRED / TERMINATED

Support expiry reminders:

90 days

60 days

30 days

14 days

7 days

Make reminder settings configurable.

5. Confidential Documents

All CSL documents are confidential company documents.

Actual files must be stored in Google Drive / Google Workspace.

Do NOT store actual documents in:

Supabase Storage

local server filesystem

public folders

public CDN

external file storage

Supabase stores metadata only.

Example:

file_name
file_type
file_size
google_drive_file_id
request_id
agreement_id
uploaded_by
uploaded_at
version
document_type

Google Drive must remain private.

Never use:

Anyone with the link

Public folder

Public document URL

Client-side Google service credentials

Preferred architecture:

Browser
→ CSL ERP
→ Authorization
→ Backend
→ Google Drive API
→ Private Company Drive

If Google Workspace exists, prefer a dedicated Shared Drive such as:

CSL - Confidential Documents

6. Document Permission

A requester can only access documents associated with their own requests.

CSL Team can access documents according to CSL permissions/assignment.

Approvers can access documents related to approval tasks.

Super Admin can access everything.

Another requester must never be able to see another requester's documents.

Do not rely only on frontend hiding.

Enforce permission server-side and at the database/RLS layer where applicable.

7. Google Docs Review

When a document requires editing/review/comment:

Use Google Docs.

Google Docs handles:

Editing

Suggesting

Comments

Comment replies

Do NOT create a second comment system in the ERP.

The ERP handles:

Workflow

Status

SLA

Assignment

Approval

Response

Audit

Reporting

Provide an Open in Google Docs action for authorized users.

8. CSL Response

After CSL completes a review, CSL must be able to respond to the original requester.

Response types:

Completed

Approved

Revision Required

Rejected

Need Additional Information

Allow CSL to:

Write response

Attach/reference final documents

Send email

Store response history

The email is a notification/communication mechanism.

The ERP remains the system of record.

9. Email Notification

Support automated email notifications for:

New request

Request acknowledged

Request assigned

Revision required

Request completed

CSL response

SLA approaching

SLA overdue

OSS deadline approaching

Agreement expiry approaching

Do not hard-code email recipients.

Determine recipients from request ownership, CSL assignment, approvers, and notification rules.

10. OSS

Some CSL requests require follow-up to OSS.

Create an OSS process linked to the original request.

Track:

Request

Company

OSS process type

PIC

Start date

Deadline

Status

Completion date

Notes

Documents

Activity

Dashboard/report must show:

On Schedule

Due Soon

Due Today

Overdue

Completed

The purpose is to ensure CSL does not miss OSS deadlines.

11. Feedback

After a request is completed, the requester can provide feedback.

Support:

Overall rating

Response time rating

Service quality rating

Comment

Feedback must be linked to the request.

Use feedback in performance reports.

12. Reports

Create:

Request Report

SLA Report

Agreement Report

OSS Report

Budget Report

CSL Performance Report

Useful KPIs:

Total requests

Open requests

Completed requests

Overdue requests

SLA achievement %

Average completion time

Requests by department

Requests by CSL PIC

Agreement expiry

OSS overdue

Average feedback score

All report numbers must come from database records.

Initial Sidebar

Use:

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

Do not add unrelated IT modules.

Roles

Initial roles:

SUPER_ADMIN
CSL_ADMIN
CSL_STAFF
REQUESTER
APPROVER

Permissions must control:

View

Create

Edit

Assign

Approve

Upload

Open documents

Send response

Manage SLA

Reports

Database Direction

Inspect the existing database before adding tables.

Potential CSL tables:

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

notifications

Reuse compatible existing tables where possible.

Use Supabase migrations for schema changes.

Use RLS and proper indexes.

UI Direction

Keep the existing Gesit ERP design language.

Design should be:

Clean

Modern

Corporate

Responsive

Desktop-first for CSL staff

Mobile-friendly for requesters and approvers

Consistent with existing components

Important dashboard concepts:

REQUEST SLA
On Track
Due Soon
Due Today
Overdue

AGREEMENT
Active
Under Review
Signing
Expiring
Expired

OSS
On Schedule
Due Soon
Overdue

MY TASKS
Pending
In Progress
Completed

Implementation Rules

Before changing code:

Inspect repository structure.

Inspect existing components.

Inspect database schema.

Inspect auth/roles.

Inspect RLS.

Inspect planner/budget systems.

Inspect notification/email system.

Identify reusable components.

Create an implementation plan.

Then implement incrementally.

Do not make a large unrelated refactor.

Do not replace existing libraries/frameworks unless necessary.

Do not create duplicate components when reusable components already exist.

Do not create duplicate comment functionality.

Do not create duplicate document storage.

Do not expose Google credentials to the browser.

Do not store confidential CSL documents outside Google Drive.

Development Priority

Implement in this order:

Phase 1 — Foundation

Request types

SLA configuration

Request database

Request workflow

Request activity

Role/permission

Request dashboard

Phase 2 — Agreement

Agreement request

Agreement register

Agreement documents

Google Drive integration

Google Docs opening

Review workflow

Approval

Expiry monitoring

Phase 3 — Communication

CSL response

Email notification

Notification center

Feedback

Phase 4 — OSS

OSS request/process

Deadline monitoring

OSS dashboard

OSS report

Phase 5 — Reporting

SLA report

Request report

Agreement report

OSS report

Performance report

Phase 6 — Existing Modules

Adapt Budgeting

Adapt Planner

Integrate them with Request

Non-Negotiable Priorities

Always prioritize in this order:

Confidentiality

Authorization

Request traceability

SLA accuracy

Document integrity

Workflow correctness

Auditability

Maintainability

UI polish

If a proposed implementation conflicts with confidentiality or authorization, stop and redesign it.

Working Method

For every task:

INSPECT
↓
PLAN
↓
IMPLEMENT
↓
MIGRATE
↓
TEST
↓
REVIEW

Keep each change focused.

Before implementing a feature, explain:

What files/components will be changed

What database changes are needed

What permission changes are needed

What external integrations are needed

How the feature will be tested

Then implement.

Do not drift outside the requested feature.

Updated Business Direction — CSL Meeting 12 August 2026

The latest confirmed scope is based on the CSL meeting held on 12 August 2026.

This scope takes priority over earlier assumptions.

Core Concept

CSL ERP has two primary operational streams:

ROUTINE
Planned CSL activities
→ Timeline
→ Progress
→ Target monitoring

NON-ROUTINE
Department request
→ Ticket
→ Category
→ CSL assignment
→ SLA
→ Processing
→ Document collaboration
→ Response
→ Feedback
→ Close

The central system of record is the Request/Ticket.

Agreement, Legal, OSS, and similar work should be represented as request categories/process types and linked records where needed, rather than immediately becoming independent systems.

Confirmed Modules

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

Non-Routine Ticketing Requirements

Every request from another department must create a permanent ticket record.

Each ticket must include:

Ticket/request number

Requester

Department

Company

Category

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

Categories must be configurable.

Suggested initial categories:

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

SLA

Every request must have a configurable target time.

Track:

ON_TRACK
DUE_SOON
DUE_TODAY
OVERDUE
COMPLETED_ON_TIME
COMPLETED_LATE

Dashboard must make SLA performance immediately visible.

Routine

Routine activities are planned CSL activities with a timeline.

Track:

Start

Target

PIC

Progress

Status

Delay

Activity history

Routine is not a ticket unless explicitly linked to a request.

Documents

All confidential CSL documents must remain in Google Drive / Google Workspace.

Supabase stores metadata only.

Never store the actual document in Supabase Storage or local server storage.

Use private Google Drive storage and server-side authorization.

Requesters can access only their own request documents.

CSL users can access authorized CSL documents.

Google Docs is the collaboration layer for editing/comments/suggestions.

Do not create a duplicate comment system in the ERP.

Notifications

Provide:

In-app notification/pop-up

Email notification

Relevant events include:

New request

Assignment

Status update

Revision required

New document

Completion

CSL response

SLA warning

SLA overdue

OSS deadline

Agreement expiry

Response & Feedback

CSL must be able to respond to the original requester after processing.

Store response history.

Allow requester feedback:

Overall rating

Response time

Service quality

Comment

Budget & Cost

Support:

Budget plan

Allocation

Request

Cost/expense

Realization

Monitoring

Show:

Allocated

Committed

Actual

Available

Utilization

Phone Directory

Focus on external contacts:

Lawyer
Vendor
Government
Notary
Consultant
Business Partner
Other

Development Priority

Implement in this order:

Phase 1

Request/Ticketing + Categories + SLA + Assignment + Timeline + Activity

Phase 2

Notifications + CSL Response + Feedback

Phase 3

Google Drive + Google Docs

Phase 4

Routine Activity

Phase 5

Budget & Cost

Phase 6

Phone Directory

Phase 7

Reports

Do not jump to advanced Agreement/Legal/OSS standalone modules before the Request/Ticketing foundation is stable.

First Task

Audit the existing gesit-erp repository first.

Identify:

Project structure

Existing UI system

Authentication and roles

Supabase schema

Existing planner

Existing budgeting

Existing notification/email

Existing activity log

Existing document/file mechanisms

Reusable components

Then provide a concise implementation plan for Phase 1 — Request/Ticketing + SLA.

Do not implement the entire ERP in one step.