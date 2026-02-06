/**
 * ContentLayout - Centered content container with max-width
 *
 * Use this layout for consistent content width across all views.
 * Content is centered horizontally with a max-width of 4xl (896px).
 */

import { View } from 'react-native';
import { cn } from '@/lib/utils';

interface ContentLayoutProps {
  children: React.ReactNode;
  /** Additional classes for the outer container */
  className?: string;
  /** Additional classes for the inner content wrapper */
  contentClassName?: string;
}

/**
 * Wrapper for centered, max-width content.
 * Use inside ScrollView/FlatList or as a standalone container.
 *
 * @example
 * // Inside a ScrollView
 * <ScrollView contentContainerClassName="grow items-center">
 *   <ContentLayout>
 *     <YourContent />
 *   </ContentLayout>
 * </ScrollView>
 *
 * @example
 * // As FlatList container style
 * <FlatList
 *   contentContainerStyle={{ alignItems: 'center' }}
 *   ListHeaderComponent={() => <ContentLayout>...</ContentLayout>}
 * />
 */
export function ContentLayout({
  children,
  className,
  contentClassName,
}: ContentLayoutProps) {
  return (
    <View className={cn('w-full items-center', className)}>
      <View className={cn('w-full max-w-4xl px-3', contentClassName)}>
        {children}
      </View>
    </View>
  );
}
