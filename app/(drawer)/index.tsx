import { View, StyleSheet, Platform } from 'react-native';
import { useCallback, useEffect } from 'react';
import { ChatUI } from '../../components/ChatUI';
import { useChatHistoryContext } from '../../contexts/ChatHistoryContext';
import { generateAPIUrl } from '../../utils';

export default function NewChatScreen() {
  const { refreshHistory, newChatKey, requestNewChat, pendingModelId, clearPendingModelId } = useChatHistoryContext();

  // Clear pending model ID after it's been used
  useEffect(() => {
    if (pendingModelId) {
      // Clear it after a short delay to ensure ChatUI has read it
      const timer = setTimeout(clearPendingModelId, 100);
      return () => clearTimeout(timer);
    }
  }, [pendingModelId, clearPendingModelId]);

  // When the first message is sent and chat is created in DB
  const handleChatCreated = useCallback(
    async (chatId: string) => {
      // Refresh the sidebar to show the new chat
      await refreshHistory();

      // Update URL without full navigation (keeps component mounted)
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.history.replaceState(null, '', `/chat/${chatId}`);
      }
    },
    [refreshHistory]
  );

  return (
    <View style={styles.container}>
      <ChatUI
        key={newChatKey}
        api={generateAPIUrl('/api/chat')}
        welcomeMessage="Hello there!"
        welcomeSubtitle="How can I help you today?"
        placeholder="Send a message..."
        onChatCreated={handleChatCreated}
        onRequestNewChat={requestNewChat}
        initialModelId={pendingModelId || undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
});
