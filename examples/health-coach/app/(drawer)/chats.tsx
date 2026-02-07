import { useCallback, useState, memo } from 'react';
import {
  View,
  FlatList,
  Pressable,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useResolveClassNames } from 'uniwind';
import { Text, Button, Input, ContentLayout } from '@chat-sdk-expo/ui/primitives';
import { useChats, type ChatWithSnippet } from '@/hooks/useChats';
import { generateAPIUrl } from '@/utils';

// ============================================================================
// SEARCH HEADER COMPONENT (memoized to prevent re-mount on input change)
// ============================================================================

interface SearchHeaderProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isSearching: boolean;
  count: number;
}

const SearchHeader = memo(function SearchHeader({
  searchQuery,
  setSearchQuery,
  isSearching,
  count,
}: SearchHeaderProps) {
  const mutedForegroundStyle = useResolveClassNames('text-muted-foreground');

  return (
    <ContentLayout contentClassName="pb-2 pt-4">
      {/* Search Input */}
      <View className="bg-secondary flex-row items-center rounded-lg px-3">
        <Feather name="search" size={18} color={mutedForegroundStyle.color as string} />
        <Input
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search your chats..."
          placeholderTextColor={mutedForegroundStyle.color as string}
          className="flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0"
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery('')}>
            <Feather name="x" size={18} color={mutedForegroundStyle.color as string} />
          </Pressable>
        )}
      </View>

      {/* Count */}
      <View className="mt-4 flex-row items-center">
        <Text className="text-muted-foreground text-sm">
          {isSearching
            ? `${count} result${count === 1 ? '' : 's'}`
            : `${count} chat${count === 1 ? '' : 's'}`}
        </Text>
      </View>
    </ContentLayout>
  );
});

// ============================================================================
// RELATIVE TIME HELPER
// ============================================================================

function getRelativeTime(date: Date | string): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  if (diffWeeks < 4) return `${diffWeeks} week${diffWeeks === 1 ? '' : 's'} ago`;
  return `${diffMonths} month${diffMonths === 1 ? '' : 's'} ago`;
}

// ============================================================================
// CHAT ITEM COMPONENT
// ============================================================================

interface ChatItemProps {
  chat: ChatWithSnippet;
  onPress: () => void;
  onExport: () => void;
  onDelete: () => void;
}

function ChatItem({ chat, onPress, onExport, onDelete }: ChatItemProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const mutedForegroundStyle = useResolveClassNames('text-muted-foreground');
  const foregroundStyle = useResolveClassNames('text-foreground');
  const destructiveStyle = useResolveClassNames('text-destructive');

  const handleMenuPress = useCallback(() => {
    setMenuOpen((prev) => !prev);
  }, []);

  const handleExport = useCallback(() => {
    setMenuOpen(false);
    onExport();
  }, [onExport]);

  const handleDelete = useCallback(() => {
    setMenuOpen(false);
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to delete this chat?')) {
        onDelete();
      }
    } else {
      Alert.alert('Delete Chat', 'Are you sure you want to delete this chat?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: onDelete },
      ]);
    }
  }, [onDelete]);

  return (
    <View className="relative">
      <Pressable
        onPress={onPress}
        className="border-border flex-row items-center justify-between border-b px-4 py-3 active:bg-secondary"
      >
        <View className="flex-1 pr-4">
          <Text className="text-foreground text-base font-medium" numberOfLines={1}>
            {chat.title}
          </Text>
          <Text className="text-muted-foreground mt-1 text-sm">
            Last message {getRelativeTime(chat.updatedAt)}
          </Text>
          {chat.snippet && (
            <Text className="text-muted-foreground mt-1 text-sm" numberOfLines={1}>
              {chat.snippet}
            </Text>
          )}
        </View>
        <Pressable
          onPress={handleMenuPress}
          className="p-2"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="more-horizontal" size={20} color={mutedForegroundStyle.color as string} />
        </Pressable>
      </Pressable>

      {/* Dropdown Menu */}
      {menuOpen && (
        <>
          {/* Backdrop */}
          <Pressable
            onPress={() => setMenuOpen(false)}
            className="absolute inset-0 z-10"
            style={{ position: 'absolute', top: -1000, bottom: -1000, left: -1000, right: -1000 }}
          />
          {/* Menu */}
          <View
            className="bg-card border-border absolute right-4 top-12 z-20 min-w-[140px] rounded-lg border shadow-lg"
          >
            <Pressable
              onPress={handleExport}
              className="flex-row items-center gap-3 px-4 py-3 active:bg-secondary"
            >
              <Feather name="download" size={16} color={foregroundStyle.color as string} />
              <Text className="text-foreground text-sm">Export</Text>
            </Pressable>
            <View className="bg-border h-px" />
            <Pressable
              onPress={handleDelete}
              className="flex-row items-center gap-3 px-4 py-3 active:bg-secondary"
            >
              <Feather name="trash-2" size={16} color={destructiveStyle.color as string} />
              <Text className="text-destructive text-sm">Delete</Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ChatsScreen() {
  const router = useRouter();
  const primaryStyle = useResolveClassNames('text-primary');
  const destructiveStyle = useResolveClassNames('text-destructive');
  const mutedForegroundStyle = useResolveClassNames('text-muted-foreground');
  const {
    searchQuery,
    setSearchQuery,
    isSearching,
    chats,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    loadMore,
    deleteChat,
    exportChat,
  } = useChats({
    api: generateAPIUrl('/api'),
    limit: 20,
  });

  const handleNewChat = useCallback(() => {
    router.push('/');
  }, [router]);

  const handleSelectChat = useCallback(
    (chatId: string) => {
      router.push(`/chat/${chatId}`);
    },
    [router]
  );

  const handleExportChat = useCallback(
    async (chatId: string) => {
      try {
        await exportChat(chatId);
      } catch (err) {
        // Error handling is done in the hook
      }
    },
    [exportChat]
  );

  const handleDeleteChat = useCallback(
    async (chatId: string) => {
      try {
        await deleteChat(chatId);
      } catch (err) {
        // Error handling is done in the hook
      }
    },
    [deleteChat]
  );

  const renderItem = useCallback(
    ({ item }: { item: ChatWithSnippet }) => (
      <ContentLayout>
        <ChatItem
          chat={item}
          onPress={() => handleSelectChat(item.id)}
          onExport={() => handleExportChat(item.id)}
          onDelete={() => handleDeleteChat(item.id)}
        />
      </ContentLayout>
    ),
    [handleSelectChat, handleExportChat, handleDeleteChat]
  );

  // Pass as element (not render function) to prevent FlatList from re-mounting on every render
  const headerElement = (
    <SearchHeader
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      isSearching={isSearching}
      count={chats.length}
    />
  );

  const renderFooter = useCallback(() => {
    if (isLoadingMore) {
      return (
        <ContentLayout contentClassName="items-center py-4">
          <ActivityIndicator color={primaryStyle.color as string} />
        </ContentLayout>
      );
    }

    if (hasMore) {
      return (
        <ContentLayout contentClassName="py-4">
          <Button variant="outline" onPress={loadMore}>
            <Text>Show more</Text>
          </Button>
        </ContentLayout>
      );
    }

    return null;
  }, [isLoadingMore, hasMore, loadMore, primaryStyle.color]);

  const renderEmpty = useCallback(() => {
    if (isLoading) {
      return (
        <ContentLayout className="flex-1 justify-center" contentClassName="items-center py-12">
          <ActivityIndicator color={primaryStyle.color as string} size="large" />
        </ContentLayout>
      );
    }

    if (error) {
      return (
        <ContentLayout className="flex-1 justify-center" contentClassName="items-center py-12">
          <Feather name="alert-circle" size={48} color={destructiveStyle.color as string} />
          <Text className="text-muted-foreground mt-4 text-center">
            Failed to load chats
          </Text>
        </ContentLayout>
      );
    }

    return (
      <ContentLayout className="flex-1 justify-center" contentClassName="items-center py-12">
        <Feather name="message-square" size={48} color={mutedForegroundStyle.color as string} />
        <Text className="text-muted-foreground mt-4 text-center">
          {isSearching ? 'No chats found' : 'No chats yet'}
        </Text>
        {!isSearching && (
          <Button variant="outline" onPress={handleNewChat} className="mt-4">
            <Text>Start a new chat</Text>
          </Button>
        )}
      </ContentLayout>
    );
  }, [isLoading, error, isSearching, handleNewChat, primaryStyle.color, destructiveStyle.color, mutedForegroundStyle.color]);

  return (
    <View className="bg-background flex-1">
      <FlatList
        data={chats}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={headerElement}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={chats.length === 0 ? { flex: 1 } : undefined}
      />
    </View>
  );
}
