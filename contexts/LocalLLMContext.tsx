import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react';
import { Platform } from 'react-native';
import { localModels } from '../lib/ai/models';

// Conditionally import llama only on native platforms
let llama: any = null;
let llamaLoadError: Error | null = null;
if (Platform.OS !== 'web') {
  try {
    const llamaModule = require('@react-native-ai/llama');
    llama = llamaModule.llama;
  } catch (e) {
    llamaLoadError = e as Error;
  }
}

interface LocalLLMState {
  isDownloaded: boolean;
  isLoading: boolean;
  isPrepared: boolean;
  downloadProgress: number;
  error: string | null;
  model: any | null; // LanguageModelV2 from llama provider
}

interface LocalLLMContextType extends LocalLLMState {
  downloadModel: () => Promise<void>;
  prepareModel: () => Promise<void>;
  unloadModel: () => Promise<void>;
  deleteModel: () => Promise<void>;
}

const defaultState: LocalLLMState = {
  isDownloaded: false,
  isLoading: false,
  isPrepared: false,
  downloadProgress: 0,
  error: null,
  model: null,
};

const LocalLLMContext = createContext<LocalLLMContextType | null>(null);

export function useLocalLLM(): LocalLLMContextType {
  const context = useContext(LocalLLMContext);
  if (!context) {
    throw new Error('useLocalLLM must be used within LocalLLMProvider');
  }
  return context;
}

interface LocalLLMProviderProps {
  children: ReactNode;
}

export function LocalLLMProvider({ children }: LocalLLMProviderProps) {
  const [state, setState] = useState<LocalLLMState>(defaultState);

  // Get model config (FunctionGemma 270M)
  const modelConfig = localModels[0];

  // Create llama model instance (memoized, only on native)
  const llamaModel = useMemo(() => {
    if (Platform.OS === 'web' || !llama || !modelConfig?.huggingFaceId) {
      return null;
    }
    try {
      return llama.languageModel(modelConfig.huggingFaceId);
    } catch (e) {
      console.error('[LocalLLM] Failed to create model:', e);
      return null;
    }
  }, [modelConfig?.huggingFaceId]);

  // Check if already downloaded on mount
  useEffect(() => {
    if (!llamaModel) return;

    llamaModel.isDownloaded().then((downloaded: boolean) => {
      setState((s) => ({ ...s, isDownloaded: downloaded }));
    }).catch((err: Error) => {
      console.warn('Failed to check download status:', err);
    });
  }, [llamaModel]);

  const downloadModel = useCallback(async () => {
    if (!llamaModel) {
      setState((s) => ({ ...s, error: 'Local models not available on web' }));
      return;
    }

    setState((s) => ({ ...s, isLoading: true, error: null, downloadProgress: 0 }));
    try {
      await llamaModel.download((progress: { percentage: number }) => {
        setState((s) => ({ ...s, downloadProgress: progress.percentage / 100 }));
      });
      setState((s) => ({ ...s, isDownloaded: true, isLoading: false }));
    } catch (error: any) {
      setState((s) => ({ ...s, error: error.message, isLoading: false }));
    }
  }, [llamaModel]);

  const prepareModel = useCallback(async () => {
    if (!llamaModel) {
      console.error('[LocalLLM] prepareModel: llamaModel is null');
      setState((s) => ({ ...s, error: 'Local models not available on web' }));
      return;
    }

    console.log('[LocalLLM] prepareModel: starting...');
    setState((s) => ({ ...s, isLoading: true, error: null }));
    try {
      await llamaModel.prepare();
      console.log('[LocalLLM] prepareModel: success!');
      setState((s) => ({ ...s, model: llamaModel, isPrepared: true, isLoading: false }));
    } catch (error: any) {
      console.error('[LocalLLM] prepareModel failed:', error);
      setState((s) => ({ ...s, error: error.message, isLoading: false }));
    }
  }, [llamaModel]);

  const unloadModel = useCallback(async () => {
    if (!llamaModel) return;

    try {
      await llamaModel.unload();
      setState((s) => ({ ...s, model: null, isPrepared: false }));
    } catch (error: any) {
      setState((s) => ({ ...s, error: error.message }));
    }
  }, [llamaModel]);

  const deleteModel = useCallback(async () => {
    if (!llamaModel) return;

    try {
      await llamaModel.unload();
      await llamaModel.delete();
      setState((s) => ({
        ...s,
        model: null,
        isPrepared: false,
        isDownloaded: false,
      }));
    } catch (error: any) {
      setState((s) => ({ ...s, error: error.message }));
    }
  }, [llamaModel]);

  const contextValue: LocalLLMContextType = {
    ...state,
    downloadModel,
    prepareModel,
    unloadModel,
    deleteModel,
  };

  return (
    <LocalLLMContext.Provider value={contextValue}>
      {children}
    </LocalLLMContext.Provider>
  );
}
