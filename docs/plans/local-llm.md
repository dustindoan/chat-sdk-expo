# Local LLM Implementation Plan

## Overview

Add on-device LLM inference with **FunctionGemma 270M** for native mobile (iOS/Android), allowing offline AI chat with tool calling support. Web platform will continue using cloud APIs only.

## Technical Analysis

### Runtime Comparison: llama.rn vs Cactus

| Aspect | llama.rn (Recommended) | Cactus |
|--------|------------------------|--------|
| **Foundation** | Direct llama.cpp binding | Uses GGML backends (same engine) |
| **Tool Calling** | ✅ Universal tool call via minja/chat.cpp | ✅ Built-in support |
| **Multimodal** | ✅ Vision + audio support | ✅ Image embedding |
| **Maturity** | More mature, active community | Newer (Y Combinator 2025) |
| **License** | MIT open source | Free for small biz/edu/nonprofit |
| **Control** | Lower-level, more control | High-level, managed |
| **RN Architecture** | Requires New Architecture (v0.10+) | Supports both |
| **GPU Support** | OpenCL (Adreno), Metal (Apple7+) | Automatic |

**Recommendation: llama.rn** because:
1. **Better tool support**: Universal tool call built-in, aligns with existing tool system
2. **More control**: Lower-level API lets us match AI SDK patterns precisely
3. **Fully open source**: MIT license, no restrictions
4. **Mature**: Battle-tested, larger community

### Model Selection: FunctionGemma 270M

| Feature | FunctionGemma 270M |
|---------|-------------------|
| Size | ~172MB quantized (INT4) |
| RAM | ~550MB during inference |
| Context | 32K tokens |
| Tool Calling | ✅ Built-in special tokens |
| Speed | 16-20 tok/s on mid-range devices |

**Why FunctionGemma over base Gemma 3:**
- Purpose-built for agentic tool use
- Special tokens: `<start_function_call>`, `<end_function_call>`, etc.
- 58% → 85% accuracy improvement for function calling
- Same size as base Gemma 3 270M

### AI SDK Integration Strategy

**Key Insight**: The AI SDK's `LanguageModelV1` interface requires `AsyncIterableStream<T>`, not HTTP. Native inference can produce async iterables through the JSI bridge.

```
┌─────────────────────────────────────────────────────┐
│                   AI SDK useChat                     │
└─────────────────────────────────────────────────────┘
                         │
          ┌──────────────┴──────────────┐
          ▼                             ▼
┌─────────────────────┐     ┌─────────────────────────┐
│  Cloud Provider     │     │  Local Provider         │
│  (Anthropic SDK)    │     │  (llama.rn wrapper)     │
│  via API route      │     │  via native bridge      │
└─────────────────────┘     └─────────────────────────┘
```

**Benefits of proper AI SDK integration:**
- Use existing `useChat` hook - no separate hook needed
- Tool calling loop handled automatically
- Middleware works (logging, etc.)
- Consistent API for cloud and local

---

## Implementation

### Phase A: Foundation (2-3 days)

#### A1: Install llama.rn

```bash
# Requires Expo dev build (no Expo Go support)
npx expo install llama.rn
npx expo prebuild
```

**Note**: llama.rn v0.10+ requires React Native New Architecture.

#### A2: Extend Model Types

```typescript
// lib/ai/models.ts
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
  downloadUrl?: string;
  sizeBytes?: number;
  minRamMb?: number;
}

export const localModels: Model[] = [
  {
    id: 'function-gemma-270m',
    name: 'Gemma 3 270M (Local)',
    provider: 'local',
    description: 'On-device, offline capable',
    isLocal: true,
    supportsTools: true,
    supportsVision: false,
    supportsReasoning: false,
    downloadUrl: 'https://huggingface.co/lmstudio-community/gemma-3-270M-it-GGUF/resolve/main/gemma-3-270M-it-Q4_K_M.gguf',
    sizeBytes: 172_000_000, // ~172MB
    minRamMb: 550,
  },
];
```

#### A3: Create Local LLM Context

```typescript
// contexts/LocalLLMContext.tsx
import { createContext, useContext, useState, useCallback } from 'react';
import { initLlama, LlamaContext as LlamaInstance } from 'llama.rn';

interface LocalLLMState {
  isDownloaded: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  downloadProgress: number;
  error: string | null;
  instance: LlamaInstance | null;
}

interface LocalLLMContextType extends LocalLLMState {
  downloadModel: () => Promise<void>;
  initializeModel: () => Promise<void>;
  unloadModel: () => Promise<void>;
  deleteModel: () => Promise<void>;
}

export const LocalLLMContext = createContext<LocalLLMContextType | null>(null);

export function LocalLLMProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<LocalLLMState>({
    isDownloaded: false,
    isLoading: false,
    isInitialized: false,
    downloadProgress: 0,
    error: null,
    instance: null,
  });

  const downloadModel = useCallback(async () => {
    setState(s => ({ ...s, isLoading: true, error: null }));
    try {
      // Download GGUF file to app's document directory
      // Track progress via onProgress callback
      // Save to FileSystem.documentDirectory
    } catch (error) {
      setState(s => ({ ...s, error: error.message, isLoading: false }));
    }
  }, []);

  const initializeModel = useCallback(async () => {
    setState(s => ({ ...s, isLoading: true }));
    try {
      const instance = await initLlama({
        model: `${FileSystem.documentDirectory}gemma-3-270m.gguf`,
        n_ctx: 4096,
        n_batch: 512,
        n_threads: 4,
        use_mlock: true,
      });
      setState(s => ({ ...s, instance, isInitialized: true, isLoading: false }));
    } catch (error) {
      setState(s => ({ ...s, error: error.message, isLoading: false }));
    }
  }, []);

  // ... unloadModel, deleteModel implementations

  return (
    <LocalLLMContext.Provider value={{ ...state, downloadModel, initializeModel, unloadModel, deleteModel }}>
      {children}
    </LocalLLMContext.Provider>
  );
}
```

---

### Phase B: AI SDK Provider (2-3 days)

#### B1: Implement LanguageModelV1 Interface

```typescript
// lib/local-llm/local-provider.ts
import type {
  LanguageModelV1,
  LanguageModelV1StreamPart,
  LanguageModelV1CallOptions,
} from '@ai-sdk/provider';
import type { LlamaContext } from 'llama.rn';

export function createLocalLanguageModel(
  instance: LlamaContext,
  modelId: string
): LanguageModelV1 {
  return {
    specificationVersion: 'v1',
    provider: 'local',
    modelId,

    // Required: Non-streaming generation
    async doGenerate(options: LanguageModelV1CallOptions) {
      const messages = convertPromptToMessages(options.prompt);

      const result = await instance.completion({
        messages,
        n_predict: options.maxTokens ?? 2048,
        temperature: options.temperature ?? 0.7,
        stop: options.stopSequences,
      });

      return {
        text: result.text,
        finishReason: 'stop',
        usage: {
          promptTokens: result.timings?.prompt_n ?? 0,
          completionTokens: result.timings?.predicted_n ?? 0,
        },
        rawCall: { rawPrompt: options.prompt, rawSettings: {} },
      };
    },

    // Required: Streaming generation
    async doStream(options: LanguageModelV1CallOptions) {
      const messages = convertPromptToMessages(options.prompt);
      const stream = createTokenStream(instance, messages, options);

      return {
        stream,
        rawCall: { rawPrompt: options.prompt, rawSettings: {} },
      };
    },
  };
}

// Convert AI SDK prompt format to llama.rn messages
function convertPromptToMessages(prompt: LanguageModelV1Prompt): LlamaMessage[] {
  return prompt.map(part => {
    if (part.role === 'system') {
      return { role: 'system', content: part.content };
    }
    if (part.role === 'user') {
      // Handle text and image parts
      const textParts = part.content.filter(c => c.type === 'text');
      return { role: 'user', content: textParts.map(t => t.text).join('\n') };
    }
    if (part.role === 'assistant') {
      // Handle text and tool calls
      const textParts = part.content.filter(c => c.type === 'text');
      return { role: 'assistant', content: textParts.map(t => t.text).join('') };
    }
    if (part.role === 'tool') {
      return { role: 'tool', content: JSON.stringify(part.content) };
    }
    return { role: 'user', content: '' };
  });
}
```

#### B2: Implement Streaming with Token Queue

The challenge: llama.rn uses push-based callbacks (`onToken`), but `LanguageModelV1` needs pull-based `AsyncIterable`. Solution: token queue.

```typescript
// lib/local-llm/token-stream.ts
import type { LanguageModelV1StreamPart } from '@ai-sdk/provider';
import type { LlamaContext } from 'llama.rn';

interface AsyncIterableStream<T> extends AsyncIterable<T>, ReadableStream<T> {}

export function createTokenStream(
  instance: LlamaContext,
  messages: LlamaMessage[],
  options: LanguageModelV1CallOptions
): AsyncIterableStream<LanguageModelV1StreamPart> {
  // Token queue for push→pull conversion
  const queue: LanguageModelV1StreamPart[] = [];
  let resolveNext: (() => void) | null = null;
  let isDone = false;
  let error: Error | null = null;

  // Start completion in background
  const completionPromise = instance.completion({
    messages,
    n_predict: options.maxTokens ?? 2048,
    temperature: options.temperature ?? 0.7,
    stop: options.stopSequences,

    onToken: (token: string) => {
      // Check for abort
      if (options.abortSignal?.aborted) {
        instance.stopCompletion();
        return;
      }

      // Check for tool call tokens (FunctionGemma format)
      if (token.includes('<start_function_call>')) {
        // Parse and emit tool call part
        // (Implementation depends on FunctionGemma output format)
      } else {
        queue.push({ type: 'text-delta', textDelta: token });
      }

      resolveNext?.();
    },
  }).then((result) => {
    queue.push({
      type: 'finish',
      finishReason: 'stop',
      usage: {
        promptTokens: result.timings?.prompt_n ?? 0,
        completionTokens: result.timings?.predicted_n ?? 0,
      },
    });
    isDone = true;
    resolveNext?.();
  }).catch((err) => {
    error = err;
    isDone = true;
    resolveNext?.();
  });

  // Abort signal handling
  options.abortSignal?.addEventListener('abort', () => {
    instance.stopCompletion();
  });

  // Create async generator
  async function* generateParts(): AsyncGenerator<LanguageModelV1StreamPart> {
    while (!isDone || queue.length > 0) {
      if (queue.length > 0) {
        yield queue.shift()!;
      } else if (!isDone) {
        await new Promise<void>(resolve => { resolveNext = resolve; });
      }
    }
    if (error) throw error;
  }

  // Convert to AsyncIterableStream (required by AI SDK)
  return createAsyncIterableStream(generateParts());
}

// Utility to create AsyncIterableStream from AsyncGenerator
function createAsyncIterableStream<T>(
  generator: AsyncGenerator<T>
): AsyncIterableStream<T> {
  const stream = new ReadableStream<T>({
    async pull(controller) {
      const { value, done } = await generator.next();
      if (done) {
        controller.close();
      } else {
        controller.enqueue(value);
      }
    },
  });

  // Add async iterable protocol
  (stream as any)[Symbol.asyncIterator] = () => generator;

  return stream as AsyncIterableStream<T>;
}
```

#### B3: Tool Call Parsing for FunctionGemma

```typescript
// lib/local-llm/tool-parser.ts

interface ParsedToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export function parseToolCallTokens(text: string): ParsedToolCall | null {
  // FunctionGemma format:
  // <start_function_call>
  // {"name": "get_weather", "arguments": {"location": "San Francisco"}}
  // <end_function_call>

  const startTag = '<start_function_call>';
  const endTag = '<end_function_call>';

  const startIdx = text.indexOf(startTag);
  const endIdx = text.indexOf(endTag);

  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
    return null;
  }

  const jsonStr = text.slice(startIdx + startTag.length, endIdx).trim();

  try {
    const parsed = JSON.parse(jsonStr);
    return {
      id: `local-${Date.now()}`,
      name: parsed.name,
      arguments: parsed.arguments || {},
    };
  } catch {
    return null;
  }
}
```

---

### Phase C: Download Management (1-2 days)

#### C1: Download Progress UI

```typescript
// components/local-llm/DownloadProgress.tsx
import { View, Text, Pressable } from 'react-native';
import { useLocalLLM } from '@/contexts/LocalLLMContext';
import { formatBytes } from '@/lib/utils';

export function DownloadProgress() {
  const {
    isDownloaded,
    isLoading,
    downloadProgress,
    downloadModel,
    error
  } = useLocalLLM();

  if (isDownloaded) {
    return (
      <View className="flex-row items-center gap-2">
        <View className="w-2 h-2 rounded-full bg-green-500" />
        <Text className="text-gray-400 text-sm">Downloaded (172MB)</Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View className="gap-2">
        <View className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <View
            className="h-full bg-blue-500 rounded-full"
            style={{ width: `${downloadProgress * 100}%` }}
          />
        </View>
        <Text className="text-gray-400 text-sm">
          Downloading... {formatBytes(downloadProgress * 172_000_000)} / 172MB
        </Text>
      </View>
    );
  }

  return (
    <Pressable
      onPress={downloadModel}
      className="bg-blue-600 px-4 py-2 rounded-lg"
    >
      <Text className="text-white font-medium">Download Model (172MB)</Text>
    </Pressable>
  );
}
```

#### C2: Storage Management

```typescript
// lib/local-llm/storage.ts
import * as FileSystem from 'expo-file-system';

const MODEL_DIR = `${FileSystem.documentDirectory}models/`;
const MODEL_FILE = `${MODEL_DIR}gemma-3-270m.gguf`;

export async function isModelDownloaded(): Promise<boolean> {
  const info = await FileSystem.getInfoAsync(MODEL_FILE);
  return info.exists && info.size > 100_000_000; // Sanity check size
}

export async function downloadModel(
  url: string,
  onProgress: (progress: number) => void
): Promise<string> {
  await FileSystem.makeDirectoryAsync(MODEL_DIR, { intermediates: true });

  const downloadResumable = FileSystem.createDownloadResumable(
    url,
    MODEL_FILE,
    {},
    (downloadProgress) => {
      const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
      onProgress(progress);
    }
  );

  const result = await downloadResumable.downloadAsync();
  if (!result?.uri) throw new Error('Download failed');

  return result.uri;
}

export async function deleteModel(): Promise<void> {
  await FileSystem.deleteAsync(MODEL_FILE, { idempotent: true });
}

export async function getStorageInfo(): Promise<{
  modelSize: number;
  freeSpace: number;
}> {
  const freeSpace = await FileSystem.getFreeDiskStorageAsync();
  const modelInfo = await FileSystem.getInfoAsync(MODEL_FILE);

  return {
    modelSize: modelInfo.exists ? modelInfo.size : 0,
    freeSpace,
  };
}
```

---

### Phase D: Integration (2-3 days)

#### D1: Unified Chat Hook

```typescript
// hooks/useUnifiedChat.ts
import { useChat } from 'ai/react';
import { useLocalLLM } from '@/contexts/LocalLLMContext';
import { createLocalLanguageModel } from '@/lib/local-llm/local-provider';
import { getModelById } from '@/lib/ai/models';

export function useUnifiedChat(options: {
  chatId: string;
  modelId: string;
  onFinish?: () => void;
}) {
  const { instance, isInitialized } = useLocalLLM();
  const model = getModelById(options.modelId);

  // For cloud models, use standard useChat with API route
  if (!model?.isLocal) {
    return useChat({
      id: options.chatId,
      api: '/api/chat',
      body: { model: options.modelId, chatId: options.chatId },
      onFinish: options.onFinish,
    });
  }

  // For local models, use useChat with custom fetch that runs local inference
  // This leverages AI SDK's state management while bypassing HTTP
  return useChat({
    id: options.chatId,
    // Custom fetch that intercepts and runs locally
    fetch: async (url, init) => {
      if (!instance || !isInitialized) {
        throw new Error('Local model not initialized');
      }

      const body = JSON.parse(init?.body as string);
      const localModel = createLocalLanguageModel(instance, options.modelId);

      // Create a streaming response that mimics what the API would return
      const result = await localModel.doStream({
        prompt: convertMessagesToPrompt(body.messages),
        abortSignal: init?.signal,
      });

      // Convert to SSE format expected by useChat
      return createSSEResponse(result.stream);
    },
    onFinish: options.onFinish,
  });
}
```

#### D2: Model Selector Update

```typescript
// components/chat/ModelSelector.tsx (additions)
import { Platform } from 'react-native';
import { useLocalLLM } from '@/contexts/LocalLLMContext';
import { DownloadProgress } from '@/components/local-llm/DownloadProgress';

function ModelOption({ model, selected, onSelect }) {
  const { isDownloaded, isInitialized, initializeModel } = useLocalLLM();

  // Hide local models on web
  if (model.isLocal && Platform.OS === 'web') {
    return null;
  }

  const handleSelect = async () => {
    if (model.isLocal) {
      if (!isDownloaded) {
        // Show download UI instead of selecting
        return;
      }
      if (!isInitialized) {
        await initializeModel();
      }
    }
    onSelect(model.id);
  };

  return (
    <Pressable onPress={handleSelect}>
      <View className="flex-row items-center justify-between p-4">
        <View>
          <Text className="text-white font-medium">{model.name}</Text>
          <Text className="text-gray-400 text-sm">{model.description}</Text>
        </View>

        {model.isLocal && !isDownloaded && (
          <DownloadProgress />
        )}

        {model.isLocal && isDownloaded && !isInitialized && (
          <Text className="text-gray-400 text-sm">Tap to load</Text>
        )}

        {selected && (
          <View className="w-5 h-5 rounded-full bg-blue-500" />
        )}
      </View>
    </Pressable>
  );
}
```

#### D3: Offline Indicator

```typescript
// components/chat/OfflineIndicator.tsx
import { View, Text } from 'react-native';
import { useNetInfo } from '@react-native-community/netinfo';
import { useLocalLLM } from '@/contexts/LocalLLMContext';

export function OfflineIndicator() {
  const netInfo = useNetInfo();
  const { isInitialized } = useLocalLLM();

  if (netInfo.isConnected) return null;

  return (
    <View className="bg-yellow-900/50 px-3 py-1 rounded-full flex-row items-center gap-2">
      <View className="w-2 h-2 rounded-full bg-yellow-500" />
      <Text className="text-yellow-200 text-sm">
        {isInitialized ? 'Offline (using local model)' : 'Offline'}
      </Text>
    </View>
  );
}
```

---

## File Structure

```
lib/
├── local-llm/
│   ├── index.ts              # Barrel exports
│   ├── local-provider.ts     # LanguageModelV1 implementation
│   ├── token-stream.ts       # Streaming token queue
│   ├── tool-parser.ts        # FunctionGemma tool call parsing
│   └── storage.ts            # Model download/storage utilities

contexts/
├── LocalLLMContext.tsx       # Global local LLM state

components/
├── local-llm/
│   ├── DownloadProgress.tsx  # Download UI
│   └── ModelInfo.tsx         # RAM/storage info display
├── chat/
│   ├── OfflineIndicator.tsx  # Network status indicator
│   └── ModelSelector.tsx     # Updated with local model support

hooks/
├── useUnifiedChat.ts         # Unified cloud/local chat hook
```

---

## Known Limitations

1. **No Expo Go**: Requires dev build with native modules
2. **RAM constraints**: 550MB+ free RAM needed during inference
3. **No vision**: FunctionGemma is text-only
4. **No reasoning**: Extended thinking not supported
5. **Tool subset**: Only tools compatible with FunctionGemma's format
6. **Persistence**: Local chats won't sync to server (offline-first)

---

## Future Enhancements

1. **Hybrid routing**: Auto-route simple queries to local, complex to cloud
2. **Larger models**: Support Gemma 1B for more capable local inference
3. **Background download**: Continue download when app backgrounded
4. **Model updates**: Check for newer quantizations periodically
5. **Thermal management**: Throttle inference when device is hot

---

## Testing Checklist

- [ ] Download model with progress indication
- [ ] Cancel download mid-way
- [ ] Resume download after app restart
- [ ] Load model into memory
- [ ] Basic chat completion
- [ ] Streaming token display
- [ ] Tool calling (weather, temperature)
- [ ] Abort mid-generation
- [ ] Unload model to free RAM
- [ ] Delete model from storage
- [ ] Offline detection and indicator
- [ ] Switch between cloud and local models
- [ ] Memory pressure handling

---

## References

- [llama.rn GitHub](https://github.com/mybigday/llama.rn)
- [FunctionGemma on Hugging Face](https://huggingface.co/google/functiongemma-2b-it)
- [AI SDK Provider Interface](https://sdk.vercel.ai/docs/ai-sdk-core/creating-language-models)
- [Gemma 3 270M Blog](https://blog.google/technology/developers/gemma-3/)
