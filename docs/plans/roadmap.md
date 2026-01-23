# Feature Parity Roadmap

**Goal:** Achieve feature parity with Vercel's chat-sdk (Next.js reference implementation)

**Last Updated:** January 2026

---

## Current Status

| Metric | Value |
|--------|-------|
| Completed Phases | 1-12 |
| Feature Parity | ~45% |
| Reference | [github.com/vercel/ai-chatbot](https://github.com/vercel/ai-chatbot) |

---

## Completed Phases (1-12)

| Phase | Feature | Status |
|-------|---------|--------|
| 1 | Component decomposition, toast, copy/stop | ✅ |
| 2 | Model selector (Claude variants) | ✅ |
| 3 | Conversation persistence (Drizzle + PostgreSQL) | ✅ |
| 4 | Chat history sidebar (drawer navigation) | ✅ |
| 5 | Tool system with custom UI components | ✅ |
| 6 | Artifacts (text/code) with streaming | ✅ |
| 7 | Version history with diff view | ✅ |
| 8 | File attachments with vision | ✅ |
| 9 | Message editing & regeneration | ✅ |
| 10 | Extended thinking display | ✅ |
| 11 | Tool approval flow (human-in-the-loop) | ✅ |
| 12 | Authentication (Better Auth) | ✅ |

---

## Planned Phases (13-27)

### Phase 13: Suggested Actions
**Complexity:** Low | **Value:** High | **Dependencies:** None

Clickable prompt suggestions shown on empty chat state for better onboarding UX.

**Reference:** `/home/user/chat-sdk/components/suggested-actions.tsx`

**Implementation:**
- Create `SuggestedActions.tsx` component
- Grid of 4 clickable suggestion cards
- Suggestions: weather, haiku, code help, document creation
- Animated entrance (React Native Animated API)
- On click: call `sendMessage()` with suggestion text

**Files to create:**
- `components/chat/SuggestedActions.tsx`

**Files to modify:**
- `components/ChatUI.tsx` - Show when messages empty

---

### Phase 14: Message Voting
**Complexity:** Medium | **Value:** High | **Dependencies:** Phase 12 (auth)

Thumbs up/down feedback on assistant messages with database persistence.

**Reference:** `/home/user/chat-sdk/lib/db/queries.ts` (voteMessage, getVotesByChatId)

**Implementation:**
- Database: Vote table (chatId, messageId, isUpvoted, userId)
- API: GET/PATCH `/api/vote`
- Wire up existing vote buttons in `MessageActions.tsx`
- Optimistic UI updates

**Files to create:**
- `app/api/vote+api.ts`

**Files to modify:**
- `lib/db/schema.ts` - Add Vote table
- `lib/db/queries.ts` - Add vote queries
- `components/chat/MessageActions.tsx` - Wire up handlers

---

### Phase 15: Spreadsheet Artifacts
**Complexity:** Medium | **Value:** High | **Dependencies:** Phase 6 (artifacts)

CSV-based spreadsheet documents with data grid UI.

**Reference:** `/home/user/chat-sdk/artifacts/sheet/`

**Implementation:**
- New artifact kind: `sheet`
- Stream handler: `data-sheetDelta`
- CSV parsing with `papaparse`
- Data grid component (evaluate RN options: react-native-table-component or custom)
- Actions: Copy as CSV, Format & Clean

**Files to create:**
- `lib/artifacts/handlers/sheet.ts`
- `components/artifacts/SheetContent.tsx`

**Files to modify:**
- `lib/artifacts/registry.ts` - Register sheet type
- `lib/ai/tools/createDocument.ts` - Add sheet kind

---

### Phase 16: Image Artifacts
**Complexity:** Medium | **Value:** Medium | **Dependencies:** Phase 6 (artifacts)

AI-generated image display with streaming support.

**Reference:** `/home/user/chat-sdk/artifacts/image/`

**Implementation:**
- New artifact kind: `image`
- Stream handler: `data-imageDelta` (base64)
- Image display component with loading state
- Actions: Copy to clipboard, Download
- Note: Requires image generation API (DALL-E, etc.)

**Files to create:**
- `lib/artifacts/handlers/image.ts`
- `components/artifacts/ImageContent.tsx`

---

### Phase 17: In-Browser Code Execution
**Complexity:** High | **Value:** High | **Dependencies:** Phase 6 (artifacts)

Execute Python/JavaScript code in browser using WASM/pyodide.

**Reference:** [vercel.com/templates/next.js/open-source-ai-artifacts](https://vercel.com/templates/next.js/open-source-ai-artifacts)

**Implementation:**
- Evaluate: pyodide (Python), quickjs (JS) for web
- Mobile: May need server-side execution fallback
- Sandbox environment with output capture
- Console display component

**Considerations:**
- Web-first feature, limited mobile support
- Security sandboxing critical
- May defer mobile implementation

---

### Phase 18: Resumable Streams
**Complexity:** Medium | **Value:** Medium | **Dependencies:** None

Redis-backed stream recovery for handling disconnections gracefully.

**Reference:** `/home/user/chat-sdk/app/(chat)/api/chat/[id]/stream/route.ts`

**Implementation:**
- Redis pub/sub for stream storage
- Stream ID generation and tracking
- `experimental_resume` on client reconnect
- Cleanup job for expired streams

**Dependencies to add:**
- `ioredis` or `@upstash/redis`
- `resumable-stream` package

---

### Phase 19: Request Suggestions
**Complexity:** Medium | **Value:** Medium | **Dependencies:** Phase 12 (auth)

AI-powered writing suggestions for documents.

**Reference:** `/home/user/chat-sdk/lib/ai/tools/request-suggestions.ts`

**Implementation:**
- New tool: `requestSuggestions`
- Database: Suggestion table
- API: GET `/api/suggestions`
- UI: Inline suggestion highlights with accept/reject

---

### Phase 20: Advanced Visualization Components
**Complexity:** Medium | **Value:** Low | **Dependencies:** None

Rich components for displaying AI reasoning and task planning.

**Reference:** `/home/user/chat-sdk/components/ai-elements/`

**Components:**
- `ChainOfThought` - Step-by-step reasoning display
- `Plan` - Multi-step plan visualization
- `Queue` - Task queue with progress
- `Task` - Individual task items
- `Checkpoint` - Progress markers

---

### Phase 21: CodeMirror Editor
**Complexity:** Medium | **Value:** Medium | **Dependencies:** Phase 6 (artifacts)

Rich code editing with syntax highlighting for 10+ languages.

**Reference:** `/home/user/chat-sdk/components/code-editor.tsx`

**Implementation:**
- Web: CodeMirror 6 integration
- Mobile: Evaluate alternatives (react-native-code-editor)
- Language support: JS, TS, Python, Go, Rust, etc.
- Actions: Copy, Format, Run (if Phase 17 done)

---

### Phase 22: Math Rendering
**Complexity:** Low | **Value:** Low | **Dependencies:** None

KaTeX integration for rendering mathematical equations.

**Implementation:**
- Web: KaTeX library
- Mobile: react-native-katex or MathJax WebView
- Markdown extension for `$...$` and `$$...$$` syntax

---

### Phase 23: Cursor Pagination
**Complexity:** Low | **Value:** Low | **Dependencies:** None

Efficient chat history loading with cursor-based pagination.

**Reference:** `/home/user/chat-sdk/app/(chat)/api/history/route.ts`

**Implementation:**
- Add `startingAfter` / `endingBefore` params
- Update `getChats()` query
- Client-side infinite scroll optimization

---

### Phase 24: Chat Search & Export
**Complexity:** Medium | **Value:** Medium | **Dependencies:** None

Full-text search across messages and export functionality.

**Implementation:**
- Search: PostgreSQL full-text search or dedicated index
- Export formats: Markdown, PDF, JSON
- UI: Search bar in sidebar, export button in chat header

---

### Phase 25: Cloud File Storage
**Complexity:** Medium | **Value:** Low | **Dependencies:** None

Replace base64 data URLs with cloud storage for large files.

**Options:**
- Vercel Blob (if deploying to Vercel)
- AWS S3 / Cloudflare R2
- Supabase Storage

**Implementation:**
- File upload API endpoint
- Signed URLs for access
- Migration path from base64

---

### Phase 26: Telemetry & Monitoring
**Complexity:** Low | **Value:** Low | **Dependencies:** None

Production monitoring and observability.

**Implementation:**
- OpenTelemetry integration
- Error tracking (Sentry)
- Performance metrics
- Usage analytics

---

### Phase 27: Local LLM (Mobile-Only)
**Complexity:** High | **Value:** High | **Dependencies:** None | **Platform:** iOS/Android only

On-device LLM inference with FunctionGemma 270M for offline AI chat with tool calling.

📄 **Detailed Plan:** [`docs/plans/local-llm.md`](./local-llm.md)

**Technical Decisions:**
- **Runtime:** llama.rn (llama.cpp binding, MIT license, tool calling support)
- **Model:** FunctionGemma 270M (~172MB, built-in tool calling tokens)
- **Integration:** Proper `LanguageModelV1` provider (not AI SDK bypass)

**Implementation Phases:**
| Sub-Phase | Description | Days |
|-----------|-------------|------|
| A | Foundation: llama.rn, model types, LocalLLMContext | 2-3 |
| B | AI SDK Provider: LanguageModelV1, token streaming, tool parsing | 2-3 |
| C | Download Management: Progress UI, storage utilities | 1-2 |
| D | Integration: Unified chat hook, model selector, offline indicator | 2-3 |

**Key Features:**
- Model download on demand (~172MB)
- Streaming inference via native bridge
- Tool calling with FunctionGemma format
- Offline indicator and graceful fallback
- ~550MB RAM during inference, 16-20 tok/s on mid-range devices

**Limitations:**
- Requires Expo dev build (no Expo Go)
- Text-only (no vision)
- No extended thinking
- Local chats don't sync to server

---

## Platform Considerations

### Web vs Mobile Differences

| Feature | Web | Mobile |
|---------|-----|--------|
| CodeMirror | Native support | WebView or alternative |
| WASM execution | Full support | Limited/server fallback |
| KaTeX | Native support | WebView |
| File picker | Native APIs | expo-image-picker |
| Keyboard shortcuts | Full support | Limited |
| Local LLM | Not supported | llama.rn via native bridge |

### React Native Limitations

Some chat-sdk features rely on web-only capabilities:
- RSC/Server Components (Generative UI) - Not applicable
- In-browser WASM - Limited support
- CodeMirror - Needs alternative editor

---

## Implementation Notes

### Generative UI Clarification

The chat-sdk markets "Generative UI" but actually uses **tool-based UI rendering**:
1. AI calls a tool (e.g., `getWeather`)
2. Tool returns structured JSON data
3. Client maps tool type to React component
4. Component renders with the data

This is exactly what we've implemented with our tool registry pattern. The RSC-based `streamUI` approach is:
- Experimental and paused
- Next.js only
- Not recommended for production

Our approach is correct for React Native.

### Priority Guidelines

When selecting next phase to implement:
1. **User value** - Does it improve daily UX?
2. **Parity impact** - Is it a key chat-sdk feature?
3. **Dependencies** - Are prerequisites complete?
4. **Complexity** - Can it be done in reasonable time?

Recommended order for maximum impact:
1. Phase 13 (Suggested Actions) - Quick win, great UX
2. Phase 14 (Message Voting) - Completes existing UI
3. Phase 15 (Spreadsheet Artifacts) - New capability
4. Phase 17 (Code Execution) - Key differentiator
