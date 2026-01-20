# Claude Code Project Notes

## Project Overview
Expo/React Native implementation of Vercel's chat-sdk features, targeting iOS, Android, and Web.

**Repository:** https://github.com/dustindoan/chat-sdk-expo

**Reference projects:**
- `../chat-sdk` - Vercel's original chat-sdk (Next.js)
- `../previous-attempt` - Earlier implementation attempts with different approaches

## Implementation Plan
Full plan with all phases: `~/.claude/plans/jazzy-riding-kahn.md`

### Completed
- **Phase 1:** Component decomposition, toast system, copy/stop actions
- **Phase 2:** Model selector (Claude 4.5 Haiku/Sonnet/Opus)
- **Phase 3:** Conversation persistence (Drizzle + PostgreSQL)
- **Phase 4:** Chat history sidebar (drawer navigation)

### Future
- Phase 5: File attachments
- Phase 6: Message editing/regeneration
- Phase 7: Reasoning display
- Phase 8: Tool approval flow
- Phase 9: Authentication

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
│   ├── ToolInvocation.tsx
│   └── WelcomeMessage.tsx
└── toast/                  # Toast notification system

hooks/
├── useClipboard.ts
└── useChatHistory.ts       # Paginated chat list with date grouping

lib/
├── ai/
│   └── models.ts           # Claude model definitions
└── db/
    ├── schema.ts           # Drizzle schema (Chat, Message)
    ├── client.ts           # PostgreSQL connection
    ├── queries.ts          # CRUD operations
    └── index.ts            # Barrel exports
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
