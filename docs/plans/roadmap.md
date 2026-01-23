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

## Open Issues

Track progress at: **[GitHub Issues](https://github.com/dustindoan/chat-sdk-expo/issues)**

### High Priority

| Issue | Feature | Complexity | Value |
|-------|---------|------------|-------|
| [#1](https://github.com/dustindoan/chat-sdk-expo/issues/1) | Message Voting | Medium | High |
| [#2](https://github.com/dustindoan/chat-sdk-expo/issues/2) | Spreadsheet Artifacts | Medium | High |
| [#4](https://github.com/dustindoan/chat-sdk-expo/issues/4) | In-Browser Code Execution | High | High |
| [#14](https://github.com/dustindoan/chat-sdk-expo/issues/14) | Local LLM (Mobile-Only) | High | High |

### Medium Priority

| Issue | Feature | Complexity | Value |
|-------|---------|------------|-------|
| [#3](https://github.com/dustindoan/chat-sdk-expo/issues/3) | Image Artifacts | Medium | Medium |
| [#5](https://github.com/dustindoan/chat-sdk-expo/issues/5) | Resumable Streams | Medium | Medium |
| [#6](https://github.com/dustindoan/chat-sdk-expo/issues/6) | Request Suggestions | Medium | Medium |
| [#8](https://github.com/dustindoan/chat-sdk-expo/issues/8) | CodeMirror Editor | Medium | Medium |
| [#11](https://github.com/dustindoan/chat-sdk-expo/issues/11) | Chat Search & Export | Medium | Medium |

### Lower Priority

| Issue | Feature | Complexity | Value |
|-------|---------|------------|-------|
| [#7](https://github.com/dustindoan/chat-sdk-expo/issues/7) | Advanced Visualization | Medium | Low |
| [#9](https://github.com/dustindoan/chat-sdk-expo/issues/9) | Math Rendering | Low | Low |
| [#10](https://github.com/dustindoan/chat-sdk-expo/issues/10) | Cursor Pagination | Low | Low |
| [#12](https://github.com/dustindoan/chat-sdk-expo/issues/12) | Cloud File Storage | Medium | Low |
| [#13](https://github.com/dustindoan/chat-sdk-expo/issues/13) | Telemetry & Monitoring | Low | Low |

### Deferred

| Issue | Feature | Reason |
|-------|---------|--------|
| [#15](https://github.com/dustindoan/chat-sdk-expo/issues/15) | Suggested Actions | Industry moved away from this UX |

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

### Priority Guidelines

When selecting next feature to implement:
1. **User value** - Does it improve daily UX?
2. **Parity impact** - Is it a key chat-sdk feature?
3. **Dependencies** - Are prerequisites complete?
4. **Complexity** - Can it be done in reasonable time?
5. **Industry trends** - Is this still a relevant UX pattern?

### Deferring Features

Features can be closed as "not planned" when:
- Industry has moved away from the UX pattern
- Implementation cost exceeds value
- Better alternatives exist
- User research indicates low demand

When deferring, close the issue with a comment explaining why.
