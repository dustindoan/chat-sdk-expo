import { Platform, TouchableOpacity, View } from 'react-native';
import { Drawer } from 'expo-router/drawer';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useResolveClassNames } from 'uniwind';
import { ChatHistoryList } from '../../components/ChatHistoryList';
import { ChatHistoryProvider, useChatHistoryContext } from '../../contexts/ChatHistoryContext';
import { useArtifact } from '../../contexts/ArtifactContext';
import { generateAPIUrl } from '../../utils';
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
    <TouchableOpacity onPress={handlePress} className="mr-4">
      <Feather name="plus" size={24} className="text-foreground" />
    </TouchableOpacity>
  );
}

export default function DrawerLayout() {
  // Use Uniwind's useResolveClassNames to convert Tailwind classes to style objects
  // for React Navigation screenOptions which only accept style objects
  const headerStyle = useResolveClassNames('bg-background');
  const headerLeftContainerStyle = useResolveClassNames('pl-3');
  const drawerStyle = useResolveClassNames('bg-background');
  const tintColorStyle = useResolveClassNames('text-foreground');

  return (
    <ChatHistoryProvider>
      <Drawer
        drawerContent={() => <DrawerContent />}
        screenOptions={{
          headerStyle,
          headerLeftContainerStyle,
          headerTintColor: tintColorStyle.color as string,
          headerShadowVisible: false,
          drawerStyle: {
            ...drawerStyle,
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
        <Drawer.Screen
          name="chats"
          options={{
            title: 'Chats',
            // Hide from drawer menu - accessed via sidebar link
            drawerItemStyle: { display: 'none' },
          }}
        />
      </Drawer>
    </ChatHistoryProvider>
  );
}
