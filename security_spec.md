# Security Specification (Phase 0: Payload-First Security TDD)

## 1. Data Invariants
1. **Default-Deny Catch-All**: All unspecified Firestore paths return `PERMISSION_DENIED`.
2. **Verified Identity**: No read or write (except `/test/connection` probe) succeeds without `request.auth != null && request.auth.token.email_verified == true`.
3. **Workspace Membership**: Only the bootstrapped admin (`gopishankarsegar@ptuniv.edu.in`) or verified Google accounts listed in `resource.data.memberEmails` (list <= 25) can list or read shop workspace documents.
4. **Immutable Ledger & Audit**: `ledger` and `audit_log` entries cannot be mutated once created (except `memberEmails` sync by admin when onboarding a new device email).
5. **Temporal Integrity**: All writes require `createdAt == request.time` on creation and `updatedAt == request.time` + `createdAt == existing().createdAt` on update.
6. **Admin Isolation**: Only `gopishankarsegar@ptuniv.edu.in` (verified) or documents in `/admins/{uid}` can manage `/cloud_members`, `/staff_users`, `/products`, `/purchases`, and approve/delete records.
7. **Strict Key & Size Enforcement**: Every collection enforces `keys().hasAll(...)`, `keys().hasOnly(...)`, `.size()` limits on all strings and bounded arrays (`memberEmails.size() <= 25`, `lines.size() <= 200`/`300`).

## 2. "Dirty Dozen" Attack Payloads (All Must Fail with PERMISSION_DENIED)
1. **Unauthenticated Purchase Read**: Anonymous client lists `/purchases` -> DENIED (`request.auth == null`).
2. **Unverified Email Admin Spoof**: Token with `email: 'gopishankarsegar@ptuniv.edu.in'`, `email_verified: false` attempts read/write -> DENIED (`email_verified == true` check).
3. **Unauthorized Signed-In User Query**: External Gmail `stranger@gmail.com` lists `/purchases` -> DENIED (`memberEmails` does not contain caller email).
4. **Shadow Field Injection on Purchase**: Authorized member sends extra key `{ ..., isAdminBypass: true }` -> DENIED (`keys().hasOnly(...)`).
5. **Poisoned Document ID**: Write to `/purchases/../../../etc/passwd` or 500-char ID -> DENIED (`isValidId()` regex + length <= 64).
6. **Giant String DoS**: Purchase with 50,000-character `supplier` or `remark` -> DENIED (`.size() <= 160` / `<= 300`).
7. **Unbounded Array DoS**: Purchase with `lines.size() == 500` or `memberEmails.size() == 100` -> DENIED (`.size() <= 200` / `<= 25`).
8. **Type Poisoning on Update**: Update `purchases/{batchId}` setting `netTotal: "999999"` (string) instead of number -> DENIED (`isValidPurchaseBatch(incoming())` runs first on `allow update`).
9. **Client Timestamp Forgery**: Create purchase with backdated `createdAt` not equal to `request.time` -> DENIED (`incoming().createdAt == request.time`).
10. **Immutable `createdAt` Tampering**: Update purchase modifying `createdAt` -> DENIED (`incoming().createdAt == existing().createdAt`).
11. **Privilege Escalation on `cloud_members`**: Non-admin signed-in staff attempts to add themselves to `/cloud_members` or `/admins` -> DENIED (`isAdmin()` required).
12. **Blanket List Query Scraping**: Signed-in non-member runs collection list on `/staff_users` -> DENIED (`resource.data.memberEmails` check on `allow list`).
