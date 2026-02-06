/**
 * ChatHistoryContext - Provides chat history refresh functionality across the app
 */

import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface ChatHistoryContextValue {
  /** Refresh the chat history list */
  refreshHistory: () => Promise<void>;
  /** Set the refresh function (called by ChatHistoryList) */
  setRefreshFn: (fn: () => Promise<void>) => void;
  /** Key that changes when a new chat is requested (use as component key) */
  newChatKey: number;
  /** Request a new chat (increments key to force remount) */
  requestNewChat: (modelId?: string) => void;
  /** Model ID to use for the new chat (set by requestNewChat) */
  pendingModelId: string | null;
  /** Clear the pending model ID (called after ChatUI reads it) */
  clearPendingModelId: () => void;
}

const ChatHistoryContext = createContext<ChatHistoryContextValue | null>(null);

export function ChatHistoryProvider({ children }: { children: ReactNode }) {
  const [refreshFn, setRefreshFnState] = useState<(() => Promise<void>) | null>(null);
  const [newChatKey, setNewChatKey] = useState(0);
  const [pendingModelId, setPendingModelId] = useState<string | null>(null);

  const setRefreshFn = useCallback((fn: () => Promise<void>) => {
    setRefreshFnState(() => fn);
  }, []);

  const refreshHistory = useCallback(async () => {
    if (refreshFn) {
      await refreshFn();
    }
  }, [refreshFn]);

  const requestNewChat = useCallback((modelId?: string) => {
    if (modelId) {
      setPendingModelId(modelId);
    }
    setNewChatKey((k) => k + 1);
  }, []);

  const clearPendingModelId = useCallback(() => {
    setPendingModelId(null);
  }, []);

  return (
    <ChatHistoryContext.Provider value={{ refreshHistory, setRefreshFn, newChatKey, requestNewChat, pendingModelId, clearPendingModelId }}>
      {children}
    </ChatHistoryContext.Provider>
  );
}

export function useChatHistoryContext() {
  const context = useContext(ChatHistoryContext);
  if (!context) {
    throw new Error('useChatHistoryContext must be used within a ChatHistoryProvider');
  }
  return context;
}
