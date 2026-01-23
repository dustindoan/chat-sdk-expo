# Feature Roadmap

**Goal:** Achieve feature parity with Vercel's chat-sdk (Next.js reference implementation)

**Last Updated:** January 2026

---

## Current Status

| Metric | Value |
|--------|-------|
| Completed Features | 12 |
| Open Issues | 14 |
| Feature Parity | ~45% |
| Reference | [github.com/vercel/ai-chatbot](https://github.com/vercel/ai-chatbot) |

---

## Completed Features

| Feature | Description |
|---------|-------------|
| Component decomposition | Toast system, copy/stop actions |
| Model selector | Claude 4.5 Haiku/Sonnet/Opus |
| Conversation persistence | Drizzle + PostgreSQL |
| Chat history sidebar | Drawer navigation |
| Tool system | Custom UI components (weather, temperature, etc.) |
| Artifacts | Text/code with streaming |
| Version history | Diff view and restore |
| File attachments | Image picker with vision |
| Message editing | Edit and regenerate messages |
| Extended thinking | Collapsible reasoning display |
| Tool approval | Human-in-the-loop confirmation |
| Authentication | Better Auth with email/password |

---

## Planned Features

📊 **[Project Board](https://github.com/users/dustindoan/projects/1)** - View all issues with Priority, Complexity, and Value fields

📋 **[All Issues](https://github.com/dustindoan/chat-sdk-expo/issues)** - Full issue list

---

## Detailed Plans

Some features have detailed implementation plans:

- [Local LLM](./local-llm.md) - On-device inference with llama.rn and FunctionGemma

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

This is exactly what we've implemented with our tool registry pattern.

### Deferring Features

Features can be closed as "not planned" when:
- Industry has moved away from the UX pattern
- Implementation cost exceeds value
- Better alternatives exist
- User research indicates low demand

When deferring, close the GitHub issue with a comment explaining why.
