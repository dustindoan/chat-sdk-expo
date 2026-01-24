import React, { useCallback, useMemo, useRef, useEffect, memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme';
import { allModels, localModels, type ChatModel } from '../../lib/ai/models';
import { useLocalLLM } from '../../contexts/LocalLLMContext';

// Format bytes to human readable string
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

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
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['50%'], []);

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
        bottomSheetRef.current?.close();
      }
    }
  }, [isPrepared, isOpen, onSelectModel]);

  const handleSheetChanges = useCallback(
    (index: number) => {
      if (index === -1) {
        onClose();
      }
    },
    [onClose]
  );

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    ),
    []
  );

  const handleSelectModel = async (model: ChatModel) => {
    // For cloud models, just select
    if (!model.isLocal) {
      onSelectModel(model.id);
      bottomSheetRef.current?.close();
      return;
    }

    // For local models, handle download/prepare flow
    if (!isDownloaded) {
      // Start download - don't close sheet
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
    bottomSheetRef.current?.close();
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
          <View style={styles.localStatus}>
            <View style={styles.progressContainer}>
              <View style={[styles.progressBar, { width: `${downloadProgress * 100}%` }]} />
            </View>
            <Text style={styles.progressText}>{Math.round(downloadProgress * 100)}%</Text>
          </View>
        );
      }

      // Loading (preparing)
      if (isLoading) {
        return (
          <View style={styles.localStatus}>
            <ActivityIndicator size="small" color={colors.text.tertiary} />
            <Text style={styles.statusText}>Loading...</Text>
          </View>
        );
      }

      // Error state
      if (localModelError) {
        return (
          <View style={styles.localStatus}>
            <Feather name="alert-circle" size={14} color={colors.accent.error} />
            <Text style={[styles.statusText, { color: colors.accent.error }]} numberOfLines={1}>
              {localModelError}
            </Text>
          </View>
        );
      }

      // Not downloaded
      if (!isDownloaded) {
        return (
          <View style={styles.localStatus}>
            <Feather name="download" size={14} color={colors.text.tertiary} />
            <Text style={styles.statusText}>Download</Text>
          </View>
        );
      }

      // Downloaded but not prepared
      if (!isPrepared) {
        return (
          <View style={styles.localStatus}>
            <Text style={styles.statusText}>Tap to load</Text>
          </View>
        );
      }

      // Ready
      return (
        <View style={styles.localStatus}>
          <View style={styles.readyDot} />
          <Text style={styles.readyText}>Ready</Text>
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
        <TouchableOpacity
          style={[
            styles.modelItem,
            isSelected && canSelect && styles.modelItemSelected,
            Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
          ]}
          onPress={() => handleSelectModel(item)}
          disabled={isLoading}
        >
          <View style={styles.modelInfo}>
            <Text style={[styles.modelName, isSelected && canSelect && styles.modelNameSelected]}>
              {item.name}
            </Text>
            <Text style={styles.modelDescription}>{item.description}</Text>
          </View>

          {renderLocalStatus(item)}

          {isSelected && canSelect && (
            <Feather name="check" size={20} color={colors.accent.primary} style={styles.checkIcon} />
          )}
        </TouchableOpacity>
      );
    },
    [selectedModelId, isDownloaded, isPrepared, isLoading, renderLocalStatus]
  );

  if (!isOpen) return null;

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={0}
      snapPoints={snapPoints}
      onChange={handleSheetChanges}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handleIndicator}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Select Model</Text>
      </View>
      <BottomSheetFlatList
        data={filteredModels}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
      />
    </BottomSheet>
  );
});

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: colors.background.secondary,
  },
  handleIndicator: {
    backgroundColor: colors.text.tertiary,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
  },
  listContent: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  modelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.background.tertiary,
  },
  modelItemSelected: {
    borderWidth: 1,
    borderColor: colors.accent.primary,
  },
  modelInfo: {
    flex: 1,
  },
  modelName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  modelNameSelected: {
    color: colors.accent.primary,
  },
  modelDescription: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
  },
  localStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginRight: spacing.sm,
  },
  progressContainer: {
    width: 60,
    height: 4,
    backgroundColor: colors.background.primary,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.accent.primary,
    borderRadius: 2,
  },
  progressText: {
    fontSize: fontSize.xs,
    color: colors.text.tertiary,
  },
  statusText: {
    fontSize: fontSize.xs,
    color: colors.text.tertiary,
  },
  readyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22c55e', // green-500
  },
  readyText: {
    fontSize: fontSize.xs,
    color: '#22c55e',
  },
  checkIcon: {
    marginLeft: spacing.sm,
  },
});
