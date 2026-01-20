import React, { useCallback, useMemo, useRef, memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme';
import { chatModels, type ChatModel } from '../../lib/ai/models';

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

  const handleSelectModel = (model: ChatModel) => {
    onSelectModel(model.id);
    bottomSheetRef.current?.close();
  };

  const renderItem = useCallback(
    ({ item }: { item: ChatModel }) => {
      const isSelected = item.id === selectedModelId;
      return (
        <TouchableOpacity
          style={[
            styles.modelItem,
            isSelected && styles.modelItemSelected,
            Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
          ]}
          onPress={() => handleSelectModel(item)}
        >
          <View style={styles.modelInfo}>
            <Text style={[styles.modelName, isSelected && styles.modelNameSelected]}>
              {item.name}
            </Text>
            <Text style={styles.modelDescription}>{item.description}</Text>
          </View>
          {isSelected && (
            <Feather name="check" size={20} color={colors.accent.primary} />
          )}
        </TouchableOpacity>
      );
    },
    [selectedModelId]
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
        data={chatModels}
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
});
