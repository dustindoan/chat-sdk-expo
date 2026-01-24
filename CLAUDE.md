# Claude Code Project Notes

## Project Overview
Expo/React Native implementation of Vercel's chat-sdk features, targeting iOS, Android, and Web.

**Repository:** https://github.com/dustindoan/chat-sdk-expo

**Reference projects:**
- `../chat-sdk` - Vercel's original chat-sdk (Next.js) - **PRIMARY REFERENCE**
- `../previous-attempt` - Earlier implementation (different approaches, NOT to be followed)

**Key principle:** Follow chat-sdk patterns, not previous-attempt patterns.

## Progress

### Completed
- **Phase 1:** Component decomposition, toast system, copy/stop actions
- **Phase 2:** Model selector (Claude 4.5 Haiku/Sonnet/Opus)
- **Phase 3:** Conversation persistence (Drizzle + PostgreSQL)
- **Phase 4:** Chat history sidebar (drawer navigation)
- **Phase 5:** Enhanced tool system - Tool registry with custom UI components (WeatherTool, TemperatureTool, DefaultTool)
- **Phase 6:** Artifacts system - createDocument/updateDocument tools, streaming text/code content to slide-in panel, document storage with preview cards
- **Phase 7:** Version history - Index-based version navigation, word-level diff view, restore functionality
- **Phase 8:** File attachments - Image picker, base64 data URLs, attachment preview, tap-to-expand modal, Claude vision
- **Phase 9:** Message editing/regeneration - Edit user messages, regenerate assistant responses, delete trailing messages
- **Phase 10:** Reasoning display - Extended thinking toggle, collapsible thinking section with duration
- **[#21](https://github.com/dustindoan/chat-sdk-expo/issues/21):** Uniwind + React Native Reusables - Migrated from NativeWind v5 to Uniwind (Tailwind v4), added RN Reusables base components
- **Phase 11:** Tool approval flow - Human-in-the-loop tool confirmation, Allow/Deny buttons, automatic continuation after approval
- **Phase 12:** Authentication - Better Auth with email/password, guest users, user-scoped data, rate limiting, redirect-after-login
- **[#1](https://github.com/dustindoan/chat-sdk-expo/issues/1):** Message Voting - Thumbs up/down feedback on assistant messages with database persistence
- **Phase 17:** In-Browser Code Execution - Pyodide for Python, sandboxed iframe for JavaScript, server fallback for mobile
- **Local LLM Integration:** On-device inference with `@react-native-ai/llama`, FunctionGemma 270M model, streaming fix via patch

### Local LLM Integration ✅

**Goal:** Run small language models locally on iOS using `@react-native-ai/llama` and `llama.rn`.

**Status:** Working with patch. Verified on iOS - first token displays correctly.

**What's been done:**
1. Installed `@react-native-ai/llama@0.10.0` and `llama.rn@0.10.0-rc.0`
2. Created `LocalLLMContext` for model state management (download, prepare, inference)
3. Created `LocalChatTransport` implementing AI SDK's `ChatTransport` interface
4. Added FunctionGemma 270M model to model selector
5. Fixed `useClipboard.ts` to use `expo-clipboard` instead of `@react-native-clipboard/clipboard` (native module error)
6. Applied Callstack's streaming fix from PR #178

**The Bug (FIXED):**
- Model outputs "Hi! I hope you are doing well..."
- App was displaying "! I hope you are doing well..." (missing "Hi")
- Root cause: `text-start` and `text-delta` emitted synchronously, AI SDK missed the first delta

**The Fix (from Callstack PR #178):**
Emit `text-start` immediately after `stream-start`, BEFORE the completion callback starts. This creates an async boundary so AI SDK processes `text-start` before any `text-delta` arrives.

```typescript
// Before: state starts as 'none', text-start emitted with first token (too late)
// After: state starts as 'text', text-start emitted before completion callback
let state = 'text'
controller.enqueue({ type: 'stream-start', warnings: [] })
controller.enqueue({ type: 'text-start', id: textId })  // <- Emitted early!
const result = await context.completion(...)  // <- Async boundary here
```

**Libraries & Version Issues:**
- `@react-native-ai/llama@0.10.0` implements `LanguageModelV2` (not V3)
- It depends on `@ai-sdk/provider@^2.0.0` but we have `@3.0.4` from AI SDK v6
- Callstack has a fix branch (`feat/upgrade-to-latest-provider`) that upgrades to V3
- Our patch matches their fix - remove when they release

**⚠️ MONITOR:** Watch for `@react-native-ai/llama` release with PR #178 merged
- Issue: https://github.com/callstackincubator/ai/issues/171
- Fix PR: https://github.com/callstackincubator/ai/pull/178
- When released: `npm update @react-native-ai/llama` and delete the patch

**Key Files:**
- `contexts/LocalLLMContext.tsx` - Model state management
- `lib/local-llm/LocalChatTransport.ts` - AI SDK transport for local inference
- `lib/local-llm/directTest.ts` - Direct testing bypassing all layers
- `lib/local-llm/index.ts` - Barrel exports
- `lib/ai/models.ts` - Added `isLocal` flag and FunctionGemma model
- `components/ChatUI.tsx` - Switches transport based on model selection
- `patches/@react-native-ai+llama+0.10.0.patch` - Callstack's streaming fix

**To Test the Patch:**
1. `npx expo run:ios` (requires dev build, not Expo Go)
2. Select "FunctionGemma 270M (Local)" from model selector
3. First use will download model (~270MB)
4. Send a message and observe the response

**To Test Directly (Bypass Abstraction):**
```typescript
import { testDirectInference, testTokenCallback } from '../lib/local-llm';

// In a component or useEffect:
await testDirectInference("Say hello"); // Full test with logging
await testTokenCallback();               // Simple token test
```
This tests at three levels:
1. `context.completion()` - Native callback directly
2. `model.doGenerate()` - AI SDK non-streaming
3. `model.doStream()` - AI SDK streaming

### Next Up

**Roadmap:** [GitHub Project](https://github.com/users/dustindoan/projects/1)

To pull the prioritized backlog (sorted by Start Date):
```bash
gh project item-list 1 --owner dustindoan --format json | \
  jq -r '.items | sort_by(.["start Date"] // "9999") | .[] | select(.status == "Todo") | "\(.["start Date"]) | \(.title)"'
```

See [GitHub Issues](https://github.com/dustindoan/chat-sdk-expo/issues) for full issue details.

---

## Phase Implementation Details

### Phase 12: Authentication

**Features implemented:**
- Better Auth with email/password authentication
- Guest user support (auto-created anonymous sessions)
- User-scoped data (chats, documents isolated per user)
- Protected API routes with `requireAuth()` middleware
- Login/Register screens matching dark theme
- Sidebar user section (email display, login/logout buttons)
- Redirect-after-login (preserves destination URL through auth flow)
- Rate limiting by user type (guest: 20/day, regular: 100/day)

**Testing flow:**
1. Visit app as guest → Can chat with 20 messages/day limit
2. Click "Login" in sidebar → Redirected to login page
3. Register new account or sign in
4. After auth → Redirected back to original page
5. User's chats are isolated from other users
6. Logout → Becomes guest again

**Key implementation details:**
- Better Auth server config with Drizzle adapter (`lib/auth/index.ts`)
- Better Auth client with expo plugin (`lib/auth/client.ts`)
- API auth helper `requireAuth()` returns user or 401 (`lib/auth/api.ts`)
- Auth context provides `user`, `isAuthenticated`, `isGuest`, `signIn`, `signUp`, `signOut`
- Entitlements system defines rate limits per user type (`lib/ai/entitlements.ts`)
- Login/Register screens read `redirect` query param for post-auth navigation

**Key files:**
- `lib/auth/index.ts` - Better Auth server configuration
- `lib/auth/client.ts` - Better Auth client with expo plugin
- `lib/auth/api.ts` - `requireAuth()` middleware
- `lib/ai/entitlements.ts` - User type rate limits
- `lib/db/schema.ts` - User, Session, Account, Verification tables + userId columns
- `lib/db/queries.ts` - `getUserById()`, `getMessageCountByUserId()` for rate limiting
- `contexts/AuthContext.tsx` - React auth context
- `app/(auth)/login.tsx` - Login screen with redirect support
- `app/(auth)/register.tsx` - Register screen with redirect support
- `app/api/auth/[...all]+api.ts` - Auth API catch-all route
- `components/ChatHistoryList.tsx` - User section in sidebar

**Database schema additions:**
```
user: id, name, email, emailVerified, image, type, createdAt, updatedAt
session: id, token, expiresAt, ipAddress, userAgent, userId
account: id, providerId, accountId, userId, tokens...
verification: id, identifier, value, expiresAt, createdAt, updatedAt
chat.userId, document.userId - Foreign keys to user table
```

---

### SWR Integration for Data Fetching

**Features implemented:**
- SWR for chat history with `useSWRInfinite` (paginated data)
- Authenticated fetcher (`authFetcher`) for web cookies and native SecureStore tokens
- Optimistic updates for mutations (delete chat, etc.)
- React Native-specific revalidation via `@nandorojo/swr-react-native`

**Why `authFetch` is needed:**
Better Auth doesn't provide a built-in fetch wrapper for custom API endpoints. Their docs state: "To make authenticated requests to your server, you have to retrieve the session cookie from SecureStore and manually add it to your request headers." So `authFetch` is the expected pattern.

**Why `swr-react-native`:**
Standard SWR's `revalidateOnFocus` and `revalidateOnReconnect` don't work in React Native. The `@nandorojo/swr-react-native` library provides:
- React Navigation screen focus revalidation
- AppState (foreground/background) revalidation
- NetInfo (network reconnect) revalidation

**Pattern (matches chat-sdk):**
1. SWR for reads (`useSWR`, `useSWRInfinite`)
2. Direct `fetch()` for mutations (POST/PATCH/DELETE)
3. SWR `mutate()` for cache updates after mutations

**Key files:**
- `lib/swr/index.ts` - `authFetcher`, `APIError` class
- `hooks/useChatHistory.ts` - SWR-based chat history with `useSWRNativeRevalidate`
- `app/_layout.tsx` - SWRConfig provider

**Mutation pattern:**
```typescript
// 1. Optimistic update
mutate(
  (currentPages) => currentPages.map(page => ({
    ...page,
    chats: page.chats.filter(c => c.id !== chatId),
  })),
  { revalidate: false }
);

// 2. Actual mutation
const response = await authFetch(`/api/chats/${chatId}`, { method: 'DELETE' });

// 3. Revert on error
if (!response.ok) {
  await mutate(); // Re-fetch actual data
}
```

---

### Issue #1: Message Voting

**Features implemented:**
- Thumbs up/down voting on assistant messages
- Vote persistence in PostgreSQL database
- Optimistic UI updates for instant feedback
- Visual state indication (green for upvote, red for downvote)
- Votes loaded when opening existing chats

**Testing flow:**
1. Send a message to get an assistant response
2. Click thumbs up → Icon turns green, vote saved
3. Click thumbs down → Icon turns red, vote changes
4. Reload page → Vote state persists
5. Open existing chat → Previous votes displayed

**Key implementation details:**
- Vote table with composite primary key (chatId, messageId)
- `voteMessage` query uses upsert pattern (insert or update on conflict)
- API endpoint validates chat ownership before recording votes
- Client-side optimistic updates with rollback on error

**Key files:**
- `lib/db/schema.ts` - Vote table definition
- `lib/db/queries.ts` - `getVotesByChatId()`, `voteMessage()` queries
- `app/api/vote+api.ts` - GET (fetch votes) and PATCH (record vote) endpoints
- `components/chat/MessageActions.tsx` - Vote button UI with state colors
- `components/chat/types.ts` - VoteState, VoteMap type definitions
- `components/ChatUI.tsx` - Vote state management and API calls

**Database schema:**
```
Vote: chatId (uuid, FK to Chat), messageId (uuid, FK to Message), isUpvoted (boolean)
Primary key: (chatId, messageId)
```

**API endpoints:**
- `GET /api/vote?chatId=X` - Returns array of votes for a chat
- `PATCH /api/vote` - Body: `{ chatId, messageId, type: 'up' | 'down' }`

---

### Phase 17: In-Browser Code Execution

**Features implemented:**
- `executeCode` tool for Python and JavaScript code execution
- Pyodide integration for Python execution (web only)
- Sandboxed iframe execution for JavaScript (web only)
- Server-side execution fallback for mobile platforms
- Tool approval required before execution (security)
- CodeExecutionTool UI component with code preview, status, and output display

**Testing prompts:**
1. Ask "Can you calculate the first 10 Fibonacci numbers using Python?"
2. Tool approval card appears showing the code
3. Click "Allow" → Code executes, output shows the result
4. Try JavaScript: "Write JavaScript to sort an array [3,1,4,1,5,9,2,6]"

**Platform support:**
- **Web:** Full support - Python via Pyodide CDN, JavaScript in sandboxed iframe
- **Mobile:** JavaScript via server-side VM, Python not supported (requires Pyodide)

**Key implementation details:**
- Web JavaScript uses sandboxed iframe with postMessage for output capture
- Web Python uses Pyodide loaded from CDN (lazy loaded on first use)
- Console output (print/console.log) is captured and displayed
- Execution timeout of 10 seconds prevents infinite loops
- Tool requires approval before execution for security

**Key files:**
- `lib/code-execution/index.ts` - Platform-aware execution service
- `lib/ai/tools/executeCode.ts` - AI SDK tool definition
- `app/api/execute-code+api.ts` - Server-side execution endpoint
- `components/chat/tools/CodeExecutionTool.tsx` - Execution UI component

**Security considerations:**
- All execution is sandboxed (iframe sandbox, Node.js vm module)
- No filesystem or network access from executed code
- Execution timeout prevents resource exhaustion
- Tool approval required (user must explicitly allow execution)
- Server-side Python disabled (requires proper containerization for production)

---

### Phase 11: Tool Approval Flow

**Features implemented:**
- `needsApproval: true` property on tools requiring user confirmation
- Tool states: `approval-requested`, `approval-responded`, `output-denied`
- ToolApprovalCard component with Allow/Deny buttons
- ToolApprovedCard and ToolDeniedCard for feedback states
- `addToolApprovalResponse` from useChat for approval handling
- `sendAutomaticallyWhen` to auto-continue after approval
- API support for tool approval continuation (sends full message history)

**Testing prompts:**
1. Ask "What's the weather in San Francisco?"
2. Tool approval card appears with parameters
3. Click "Allow" → Weather tool executes, shows result
4. Or click "Deny" → Shows denied message, AI responds accordingly

**Key implementation details:**
- AI SDK v6 uses `needsApproval` on tool definitions
- Tool part includes `approval: { id, approved?, reason? }` object
- Transport detects approval flows via `approval-responded` or `output-denied` states
- For approval flows, sends entire `messages` array (not just new message)
- `sendAutomaticallyWhen` checks for `approval-responded` with `approved: true`

**Key files:**
- `lib/ai/tools/weather.ts` - Weather tool with `needsApproval: true`
- `components/chat/tools/types.ts` - ToolState with approval states, ToolApproval type
- `components/chat/tools/ToolApprovalCard.tsx` - Approval UI components
- `components/chat/ToolInvocation.tsx` - Routes approval states to appropriate UI
- `components/chat/types.ts` - ToolApprovalResponseFn, updated ToolPart
- `components/ChatUI.tsx` - Transport with approval detection, `sendAutomaticallyWhen`
- `app/api/chat+api.ts` - Detects tool approval flow, uses full messages array

**Component flow:**
```
ChatUI
├── useChat with addToolApprovalResponse, sendAutomaticallyWhen
├── Transport: detects isToolApprovalContinuation
│   ├── Normal: sends { message }
│   └── Approval: sends { messages } (full history)
└── MessageList
    └── MessageBubble
        └── ToolInvocation
            ├── approval-requested → ToolApprovalCard (Allow/Deny)
            ├── approval-responded → ToolApprovedCard (or tool result)
            └── output-denied → ToolDeniedCard
```

---

### Phase 10: Reasoning Display

**Features implemented:**
- `supportsReasoning` flag on Claude models (Haiku, Sonnet, Opus all support it)
- ReasoningToggle component (icon-only button next to attachment)
- ReasoningSection component (collapsible thinking display with duration tracking, auto-close)
- Extended thinking via `providerOptions.anthropic.thinking`
- AI SDK reasoning parts rendered in MessageBubble

**Uniwind + React Native Reusables Setup:**
- Migrated from NativeWind v5 to Uniwind (faster, Tailwind v4 native)
- Added React Native Reusables base components (Text, Button, Card, Input)
- CSS-first theming with `@theme` directive in `global.css`
- No `tailwind.config.js` needed for runtime (stub file for CLI only)
- Path aliases via `@/` in tsconfig.json

**Key files:**
- `lib/ai/models.ts` - `supportsReasoning` flag, `modelSupportsReasoning()` helper
- `components/chat/ReasoningToggle.tsx` - Icon-only toggle button
- `components/chat/ReasoningSection.tsx` - Collapsible thinking display
- `components/chat/MessageInput.tsx` - Reasoning toggle integration
- `app/api/chat+api.ts` - Extended thinking configuration

---

### Phase 9: Message Editing/Regeneration

**Pattern from chat-sdk reference:**
1. User clicks edit on message → MessageEditor appears
2. On save: call API to delete trailing messages from DB
3. Update client state with `setMessages()`
4. Call `reload()` to regenerate response

**Testing prompts:**
1. Send a message: "Hello, my name is Alice"
2. Click edit (pencil) icon on user message
3. Change to "Hello, my name is Bob"
4. Click Send → Previous response deleted, new response generated
5. Click regenerate (refresh) icon on assistant message → Same message regenerated

**Key implementation details:**
- Database query: `getMessageById()`, `deleteMessagesByChatIdAfterTimestamp()` (uses `gte` to delete target message + all after)
- API endpoint: `DELETE /api/messages/:id` - deletes message and all trailing messages
- useChat hook: `setMessages()` for client state, `reload()` for regeneration
- MessageEditor: Inline textarea with Cancel/Send buttons
- MessageActions: Edit button for user messages, Regenerate button for assistant messages

**Key files:**
- `lib/db/queries.ts` - `getMessageById()` query
- `app/api/messages/[id]+api.ts` - DELETE endpoint
- `components/chat/MessageEditor.tsx` - Edit UI component
- `components/chat/MessageActions.tsx` - Edit/Regenerate buttons
- `components/chat/MessageBubble.tsx` - Edit mode state management
- `components/ChatUI.tsx` - `handleEdit()`, `handleRegenerate()` handlers

---

### Phase 8: File Attachments

**Architecture Decision:** Data URLs (base64) instead of cloud blob storage
- Simpler implementation, no external dependencies
- Works offline, instant preview
- Anthropic API accepts Data URLs directly
- Easy migration to cloud storage later (just change upload function)

**Testing prompts:**
1. Click paperclip icon → select image
2. Image appears as thumbnail in input area
3. Click X to remove, or send with message
4. Image appears in user bubble
5. Tap image → fullscreen modal
6. Claude analyzes the image content

**Key files:**
- `hooks/useAttachments.ts` - Attachment state management, image picker integration
- `lib/files/index.ts` - fileToBase64, validation utilities
- `components/chat/AttachmentPreview.tsx` - Input area thumbnails
- `components/chat/ImagePreview.tsx` - Message bubble images with modal
- `components/chat/types.ts` - FilePart, Attachment interfaces

**Message format with attachments:**
```typescript
{
  role: 'user',
  parts: [
    { type: 'file', mediaType: 'image/png', filename: 'photo.png', url: 'data:image/png;base64,...' },
    { type: 'text', text: 'What is in this image?' }
  ]
}
```

---

### Phase 7: Version History

**Testing prompts:**
1. Create: "Write a haiku about mountains"
2. Update: "Make the haiku about the ocean instead"
3. Open panel → "Version 2 of 2"
4. Navigate prev → Version 1 shows, footer appears
5. Toggle diff → Word-level red/green diff
6. Restore → Deletes newer versions

**Key implementation details:**
- Database queries: `getDocumentsById()`, `deleteDocumentsByIdAfterTimestamp()`
- API endpoint: `GET/DELETE /api/documents?id=X`
- Word diff: `diff` npm package with `diffWords()`
- Context extended with: `versionState`, `fetchVersions`, `handleVersionChange`, `restoreVersion`

**Key files:** `lib/db/queries.ts`, `app/api/documents/index+api.ts`, `contexts/ArtifactContext.tsx`, `components/artifacts/DiffView.tsx`, `components/artifacts/VersionNavigation.tsx`, `components/artifacts/VersionFooter.tsx`

---

### Phase 6: Artifacts System

**Testing prompt:** "Can you generate two files for me (a jsx and a css), in an effort to create a complete React component for a todo list app."

**Issues fixed:**
1. **Content mixing** - Code handler uses `streamObject`, ArtifactContext replaces (not appends) content, compound data format `{ value, docId }` routes to correct doc
2. **Inline card flickering** - `getStreamingDocument(idOrTitle)` provides per-document state
3. **Panel flickering** - Panel opens only after streaming ends via `openFirstDocument()`
4. **Error handling** - try/catch in handlers prevents stream crashes

**Key files:** `lib/artifacts/handlers/code.ts`, `contexts/ArtifactContext.tsx`, `components/chat/tools/DocumentTool.tsx`, `components/ChatUI.tsx`

### updateDocument Tool Fix

**Problem:** AI couldn't use updateDocument - didn't see previous tool results.

**Root cause:** API wasn't loading message history from database.

**Fixed:**
1. Load full history from DB using `getMessagesByChatId()`
2. Use AI SDK's `convertToModelMessages()` for proper tool call/result formatting

**Key file:** `app/api/chat+api.ts`

---

### Post-Phase 7 Bug Fixes

**1. Completed cards showing streaming content (commit 3c7259a)**

**Problem:** When updateDocument ran, the original createDocument card would show the streaming preview instead of staying as a compact completed card.

**Root cause:** Both cards share the same document ID, so both found the streaming doc.

**Fix in `DocumentTool.tsx`:**
- Added type guards `isCreateDocumentArgs()` and `isUpdateDocumentArgs()` to distinguish tool types
- createDocument looks up streaming doc by title, updateDocument by ID
- Key change: `if (!hasResult && (isStreamingThisDocument || isToolLoading))` - completed cards never show streaming preview

**2. Panel not refreshing when document updated (commit 54d791e)**

**Problem:** When updateDocument completed while the panel was open, the panel didn't refresh its version count or content.

**Fix in `ArtifactContext.tsx`:**
- In `data-finish` handler, check if panel is showing the updated document
- If so, call `fetchVersions(targetId)` to refresh version list
- Update content immediately in artifact state

---

## Architecture

```
app/
├── _layout.tsx             # Root layout with AuthProvider, AuthGate
├── (auth)/
│   ├── _layout.tsx         # Auth screens stack layout
│   ├── login.tsx           # Login screen with redirect support
│   └── register.tsx        # Register screen with redirect support
├── (drawer)/
│   ├── _layout.tsx         # Drawer layout with ChatHistoryList
│   ├── index.tsx           # New chat screen
│   └── chat/
│       └── [id].tsx        # Load existing chat by ID
└── api/
    ├── auth/
    │   └── [...all]+api.ts # Better Auth catch-all route
    ├── chat+api.ts         # Chat streaming with persistence + rate limiting
    ├── history+api.ts      # Chat list pagination (user-scoped)
    ├── messages/
    │   └── [id]+api.ts     # Delete trailing messages (for edit/regenerate)
    ├── documents/
    │   ├── index+api.ts    # Document CRUD (user-scoped)
    │   └── [id]+api.ts     # Document by ID
    └── chats/
        ├── index+api.ts    # Create new chat (user-scoped)
        ├── [id]+api.ts     # Get/update/delete chat
        └── [id]/
            └── messages+api.ts  # Save messages

components/
├── ChatUI.tsx              # Main chat orchestrator
├── ChatHistoryList.tsx     # Sidebar with grouped chat list
├── theme.ts                # Design tokens
├── chat/                   # Chat components
│   ├── MessageList.tsx
│   ├── MessageBubble.tsx     # Supports view/edit modes
│   ├── MessageEditor.tsx     # Inline message editing
│   ├── MessageInput.tsx      # Tailwind classes, responsive max-width
│   ├── MessageActions.tsx    # Copy, edit, regenerate, vote buttons
│   ├── SimpleMarkdown.tsx    # Custom streaming-optimized renderer
│   ├── ModelSelector.tsx
│   ├── ToolInvocation.tsx    # Routes to tool-specific components
│   ├── WelcomeMessage.tsx
│   ├── AttachmentPreview.tsx # Pending attachment thumbnail
│   ├── ImagePreview.tsx      # Image display with tap-to-expand
│   ├── ReasoningToggle.tsx   # Extended thinking toggle button
│   ├── ReasoningSection.tsx  # Collapsible thinking display
│   └── tools/                # Tool-specific UI components
│       ├── index.ts        # Tool registry
│       ├── types.ts        # ToolUIProps, ToolState, ToolApproval types
│       ├── WeatherTool.tsx # Weather card with SVG icons, day/night theming
│       ├── TemperatureTool.tsx  # F° to C° conversion display
│       ├── DocumentTool.tsx    # Artifact preview card
│       ├── CodeExecutionTool.tsx # Code execution UI with output display
│       ├── ToolApprovalCard.tsx # Tool approval UI (Allow/Deny)
│       └── DefaultTool.tsx # Fallback for unknown tools
├── artifacts/              # Artifact system components
│   ├── index.ts            # Barrel exports
│   ├── ArtifactPanel.tsx   # Slide-in panel container
│   ├── ArtifactHeader.tsx  # Title, kind badge, actions, version nav
│   ├── TextContent.tsx     # Markdown content renderer
│   ├── CodeContent.tsx     # Syntax-highlighted code
│   ├── DocumentPreview.tsx # Inline message preview
│   ├── DiffView.tsx        # Word-level diff visualization
│   ├── VersionNavigation.tsx  # Version nav buttons
│   └── VersionFooter.tsx   # Restore/latest actions footer
└── toast/                  # Toast notification system

hooks/
├── useClipboard.ts
├── useChatHistory.ts       # Paginated chat list with date grouping
└── useAttachments.ts       # File attachment state management

lib/
├── ai/
│   ├── models.ts           # Claude model definitions with supportsReasoning
│   ├── entitlements.ts     # User type rate limits (guest/regular)
│   └── tools/              # AI SDK tool definitions
│       ├── index.ts        # Barrel exports
│       ├── weather.ts      # Weather tool (Open-Meteo API)
│       ├── temperature.ts  # Temperature conversion tool
│       ├── createDocument.ts   # Artifact creation tool
│       ├── updateDocument.ts   # Artifact update tool
│       └── executeCode.ts  # Code execution tool (Python/JavaScript)
├── code-execution/
│   └── index.ts            # Platform-aware code execution service (Pyodide, iframe sandbox)
├── auth/
│   ├── index.ts            # Better Auth server configuration
│   ├── client.ts           # Better Auth client with expo plugin
│   └── api.ts              # requireAuth() middleware
├── artifacts/              # Artifact system
│   ├── index.ts            # Barrel exports
│   ├── types.ts            # UIArtifact, ArtifactDefinition types
│   ├── registry.ts         # Artifact definitions registry
│   └── handlers/           # Document generation handlers
│       ├── index.ts
│       ├── text.ts         # Text document handler
│       └── code.ts         # Code document handler
├── files/
│   └── index.ts            # File utilities (fileToBase64, validation)
└── db/
    ├── schema.ts           # Drizzle schema (User, Session, Chat, Message, Document)
    ├── client.ts           # PostgreSQL connection
    ├── queries.ts          # CRUD operations + rate limiting queries
    └── index.ts            # Barrel exports

contexts/
├── AuthContext.tsx         # Auth state (user, signIn, signUp, signOut)
├── ChatHistoryContext.tsx  # Cross-component chat state
└── ArtifactContext.tsx     # Global artifact state (like useArtifact)
```

## chat-sdk Patterns to Follow

When implementing tools and artifacts, align with these chat-sdk patterns:

### Artifact System
- **Artifact class** - Encapsulates kind, content component, actions, toolbar, onStreamPart handler
- **Document handlers** - Server-side content generation with `createDocumentHandler<T>()`
- **Streaming deltas** - Use `dataStream.write()` with transient data parts (`data-textDelta`, `data-codeDelta`)
- **State management** - SWR in chat-sdk, React Context for us (expo-compatible)

### Key Files in chat-sdk
- `components/create-artifact.tsx` - Artifact class definition
- `lib/artifacts/server.ts` - Document handler factory
- `artifacts/text/server.ts` - Text document handler
- `artifacts/text/client.tsx` - Text artifact UI definition
- `hooks/use-artifact.ts` - Global artifact state
- `lib/ai/tools/create-document.ts` - createDocument tool

### Streaming Protocol
```typescript
// Metadata
dataStream.write({ type: 'data-id', data: id, transient: true });
dataStream.write({ type: 'data-title', data: title, transient: true });
dataStream.write({ type: 'data-kind', data: kind, transient: true });

// Content deltas
dataStream.write({ type: 'data-textDelta', data: text, transient: true });
dataStream.write({ type: 'data-codeDelta', data: code, transient: true });

// Control
dataStream.write({ type: 'data-clear', data: null, transient: true });
dataStream.write({ type: 'data-finish', data: null, transient: true });
```

## Database

Uses **Drizzle ORM** with **PostgreSQL** (Docker) for persistence.

### Schema
- `User`: id, name, email, emailVerified, image, type (guest/regular), timestamps
- `Session`: id, token, expiresAt, ipAddress, userAgent, userId
- `Account`: id, providerId, accountId, userId, tokens...
- `Verification`: id, identifier, value, expiresAt, timestamps
- `Chat`: id, title, model, userId, createdAt, updatedAt
- `Message`: id, chatId, role, parts (JSON), createdAt
- `Document`: id, title, kind, content, userId, createdAt (versions share same id, different timestamps)

### Commands
```bash
npm run db:generate     # Generate migrations
npm run db:push         # Push schema to database
npm run db:studio       # Open Drizzle Studio
```

## Key Decisions
- **Drizzle + PostgreSQL** instead of expo-sqlite for future cloud sync compatibility
- **Server-side persistence** - messages saved in API routes, not client
- **expo-router drawer** - Uses `expo-router/drawer` for native navigation
- **Custom markdown renderer** (`SimpleMarkdown.tsx`) for better streaming performance
- **Memoized components** to prevent re-render lag
- **@gorhom/bottom-sheet** for native-feeling model selector
- **react-native-svg** for cross-platform SVG icons in tool components
- **Tool registry pattern** - Maps tool names to custom UI components
- **AI SDK v6 tool states** - Uses `'output-available'` (not `'result'`) for completed tools
- **React 19.1.0** pinned for Expo compatibility (use `--legacy-peer-deps` for installs)
- **Artifact streaming** - Uses `onData` callback in useChat to process custom data parts (`data-textDelta`, etc.)
- **ArtifactContext** - React Context instead of SWR for global artifact state (Expo-compatible)
- **Uniwind** - Faster Tailwind v4 bindings for React Native (replaced NativeWind v5)
- **React Native Reusables** - shadcn/ui-style components with CVA variants
- **Extended thinking** - Uses `providerOptions.anthropic.thinking` with toggle control

## Development

### Prerequisites
```bash
# Start PostgreSQL
docker-compose up -d

# Push schema (first time or after changes)
npm run db:push
```

### Running
```bash
npx expo start          # Start dev server
npx expo start --web    # Web only
npx expo run:ios        # Build and run on iOS simulator
```

### Environment
Create `.env` (gitignored):
```
ANTHROPIC_API_KEY=sk-ant-...
DATABASE_URL=postgres://postgres:postgres@localhost:5432/chat
```

## Dependencies

### AI SDK
- `ai@6.0.39`
- `@ai-sdk/anthropic@3.0.15`
- `@ai-sdk/react@3.0.41`

### Styling (Uniwind + Tailwind v4)
- `uniwind` - Tailwind v4 bindings for React Native
- `tailwindcss@^4.1.0`
- `class-variance-authority` - CVA for component variants
- `clsx`, `tailwind-merge` - Utility for className composition
- `@rn-primitives/slot`, `@rn-primitives/portal` - Radix-style primitives

### React Native Reusables Components
- `components/ui/text.tsx` - Text with variant support (h1-h4, p, code, muted, etc.)
- `components/ui/button.tsx` - Button with variants (default, destructive, outline, ghost, link)
- `components/ui/card.tsx` - Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter
- `components/ui/input.tsx` - TextInput with styling

### Configuration Files
- `global.css` - Uniwind imports + CSS theme variables
- `metro.config.js` - `withUniwindConfig(config, { cssEntryFile })`
- `components.json` - shadcn CLI configuration for RN Reusables
- `tsconfig.json` - Path alias `@/*` for imports
- `.npmrc` - `legacy-peer-deps=true` for React 19 compatibility

### Adding New Components
```bash
npx @react-native-reusables/cli@latest add <component-name>
```
Available components: text, button, card, input, dialog, select, tabs, accordion, etc.
