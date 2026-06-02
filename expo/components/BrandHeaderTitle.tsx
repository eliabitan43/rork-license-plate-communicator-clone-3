import React, { useMemo } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { designTokens } from '@/constants/theme';
import { HomiLogo } from '@/components/HomiLogo';

interface BrandHeaderTitleProps {
  size?: number;
}

export default function BrandHeaderTitle({ size = 24 }: BrandHeaderTitleProps) {
  const scaled = useMemo(() => Math.max(24, Math.min(40, size)), [size]);
  return (
    <View style={styles.container} testID="brand-header-title">
      <HomiLogo size={scaled} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Platform.OS === 'web' ? 4 : 0,
    backgroundColor: 'transparent',
  },
});
