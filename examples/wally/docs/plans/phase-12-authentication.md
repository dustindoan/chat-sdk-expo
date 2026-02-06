# Phase 12: Authentication with Better Auth

**Status:** ✅ COMPLETED

## Overview

Add user authentication using Better Auth with email/password to scope all chat and document data per user.

## Dependencies Installed

```bash
npm install better-auth @better-auth/expo expo-secure-store --legacy-peer-deps
```

---

## Implementation Steps (Completed)

### Step 1: Configuration Setup ✅

**1.1 Update `metro.config.js`** - Enable package exports for Better Auth:
```javascript
config.resolver.unstable_enablePackageExports = true;
```

**1.2 Create `lib/auth/index.ts`** - Better Auth server config:
- Configure Drizzle adapter with `provider: 'pg'`
- Enable `emailAndPassword`
- Add `expo()` plugin
- Set `trustedOrigins` for deep links and localhost

**1.3 Create `lib/auth/client.ts`** - Better Auth client:
- Configure `expoClient` plugin with scheme `ai-chat-app`
- Use `expo-secure-store` for session storage
- Export `signIn`, `signUp`, `signOut`, `useSession`

**1.4 Create `lib/auth/api.ts`** - API route helper:
- `getAuthenticatedUser(request)` - Extract user from session
- `requireAuth(request)` - Return 401 if not authenticated

---

### Step 2: Database Schema Updates ✅

**File: `lib/db/schema.ts`**

Add Better Auth tables:
- `user` - id, name, email, emailVerified, image, type (guest/regular), timestamps
- `session` - id, token, expiresAt, userId, timestamps
- `account` - id, providerId, accountId, userId, tokens
- `verification` - id, identifier, value, expiresAt

Add `userId` column to existing tables:
- `chat.userId` - references user.id, cascade delete
- `document.userId` - references user.id, cascade delete

Run migration: `npm run db:push`

---

### Step 3: Auth API Route ✅

**New file: `app/api/auth/[...all]+api.ts`**

Catch-all route that handles:
- `POST /api/auth/sign-up` - Registration
- `POST /api/auth/sign-in/email` - Login
- `POST /api/auth/sign-out` - Logout
- `GET /api/auth/get-session` - Session check

**New file: `app/api/auth/guest+api.ts`**
- Creates anonymous guest sessions for unauthenticated users

---

### Step 4: Update Database Queries ✅

**File: `lib/db/queries.ts`**

All queries require `userId` parameter:
- `getChats({ userId, limit, cursor })` - Filter by user
- `getChatById(id, userId)` - Verify ownership
- `saveChat({ userId, title, model })` - Associate with user
- `getDocumentsById(id, userId)` - Filter by user
- `saveDocument({ userId, ... })` - Associate with user
- `getUserById(id)` - Get user by ID
- `getMessageCountByUserId({ userId, differenceInHours })` - For rate limiting

---

### Step 5: Protect API Routes ✅

All routes call `requireAuth()` first:

| Route | Changes |
|-------|---------|
| `api/history+api.ts` | Add auth, pass userId to getChats |
| `api/chat+api.ts` | Add auth, pass userId to saveChat/saveMessages, rate limiting |
| `api/chats/index+api.ts` | Add auth, pass userId to saveChat |
| `api/chats/[id]+api.ts` | Add auth, verify ownership |
| `api/chats/[id]/messages+api.ts` | Add auth, verify chat ownership |
| `api/documents/index+api.ts` | Add auth, filter by userId |
| `api/documents/[id]+api.ts` | Add auth, verify ownership |
| `api/messages/[id]+api.ts` | Add auth, verify via chat |

---

### Step 6: Auth Context ✅

**New file: `contexts/AuthContext.tsx`**

- State: `user`, `isLoading`, `isAuthenticated`, `isGuest`
- Methods: `signIn()`, `signUp()`, `signOut()`
- Check session on mount, create guest session if needed

---

### Step 7: Auth Screens ✅

**New files:**
- `app/(auth)/_layout.tsx` - Stack layout for auth screens
- `app/(auth)/login.tsx` - Email/password login form with redirect support
- `app/(auth)/register.tsx` - Registration with email/password (name derived from email)

Match existing dark theme (`#0a0a0a` background, `#fafafa` text).

---

### Step 8: Navigation Guard ✅

**Update `app/_layout.tsx`:**
- Wrap with `AuthProvider`
- `AuthGate` shows loading spinner while checking auth
- Auth screens handle their own redirects (to support redirect-after-login)

**Update `components/ChatHistoryList.tsx`:**
- Add user section at bottom of sidebar
- Show user email or "Guest"
- Login/Logout button with appropriate action
- Pass current pathname as redirect param when navigating to login

---

### Step 9: Client Auth Headers ✅

**Update `components/ChatUI.tsx`:**
- Credentials included in fetch calls via `credentials: 'include'`

**Update `hooks/useChatHistory.ts`:**
- Credentials included in fetch calls

---

### Step 10: Rate Limiting (chat-sdk inspired) ✅

**New file: `lib/ai/entitlements.ts`**
- Define user types: `guest`, `regular`
- Message limits: guest (20/day), regular (100/day)

**Update `app/api/chat+api.ts`:**
- Check message count before processing
- Return 429 with helpful message when limit exceeded

---

### Step 11: Redirect After Login (chat-sdk inspired) ✅

**Update `app/(auth)/login.tsx` and `register.tsx`:**
- Read `redirect` query param with `useLocalSearchParams`
- After successful auth, `router.replace(redirect || '/')`
- Preserve redirect param when switching between login/register

**Update `components/ChatHistoryList.tsx`:**
- Pass current pathname as redirect param: `/login?redirect=${encodeURIComponent(pathname)}`

---

## Files Created

| File | Purpose |
|------|---------|
| `lib/auth/index.ts` | Better Auth server config |
| `lib/auth/client.ts` | Better Auth client config |
| `lib/auth/api.ts` | API auth helpers |
| `lib/ai/entitlements.ts` | User type rate limits |
| `contexts/AuthContext.tsx` | React auth context |
| `app/api/auth/[...all]+api.ts` | Auth catch-all route |
| `app/api/auth/guest+api.ts` | Guest session creation |
| `app/(auth)/_layout.tsx` | Auth screens layout |
| `app/(auth)/login.tsx` | Login screen |
| `app/(auth)/register.tsx` | Register screen |

## Files Modified

| File | Changes |
|------|---------|
| `metro.config.js` | Enable package exports |
| `lib/db/schema.ts` | Add auth tables, userId columns |
| `lib/db/queries.ts` | Add userId to all queries, rate limiting queries |
| `app/_layout.tsx` | Add AuthProvider, AuthGate |
| `components/ChatHistoryList.tsx` | User section, login/logout |
| `components/ChatUI.tsx` | Credentials in fetch |
| `hooks/useChatHistory.ts` | Credentials in fetch |
| All API routes | Add auth check |

---

## Testing Plan (All Passed)

1. ✅ **Signup flow** - Create account, auto-login, redirect to home
2. ✅ **Login flow** - Existing user can login
3. ✅ **Session persistence** - Session survives page refresh (web)
4. ✅ **Logout** - Clears session, becomes guest
5. ✅ **Data isolation** - User A can't see User B's chats
6. ✅ **Protected routes** - 401 for unauthenticated API calls
7. ✅ **New chat** - Created with current user's ID
8. ✅ **Existing chats** - Only current user's chats shown
9. ✅ **Redirect after login** - Preserves destination URL
10. ✅ **Rate limiting** - Returns 429 when limit exceeded

---

## Migration Strategy

**Clean slate approach** (confirmed by user):
1. Update schema with new tables and userId columns
2. Run `npm run db:push` - Drizzle will drop/recreate tables
3. Existing chats/documents/messages will be cleared
4. Fresh start for authenticated users
