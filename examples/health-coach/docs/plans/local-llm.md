# Local LLM Implementation Plan

## Overview

Add on-device LLM inference for native mobile (iOS/Android), allowing offline AI chat. Web platform will continue using cloud APIs only.

**Key insight:** Use Callstack's [`@react-native-ai/llama`](https://github.com/callstackincubator/ai) package, which already implements a proper AI SDK provider for llama.rn. This eliminates the need to write our own `LanguageModelV3` implementation.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        ChatUI                                │
│                    (unchanged component)                     │
└─────────────────────────────────────────────────────────────┘
                              │
                           useChat
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌──────────────────────────┐    ┌──────────────────────────────┐
│   DefaultChatTransport   │    │    LocalChatTransport        │
│   (cloud models)         │    │    (local models)            │
│                          │    │                              │
│   fetch → /api/chat      │    │   streamText() → llama model │
│         → Claude API     │    │         → llama.rn           │
│         → SSE response   │    │         → token stream       │
└──────────────────────────┘    └──────────────────────────────┘
```

**Benefits:**
- `useChat` hook unchanged - same API for cloud and local
- All existing features work: abort, setMessages, regenerate
- MessageList, MessageInput unchanged
- Only transport layer differs

---

## Technical Decisions

### Package: @react-native-ai/llama

| Aspect | Details |
|--------|---------|
| **npm** | `@react-native-ai/llama@0.10.0` |
| **Maintainer** | Callstack (grabbou, szymonrybczak) |
| **Dependencies** | llama.rn ^0.10.0, react-native-blob-util |
| **AI SDK** | Implements LanguageModelV2 (compatible with our v6) |
| **Features** | HuggingFace download, progress tracking, prepare/unload lifecycle |

### Model: FunctionGemma 270M (MVP)

Using Google's FunctionGemma - purpose-built for function/tool calling:

| Feature | FunctionGemma 270M |
|---------|-------------------|
| Size | ~250MB (Q4_K_M) |
| RAM | ~512MB during inference |
| Tool Calling | Native via special tokens |
| Quality | Optimized for agentic use |

**Why FunctionGemma:**
- **Native tool calling** - uses `<start_function_call>` / `<end_function_call>` tokens
- Smallest practical model (~250MB download)
- Foundation for hybrid routing (local can decide when to escalate to cloud)
- 58% → 85% accuracy improvement for function calling vs base model

**Tool calling format:**
```
<start_function_call>
{"name": "get_weather", "arguments": {"location": "San Francisco"}}
<end_function_call>
```

**Future:** Add Gemma 3 1B/4B for higher quality general chat.

### Requirements

- React Native ≥ 0.76.0 ✅ (have 0.81.5)
- New Architecture enabled ✅ (already enabled)
- Expo dev build (no Expo Go)

---

## Implementation

### Phase A: Foundation (1 day)

#### A1: Install Dependencies

```bash
npm install @react-native-ai/llama llama.rn react-native-blob-util --legacy-peer-deps
npx expo prebuild
```

#### A2: Extend Model Types

```typescript
// lib/ai/models.ts - additions

export interface Model {
  id: string;
  name: string;
  provider: 'anthropic' | 'local';
  description: string;
  supportsReasoning?: boolean;
  supportsTools?: boolean;
  supportsVision?: boolean;

  // Local-only properties
  isLocal?: boolean;
  huggingFaceId?: string;  // Format: "owner/repo/filename.gguf"
  sizeBytes?: number;
  minRamMb?: number;
}

export const localModels: Model[] = [
  {
    id: 'smollm3-3b-local',
    name: 'SmolLM3 3B (Local)',
    provider: 'local',
    description: 'On-device, offline capable',
    isLocal: true,
    supportsTools: false,  // MVP: no tools
    supportsVision: false,
    supportsReasoning: false,
    huggingFaceId: 'ggml-org/SmolLM3-3B-GGUF/SmolLM3-Q4_K_M.gguf',
    sizeBytes: 1_800_000_000,  // ~1.8GB
    minRamMb: 2048,
  },
];

export const allModels = [...chatModels, ...localModels];
```

#### A3: Create LocalLLMContext

```typescript
// contexts/LocalLLMContext.tsx
import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Platform } from 'react-native';
import { llama } from '@react-native-ai/llama';
import type { LanguageModelV2 } from '@ai-sdk/provider';
import { localModels } from '@/lib/ai/models';

interface LocalLLMState {
  isDownloaded: boolean;
  isLoading: boolean;
  isPrepared: boolean;
  downloadProgress: number;
  error: string | null;
  model: LanguageModelV2 | null;
}

interface LocalLLMContextType extends LocalLLMState {
  downloadModel: () => Promise<void>;
  prepareModel: () => Promise<void>;
  unloadModel: () => Promise<void>;
  deleteModel: () => Promise<void>;
}

const LocalLLMContext = createContext<LocalLLMContextType | null>(null);

export function useLocalLLM() {
  const context = useContext(LocalLLMContext);
  if (!context) {
    throw new Error('useLocalLLM must be used within LocalLLMProvider');
  }
  return context;
}

export function LocalLLMProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<LocalLLMState>({
    isDownloaded: false,
    isLoading: false,
    isPrepared: false,
    downloadProgress: 0,
    error: null,
    model: null,
  });

  // Skip on web
  if (Platform.OS === 'web') {
    return (
      <LocalLLMContext.Provider value={{
        ...state,
        downloadModel: async () => {},
        prepareModel: async () => {},
        unloadModel: async () => {},
        deleteModel: async () => {},
      }}>
        {children}
      </LocalLLMContext.Provider>
    );
  }

  const modelConfig = localModels[0];  // SmolLM3 3B
  const llamaModel = llama.languageModel(modelConfig.huggingFaceId!);

  // Check if already downloaded on mount
  useEffect(() => {
    llamaModel.isDownloaded().then((downloaded) => {
      setState(s => ({ ...s, isDownloaded: downloaded }));
    });
  }, []);

  const downloadModel = useCallback(async () => {
    setState(s => ({ ...s, isLoading: true, error: null, downloadProgress: 0 }));
    try {
      await llamaModel.download((progress) => {
        setState(s => ({ ...s, downloadProgress: progress.percentage / 100 }));
      });
      setState(s => ({ ...s, isDownloaded: true, isLoading: false }));
    } catch (error: any) {
      setState(s => ({ ...s, error: error.message, isLoading: false }));
    }
  }, [llamaModel]);

  const prepareModel = useCallback(async () => {
    setState(s => ({ ...s, isLoading: true, error: null }));
    try {
      await llamaModel.prepare();
      setState(s => ({ ...s, model: llamaModel, isPrepared: true, isLoading: false }));
    } catch (error: any) {
      setState(s => ({ ...s, error: error.message, isLoading: false }));
    }
  }, [llamaModel]);

  const unloadModel = useCallback(async () => {
    try {
      await llamaModel.unload();
      setState(s => ({ ...s, model: null, isPrepared: false }));
    } catch (error: any) {
      setState(s => ({ ...s, error: error.message }));
    }
  }, [llamaModel]);

  const deleteModel = useCallback(async () => {
    try {
      await llamaModel.unload();
      await llamaModel.delete();
      setState(s => ({
        ...s,
        model: null,
        isPrepared: false,
        isDownloaded: false
      }));
    } catch (error: any) {
      setState(s => ({ ...s, error: error.message }));
    }
  }, [llamaModel]);

  return (
    <LocalLLMContext.Provider value={{
      ...state,
      downloadModel,
      prepareModel,
      unloadModel,
      deleteModel,
    }}>
      {children}
    </LocalLLMContext.Provider>
  );
}
```

---

### Phase B: LocalChatTransport (1-2 days)

The key integration piece - a transport that uses `streamText()` locally instead of HTTP.

#### B1: Implement LocalChatTransport

```typescript
// lib/local-llm/LocalChatTransport.ts
import { streamText } from 'ai';
import type { LanguageModelV2 } from '@ai-sdk/provider';
import type { ChatTransport, ChatTransportSendOptions } from '@ai-sdk/react';

/**
 * Custom transport that runs inference locally via @react-native-ai/llama
 * instead of making HTTP requests.
 */
export class LocalChatTransport implements ChatTransport {
  private model: LanguageModelV2;

  constructor(model: LanguageModelV2) {
    this.model = model;
  }

  async send(options: ChatTransportSendOptions): Promise<Response> {
    const { messages, abortSignal } = options;

    // Convert UIMessage[] to AI SDK format
    const aiMessages = messages.map(msg => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: this.extractTextContent(msg),
    }));

    // Run local inference with streamText
    const result = await streamText({
      model: this.model,
      messages: aiMessages,
      abortSignal,
    });

    // Convert the AI SDK stream to a Response with SSE format
    // that useChat's internal parser expects
    return this.streamToSSEResponse(result.textStream);
  }

  private extractTextContent(msg: any): string {
    if (typeof msg.content === 'string') return msg.content;
    if (Array.isArray(msg.parts)) {
      return msg.parts
        .filter((p: any) => p.type === 'text')
        .map((p: any) => p.text)
        .join('');
    }
    return '';
  }

  private async streamToSSEResponse(
    textStream: AsyncIterable<string>
  ): Promise<Response> {
    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        try {
          // Emit stream start
          controller.enqueue(encoder.encode('0:""\n'));

          for await (const chunk of textStream) {
            // AI SDK UI protocol: text chunks as JSON
            const data = JSON.stringify(chunk);
            controller.enqueue(encoder.encode(`0:${data}\n`));
          }

          // Emit finish
          controller.enqueue(encoder.encode('e:{"finishReason":"stop"}\n'));
          controller.enqueue(encoder.encode('d:{"finishReason":"stop"}\n'));
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
    });
  }
}
```

#### B2: Update ChatUI to Use Dynamic Transport

```typescript
// components/ChatUI.tsx - modifications

import { LocalChatTransport } from '@/lib/local-llm/LocalChatTransport';
import { useLocalLLM } from '@/contexts/LocalLLMContext';
import { getModelById } from '@/lib/ai/models';

export function ChatUI({ /* ... */ }) {
  // ... existing code ...

  const { model: localModel, isPrepared } = useLocalLLM();
  const selectedModel = getModelById(selectedModelId);
  const isLocalModel = selectedModel?.isLocal && isPrepared && localModel;

  // Create transport based on model type
  const transport = useMemo(() => {
    if (isLocalModel && localModel) {
      return new LocalChatTransport(localModel);
    }
    return new DefaultChatTransport({
      api,
      fetch: transportFetch,
      prepareSendMessagesRequest(request) {
        // ... existing logic ...
      },
    });
  }, [isLocalModel, localModel, api, transportFetch]);

  const { messages, sendMessage, /* ... */ } = useChat({
    id: currentChatId,
    messages: initialMessages,
    generateId: generateUUID,
    transport,
    // ... rest unchanged ...
  });

  // ... rest of component unchanged ...
}
```

---

### Phase C: UI Updates (1 day)

#### C1: Model Selector with Download UI

```typescript
// components/chat/ModelSelector.tsx - additions

import { Platform } from 'react-native';
import { useLocalLLM } from '@/contexts/LocalLLMContext';
import { allModels } from '@/lib/ai/models';

function ModelOption({ model, selected, onSelect }: ModelOptionProps) {
  const {
    isDownloaded,
    isPrepared,
    isLoading,
    downloadProgress,
    downloadModel,
    prepareModel,
  } = useLocalLLM();

  // Hide local models on web
  if (model.isLocal && Platform.OS === 'web') {
    return null;
  }

  const handlePress = async () => {
    if (!model.isLocal) {
      onSelect(model.id);
      return;
    }

    // Local model flow
    if (!isDownloaded) {
      await downloadModel();
      return;
    }

    if (!isPrepared) {
      await prepareModel();
    }

    onSelect(model.id);
  };

  const renderLocalStatus = () => {
    if (!model.isLocal) return null;

    if (isLoading && downloadProgress > 0) {
      return (
        <View className="gap-1">
          <View className="h-1.5 w-20 bg-gray-700 rounded-full overflow-hidden">
            <View
              className="h-full bg-blue-500 rounded-full"
              style={{ width: `${downloadProgress * 100}%` }}
            />
          </View>
          <Text className="text-gray-500 text-xs">
            {Math.round(downloadProgress * 100)}%
          </Text>
        </View>
      );
    }

    if (isLoading) {
      return <Text className="text-gray-500 text-xs">Loading...</Text>;
    }

    if (!isDownloaded) {
      return (
        <View className="flex-row items-center gap-1">
          <DownloadIcon size={14} color="#6b7280" />
          <Text className="text-gray-500 text-xs">
            {formatBytes(model.sizeBytes || 0)}
          </Text>
        </View>
      );
    }

    if (!isPrepared) {
      return <Text className="text-gray-500 text-xs">Tap to load</Text>;
    }

    return (
      <View className="flex-row items-center gap-1">
        <View className="w-2 h-2 rounded-full bg-green-500" />
        <Text className="text-green-500 text-xs">Ready</Text>
      </View>
    );
  };

  return (
    <Pressable onPress={handlePress} disabled={isLoading}>
      <View className="flex-row items-center justify-between p-4">
        <View className="flex-1">
          <Text className="text-white font-medium">{model.name}</Text>
          <Text className="text-gray-400 text-sm">{model.description}</Text>
        </View>

        {renderLocalStatus()}

        {selected && !model.isLocal && (
          <View className="w-5 h-5 rounded-full bg-blue-500 ml-3" />
        )}
        {selected && model.isLocal && isPrepared && (
          <View className="w-5 h-5 rounded-full bg-blue-500 ml-3" />
        )}
      </View>
    </Pressable>
  );
}
```

#### C2: Offline Indicator

```typescript
// components/chat/OfflineIndicator.tsx
import { View, Text } from 'react-native';
import { useNetInfo } from '@react-native-community/netinfo';
import { useLocalLLM } from '@/contexts/LocalLLMContext';

export function OfflineIndicator() {
  const netInfo = useNetInfo();
  const { isPrepared } = useLocalLLM();

  // Only show when offline
  if (netInfo.isConnected !== false) return null;

  return (
    <View className="bg-yellow-900/50 px-3 py-1.5 rounded-full flex-row items-center gap-2">
      <View className="w-2 h-2 rounded-full bg-yellow-500" />
      <Text className="text-yellow-200 text-sm">
        {isPrepared ? 'Offline (local model ready)' : 'Offline'}
      </Text>
    </View>
  );
}
```

#### C3: Add Provider to App Layout

```typescript
// app/_layout.tsx - additions

import { LocalLLMProvider } from '@/contexts/LocalLLMContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <LocalLLMProvider>
        <ArtifactProvider>
          {/* ... existing providers ... */}
        </ArtifactProvider>
      </LocalLLMProvider>
    </AuthProvider>
  );
}
```

---

## File Structure

```
lib/
├── local-llm/
│   ├── index.ts               # Barrel exports
│   └── LocalChatTransport.ts  # Custom transport for local inference

contexts/
├── LocalLLMContext.tsx        # Model download/prepare/unload state

components/
├── chat/
│   ├── ModelSelector.tsx      # Updated with download UI
│   └── OfflineIndicator.tsx   # Network status indicator
```

---

## Known Limitations (MVP)

1. **No Expo Go**: Requires dev build (`npx expo prebuild`)
2. **Tool parsing needed**: FunctionGemma outputs special tokens that need parsing
3. **No persistence**: Local chats don't save to server
4. **iOS/Android only**: Web uses cloud models
5. **Small model**: 270M params - good for tool routing, limited for complex responses

---

## Future Enhancements

1. **Hybrid routing**: FunctionGemma decides when to escalate to cloud (Claude)
2. **Parse tool calls**: Detect `<start_function_call>` tokens and execute tools
3. **Larger model option**: Add Gemma 3 1B/4B for higher quality general chat
4. **Local persistence**: SQLite for offline chat history
5. **Background download**: Continue when app backgrounded
6. **Thermal management**: Throttle when device is hot

---

## Testing Checklist

### Phase A: Foundation
- [ ] Install dependencies without errors
- [ ] `npx expo prebuild` succeeds
- [ ] LocalLLMProvider mounts without crash
- [ ] `isDownloaded` correctly detects model state

### Phase B: Transport
- [ ] LocalChatTransport instantiates with model
- [ ] `streamText()` produces tokens
- [ ] SSE Response format parsed by useChat
- [ ] Abort signal stops generation

### Phase C: UI
- [ ] Local model appears in ModelSelector (mobile only)
- [ ] Download progress shows correctly
- [ ] "Tap to load" → model prepares
- [ ] Can switch between cloud and local
- [ ] OfflineIndicator shows when disconnected

### Integration
- [ ] Send message with local model → streaming response
- [ ] Send message with cloud model → still works
- [ ] Unload model frees memory
- [ ] Delete model removes from storage

---

## References

- [@react-native-ai/llama](https://github.com/callstackincubator/ai)
- [llama.rn](https://github.com/mybigday/llama.rn)
- [AI SDK Chat Transport](https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-chat)
- [SmolLM3 on HuggingFace](https://huggingface.co/ggml-org/SmolLM3-3B-GGUF)
