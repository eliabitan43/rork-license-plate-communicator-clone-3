import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { MotiView } from 'moti';
import { useReducedMotion } from 'react-native-reanimated';
import { designTokens } from '@/constants/theme';

interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Shimmering placeholder block. Use instead of blank screens during initial load.
 * Collapses to a static block when the system requests reduced motion.
 */
export function Skeleton({
  width = '100%',
  height = 16,
  radius = designTokens.radius.sm,
  style,
}: SkeletonProps) {
  const reduced = useReducedMotion();

  if (reduced) {
    return (
      <View
        style={[styles.base, { width, height, borderRadius: radius }, style]}
        accessibilityElementsHidden
      />
    );
  }

  return (
    <MotiView
      from={{ opacity: 0.45 }}
      animate={{ opacity: 1 }}
      transition={{ type: 'timing', duration: 700, loop: true }}
      style={[styles.base, { width, height, borderRadius: radius }, style]}
      accessibilityElementsHidden
    />
  );
}

/** Card-shaped skeleton for feed / inbox rows. */
export function SkeletonCard({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.card, style]} accessibilityLabel="Loading" accessibilityRole="progressbar">
      <View style={styles.cardTop}>
        <Skeleton width={64} height={20} radius={5} />
        <Skeleton width={32} height={12} />
      </View>
      <Skeleton height={13} style={styles.line} />
      <Skeleton width="72%" height={13} />
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: designTokens.color.borderMuted,
  },
  card: {
    backgroundColor: designTokens.color.surface,
    borderRadius: designTokens.radius.lg,
    borderWidth: 1,
    borderColor: designTokens.color.borderMuted,
    padding: 14,
    marginBottom: 9,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  line: {
    marginBottom: 6,
  },
});
