# Local LLM Implementation Plan

## Overview

Add on-device LLM inference with **Gemma 3 270M** for native mobile (iOS/Android), allowing offline AI chat without API calls. Web platform will continue using cloud APIs only.

## Recommended Approach: Cactus SDK

After evaluating several options, **[Cactus](https://github.com/cactus-compute/cactus)** is the recommended solution:

| Library | Pros | Cons |
|---------|------|------|
| **Cactus** ✓ | Modern, Y Combinator-backed, supports Gemma 3, streaming, React Native SDK, good benchmarks | Newer library, requires native modules |
| expo-llm-mediapipe | Expo native module, simple API | No streaming, older Gemma 2B only |
| react-native-llm-mediapipe | MediaPipe-based, mature | Limited to Gemma 2B, no Gemma 3 |
| llama.rn | llama.cpp binding, any GGUF | Lower-level API, more manual setup |

### Why Cactus?

1. **Gemma 3 Support**: Specifically supports `gemma-3-270m-it` (172MB compressed)
2. **Performance**: Sub-50ms time-to-first-token, 16-20 tok/s on mid-range devices
3. **Streaming**: Built-in `onToken` callback for token-by-token streaming
4. **React Native SDK**: Official `cactus-react-native` package
5. **GGUF Compatible**: Can use any Hugging Face GGUF model
6. **Active Development**: Backed by Y Combinator, regular updates

---

## Model Choice: Gemma 3 270M

| Model | Size | RAM | Use Case |
|-------|------|-----|----------|
| **gemma-3-270m-it** ✓ | ~172MB (INT4) | ~550MB | Lightweight, battery efficient |
| gemma-3-1b-it | ~642MB | ~1.5GB | More capable, heavier |

**Gemma 3 270M** is ideal because:
- 0.75% battery for 25 conversations (Google's Pixel 9 tests)
- 100M transformer parameters + 170M embedding parameters
- 32K context window
- Fits comfortably on any modern smartphone

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       Model Selector                        │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌──────────────────┐  │
│  │ Haiku   │ │ Sonnet  │ │  Opus   │ │ Gemma 3 (Local)  │  │
│  │ (Cloud) │ │ (Cloud) │ │ (Cloud) │ │ 📱 On-Device     │  │
│  └─────────┘ └─────────┘ └─────────┘ └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Chat Provider Layer                       │
│  ┌─────────────────────────┐ ┌────────────────────────────┐ │
│  │   Cloud Provider        │ │   Local Provider           │ │
│  │   (API route)           │ │   (Native bridge)          │ │
│  │   • Anthropic SDK       │ │   • Cactus SDK             │ │
│  │   • Server-side         │ │   • Client-side            │ │
│  │   • Full tool support   │ │   • Basic completion       │ │
│  └─────────────────────────┘ └────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

1. **Platform-specific rendering**: Local model option hidden on web
2. **Dual chat providers**: Abstract cloud vs local inference behind common interface
3. **On-demand download**: Model downloaded only when first selected
4. **Persistent storage**: Model cached in app documents directory
5. **Graceful degradation**: If local inference fails, offer to switch to cloud

---

## Implementation Phases

### Phase A: Foundation (~2-3 days effort)

**A1. Install Dependencies**
```bash
npm install cactus-react-native react-native-nitro-modules --legacy-peer-deps
cd ios && pod install
```

**A2. Extend Model Types**
```typescript
// lib/ai/models.ts
export interface ChatModel {
  id: string;
  name: string;
  description: string;
  supportsReasoning?: boolean;
  isLocal?: boolean;           // NEW: On-device model
  localConfig?: {              // NEW: Cactus config
    slug: string;              // e.g., 'gemma-3-270m-it'
    quantization: 'int4' | 'int8';
    contextSize: number;
  };
}

export const chatModels: ChatModel[] = [
  // ... existing Claude models ...
  {
    id: 'gemma-3-270m-local',
    name: 'Gemma 3 (Local)',
    description: 'On-device • No internet required',
    isLocal: true,
    localConfig: {
      slug: 'gemma-3-270m-it',
      quantization: 'int4',
      contextSize: 4096,
    },
  },
];
```

**A3. Create Local LLM Context**
```typescript
// contexts/LocalLLMContext.tsx
interface LocalLLMState {
  isAvailable: boolean;        // Platform supports local LLM
  downloadProgress: number;    // 0-100
  downloadStatus: 'idle' | 'downloading' | 'ready' | 'error';
  isGenerating: boolean;
}

interface LocalLLMActions {
  downloadModel: (modelId: string) => Promise<void>;
  deleteModel: (modelId: string) => Promise<void>;
  checkModelStatus: (modelId: string) => Promise<boolean>;
  generate: (messages: Message[], onToken: (token: string) => void) => Promise<string>;
  cancelGeneration: () => void;
}
```

---

### Phase B: Download Management (~1-2 days effort)

**B1. Model Download UI in ModelSelector**

When user selects a local model that isn't downloaded:
1. Show download prompt with size info (~172MB)
2. Display progress bar during download
3. Show "Ready" badge when complete

```typescript
// components/chat/ModelSelector.tsx additions
const renderLocalModelItem = ({ item }: { item: ChatModel }) => {
  const { downloadStatus, downloadProgress } = useLocalLLM();

  return (
    <TouchableOpacity onPress={() => handleLocalModelSelect(item)}>
      <View>
        <Text>{item.name}</Text>
        {downloadStatus === 'idle' && (
          <Text>Tap to download (~172MB)</Text>
        )}
        {downloadStatus === 'downloading' && (
          <ProgressBar progress={downloadProgress} />
        )}
        {downloadStatus === 'ready' && (
          <Badge>Ready</Badge>
        )}
      </View>
    </TouchableOpacity>
  );
};
```

**B2. Storage Management**
```typescript
// lib/local-llm/storage.ts
import * as FileSystem from 'expo-file-system';

const MODEL_DIR = `${FileSystem.documentDirectory}models/`;

export async function getModelPath(modelId: string): Promise<string> {
  return `${MODEL_DIR}${modelId}/`;
}

export async function isModelDownloaded(modelId: string): Promise<boolean> {
  const path = await getModelPath(modelId);
  const info = await FileSystem.getInfoAsync(path);
  return info.exists;
}

export async function deleteModel(modelId: string): Promise<void> {
  const path = await getModelPath(modelId);
  await FileSystem.deleteAsync(path, { idempotent: true });
}

export async function getStorageUsage(): Promise<number> {
  // Return total MB used by downloaded models
}
```

---

### Phase C: Inference Integration (~2-3 days effort)

**C1. Cactus Wrapper Hook**
```typescript
// hooks/useLocalInference.ts
import { CactusLM, useCactusLM } from 'cactus-react-native';

export function useLocalInference(modelConfig: LocalModelConfig) {
  const [cactusLM, setCactusLM] = useState<CactusLM | null>(null);

  const initialize = useCallback(async () => {
    const lm = new CactusLM({
      slug: modelConfig.slug,
      quantization: modelConfig.quantization,
      contextSize: modelConfig.contextSize,
    });

    await lm.init();
    setCactusLM(lm);
  }, [modelConfig]);

  const generate = useCallback(async (
    messages: Message[],
    onToken: (token: string) => void
  ) => {
    if (!cactusLM) throw new Error('Model not initialized');

    const result = await cactusLM.complete({
      messages: messages.map(m => ({
        role: m.role,
        content: getTextContent(m),
      })),
      onToken,
    });

    return result;
  }, [cactusLM]);

  const cleanup = useCallback(async () => {
    await cactusLM?.destroy();
  }, [cactusLM]);

  return { initialize, generate, cleanup };
}
```

**C2. Unified Chat Hook**
```typescript
// hooks/useChatUnified.ts
// Abstracts cloud vs local inference

export function useChatUnified(options: ChatOptions) {
  const { modelId } = options;
  const model = getModelById(modelId);

  // Use Vercel AI SDK for cloud models
  const cloudChat = useChat({
    api: '/api/chat',
    // ... existing options
  });

  // Use local inference for on-device models
  const localInference = useLocalInference(model?.localConfig);
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [isLocalGenerating, setIsLocalGenerating] = useState(false);

  const sendMessage = useCallback(async (content: string) => {
    if (model?.isLocal) {
      // Local inference path
      const userMessage = createUserMessage(content);
      setLocalMessages(prev => [...prev, userMessage]);
      setIsLocalGenerating(true);

      let assistantContent = '';
      const assistantMessage = createAssistantMessage('');
      setLocalMessages(prev => [...prev, assistantMessage]);

      await localInference.generate(
        [...localMessages, userMessage],
        (token) => {
          assistantContent += token;
          // Update streaming message
          setLocalMessages(prev =>
            updateLastMessage(prev, assistantContent)
          );
        }
      );

      setIsLocalGenerating(false);
      // Save to database...
    } else {
      // Cloud inference path (existing)
      cloudChat.append({ role: 'user', content });
    }
  }, [model, localMessages, localInference, cloudChat]);

  return {
    messages: model?.isLocal ? localMessages : cloudChat.messages,
    isLoading: model?.isLocal ? isLocalGenerating : cloudChat.isLoading,
    sendMessage,
    // ... other unified API
  };
}
```

---

### Phase D: UI Polish (~1-2 days effort)

**D1. Platform Detection**
```typescript
// lib/local-llm/platform.ts
import { Platform } from 'react-native';

export function supportsLocalLLM(): boolean {
  // Only native platforms support local inference
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

export function getDeviceCapabilities() {
  // Could check RAM, storage space, etc.
  return {
    hasEnoughStorage: true,  // Check > 500MB free
    hasEnoughMemory: true,   // Check > 1GB RAM
  };
}
```

**D2. ModelSelector Enhancements**
```typescript
// Filter models by platform
const availableModels = useMemo(() => {
  if (supportsLocalLLM()) {
    return chatModels;
  }
  return chatModels.filter(m => !m.isLocal);
}, []);
```

**D3. Download Management Screen** (optional)
```typescript
// app/settings/models.tsx
// - List downloaded models with sizes
// - Delete button for each
// - Total storage used
// - Download queue status
```

**D4. Offline Indicator**
```typescript
// Show "Offline Mode" badge when using local model
// Show network status indicator
```

---

## File Structure

```
lib/
├── ai/
│   ├── models.ts              # Extended with isLocal, localConfig
│   └── tools/                 # (Cloud-only for now)
├── local-llm/                 # NEW
│   ├── index.ts               # Barrel exports
│   ├── platform.ts            # Platform detection
│   ├── storage.ts             # Model file management
│   └── cactus-adapter.ts      # Cactus SDK wrapper

hooks/
├── useLocalInference.ts       # NEW: Cactus integration
└── useChatUnified.ts          # NEW: Cloud/local abstraction

contexts/
├── LocalLLMContext.tsx        # NEW: Global local LLM state
└── ...existing

components/
├── chat/
│   ├── ModelSelector.tsx      # Extended for download UI
│   └── OfflineIndicator.tsx   # NEW: Shows offline status
└── settings/
    └── ModelManagement.tsx    # NEW: Downloaded models list
```

---

## Limitations & Considerations

### What Local Models Can't Do (Initially)
- **Tool calling**: Weather, documents, etc. require cloud
- **Extended thinking**: Reasoning mode is Claude-specific
- **Vision**: Gemma 3 270M is text-only
- **Long context**: Limited to ~4K tokens vs cloud's 200K

### Future Enhancements
1. **FunctionGemma**: Google's tool-calling fine-tune of Gemma 3 270M
2. **Gemma 3N**: Multimodal version for vision tasks
3. **Larger models**: gemma-3-1b-it for more capable responses
4. **Hybrid mode**: Use local for simple queries, cloud for complex

### Technical Considerations
- **Memory pressure**: May need to unload model during background
- **Thermal throttling**: Long conversations may slow down
- **First-load latency**: ~2-3 seconds to load model into memory
- **Expo compatibility**: Requires development build (not Expo Go)

---

## Testing Checklist

- [ ] Model downloads successfully on iOS
- [ ] Model downloads successfully on Android
- [ ] Download can be cancelled/resumed
- [ ] Downloaded model persists across app restarts
- [ ] Inference produces coherent responses
- [ ] Streaming tokens display smoothly
- [ ] Generation can be stopped mid-response
- [ ] Switching between cloud/local models works
- [ ] Chat history saves for local model conversations
- [ ] Web platform hides local model option
- [ ] Low storage warning shows appropriately
- [ ] Model can be deleted to free space

---

## Dependencies to Add

```json
{
  "dependencies": {
    "cactus-react-native": "^0.x.x",
    "react-native-nitro-modules": "^0.x.x"
  }
}
```

**Note**: Requires Expo development build with native modules.

---

## References

- [Cactus GitHub](https://github.com/cactus-compute/cactus)
- [Cactus React Native](https://github.com/cactus-compute/cactus-react-native)
- [Gemma 3 270M GGUF](https://huggingface.co/unsloth/gemma-3-270m-it-GGUF)
- [Google Gemma 3 270M Blog](https://developers.googleblog.com/en/introducing-gemma-3-270m/)
- [Callstack React Native AI](https://www.callstack.com/blog/meet-react-native-ai-llms-running-on-mobile-for-real)
- [expo-llm-mediapipe](https://github.com/tirthajyoti-ghosh/expo-llm-mediapipe)
