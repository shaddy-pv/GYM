# 🔒 GymOS Security Audit Report

**Date:** June 15, 2026  
**Scope:** `gymos-backend`, `gymflow-pro-main` (owner app), `gymos-member-app-main`  
**Findings:** 10 vulnerabilities (3 Critical, 3 High, 3 Medium, 1 Low)

---

## Summary

| Severity | Count | Status |
|----------|-------|--------|
| 🔴 CRITICAL | 3 | Needs immediate fix |
| 🟠 HIGH | 3 | Needs fix before production |
| 🟡 MEDIUM | 3 | Should fix |
| 🔵 LOW | 1 | Nice to fix |

---

## 🔴 CRITICAL Findings

### 1. All Secrets Committed to Git in Plaintext

> [!CAUTION]
> **Your MongoDB URI, JWT secrets, Twilio credentials, Cloudinary keys, and SMTP password are ALL committed to the public Git repo.** This is the #1 most dangerous vulnerability.

**File:** [.env](file:///e:/Project/Working/gymflow-pro-main/gymos-backend/.env)  
**Evidence:** `git log --all --oneline --diff-filter=A -- "*.env"` shows the `.env` file was committed in the initial commit (`63c26e9`).

**What's exposed:**
- MongoDB Atlas connection string (full read/write DB access)
- JWT signing secrets (anyone can forge admin tokens)
- Twilio SID + Auth Token (can send messages on your account / run up bills)
- Cloudinary API key + secret (can upload/delete all images)
- Gmail SMTP app password (can send emails as your account)

**Root cause:** The [.gitignore](file:///e:/Project/Working/gymflow-pro-main/.gitignore) only ignores `.vercel` — it does NOT ignore `.env` files.

**Impact:** Anyone with repo access can:
- Read/modify/delete all data in your database
- Forge JWT tokens to impersonate any owner or member
- Send WhatsApp/email from your accounts
- Upload malicious content to your Cloudinary

**Fix:**
```diff
# .gitignore — add these immediately
+.env
+.env.*
+!.env.example
 .vercel
+node_modules
```
Then **rotate ALL secrets** — the old ones are permanently in git history even after deleting the file.

---

### 2. Hardcoded Fallback JWT Secrets in Source Code

> [!CAUTION]
> Even if `.env` is removed, the app has **hardcoded JWT secrets** baked into the source code that will be used as fallback.

**File:** [generateToken.js](file:///e:/Project/Working/gymflow-pro-main/gymos-backend/src/utils/generateToken.js#L6-L9)

```js
const FALLBACK_ACCESS_SECRET = '3c3893b4f2b1...';  // line 7
const FALLBACK_REFRESH_SECRET = '5564ce355690...'; // line 9
```

**Impact:** If env vars aren't set on the deployment host, the app silently uses these well-known secrets. **Anyone reading the source code can forge valid JWTs** for any user.

**Fix:** Remove the fallback secrets entirely. The app should **crash on startup** if JWT secrets are missing, not silently degrade:
```js
const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
if (!ACCESS_SECRET) throw new Error('FATAL: JWT_ACCESS_SECRET not set');
```

---

### 3. Plaintext Passwords Sent via WhatsApp, Email, and API Response

> [!CAUTION]
> When a member is created, their **plaintext password** is sent via WhatsApp, email, AND returned in the API response.

**File:** [member.controller.js](file:///e:/Project/Working/gymflow-pro-main/gymos-backend/src/controllers/member.controller.js#L117-L160)

```js
// Line 117 — sent in WhatsApp
password: rawPassword,

// Line 130 — sent in email
password: rawPassword,

// Line 160 — returned to API caller
temporaryPassword: rawPassword,
```

Same pattern in [resetPassword](file:///e:/Project/Working/gymflow-pro-main/gymos-backend/src/controllers/member.controller.js#L375-L379):
```js
// Line 375 — plaintext password sent via WhatsApp
`Your new password for GymOS is:\n*${newPassword}*`

// Line 379 — returned in API response
return successResponse(res, 'Password reset successfully', { newPassword });
```

**Impact:** 
- Passwords transmitted in cleartext over WhatsApp (stored in chat history forever)
- Logged in Twilio's message logs
- Visible in browser network tab / API logs
- Anyone with physical access to the member's phone sees the password

**Fix:** Use a **magic link / OTP flow** instead of sending raw passwords. Or at minimum, force password change on first login and don't return passwords in API responses.

---

## 🟠 HIGH Findings

### 4. No `.gitignore` for `node_modules` or Environment Files

**File:** [.gitignore](file:///e:/Project/Working/gymflow-pro-main/.gitignore)

The entire `.gitignore` is just:
```
.vercel
```

This means `node_modules`, `.env`, `.env.local`, build outputs, and logs could all be committed.

**Fix:** Use a proper Node.js gitignore:
```
node_modules
.env
.env.*
!.env.example
dist
build
*.log
.vercel
```

---

### 5. Member Search Vulnerable to ReDoS (Regex Injection)

**File:** [member.controller.js](file:///e:/Project/Working/gymflow-pro-main/gymos-backend/src/controllers/member.controller.js#L189-L193)

```js
filter.$or = [
  { name: { $regex: search, $options: 'i' } },
  { phone: { $regex: search, $options: 'i' } },
  { memberId: { $regex: search, $options: 'i' } },
];
```

User-supplied `search` is used directly as a regex pattern. A crafted input like `(a+)+$` can cause **catastrophic backtracking** (ReDoS), hanging the server.

**Fix:** Escape the search string before using it as regex:
```js
const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
```

---

### 6. `updateMember` Accepts Arbitrary Fields (Mass Assignment)

**File:** [member.controller.js](file:///e:/Project/Working/gymflow-pro-main/gymos-backend/src/controllers/member.controller.js#L235)

```js
const updateData = { ...req.body };
```

The entire request body is spread directly into the update. An attacker could send:
```json
{ "isActive": true, "status": "active", "owner": "attacker_id", "totalPoints": 999999 }
```

**Fix:** Whitelist allowed fields:
```js
const allowed = ['name', 'phone', 'email', 'gender', 'height', 'weight', 'goals', 'healthNotes'];
const updateData = Object.fromEntries(
  Object.entries(req.body).filter(([key]) => allowed.includes(key))
);
```

---

## 🟡 MEDIUM Findings

### 7. Stack Traces Leaked in Development Error Responses

**File:** [error.middleware.js](file:///e:/Project/Working/gymflow-pro-main/gymos-backend/src/middleware/error.middleware.js#L61-L63)

```js
if (process.env.NODE_ENV === 'development' && err.stack) {
  response.stack = err.stack;
}
```

This is fine for local dev, but if someone deploys with `NODE_ENV=development` (which is the default in the `.env`), full stack traces including file paths and library versions are leaked to the client.

**Fix:** Default to production behavior. Only enable stack traces with an explicit `DEBUG=true` flag.

---

### 8. No Account Lockout After Failed Login Attempts

**Files:** [auth.controller.js](file:///e:/Project/Working/gymflow-pro-main/gymos-backend/src/controllers/auth.controller.js#L77-L124)

While there's rate limiting at the route level (5000 req/15min in dev, 100 in prod), there's **no per-account lockout**. An attacker can try 100 passwords against one account within 15 minutes.

**Fix:** Track failed login attempts per account and lock after 5-10 failures:
```js
// In Owner model: failedLoginAttempts, lockUntil fields
if (owner.lockUntil && owner.lockUntil > Date.now()) {
  return errorResponse(res, 'Account temporarily locked', null, 429);
}
```

---

### 9. Frontend Token Stored in localStorage (XSS Vulnerable)

**File:** [auth.ts](file:///e:/Project/Working/gymflow-pro-main/gymflow-pro-main/src/lib/auth.ts#L29-L31)

```js
export function setTokens(tokens: AuthTokens) {
  localStorage.setItem(TOKENS_KEY, JSON.stringify(tokens));
}
```

If any XSS vulnerability exists (e.g., from unescaped user content), an attacker can steal tokens from `localStorage` with `localStorage.getItem('gymos_tokens')`.

**Fix:** Store tokens in `httpOnly` cookies instead, which JavaScript cannot access. This requires backend changes to set the cookie on login and read it on requests.

---

## 🔵 LOW Findings

### 10. Duplicate Key in Notification Object

**File:** [member.controller.js](file:///e:/Project/Working/gymflow-pro-main/gymos-backend/src/controllers/member.controller.js#L138-L146)

```js
await Notification.create({
  gym: gymId,
  targetRole: 'admin',     // ← first declaration
  type: 'new_member',      // ← first declaration
  title: 'New Member Joined 🎉',
  message: `...`,
  type: 'system',          // ← OVERRIDES 'new_member'
  targetRole: 'admin',     // ← DUPLICATE
});
```

The `type` field is set twice — `'new_member'` is silently overwritten by `'system'`. This is likely a bug causing incorrect notification categorization.

---

## Priority Action Plan

| Priority | Action | Effort |
|----------|--------|--------|
| 🔴 **NOW** | Fix `.gitignore`, remove `.env` from git, **rotate ALL secrets** | 30 min |
| 🔴 **NOW** | Remove hardcoded fallback JWT secrets | 5 min |
| 🔴 **NOW** | Stop sending plaintext passwords in messages/responses | 2 hrs |
| 🟠 **This week** | Fix mass assignment in `updateMember` | 15 min |
| 🟠 **This week** | Escape regex in member search | 5 min |
| 🟡 **Before launch** | Add account lockout | 1 hr |
| 🟡 **Before launch** | Move tokens to httpOnly cookies | 3 hrs |
| 🟡 **Before launch** | Default error handler to production mode | 10 min |

---

> [!IMPORTANT]
> **The #1 priority is rotating all secrets.** Even after fixing `.gitignore`, the old secrets remain in git history forever. You need to:
> 1. Generate new MongoDB password, JWT secrets, Twilio tokens, Cloudinary keys, SMTP app password
> 2. Update them in your deployment environment (Render/Vercel)
> 3. Consider using `git filter-branch` or BFG Repo Cleaner to purge the `.env` from history

Would you like me to fix any of these? I'd recommend starting with the critical items.
