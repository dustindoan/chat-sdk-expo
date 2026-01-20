import { Platform, TouchableOpacity } from 'react-native';
import { Drawer } from 'expo-router/drawer';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { ChatHistoryList } from '../../components/ChatHistoryList';
import { ChatHistoryProvider, useChatHistoryContext } from '../../contexts/ChatHistoryContext';
import { generateAPIUrl } from '../../utils';
import type { Chat } from '../../hooks/useChatHistory';

const colors = {
  background: '#0a0a0a',
  headerBackground: '#0a0a0a',
  text: '#fafafa',
};

function DrawerContent() {
  const router = useRouter();
  const { setRefreshFn, requestNewChat } = useChatHistoryContext();

  const handleSelectChat = (chat: Chat) => {
    router.push(`/chat/${chat.id}`);
  };

  const handleNewChat = () => {
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

  if (Platform.OS === 'web') {
    return null;
  }

  const handlePress = () => {
    requestNewChat();
    router.push('/');
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={{ marginRight: 16 }}
    >
      <Feather name="plus" size={24} color={colors.text} />
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
            backgroundColor: colors.headerBackground,
          },
          headerTintColor: colors.text,
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
