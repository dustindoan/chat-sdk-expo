# Claude Code Project Notes

## Project Overview

Expo/React Native implementation of Vercel's chat-sdk features, targeting iOS, Android, and Web.

**Repository:** https://github.com/dustindoan/chat-sdk-expo
**Contributing:** See [CONTRIBUTING.md](./CONTRIBUTING.md) - all changes must reference a GitHub issue.
**Roadmap:** [GitHub Project](https://github.com/users/dustindoan/projects/1)

---

## Monorepo Structure

```
chat-sdk-expo/
├── packages/                    # Shared packages (@chat-sdk-expo/*)
│   ├── db/                      # Core types & DatabaseAdapter interface
│   ├── drizzle-postgres/        # Drizzle + PostgreSQL implementation
│   ├── agents/                  # Stateful agent workflows
│   ├── artifacts/               # Document handlers, streaming
│   └── tools/                   # AI SDK tool definitions
├── examples/
│   ├── basic-chat/              # General-purpose chat application
│   └── health-coach/            # Fitness coaching assistant (stateful workflow)
└── pnpm-workspace.yaml
```

**Key principle:** Follow Vercel's chat-sdk patterns. Share code via `@chat-sdk-expo/*` packages.

---

## Development

```bash
# Start PostgreSQL
docker-compose up -d

# Push schema
pnpm run db:push

# Run examples
cd examples/basic-chat && pnpm dev --port 8081
cd examples/health-coach && pnpm dev --port 8082

# Native builds (requires dev build, not Expo Go)
npx expo run:ios
npx expo run:android
```

**Environment** (`.env` in each example):
```
ANTHROPIC_API_KEY=sk-ant-...
DATABASE_URL=postgres://postgres:postgres@localhost:5432/chat
BETTER_AUTH_SECRET=your-secret-key
```

---

## Key Patterns

### DatabaseAdapter
Apps import types from `@chat-sdk-expo/db` and use an implementation:
```typescript
import type { Chat, Message, Document, DatabaseAdapter } from '@chat-sdk-expo/db';
import { createDrizzlePostgresAdapter } from '@chat-sdk-expo/drizzle-postgres';

export const dbAdapter = createDrizzlePostgresAdapter(db);
```

### Extensible Document Kinds
The `Document.kind` field is `string` to allow custom kinds per app:
```typescript
// health-coach extends base kinds
type HealthCoachDocumentKind = 'text' | 'code' | 'training-block';
```

### Artifact Streaming Protocol
```typescript
dataStream.write({ type: 'data-id', data: id, transient: true });
dataStream.write({ type: 'data-textDelta', data: text, transient: true });
dataStream.write({ type: 'data-finish', data: null, transient: true });
```

### Styling (Uniwind + Tailwind v4)
Use Tailwind classes. For props that don't accept `className`, use `useResolveClassNames`:
```tsx
const mutedStyle = useResolveClassNames('text-muted-foreground');
<Feather color={mutedStyle.color as string} />
```

Use semantic tokens: `bg-background`, `text-foreground`, `text-muted-foreground`, `bg-primary`, etc.

---

## Key Decisions

- **AI SDK v6** with `ignoreIncompleteToolCalls: true` in `convertToModelMessages()`
- **Drizzle + PostgreSQL** for persistence (Docker locally)
- **Better Auth** with email/password, guest users, rate limiting
- **expo-router drawer** for native navigation
- **React 19.1.0** pinned (use `--legacy-peer-deps`)
- **ArtifactContext** for global artifact state (React Context vs SWR for Expo)
- **Tool registry pattern** maps tool names to custom UI components

---

## Local LLM Integration

On-device inference with `@react-native-ai/llama` and FunctionGemma 270M model.

**⚠️ MONITOR:** Watch for `@react-native-ai/llama` release with PR #178 merged (streaming fix).
- When released: `pnpm update @react-native-ai/llama` and delete `patches/@react-native-ai+llama+0.10.0.patch`

---

## Examples

### basic-chat
General-purpose chat with all features: attachments, artifacts, tool approval, voting, code execution.

### health-coach
Stateful coaching workflow with 6 states:
```
GOAL_CAPTURE → ANALYST → INTAKE → SAFETY → PLAN → PRESENT
```
Custom `training-block` document kind for training plans.
