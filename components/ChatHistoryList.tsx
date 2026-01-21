/**
 * ChatHistoryList - Sidebar component for chat history
 *
 * Displays a scrollable list of past chats grouped by date.
 * Used as drawer content on mobile and sidebar on web.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  StyleSheet,
  Modal,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useChatHistory, type Chat, type GroupedChats } from '../hooks/useChatHistory';
import { colors } from './theme';

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
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [deletingChatId, setDeletingChatId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const history = useChatHistory({
    api,
    onSelectChat,
  });

  // Expose refresh to parent
  React.useEffect(() => {
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
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chats</Text>
        <View style={styles.headerActions}>
          {history.chats.length > 0 && (
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => setShowDeleteAllConfirm(true)}
            >
              <Feather name="trash-2" size={18} color={colors.text.secondary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.headerButton} onPress={onNewChat}>
            <Feather name="plus" size={20} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Chat list */}
      <ScrollView
        style={styles.listContainer}
        contentContainerStyle={styles.listContent}
        onScroll={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          const isNearBottom =
            layoutMeasurement.height + contentOffset.y >= contentSize.height - 100;
          if (isNearBottom && !history.isLoadingMore && history.hasMore) {
            history.loadMore();
          }
        }}
        scrollEventThrottle={400}
      >
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

        {history.isLoadingMore && (
          <View style={styles.loadingMore}>
            <ActivityIndicator size="small" color={colors.accent.primary} />
            <Text style={styles.loadingMoreText}>Loading...</Text>
          </View>
        )}

        {!history.hasMore && history.chats.length > 0 && (
          <Text style={styles.endOfList}>End of chat history</Text>
        )}
      </ScrollView>

      {/* Delete all confirmation modal */}
      <Modal
        visible={showDeleteAllConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteAllConfirm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Delete all chats?</Text>
            <Text style={styles.modalDescription}>
              This action cannot be undone. All your chats will be permanently deleted.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalButtonCancel}
                onPress={() => setShowDeleteAllConfirm(false)}
              >
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalButtonDelete} onPress={handleDeleteAll}>
                <Text style={styles.modalButtonDeleteText}>Delete All</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    <View style={styles.groups}>
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
    <View style={styles.group}>
      <View style={styles.groupHeader}>
        <Text style={styles.groupTitle}>{title}</Text>
        {showRefresh && (
          <TouchableOpacity
            style={styles.groupRefreshButton}
            onPress={onRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <ActivityIndicator size="small" color={colors.text.tertiary} />
            ) : (
              <Feather name="refresh-cw" size={14} color={colors.text.tertiary} />
            )}
          </TouchableOpacity>
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
    <TouchableOpacity
      style={[styles.chatItem, isActive && styles.chatItemActive]}
      onPress={onSelect}
      onLongPress={() => setShowMenu(true)}
      disabled={isDeleting}
    >
      <Text style={styles.chatItemTitle} numberOfLines={1}>
        {chat.title}
      </Text>
      {isDeleting ? (
        <ActivityIndicator size="small" color={colors.text.tertiary} />
      ) : (
        <TouchableOpacity
          style={styles.chatItemMenu}
          onPress={() => setShowMenu(!showMenu)}
        >
          <Feather name="more-horizontal" size={16} color={colors.text.tertiary} />
        </TouchableOpacity>
      )}

      {showMenu && (
        <View style={styles.chatItemDropdown}>
          <TouchableOpacity
            style={styles.dropdownItem}
            onPress={() => {
              setShowMenu(false);
              onDelete();
            }}
          >
            <Feather name="trash-2" size={14} color={colors.accent.error} />
            <Text style={styles.dropdownItemText}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
}

function LoadingSkeleton() {
  return (
    <View style={styles.skeleton}>
      <Text style={styles.skeletonLabel}>Today</Text>
      {[44, 32, 28, 64, 52].map((width, i) => (
        <View key={i} style={styles.skeletonItem}>
          <View style={[styles.skeletonBar, { width: `${width}%` }]} />
        </View>
      ))}
    </View>
  );
}

function EmptyState() {
  return (
    <View style={styles.emptyState}>
      <Feather name="message-circle" size={32} color={colors.text.tertiary} />
      <Text style={styles.emptyStateText}>
        Your conversations will appear here once you start chatting!
      </Text>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: Platform.OS === 'web' ? 16 : 50,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    padding: 8,
  },

  // List
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: 8,
  },

  // Groups
  groups: {
    gap: 20,
  },
  group: {
    gap: 4,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  groupTitle: {
    fontSize: 12,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  groupRefreshButton: {
    padding: 4,
  },

  // Chat items
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  chatItemActive: {
    backgroundColor: colors.background.tertiary,
  },
  chatItemTitle: {
    flex: 1,
    fontSize: 14,
    color: colors.text.primary,
    marginRight: 8,
  },
  chatItemMenu: {
    padding: 4,
    opacity: 0.5,
  },
  chatItemDropdown: {
    position: 'absolute',
    right: 8,
    top: '100%',
    backgroundColor: colors.background.primary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.default,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 100,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dropdownItemText: {
    fontSize: 14,
    color: colors.accent.error,
  },

  // Loading
  loadingMore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 20,
  },
  loadingMoreText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  endOfList: {
    textAlign: 'center',
    fontSize: 12,
    color: colors.text.tertiary,
    paddingVertical: 20,
  },

  // Skeleton
  skeleton: {
    padding: 8,
  },
  skeletonLabel: {
    fontSize: 12,
    color: colors.text.tertiary,
    marginBottom: 8,
  },
  skeletonItem: {
    height: 32,
    justifyContent: 'center',
    paddingHorizontal: 8,
    marginBottom: 4,
  },
  skeletonBar: {
    height: 16,
    backgroundColor: colors.background.tertiary,
    borderRadius: 4,
  },

  // Empty state
  emptyState: {
    padding: 32,
    alignItems: 'center',
    gap: 12,
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: 24,
    width: 320,
    maxWidth: '90%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalButtonCancel: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  modalButtonCancelText: {
    fontSize: 14,
    color: colors.text.primary,
  },
  modalButtonDelete: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: colors.accent.error,
  },
  modalButtonDeleteText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
});
