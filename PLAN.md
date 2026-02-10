# Plan: Extract shared UI components into `@chat-sdk-expo/ui`

Part of #30

## Approach

Create a single `@chat-sdk-expo/ui` package containing all shared UI — from primitives (Button, Card, Text) through chat-specific components (Message, PromptInput, Conversation). Align naming with [Vercel ai-elements](https://github.com/vercel/ai-elements) where applicable.

**Build strategy: Source-only (no tsup build step).** Following the [byCedric/expo-monorepo-example](https://github.com/byCedric/expo-monorepo-example) pattern used by the Expo team — `"main": "./src/index.ts"`. Metro transpiles source directly. This is the standard approach for RN UI packages in monorepos and avoids issues with JSX compilation and platform-specific files (`.native.ts`/`.web.ts`).

## Package Structure

```
packages/ui/
├── src/
│   ├── primitives/          # Low-level UI primitives (from components/ui/)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── text.tsx
│   │   ├── input.tsx
│   │   ├── dialog.tsx
│   │   ├── ... (all 26 existing ui/ components)
│   │   └── index.ts
│   │
│   ├── chat/                # Chat components (ai-elements naming)
│   │   ├── conversation.tsx          # was MessageList (ai-elements: Conversation)
│   │   ├── message.tsx               # was Message (ai-elements: Message)
│   │   ├── prompt-input.tsx          # was PromptInput (ai-elements: PromptInput)
│   │   ├── actions.tsx               # message actions (copy, edit, vote, regenerate)
│   │   ├── reasoning.tsx             # was Reasoning (ai-elements: Reasoning)
│   │   ├── markdown.tsx              # was SimpleMarkdown (renders message content)
│   │   ├── message-editor.tsx        # inline message editing
│   │   ├── model-selector.tsx        # model picker dialog
│   │   ├── attachments.tsx           # was AttachmentPreview (ai-elements: Attachments)
│   │   ├── image-preview.tsx         # image attachment display + lightbox
│   │   ├── empty-state.tsx           # was ConversationEmptyState
│   │   ├── reasoning-toggle.tsx      # reasoning enable/disable toggle
│   │   └── index.ts
│   │
│   ├── tools/               # Tool UI components
│   │   ├── tool.tsx                  # tool router (ai-elements: Tool)
│   │   ├── confirmation.tsx          # approval flow (ai-elements: Confirmation)
│   │   ├── default-tool.tsx          # fallback tool display
│   │   ├── code-execution.tsx        # code execution results
│   │   ├── document-tool.tsx         # document creation tool
│   │   ├── weather-tool.tsx          # weather display
│   │   ├── temperature-tool.tsx      # temperature display
│   │   └── index.ts
│   │
│   ├── artifacts/           # Artifact viewer components
│   │   ├── artifact-panel.tsx        # slide-in artifact panel
│   │   ├── artifact-header.tsx       # header with version nav
│   │   ├── code-content.tsx          # code viewer (ai-elements: CodeBlock-ish)
│   │   ├── text-content.tsx          # text document viewer
│   │   ├── diff-view.tsx             # side-by-side diff
│   │   ├── document-preview.tsx      # preview component
│   │   ├── version-footer.tsx        # restore version footer
│   │   ├── version-navigation.tsx    # version nav controls
│   │   └── index.ts
│   │
│   ├── layout/              # Layout components
│   │   ├── side-by-side.tsx          # was SideBySideLayout
│   │   ├── chat-history.tsx          # was ChatHistoryList
│   │   └── index.ts
│   │
│   ├── toast/               # Toast/notification system
│   │   ├── toast.tsx
│   │   ├── toast-context.tsx
│   │   ├── use-toast.ts
│   │   └── index.ts
│   │
│   ├── hooks/               # Shared hooks
│   │   ├── use-clipboard.ts
│   │   ├── use-attachments.ts
│   │   └── index.ts
│   │
│   └── index.ts             # Root barrel export
│
├── package.json
└── tsconfig.json
```

## ai-elements Naming Alignment

| ai-elements | Current name | New name in @chat-sdk-expo/ui |
|---|---|---|
| `Conversation` / `ConversationContent` | `MessageList` | `Conversation` |
| `ConversationEmptyState` | `ConversationEmptyState` | `ConversationEmptyState` |
| `Message` / `MessageContent` / `MessageResponse` | `Message` | `Message` |
| `PromptInput` / `PromptInputTextarea` / `PromptInputSubmit` | `PromptInput` | `PromptInput` |
| `Reasoning` / `ReasoningTrigger` / `ReasoningContent` | `Reasoning` | `Reasoning` |
| `Attachments` / `Attachment` | `AttachmentPreview` | `Attachments` / `AttachmentPreview` |
| `ModelSelector` | `ModelSelector` | `ModelSelector` |
| `Tool` | `Tool` | `Tool` |
| `Confirmation` | `Confirmation` | `Confirmation` |

Note: ai-elements uses compound components (e.g. `<Message><MessageContent>...</MessageContent></Message>`). We'll keep our current single-component-with-props pattern for now since our components are React Native (not web-only), but adopt their **naming**. We can refactor to compound components later if desired.

## Steps

### Step 1: Create the `@chat-sdk-expo/ui` package skeleton

- Create `packages/ui/package.json` (source-only, no build step)
- Create `packages/ui/tsconfig.json` (typecheck only)
- Create `packages/ui/src/index.ts` barrel export

### Step 2: Move UI primitives

- Copy all 26 components from `examples/basic-chat/components/ui/` → `packages/ui/src/primitives/`
- Create `packages/ui/src/primitives/index.ts` barrel export
- Adjust any internal import paths

### Step 3: Move chat components

- Copy identical chat components from `examples/basic-chat/components/chat/` → `packages/ui/src/chat/`
- Rename files to match ai-elements conventions where applicable
- Create `packages/ui/src/chat/index.ts` barrel export
- Keep app-specific toggles (ResearchToggle, CoachingToggle) in the example apps

### Step 4: Move tool components

- Copy tool components → `packages/ui/src/tools/`
- Create barrel export

### Step 5: Move artifact components

- Copy identical artifact components → `packages/ui/src/artifacts/`
- Create barrel export
- Keep app-specific renderers (TrainingBlockContent) in example apps

### Step 6: Move layout, toast, and hooks

- Copy SideBySideLayout, ChatHistoryList → `packages/ui/src/layout/`
- Copy toast system → `packages/ui/src/toast/`
- Copy shared hooks → `packages/ui/src/hooks/`

### Step 7: Update example apps to import from `@chat-sdk-expo/ui`

- Add `"@chat-sdk-expo/ui": "workspace:*"` to both example app package.json files
- Update all imports in `basic-chat` to use `@chat-sdk-expo/ui`
- Update all imports in `health-coach` to use `@chat-sdk-expo/ui`
- Delete the now-redundant local component files from both apps
- Verify both apps still have their app-specific components locally

### Step 8: Verify

- Run `pnpm install` to link the new package
- Run typecheck across the monorepo
- Smoke test both example apps
