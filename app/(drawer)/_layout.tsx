import { Platform, TouchableOpacity } from 'react-native';
import { Drawer } from 'expo-router/drawer';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { ChatHistoryList } from '../../components/ChatHistoryList';
import { ChatHistoryProvider, useChatHistoryContext } from '../../contexts/ChatHistoryContext';
import { useArtifact } from '../../contexts/ArtifactContext';
import { generateAPIUrl } from '../../utils';
import { colors, spacing } from '../../lib/theme';
import type { Chat } from '../../hooks/useChatHistory';

function DrawerContent() {
  const router = useRouter();
  const { setRefreshFn, requestNewChat } = useChatHistoryContext();
  const { resetArtifact } = useArtifact();

  const handleSelectChat = (chat: Chat) => {
    router.push(`/chat/${chat.id}`);
  };

  const handleNewChat = () => {
    resetArtifact();
    requestNewChat();
    router.push('/');
  };

  return (
    <ChatHistoryList
      api={generateAPIUrl('/api')}
      onSelectChat={handleSelectChat}
      onNewChat={handleNewChat}
      onRefreshReady={setRefreshFn}
    />
  );
}

function NewChatButton() {
  const router = useRouter();
  const { requestNewChat } = useChatHistoryContext();
  const { resetArtifact } = useArtifact();

  if (Platform.OS === 'web') {
    return null;
  }

  const handlePress = () => {
    resetArtifact();
    requestNewChat();
    router.push('/');
  };

  return (
    <TouchableOpacity onPress={handlePress} style={{ marginRight: spacing[4] }}>
      <Feather name="plus" size={24} color={colors.foreground} />
    </TouchableOpacity>
  );
}

export default function DrawerLayout() {
  return (
    <ChatHistoryProvider>
      <Drawer
        drawerContent={() => <DrawerContent />}
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.background,
          },
          // Fix: Uniwind/Tailwind v4 preflight resets default header padding
          headerLeftContainerStyle: {
            paddingLeft: spacing[3],
          },
          headerTintColor: colors.foreground,
          headerShadowVisible: false,
          drawerStyle: {
            backgroundColor: colors.background,
            width: Platform.OS === 'web' ? 280 : '85%',
          },
          headerRight: () => <NewChatButton />,
        }}
      >
        <Drawer.Screen
          name="index"
          options={{
            title: 'Chat',
          }}
        />
        <Drawer.Screen
          name="chat/[id]"
          options={{
            title: 'Chat',
          }}
        />
      </Drawer>
    </ChatHistoryProvider>
  );
}
