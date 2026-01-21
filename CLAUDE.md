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

### Next Up (Artifacts)
- **Phase 6:** Artifacts - Document creation/editing with streaming, following chat-sdk's `Artifact` class pattern
- **Phase 7:** Version history - Document versioning with diff view

### Future
- Phase 8: File attachments
- Phase 9: Message editing/regeneration
- Phase 10: Reasoning display
- Phase 11: Tool approval flow
- Phase 12: Authentication

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
│   ├── MessageBubble.tsx
│   ├── MessageInput.tsx
│   ├── MessageActions.tsx
│   ├── SimpleMarkdown.tsx  # Custom streaming-optimized renderer
│   ├── ModelSelector.tsx
│   ├── ToolInvocation.tsx  # Routes to tool-specific components
│   ├── WelcomeMessage.tsx
│   └── tools/              # Tool-specific UI components
│       ├── index.ts        # Tool registry
│       ├── types.ts        # ToolUIProps, ToolState types
│       ├── WeatherTool.tsx # Weather card with SVG icons, day/night theming
│       ├── TemperatureTool.tsx  # F° to C° conversion display
│       └── DefaultTool.tsx # Fallback for unknown tools
└── toast/                  # Toast notification system

hooks/
├── useClipboard.ts
└── useChatHistory.ts       # Paginated chat list with date grouping

lib/
├── ai/
│   ├── models.ts           # Claude model definitions
│   └── tools/              # AI SDK tool definitions
│       ├── index.ts        # Barrel exports
│       ├── weather.ts      # Weather tool (Open-Meteo API)
│       └── temperature.ts  # Temperature conversion tool
└── db/
    ├── schema.ts           # Drizzle schema (Chat, Message)
    ├── client.ts           # PostgreSQL connection
    ├── queries.ts          # CRUD operations
    └── index.ts            # Barrel exports

contexts/
└── ChatHistoryContext.tsx  # Cross-component chat state
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
