import React, { useCallback, useMemo, useEffect, useRef, memo } from 'react';
import { View, Pressable, Platform, ActivityIndicator, FlatList } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Text } from '@/components/ui/text';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { allModels, localModels, type ChatModel } from '../../lib/ai/models';
import { useLocalLLM } from '../../contexts/LocalLLMContext';
import { colors } from '@/lib/theme';

interface ModelSelectorProps {
  selectedModelId: string;
  onSelectModel: (modelId: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const ModelSelector = memo(function ModelSelector({
  selectedModelId,
  onSelectModel,
  isOpen,
  onClose,
}: ModelSelectorProps) {
  const {
    isDownloaded,
    isPrepared,
    isLoading,
    downloadProgress,
    downloadModel,
    prepareModel,
    error: localModelError,
  } = useLocalLLM();

  // Track if we're waiting for prepare to complete
  const pendingLocalSelectionRef = useRef(false);

  // Auto-select local model once prepared (after user initiated prepare)
  useEffect(() => {
    if (isPrepared && pendingLocalSelectionRef.current && isOpen) {
      pendingLocalSelectionRef.current = false;
      const localModel = localModels[0];
      if (localModel) {
        onSelectModel(localModel.id);
        onClose();
      }
    }
  }, [isPrepared, isOpen, onSelectModel, onClose]);

  const handleSelectModel = async (model: ChatModel) => {
    // For cloud models, just select
    if (!model.isLocal) {
      onSelectModel(model.id);
      onClose();
      return;
    }

    // For local models, handle download/prepare flow
    if (!isDownloaded) {
      // Start download - don't close dialog
      await downloadModel();
      return;
    }

    if (!isPrepared) {
      // Prepare model - mark that we're waiting, then auto-select when ready
      pendingLocalSelectionRef.current = true;
      await prepareModel();
      // Don't close - the useEffect will auto-select once isPrepared becomes true
      return;
    }

    // Model is ready and prepared, select it
    onSelectModel(model.id);
    onClose();
  };

  // Filter out local models on web
  const filteredModels = useMemo(() => {
    if (Platform.OS === 'web') {
      return allModels.filter((m) => !m.isLocal);
    }
    return allModels;
  }, []);

  const renderLocalStatus = useCallback(
    (model: ChatModel) => {
      if (!model.isLocal) return null;

      // Downloading
      if (isLoading && downloadProgress > 0) {
        return (
          <View className="flex-row items-center gap-1 mr-2">
            <View className="w-[60px] h-1 bg-background rounded-sm overflow-hidden">
              <View
                className="h-full bg-primary rounded-sm"
                style={{ width: `${downloadProgress * 100}%` }}
              />
            </View>
            <Text className="text-xs text-muted-foreground">
              {Math.round(downloadProgress * 100)}%
            </Text>
          </View>
        );
      }

      // Loading (preparing)
      if (isLoading) {
        return (
          <View className="flex-row items-center gap-1 mr-2">
            <ActivityIndicator size="small" color={colors.tertiary} />
            <Text className="text-xs text-muted-foreground">Loading...</Text>
          </View>
        );
      }

      // Error state
      if (localModelError) {
        return (
          <View className="flex-row items-center gap-1 mr-2">
            <Feather name="alert-circle" size={14} color={colors.destructive} />
            <Text className="text-xs text-red-500" numberOfLines={1}>
              {localModelError}
            </Text>
          </View>
        );
      }

      // Not downloaded
      if (!isDownloaded) {
        return (
          <View className="flex-row items-center gap-1 mr-2">
            <Feather name="download" size={14} color={colors.tertiary} />
            <Text className="text-xs text-muted-foreground">Download</Text>
          </View>
        );
      }

      // Downloaded but not prepared
      if (!isPrepared) {
        return (
          <View className="flex-row items-center gap-1 mr-2">
            <Text className="text-xs text-muted-foreground">Tap to load</Text>
          </View>
        );
      }

      // Ready
      return (
        <View className="flex-row items-center gap-1 mr-2">
          <View className="w-1.5 h-1.5 rounded-full bg-green-500" />
          <Text className="text-xs text-green-500">Ready</Text>
        </View>
      );
    },
    [isLoading, downloadProgress, isDownloaded, isPrepared, localModelError]
  );

  const renderItem = useCallback(
    ({ item }: { item: ChatModel }) => {
      const isSelected = item.id === selectedModelId;
      const canSelect = !item.isLocal || (isDownloaded && isPrepared);

      return (
        <Pressable
          className={`flex-row items-center justify-between p-4 rounded-xl bg-secondary ${
            isSelected && canSelect ? 'border border-primary' : ''
          }`}
          style={Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : undefined}
          onPress={() => handleSelectModel(item)}
          disabled={isLoading}
        >
          <View className="flex-1">
            <Text
              className={`text-base font-medium mb-1 ${
                isSelected && canSelect ? 'text-primary' : 'text-foreground'
              }`}
            >
              {item.name}
            </Text>
            <Text className="text-sm text-muted-foreground">{item.description}</Text>
          </View>

          {renderLocalStatus(item)}

          {isSelected && canSelect && (
            <Feather name="check" size={20} color={colors.primary} className="ml-2" />
          )}
        </Pressable>
      );
    },
    [selectedModelId, isDownloaded, isPrepared, isLoading, renderLocalStatus]
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[350px] max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle>Select Model</DialogTitle>
        </DialogHeader>
        <View className="gap-2 max-h-[50vh]">
          <FlatList
            data={filteredModels}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={{ gap: 8 }}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </DialogContent>
    </Dialog>
  );
});
