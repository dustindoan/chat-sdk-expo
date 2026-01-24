import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState, useCallback } from 'react';
import { ChatUI } from '../../../components/ChatUI';
import { generateAPIUrl } from '../../../utils';
import { useChatHistoryContext } from '../../../contexts/ChatHistoryContext';
import type { UIMessage } from '@ai-sdk/react';

interface ChatData {
  chat: {
    id: string;
    title: string;
    model?: string;
  };
  messages: Array<{
    id: string;
    role: 'user' | 'assistant' | 'system';
    parts: any[];
    createdAt: string;
  }>;
}

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { requestNewChat } = useChatHistoryContext();
  const [chatData, setChatData] = useState<ChatData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // When model type changes, navigate to home to start a new chat with the new model
  const handleRequestNewChat = useCallback((modelId: string) => {
    requestNewChat(modelId);
    router.replace('/');
  }, [router, requestNewChat]);

  useEffect(() => {
    async function loadChat() {
      if (!id) return;

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(generateAPIUrl(`/api/chats/${id}`));
        if (!response.ok) {
          throw new Error('Chat not found');
        }
        const data = await response.json();
        setChatData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load chat');
      } finally {
        setIsLoading(false);
      }
    }

    loadChat();
  }, [id]);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (error || !chatData) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error || 'Chat not found'}</Text>
      </View>
    );
  }

  // Transform DB messages to UIMessage format
  const initialMessages: UIMessage[] = chatData.messages.map((msg) => ({
    id: msg.id,
    role: msg.role,
    parts: msg.parts,
    createdAt: new Date(msg.createdAt),
  }));

  return (
    <View style={styles.container}>
      <ChatUI
        chatId={id}
        initialMessages={initialMessages}
        api={generateAPIUrl('/api/chat')}
        welcomeMessage="Hello there!"
        welcomeSubtitle="How can I help you today?"
        placeholder="Send a message..."
        onRequestNewChat={handleRequestNewChat}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
  },
  errorText: {
    color: '#a1a1aa',
    fontSize: 16,
  },
});
