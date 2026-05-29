# Bank Details — API Integration Guide

> **Audience:** Frontend / Dashboard Team  
> **Base URL:** All seller endpoints are prefixed with `/seller-onboarding`, admin endpoints with `/admin`  
> **Auth:** Every protected endpoint requires a Bearer token in the `Authorization` header  
> **Last Updated:** March 10, 2026

```
Authorization: Bearer <jwt_token>
```

---

## Quick Reference

| # | Who | Method | Endpoint | Purpose |
|---|-----|--------|----------|---------|
| 1 | Seller | `GET` | `/seller-onboarding/bank-details` | Fetch masked current bank details + any pending request |
| 2 | Seller | `POST` | `/seller-onboarding/bank-details/change-request` | Submit a change request (requires current password) |
| 3 | Seller | `GET` | `/seller-onboarding/bank-change-requests` | Full history of the seller's own change requests |
| 4 | Admin | `GET` | `/admin/bank-change-requests` | List all change requests (filterable, paginated) |
| 5 | Admin | `POST` | `/admin/bank-change-requests/:id/approve` | Approve a request — atomically updates live bank details |
| 6 | Admin | `POST` | `/admin/bank-change-requests/:id/reject` | Reject a request — live bank details unchanged |

---

## Table of Contents

1. [Overview & Flow](#1-overview--flow)
2. [Seller — Get Bank Details](#2-seller--get-bank-details)
3. [Seller — Request Bank Details Change](#3-seller--request-bank-details-change)
4. [Seller — Get Request History](#4-seller--get-request-history)
5. [Admin — List Bank Change Requests](#5-admin--list-bank-change-requests)
6. [Admin — Approve a Request](#6-admin--approve-a-request)
7. [Admin — Reject a Request](#7-admin--reject-a-request)
8. [Status & Error Reference](#8-status--error-reference)
9. [UI Implementation Notes](#9-ui-implementation-notes)

> **Note — Initial Onboarding:** `POST /seller-onboarding/bank-details` is a separate endpoint used only during the seller onboarding wizard (Step 7). It is **not** part of this change-request flow and does not require a password or admin approval.

---

## 1. Overview & Flow

```
Seller views masked bank details on dashboard
        │
        ▼
Seller clicks "Request to Change Bank Details"
        │
        ▼
Seller fills form:
  • New Bank Name
  • New Account Name
  • New BSB
  • New Account Number
  • Current Account Password   ← verified server-side
  • Reason for change
        │
        ▼
POST /seller-onboarding/bank-details/change-request
        │
        ▼
Request created with status: PENDING
(only 1 pending request allowed at a time)
        │
        ▼
Admin reviews in dashboard
  ┌─────────────────────────────┐
  │  POST …/:id/approve         │  → updates live bank details atomically
  │  POST …/:id/reject          │  → stores rejection note, no change applied
  └─────────────────────────────┘
```

---

## 2. Seller — Get Bank Details

Fetch the authenticated seller's current bank details (masked for security) and any pending change request they have open.

### Request

```
GET /seller-onboarding/bank-details
Authorization: Bearer <seller_token>
```

### Success Response `200`

```json
{
  "success": true,
  "bankDetails": {
    "bankName": "Commonwealth Bank",
    "accountName": "John Smith",
    "bsb": "XXX-000",
    "accountNumber": "*****678"
  },
  "pendingChangeRequest": null
}
```

> **Note:** BSB first 3 digits are masked as `XXX`. Account number shows only the last 3 digits, rest are `*`.

#### When a pending change request exists

```json
{
  "success": true,
  "bankDetails": {
    "bankName": "Commonwealth Bank",
    "accountName": "John Smith",
    "bsb": "XXX-000",
    "accountNumber": "*****678"
  },
  "pendingChangeRequest": {
    "id": "clxyz123abc",
    "newBankDetails": {
      "bankName": "ANZ Bank",
      "accountName": "John Smith",
      "bsb": "013-000",
      "accountNumber": "87654321"
    },
    "reason": "Switched to a new bank account",
    "status": "PENDING",
    "createdAt": "2026-03-09T10:30:00.000Z"
  }
}
```

> When `pendingChangeRequest` is not `null`, show a banner/notice to the seller that a change request is under review. Disable the "Request Change" button.

#### When seller has no bank details on file

```json
{
  "success": true,
  "bankDetails": null,
  "pendingChangeRequest": null
}
```

### Error Responses

| Status | Reason |
|--------|--------|
| `401` | Token missing or expired |
| `404` | Seller profile not found |
| `500` | Server error |

---

## 3. Seller — Request Bank Details Change

Submit a request to update bank details. A current account password is required for security verification. Only **one pending request** is allowed at a time.

### Request

```
POST /seller-onboarding/bank-details/change-request
Authorization: Bearer <seller_token>
Content-Type: application/json
```

### Request Body

```json
{
  "bankName": "ANZ Bank",
  "accountName": "John Smith",
  "bsb": "013-000",
  "accountNumber": "87654321",
  "currentPassword": "seller_current_password",
  "reason": "I have switched to a new bank account for my business"
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `bankName` | string | ✅ | Name of the bank |
| `accountName` | string | ✅ | Name on the account |
| `bsb` | string | ✅ | 6-digit BSB, with or without hyphen |
| `accountNumber` | string | ✅ | Bank account number |
| `currentPassword` | string | ✅ | Seller's current login password (verified server-side) |
| `reason` | string | ✅ | Min 10 characters |

### Success Response `201`

```json
{
  "success": true,
  "message": "Bank details change request submitted successfully. It will be reviewed by our team.",
  "requestId": "clxyz123abc"
}
```

### Error Responses

| Status | Body `message` | Reason |
|--------|---------------|--------|
| `400` | `"bankName, accountName, bsb, accountNumber, currentPassword and reason are all required"` | Missing field(s) |
| `400` | `"Please provide a more detailed reason (at least 10 characters)"` | Reason too short |
| `401` | `"Incorrect password"` | Wrong current password |
| `404` | `"User not found"` | Token refers to deleted user |
| `409` | `"You already have a pending bank details change request. Please wait for it to be reviewed."` | Duplicate pending request |
| `500` | `"Server error"` | Server error |

---

## 4. Seller — Get Request History

Returns the authenticated seller's **complete history** of bank change requests, ordered most-recent first. Results are always scoped to the calling seller — other sellers' data is never returned.

Use this to populate the "Request History" section on the seller's settings page, showing past approved and rejected requests along with any admin review notes.

### Request

```
GET /seller-onboarding/bank-change-requests
Authorization: Bearer <seller_token>
```

### Query Parameters

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | `1` | Page number |
| `limit` | number | `20` | Items per page (max 100) |

**Example:**
```
GET /seller-onboarding/bank-change-requests?page=1&limit=20
```

### Success Response `200`

```json
{
  "success": true,
  "requests": [
    {
      "id": "clxyz123abc",
      "newBankDetails": {
        "bankName": "ANZ Bank",
        "accountName": "John Smith",
        "bsb": "013-000",
        "accountNumber": "87654321"
      },
      "reason": "Switched to a new bank account",
      "status": "REJECTED",
      "reviewNote": "The BSB provided does not appear to be valid. Please resubmit.",
      "createdAt": "2026-03-01T10:30:00.000Z",
      "updatedAt": "2026-03-02T09:00:00.000Z"
    },
    {
      "id": "clabc456def",
      "newBankDetails": {
        "bankName": "Commonwealth Bank",
        "accountName": "John Smith",
        "bsb": "062-000",
        "accountNumber": "11223344"
      },
      "reason": "Opening a new business account",
      "status": "APPROVED",
      "reviewNote": null,
      "createdAt": "2026-01-15T08:00:00.000Z",
      "updatedAt": "2026-01-16T10:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 2,
    "page": 1,
    "limit": 20,
    "pages": 1
  }
}
```

### Fields per Request Object

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | Request ID |
| `newBankDetails` | object | `bankName`, `accountName`, `bsb`, `accountNumber` |
| `reason` | string | Seller's stated reason |
| `status` | `PENDING` \| `APPROVED` \| `REJECTED` | Current status |
| `reviewNote` | string \| null | Admin's note — `null` if no note or not yet reviewed |
| `createdAt` | ISO datetime | When submitted |
| `updatedAt` | ISO datetime | When last actioned |

### Error Responses

| Status | Reason |
|--------|--------|
| `401` | Token missing or expired |
| `404` | Seller profile not found |
| `500` | Server error |

---

## 5. Admin — List Bank Change Requests

Retrieve all bank change requests with optional status filtering and pagination.

### Request

```
GET /admin/bank-change-requests
Authorization: Bearer <admin_token>
```

### Query Parameters

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `status` | `PENDING` \| `APPROVED` \| `REJECTED` | _(all)_ | Filter by status |
| `page` | number | `1` | Page number |
| `limit` | number | `20` | Items per page (max 100) |

**Examples:**
```
GET /admin/bank-change-requests?status=PENDING
GET /admin/bank-change-requests?status=APPROVED&page=2&limit=10
```

### Success Response `200`

```json
{
  "success": true,
  "requests": [
    {
      "id": "clxyz123abc",
      "sellerId": "clseller456",
      "newBankDetails": {
        "bankName": "ANZ Bank",
        "accountName": "John Smith",
        "bsb": "013-000",
        "accountNumber": "87654321"
      },
      "reason": "I have switched to a new bank account for my business",
      "status": "PENDING",
      "reviewedBy": null,
      "reviewNote": null,
      "createdAt": "2026-03-09T10:30:00.000Z",
      "updatedAt": "2026-03-09T10:30:00.000Z",
      "seller": {
        "userId": "clseller456",
        "storeName": "John's Art Studio",
        "businessName": "Smith Arts Pty Ltd",
        "bankDetails": {
          "bankName": "Commonwealth Bank",
          "accountName": "John Smith",
          "bsb": "062-000",
          "accountNumber": "12345678"
        },
        "user": {
          "email": "john@example.com",
          "name": "John Smith"
        }
      }
    }
  ],
  "pagination": {
    "total": 5,
    "page": 1,
    "limit": 20,
    "pages": 1
  }
}
```

> `seller.bankDetails` contains the **current live** bank details (unmasked). The `newBankDetails` field contains what the seller wants to change to. Display both side-by-side for admin to compare.

---

## 6. Admin — Approve a Request

Approves a pending bank change request. This **atomically** updates the seller's live bank details and marks the request as `APPROVED` in a single database transaction.

### Request

```
POST /admin/bank-change-requests/:id/approve
Authorization: Bearer <admin_token>
```

| Param | Description |
|-------|-------------|
| `:id` | The `id` of the bank change request |

### Request Body

None required.

### Success Response `200`

```json
{
  "success": true,
  "message": "Bank details change request approved and applied"
}
```

### Error Responses

| Status | Body `message` | Reason |
|--------|---------------|--------|
| `404` | `"Bank change request not found"` | Invalid ID |
| `409` | `"Request is already approved"` | Already actioned |
| `409` | `"Request is already rejected"` | Already actioned |
| `500` | `"Server error"` | Server error |

---

## 7. Admin — Reject a Request

Rejects a pending bank change request. The seller's live bank details are **not** modified.

### Request

```
POST /admin/bank-change-requests/:id/reject
Authorization: Bearer <admin_token>
Content-Type: application/json
```

| Param | Description |
|-------|-------------|
| `:id` | The `id` of the bank change request |

### Request Body

```json
{
  "reviewNote": "The provided BSB does not appear to be valid. Please resubmit with a correct BSB."
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `reviewNote` | string | Optional | Reason for rejection shown to seller |

### Success Response `200`

```json
{
  "success": true,
  "message": "Bank details change request rejected"
}
```

### Error Responses

| Status | Body `message` | Reason |
|--------|---------------|--------|
| `404` | `"Bank change request not found"` | Invalid ID |
| `409` | `"Request is already approved"` | Already actioned |
| `409` | `"Request is already rejected"` | Already actioned |
| `500` | `"Server error"` | Server error |

---

## 8. Status & Error Reference

### `BankChangeStatus` Enum

| Value | Meaning |
|-------|---------|
| `PENDING` | Awaiting admin review |
| `APPROVED` | Approved — live bank details updated |
| `REJECTED` | Rejected — live bank details unchanged |

### Common HTTP Status Codes

| Code | Meaning |
|------|---------|
| `200` | OK |
| `201` | Created |
| `400` | Validation error — check `message` field |
| `401` | Unauthorized — invalid/missing token or wrong password |
| `404` | Record not found |
| `409` | Conflict — duplicate pending request or already actioned |
| `500` | Server error |

---

## 9. UI Implementation Notes

### Seller Dashboard — Bank Details Section

1. **On page load:** Call `GET /seller-onboarding/bank-details`
2. **Display masked details** in a read-only card:  
   - Bank Name, Account Name, BSB (`XXX-xxx`), Account Number (`*****123`)
3. **If `bankDetails` is `null`:** Show "No bank details on file" message
4. **If `pendingChangeRequest` is not `null`:**
   - Show a yellow info banner: _"A change request is currently under review"_
   - Display the requested new details in the banner for seller's reference
   - **Disable** the "Request Change" button
5. **If no pending request:** Show an active "Request to Change Bank Details" button

### Seller — Change Request Form

Required fields to collect:
- New Bank Name _(text input)_
- New Account Name _(text input)_
- New BSB _(text input, format hint: `XXX-XXX`)_
- New Account Number _(text input)_
- Reason for Change _(textarea, min 10 characters)_
- Current Password _(password input — do not store, send directly)_

On submit: `POST /seller-onboarding/bank-details/change-request`

Handle these specific error cases:
- `401 "Incorrect password"` → Show inline error on the password field
- `409` → Close form, refresh to show the existing pending request banner
- `400` → Show field-level or form-level validation error from `message`

### Admin Dashboard — Bank Change Requests

Suggested page layout:

1. **Tab/filter bar:** All | Pending | Approved | Rejected  
   → drives the `?status=` query param
2. **Request card / table row** showing:
   - Seller name, store name, email
   - Current bank details (from `seller.bankDetails`)
   - Requested new bank details (from `newBankDetails`)
   - Reason
   - Date submitted
   - Status badge
3. **Action buttons** (visible only when `status === "PENDING"`):
   - ✅ **Approve** → `POST /admin/bank-change-requests/:id/approve`
   - ❌ **Reject** → opens a small modal to enter an optional `reviewNote`, then `POST /admin/bank-change-requests/:id/reject`
4. After approve/reject, refresh the list

### Seller Dashboard — Request History Page

1. **On page load:** Call `GET /seller-onboarding/bank-change-requests`
2. **Display a timeline or table** of past requests, most-recent first
3. **Per row show:**
   - Date submitted (`createdAt`)
   - Requested bank details (`newBankDetails`)
   - Reason
   - Status badge: `PENDING` (yellow) / `APPROVED` (green) / `REJECTED` (red)
   - If `status === "REJECTED"` and `reviewNote` is not `null`: show the admin's note in a highlighted block beneath the row
4. **Pagination:** use `page` / `limit` query params if the seller has many requests; display total from `pagination.total`
5. **Empty state:** If `requests` is an empty array, show "No bank change requests yet"

---

*Last Updated: March 10, 2026*
