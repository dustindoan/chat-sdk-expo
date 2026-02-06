# Contributing to chat-sdk-expo

## Issue-Driven Development

All changes to this repository should be associated with a GitHub issue.

### Before You Start

1. **Check for existing issues** - Search [open issues](https://github.com/dustindoan/chat-sdk-expo/issues) to see if your change is already tracked
2. **Create an issue if needed** - Every change needs a ticket, including:
   - New features
   - Bug fixes
   - Refactoring
   - Housekeeping (renames, cleanups, dependency updates)
3. **Reference the issue in commits** - Use `Part of #X` or `Fixes #X` in commit messages

### Commit Message Format

```
<type>: <description>

<optional body>

Part of #<issue-number>

Co-Authored-By: Claude <noreply@anthropic.com>  (if applicable)
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `refactor` - Code restructuring (no behavior change)
- `chore` - Housekeeping (renames, deps, config)
- `docs` - Documentation only
- `test` - Adding or updating tests
- `style` - Formatting, styling (no logic change)

### Examples

```bash
# Feature work
git commit -m "feat: Add onFinish callback to stateful agent

Part of #29"

# Housekeeping
git commit -m "chore: Rename examples for public consumption

- ai-chat-app → basic-chat
- wally → health-coach

Part of #32"

# Bug fix that closes an issue
git commit -m "fix: Handle orphaned tool calls in message history

Fixes #45"
```

## Workflow

1. **Create or claim an issue**
2. **Work on a branch** (optional for small changes on main)
3. **Make commits referencing the issue**
4. **Update the issue** with progress comments for long-running work
5. **Close the issue** when complete (or let `Fixes #X` do it automatically)

## Monorepo Structure

```
chat-sdk-expo/
├── packages/           # Shared packages (@chat-sdk-expo/*)
│   ├── db/             # Core types & DatabaseAdapter interface
│   ├── drizzle-postgres/  # Drizzle + PostgreSQL implementation
│   ├── agents/         # Agent definitions
│   ├── artifacts/      # Artifact system
│   └── tools/          # AI SDK tool definitions
└── examples/           # Example applications
    ├── basic-chat/     # General-purpose chat
    └── health-coach/   # Fitness coaching assistant
```

### Adding to Shared Packages

When extracting shared code:
1. Create the package in `packages/`
2. Export from the package's `src/index.ts`
3. Update consuming apps to import from `@chat-sdk-expo/<package>`
4. Run `pnpm install` to link the workspace

### Package Naming Convention

| Type | Naming |
|------|--------|
| Interface/types | `@chat-sdk-expo/<name>` (e.g., `db`, `auth`) |
| Implementation | `@chat-sdk-expo/<impl>` (e.g., `drizzle-postgres`, `better-auth`) |

## Running Locally

```bash
# Install dependencies
pnpm install

# Run an example app
cd examples/basic-chat
pnpm dev

# Build all packages
pnpm build
```

## Questions?

Open an issue with the `question` label.
