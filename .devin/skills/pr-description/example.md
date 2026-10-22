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
