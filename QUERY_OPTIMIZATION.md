# Query Optimization Migration Guide

## Summary of Changes

Fixed **N+1 query problem** where each API endpoint independently fetches session/user/member data, causing 5-6x duplicate queries per request.

### Files Changed
- ✅ `lib/get-session-cached.ts` - New centralized memoized session fetcher
- ✅ `components/dashboard/common/planned-activities-calendar.tsx` - Fixed React prop warning
- ✅ `app/api/penalties/[id]/route.ts` - Example migration (TEMPLATE)

### Expected Performance Improvement
- **Before**: GET `/president/members` = 52s (46s wasted on queries)
- **After**: Expected ~5-10s reduction (10-50% faster)

---

## How to Apply This Fix to Other Endpoints

Every API route currently has its own `getSessionUser()` or `getSessionInfo()` function that fetches:
1. Session from DB (can be called 5-6x!)
2. User from DB
3. Member role from DB

### Step 1: Remove Old Function
Delete the `getSessionInfo()` or `getSessionUser()` function from your route file:

```typescript
// ❌ DELETE THIS
async function getSessionInfo() {
  const headersList = await headers()
  const session = await auth.api.getSession({ headers: headersList })
  // ... rest of function
}
```

### Step 2: Add Import
```typescript
// ✅ ADD THIS at top
import { getSessionUserCached } from "@/lib/get-session-cached"
```

### Step 3: Replace Function Calls
Replace all calls to the old function:

```typescript
// ❌ BEFORE
const { user, role, activeOrganizationId } = await getSessionInfo()

// ✅ AFTER
const { user, role, activeOrganizationId } = await getSessionUserCached()
```

### Step 4: Remove Unused Imports
If you no longer use `headers()`, `auth`, `member`, `extractRoleValue`, remove their imports:

```typescript
// ❌ REMOVE
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { member } from "@/db/schemas"
import { extractRoleValue } from "@/utils/role-utils"
```

---

## Files to Migrate

Search for all `getSessionUser` or `getSessionInfo` functions:

```bash
# Find all files with these functions
grep -r "async function getSession" app/api/**/*.ts

# Approximate count: ~25-30 route files need updating
```

### Priority (High Impact)
1. `app/api/attendance/route.ts` - High traffic endpoint
2. `app/api/attendance/[id]/route.ts`
3. `app/api/action-items/route.ts`
4. `app/api/contributions/route.ts`
5. `app/api/loans/route.ts`
6. `app/api/meetings/route.ts`

### Pattern Example (Attendance)

**Before:**
```typescript
// app/api/attendance/route.ts - 60+ lines of duplicated getSessionUser()
async function getSessionUser() {
  const headersList = await headers()
  const session = await auth.api.getSession({ headers: headersList })
  const sessionUser = session?.user || null
  // ... 20+ lines of member lookup logic
  return { user: sessionUser, role, activeOrganizationId }
}
```

**After:**
```typescript
// Just 1 import and use!
import { getSessionUserCached } from "@/lib/get-session-cached"

// In handler:
const { user, role, activeOrganizationId } = await getSessionUserCached()
```

---

## Testing

After applying changes:

1. **Verify no duplicate queries** in server logs
2. **Check performance**:
   ```bash
   # Test endpoint response time
   time curl http://localhost:3000/api/penalties/[id]
   ```

3. **Run authentication tests** to ensure role resolution still works

---

## How It Works

The new implementation uses React's `cache()` function:

```typescript
export const getSessionUserCached = cache(async () => {
  // This function body runs ONCE per request
  // Subsequent calls in the same request return cached result
  return { user, role, activeOrganizationId }
})
```

When multiple handlers or nested function calls invoke `getSessionUserCached()` in the same request:
- 1st call: Executes query, returns result, caches it
- 2nd call: Returns cached result (NO database query)
- 3rd+ calls: Returns cached result (NO database query)

**Result**: From 5-6 identical queries down to 1 query per request!

---

## Monitoring

After migration, watch for improvements:

- Session query count should drop 80%
- User query count should drop 60-70%
- Member role query count should drop 90%+
- Overall API response times should improve 10-50%

Check server logs for:
```
Query: select ... from "session" where ...
```

Should see these queries drop significantly.
