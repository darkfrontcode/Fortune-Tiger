# [PR Title — clear summary of the feature or fix]

## 📋 Description

[2–4 sentences in English: what problem this solves, what was implemented, and any notable impact for reviewers or operators.]

## ✨ Changes

### [Area 1 — e.g. Company Management]

- ✅ [What was added or enabled]
- 🔄 [What was updated]
- 🗑️ [What was removed, if any]

### [Area 2 — e.g. Security Improvements]

- 🔒 [Security-related change]
- ...

### [Area 3 — e.g. Code Improvements]

- 🔄 [Refactors, validation simplifications, repository improvements]

## 🔧 Technical Details

### [Topic — e.g. New Endpoints]

Describe behavior in prose only (no code blocks):

- **Suspend company**: PATCH route under companies with tenant id and deactivate path; requires Refuturiza auth headers; returns success, unauthorized, or not found as applicable.
- **Reactivate company**: PATCH route with reactivate path; same auth and response semantics.

### [Topic — e.g. Database Changes]

- [Policies, columns, migrations — described in plain language]

## 📦 Dependencies

- [No new dependencies / list new packages and why]

---

## Reference example (structure and tone only)

The example below shows section layout and emoji usage. When generating a real PR file, **do not copy endpoint code blocks** — the live output must follow PS-2 (no code in the PR).

# Company Suspension and Reactivation Functionality for Refuturiza Integration

## 📋 Description

This PR implements company management capabilities for the Refuturiza integration, allowing companies to be suspended and reactivated. It also includes security improvements and validation simplifications.

## ✨ Changes

### Company Management

- ✅ Added suspend and reactivate company controllers
- ✅ New PATCH endpoints for deactivate and reactivate by tenant id
- 🔄 Updated tenant domain to handle suspension status and tracking
- ✅ Added suspension timestamp tracking

### Security Improvements

- 🔒 Added row-level security for payroll templates
- 🔒 Enhanced middleware to check company suspension status
- 🔒 Improved validation in the authentication flow

### Code Improvements

- 🔄 Simplified company creation validation
- 🔄 Made optional fields truly optional in company creation
- 🔄 Improved tenant repository with save method
- 🔄 Enhanced tenant domain model

## 🔧 Technical Details

### New Endpoints

Suspend and reactivate operations are exposed as PATCH routes on the companies resource, scoped by tenant id, with Refuturiza authentication headers required. Successful suspension or reactivation returns OK; missing or invalid auth returns unauthorized; unknown tenant returns not found.

### Database Changes

- Row-level security policy added for payroll template system fields
- Tenant table extended with suspension tracking fields

## 📦 Dependencies

- No new dependencies added
- Uses existing services and repositories
