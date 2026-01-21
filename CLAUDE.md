# Claude Code Project Notes

## Project Overview
Expo/React Native implementation of Vercel's chat-sdk features, targeting iOS, Android, and Web.

**Repository:** https://github.com/dustindoan/chat-sdk-expo

**Reference projects:**
- `../chat-sdk` - Vercel's original chat-sdk (Next.js) - **PRIMARY REFERENCE**
- `../previous-attempt` - Earlier implementation (different approaches, NOT to be followed)

## Implementation Plans

### Main Plan (Phases 1-4)
`~/.claude/plans/jazzy-riding-kahn.md`

### Tools & Artifacts Plan (Phases 5-7)
`~/.claude/plans/tools-artifacts-plan.md`

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

### Next Up
- **Phase 10:** Reasoning display

---

## Resolved Issues (Phase 6)

### Multi-Document Concurrent Streaming

**Testing prompt:** "Can you generate two files for me (a jsx and a css), in an effort to create a complete React component for a todo list app."

**Issues fixed:**
1. **Content mixing** - Code handler uses `streamObject`, ArtifactContext replaces (not appends) content, compound data format `{ value, docId }` routes to correct doc
2. **Inline card flickering** - `getStreamingDocument(idOrTitle)` provides per-document state
3. **Panel flickering** - Panel opens only after streaming ends via `openFirstDocument()`
4. **Error handling** - try/catch in handlers prevents stream crashes

**Key files:** `lib/artifacts/handlers/code.ts`, `contexts/ArtifactContext.tsx`, `components/chat/tools/DocumentTool.tsx`, `components/ChatUI.tsx`

### updateDocument Tool

**Problem:** AI couldn't use updateDocument - didn't see previous tool results.

**Root cause:** API wasn't loading message history from database.

**Fixed:**
1. Load full history from DB using `getMessagesByChatId()`
2. Use AI SDK's `convertToModelMessages()` for proper tool call/result formatting

**Key file:** `app/api/chat+api.ts`

### Future Phases
- Phase 10: Reasoning display
- Phase 11: Tool approval flow
- Phase 12: Authentication

---

## Resolved Issues (Phase 7)

### Version History Implementation

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

## Resolved Issues (Phase 8)

### File Attachments Implementation

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

## Resolved Issues (Phase 9)

### Message Editing/Regeneration Implementation

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

## Architecture

```
app/
├── _layout.tsx             # Root layout (Stack wrapping drawer)
├── (drawer)/
│   ├── _layout.tsx         # Drawer layout with ChatHistoryList
│   ├── index.tsx           # New chat screen
│   └── chat/
│       └── [id].tsx        # Load existing chat by ID
└── api/
    ├── chat+api.ts         # Chat streaming with persistence
    ├── history+api.ts      # Chat list pagination
    ├── messages/
    │   └── [id]+api.ts     # Delete trailing messages (for edit/regenerate)
    └── chats/
        ├── index+api.ts    # Create new chat
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
│   ├── MessageInput.tsx
│   ├── MessageActions.tsx    # Copy, edit, regenerate, vote buttons
│   ├── SimpleMarkdown.tsx    # Custom streaming-optimized renderer
│   ├── ModelSelector.tsx
│   ├── ToolInvocation.tsx    # Routes to tool-specific components
│   ├── WelcomeMessage.tsx
│   ├── AttachmentPreview.tsx # Pending attachment thumbnail
│   ├── ImagePreview.tsx      # Image display with tap-to-expand
│   └── tools/                # Tool-specific UI components
│       ├── index.ts        # Tool registry
│       ├── types.ts        # ToolUIProps, ToolState types
│       ├── WeatherTool.tsx # Weather card with SVG icons, day/night theming
│       ├── TemperatureTool.tsx  # F° to C° conversion display
│       ├── DocumentTool.tsx    # Artifact preview card
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
│   ├── models.ts           # Claude model definitions
│   └── tools/              # AI SDK tool definitions
│       ├── index.ts        # Barrel exports
│       ├── weather.ts      # Weather tool (Open-Meteo API)
│       ├── temperature.ts  # Temperature conversion tool
│       ├── createDocument.ts   # Artifact creation tool
│       └── updateDocument.ts   # Artifact update tool
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
    ├── schema.ts           # Drizzle schema (Chat, Message)
    ├── client.ts           # PostgreSQL connection
    ├── queries.ts          # CRUD operations
    └── index.ts            # Barrel exports

contexts/
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
- `Chat`: id, title, model, createdAt, updatedAt
- `Message`: id, chatId, role, parts (JSON), createdAt

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

## AI SDK Version
- `ai@6.0.39`
- `@ai-sdk/anthropic@3.0.15`
- `@ai-sdk/react@3.0.41`
