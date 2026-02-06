# Wally - AI Fitness Coaching Assistant

## Overview

Wally is an AI-powered fitness coaching app built on chat-sdk-expo. It demonstrates:
- **Stateful agent workflows** - Multi-state conversation flows for goal-based coaching
- **Extended document kinds** - Custom `'training-block'` artifact type
- **Domain-specific UI** - Calendar views, workout sessions, training plans

**Part of:** [chat-sdk-expo](https://github.com/dustindoan/chat-sdk-expo) monorepo (`examples/wally/`)

---

## Key Differentiators from ai-chat-app

| Feature | ai-chat-app | wally |
|---------|-------------|-------|
| Document kinds | `'text' \| 'code'` | `'text' \| 'code' \| 'training-block'` |
| Agent type | Stateless chat | Stateful workflow (6 states) |
| Domain | General-purpose | Fitness coaching |
| UI | Standard chat | Calendar + workout sessions |

---

## Stateful Agent Workflow

Wally uses a 6-state coaching workflow:

```
GOAL_CAPTURE → ANALYST → INTAKE → SAFETY → PLAN → PRESENT
```

**States:**
1. **GOAL_CAPTURE**: User states high-level goal ("I want to run a 4:25 1500m")
2. **ANALYST**: Determine what information is needed, implicit goal reframing
3. **INTAKE**: Gather profile/fitness data (age, experience, injury history)
4. **SAFETY**: Gate unsafe training approaches
5. **PLAN**: Generate personalized training block
6. **PRESENT**: Display plan for review/refinement

**Key Principle:** "The system should know without telling" - apply age-based frameworks implicitly, reframe goals through questions.

### Key Files

- `lib/agents/index.ts` - Agent exports and types
- `lib/agents/createStatefulAgent.ts` - State machine factory
- `lib/agents/examples/coaching-workflow.ts` - Coaching workflow definition
- `lib/agents/registry.ts` - Workflow registry

### Usage

```typescript
import { createStatefulAgent, getWorkflow } from '@/lib/agents';

// Get the coaching workflow
const { workflow, tools } = getWorkflow('coaching');

// Create an agent instance
const agent = createStatefulAgent(workflow, tools, { apiKey });

// Run the workflow
const result = await agent.generate({ prompt: 'I want to run a 4:25 1500m' });
```

---

## Extended Document Kinds

Wally defines a custom document kind for training plans:

```typescript
// lib/db/schema.ts
export type WallyDocumentKind = 'text' | 'code' | 'training-block';
```

The `training-block` kind represents structured training plans that can be:
- Stored as versioned documents
- Displayed in a specialized calendar view
- Edited and refined through conversation

### Database Pattern

Wally uses the shared `DatabaseAdapter` from `@chat-sdk-expo/db`:

```typescript
// lib/db/client.ts
import { createDrizzlePostgresAdapter } from '@chat-sdk-expo/db-drizzle-postgres';
export const dbAdapter = createDrizzlePostgresAdapter(db);

// lib/db/queries.ts - Type-safe wrappers
export async function getLatestDocumentByKind(
  userId: string,
  kind: WallyDocumentKind  // Type-safe!
): Promise<Document | undefined> {
  return dbAdapter.getLatestDocumentByKind(userId, kind);
}
```

---

## UI Components

### Calendar View
Week view calendar showing training sessions by day.

### Today's Sessions
Cards showing workouts scheduled for the current day:
- Recovery Run (duration, distance)
- Full Body Strength (duration)

### Chat Interface
Standard chat-sdk-expo chat with fitness-focused empty state and Wally branding.

---

## Development

### Running Wally

```bash
# From monorepo root
cd examples/wally
pnpm dev --port 8082
```

### Environment

Create `.env` in `examples/wally/`:
```
ANTHROPIC_API_KEY=sk-ant-...
DATABASE_URL=postgres://postgres:postgres@localhost:5432/chat
BETTER_AUTH_SECRET=your-secret-key
```

### Testing the Coaching Workflow

1. Start the app and begin a new conversation
2. Say: "I want to run a 4:25 1500m"
3. Observe state transitions: GOAL_CAPTURE → ANALYST → INTAKE
4. Answer intake questions about age, experience, injury history
5. Watch the training block get generated and displayed

---

## Relationship to Shared Packages

Wally imports from these `@chat-sdk-expo/*` packages:

| Package | Usage in Wally |
|---------|----------------|
| `@chat-sdk-expo/db` | Types (`Chat`, `Message`, `Document`), `DatabaseAdapter` interface |
| `@chat-sdk-expo/db-drizzle-postgres` | `createDrizzlePostgresAdapter`, `schema` |
| `@chat-sdk-expo/tools` | Base tool definitions |
| `@chat-sdk-expo/artifacts` | Artifact handlers (text, code) |
| `@chat-sdk-expo/agents` | (planned) Shared agent patterns |

---

## Future Work

- [ ] Training block artifact renderer (calendar integration)
- [ ] Workout completion tracking
- [ ] Progress visualization
- [ ] Export to calendar apps
