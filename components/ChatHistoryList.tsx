/**
 * ChatHistoryList - Sidebar component for chat history
 *
 * Displays a scrollable list of past chats grouped by date.
 * Used as drawer content on mobile and sidebar on web.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import { useChatHistory, type Chat, type GroupedChats } from '../hooks/useChatHistory';
import { useAuth } from '../contexts/AuthContext';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { colors } from '@/lib/theme';

// ============================================================================
// TYPES
// ============================================================================

export interface ChatHistoryListProps {
  /** API base URL */
  api?: string;
  /** Called when a chat is selected */
  onSelectChat?: (chat: Chat) => void;
  /** Called when user wants to start a new chat */
  onNewChat?: () => void;
  /** Currently active chat ID */
  activeChatId?: string | null;
  /** Expose refresh function to parent */
  onRefreshReady?: (refresh: () => Promise<void>) => void;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ChatHistoryList({
  api = '/api',
  onSelectChat,
  onNewChat,
  activeChatId,
  onRefreshReady,
}: ChatHistoryListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [deletingChatId, setDeletingChatId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const { user, isGuest, signOut } = useAuth();
  const history = useChatHistory({
    api,
    onSelectChat,
  });

  // Track previous user ID to detect user changes
  const prevUserIdRef = useRef<string | undefined>(undefined);

  // Refresh chat history when user changes (login/logout)
  useEffect(() => {
    const currentUserId = user?.id;

    // If user changed (not just initial load), refresh the history
    if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== currentUserId) {
      // Use a small delay to ensure the new session is fully established
      const timeoutId = setTimeout(() => {
        history.refresh();
      }, 100);
      return () => clearTimeout(timeoutId);
    }

    prevUserIdRef.current = currentUserId;
  }, [user?.id, history.refresh]); // Use history.refresh directly for stable reference

  const handleLogout = useCallback(async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
    } finally {
      setIsLoggingOut(false);
    }
  }, [signOut]);

  // Expose refresh to parent
  useEffect(() => {
    onRefreshReady?.(history.refresh);
  }, [history.refresh, onRefreshReady]);

  // Pull-to-refresh handler
  const handlePullToRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await history.refresh();
    } finally {
      setIsRefreshing(false);
    }
  }, [history]);

  const handleDeleteChat = useCallback(
    async (chatId: string) => {
      setDeletingChatId(chatId);
      try {
        await history.deleteChat(chatId);
      } finally {
        setDeletingChatId(null);
      }
    },
    [history]
  );

  const handleDeleteAll = useCallback(async () => {
    setShowDeleteAllConfirm(false);
    await history.deleteAllChats();
    // Navigate to new chat after deleting all
    onNewChat?.();
  }, [history, onNewChat]);

  return (
    <View className="flex-1 bg-card">
      {/* Header */}
      <View className={`flex-row items-center justify-between border-b border-border px-4 py-4 ${Platform.OS === 'web' ? 'pt-4' : 'pt-12'}`}>
        <Text className="text-lg font-semibold">Chats</Text>
        <View className="flex-row gap-2">
          {history.chats.length > 0 && (
            <Tooltip delayDuration={300}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  onPress={() => setShowDeleteAllConfirm(true)}
                >
                  <Feather name="trash-2" size={18} color={colors.mutedForeground} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <Text>Delete all chats</Text>
              </TooltipContent>
            </Tooltip>
          )}
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onPress={onNewChat}
              >
                <Feather name="plus" size={20} color={colors.mutedForeground} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <Text>New chat</Text>
            </TooltipContent>
          </Tooltip>
        </View>
      </View>

      {/* Navigation */}
      <View className="border-b border-border px-2 py-2">
        <Button
          variant="ghost"
          className={`h-auto flex-row items-center justify-start gap-3 rounded-lg px-3 py-2.5 ${pathname === '/chats' ? 'bg-secondary' : ''}`}
          onPress={() => router.push('/chats')}
        >
          <Feather name="message-square" size={18} color={colors.mutedForeground} />
          <Text className="text-sm">Chats</Text>
        </Button>
      </View>

      {/* Chat list */}
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 8 }}>
        {history.isLoading ? (
          <LoadingSkeleton />
        ) : history.chats.length === 0 ? (
          <EmptyState />
        ) : (
          <ChatGroups
            groups={history.groupedChats}
            activeChatId={activeChatId}
            deletingChatId={deletingChatId}
            onSelectChat={(chat) => onSelectChat?.(chat)}
            onDeleteChat={handleDeleteChat}
            onRefresh={handlePullToRefresh}
            isRefreshing={isRefreshing}
          />
        )}
      </ScrollView>

      {/* User section - consistent layout for both guest and regular users */}
      {user && (
        <View className="flex-row items-center justify-between border-t border-border bg-card px-3 py-2">
          <View className="flex-1 flex-row items-center gap-2.5" accessibilityLabel={isGuest ? 'Guest user' : `Signed in as ${user.name || user.email}`}>
            <View className="h-7 w-7 items-center justify-center rounded-full bg-secondary">
              <Text variant="small" className="text-muted-foreground">
                {isGuest ? 'G' : (user.name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase())}
              </Text>
            </View>
            <Text className="flex-1 text-sm" numberOfLines={1}>
              {isGuest ? 'Guest' : user.email}
            </Text>
          </View>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onPress={
              isGuest
                ? () => router.push(`/login?redirect=${encodeURIComponent(pathname)}`)
                : handleLogout
            }
            disabled={isLoggingOut}
            accessibilityLabel={isGuest ? 'Login to your account' : 'Sign out of your account'}
          >
            {isLoggingOut ? (
              <ActivityIndicator size="small" color={colors.mutedForeground} />
            ) : (
              <Feather
                name={isGuest ? 'log-in' : 'log-out'}
                size={18}
                color={colors.mutedForeground}
              />
            )}
          </Button>
        </View>
      )}

      {/* Delete all confirmation dialog */}
      <Dialog open={showDeleteAllConfirm} onOpenChange={setShowDeleteAllConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete all chats?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. All your chats will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onPress={() => setShowDeleteAllConfirm(false)}
            >
              <Text>Cancel</Text>
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onPress={handleDeleteAll}
            >
              <Text>Delete All</Text>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </View>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function ChatGroups({
  groups,
  activeChatId,
  deletingChatId,
  onSelectChat,
  onDeleteChat,
  onRefresh,
  isRefreshing,
}: {
  groups: GroupedChats;
  activeChatId?: string | null;
  deletingChatId: string | null;
  onSelectChat: (chat: Chat) => void;
  onDeleteChat: (chatId: string) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}) {
  // Determine which is the first non-empty group
  const firstGroup = groups.today.length > 0 ? 'today' :
    groups.yesterday.length > 0 ? 'yesterday' :
    groups.lastWeek.length > 0 ? 'lastWeek' :
    groups.lastMonth.length > 0 ? 'lastMonth' :
    groups.older.length > 0 ? 'older' : null;

  return (
    <View className="gap-5">
      {groups.today.length > 0 && (
        <ChatGroup
          title={firstGroup === 'today' ? 'Recents' : 'Today'}
          chats={groups.today}
          activeChatId={activeChatId}
          deletingChatId={deletingChatId}
          onSelectChat={onSelectChat}
          onDeleteChat={onDeleteChat}
          showRefresh={firstGroup === 'today'}
          onRefresh={onRefresh}
          isRefreshing={isRefreshing}
        />
      )}
      {groups.yesterday.length > 0 && (
        <ChatGroup
          title={firstGroup === 'yesterday' ? 'Recents' : 'Yesterday'}
          chats={groups.yesterday}
          activeChatId={activeChatId}
          deletingChatId={deletingChatId}
          onSelectChat={onSelectChat}
          onDeleteChat={onDeleteChat}
          showRefresh={firstGroup === 'yesterday'}
          onRefresh={onRefresh}
          isRefreshing={isRefreshing}
        />
      )}
      {groups.lastWeek.length > 0 && (
        <ChatGroup
          title={firstGroup === 'lastWeek' ? 'Recents' : 'Last 7 days'}
          chats={groups.lastWeek}
          activeChatId={activeChatId}
          deletingChatId={deletingChatId}
          onSelectChat={onSelectChat}
          onDeleteChat={onDeleteChat}
          showRefresh={firstGroup === 'lastWeek'}
          onRefresh={onRefresh}
          isRefreshing={isRefreshing}
        />
      )}
      {groups.lastMonth.length > 0 && (
        <ChatGroup
          title={firstGroup === 'lastMonth' ? 'Recents' : 'Last 30 days'}
          chats={groups.lastMonth}
          activeChatId={activeChatId}
          deletingChatId={deletingChatId}
          onSelectChat={onSelectChat}
          onDeleteChat={onDeleteChat}
          showRefresh={firstGroup === 'lastMonth'}
          onRefresh={onRefresh}
          isRefreshing={isRefreshing}
        />
      )}
      {groups.older.length > 0 && (
        <ChatGroup
          title={firstGroup === 'older' ? 'Recents' : 'Older'}
          chats={groups.older}
          activeChatId={activeChatId}
          deletingChatId={deletingChatId}
          onSelectChat={onSelectChat}
          onDeleteChat={onDeleteChat}
          showRefresh={firstGroup === 'older'}
          onRefresh={onRefresh}
          isRefreshing={isRefreshing}
        />
      )}
    </View>
  );
}

function ChatGroup({
  title,
  chats,
  activeChatId,
  deletingChatId,
  onSelectChat,
  onDeleteChat,
  showRefresh = false,
  onRefresh,
  isRefreshing = false,
}: {
  title: string;
  chats: Chat[];
  activeChatId?: string | null;
  deletingChatId: string | null;
  onSelectChat: (chat: Chat) => void;
  onDeleteChat: (chatId: string) => void;
  showRefresh?: boolean;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}) {
  return (
    <View className="gap-1">
      <View className="flex-row items-center justify-between px-2 py-1">
        <Text variant="muted" className="text-xs uppercase tracking-wide">
          {title}
        </Text>
        {showRefresh && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onPress={onRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <ActivityIndicator size="small" color={colors.tertiary} />
            ) : (
              <Feather name="refresh-cw" size={14} color={colors.tertiary} />
            )}
          </Button>
        )}
      </View>
      {chats.map((chat) => (
        <ChatItem
          key={chat.id}
          chat={chat}
          isActive={chat.id === activeChatId}
          isDeleting={chat.id === deletingChatId}
          onSelect={() => onSelectChat(chat)}
          onDelete={() => onDeleteChat(chat.id)}
        />
      ))}
    </View>
  );
}

function ChatItem({
  chat,
  isActive,
  isDeleting,
  onSelect,
  onDelete,
}: {
  chat: Chat;
  isActive: boolean;
  isDeleting: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <Button
      variant="ghost"
      className={`h-auto flex-row items-center justify-between rounded-lg px-3 py-2.5 ${isActive ? 'bg-secondary' : ''}`}
      onPress={onSelect}
      onLongPress={() => setShowMenu(true)}
      disabled={isDeleting}
    >
      <Text className="mr-2 flex-1 text-sm" numberOfLines={1}>
        {chat.title}
      </Text>
      {isDeleting ? (
        <ActivityIndicator size="small" color={colors.tertiary} />
      ) : (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-50"
          onPress={() => setShowMenu(!showMenu)}
        >
          <Feather name="more-horizontal" size={16} color={colors.tertiary} />
        </Button>
      )}

      {showMenu && (
        <View className="absolute right-2 top-full z-50 rounded-lg border border-border bg-background shadow-lg">
          <Button
            variant="ghost"
            className="h-auto flex-row items-center gap-2 rounded-lg px-3 py-2.5"
            onPress={() => {
              setShowMenu(false);
              onDelete();
            }}
          >
            <Feather name="trash-2" size={14} color={colors.destructive} />
            <Text className="text-sm text-destructive">Delete</Text>
          </Button>
        </View>
      )}
    </Button>
  );
}

function LoadingSkeleton() {
  return (
    <View className="p-2">
      <Text variant="muted" className="mb-2 text-xs">Today</Text>
      {[44, 32, 28, 64, 52].map((width, i) => (
        <View key={i} className="mb-1 h-8 justify-center px-2">
          <View className="h-4 rounded bg-secondary" style={{ width: `${width}%` }} />
        </View>
      ))}
    </View>
  );
}

function EmptyState() {
  return (
    <View className="items-center gap-3 p-8">
      <Feather name="message-circle" size={32} color={colors.tertiary} />
      <Text variant="muted" className="text-center">
        Your conversations will appear here once you start chatting!
      </Text>
    </View>
  );
}
