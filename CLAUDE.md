# Claude Code Project Notes

## Project Overview
Expo/React Native implementation of Vercel's chat-sdk features, targeting iOS, Android, and Web.

**Repository:** https://github.com/dustindoan/chat-sdk-expo

## Implementation Plan
Full plan with all phases: `~/.claude/plans/jazzy-riding-kahn.md`

### Completed
- **Phase 1:** Component decomposition, toast system, copy/stop actions
- **Phase 2:** Model selector (Claude 4.5 Haiku/Sonnet/Opus)

### Next Up
- **Phase 3:** Conversation persistence (expo-sqlite)
- **Phase 4:** Chat history sidebar (drawer navigation)

### Future
- Phase 5: File attachments
- Phase 6: Message editing/regeneration
- Phase 7: Reasoning display
- Phase 8: Tool approval flow
- Phase 9: Authentication

## Architecture

```
components/
├── ChatUI.tsx              # Main orchestrator (~100 lines)
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
└── useClipboard.ts

lib/ai/
└── models.ts               # Claude model definitions
```

## Key Decisions
- **Custom markdown renderer** (`SimpleMarkdown.tsx`) instead of react-native-markdown-display for better streaming performance
- **Memoized components** (MessageList, MessageBubble, ModelSelector) to prevent re-render lag
- **@gorhom/bottom-sheet** for native-feeling model selector
- **React 19.1.0** pinned for Expo compatibility

## Development
```bash
npx expo start          # Start dev server
npx expo run:ios        # Build and run on iOS simulator
```

API key goes in `.env` (gitignored):
```
ANTHROPIC_API_KEY=sk-ant-...
```
