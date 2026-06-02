import React, { memo, PropsWithChildren } from 'react';
import { View, StyleSheet, ViewStyle, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { designTokens } from '@/constants/theme';

interface GlassCardProps {
  variant?: 'light' | 'dark' | 'accent';
  style?: ViewStyle | ViewStyle[];
  intensity?: number;
  testID?: string;
}

export const GlassCard = memo(function GlassCard({
  children,
  variant = 'light',
  style,
  intensity,
  testID,
}: PropsWithChildren<GlassCardProps>) {
  const glass = designTokens.glass[variant];
  const blurIntensity = intensity ?? glass.blurIntensity;

  if (Platform.OS === 'web') {
    return (
      <View
        testID={testID}
        style={[
          styles.base,
          {
            backgroundColor: glass.backgroundSolid,
            borderColor: glass.border,
            shadowColor: glass.shadowColor,
            shadowOpacity: glass.shadowOpacity,
          },
          style,
        ]}
      >
        {children}
      </View>
    );
  }

  return (
    <View
      testID={testID}
      style={[
        styles.base,
        {
          borderColor: glass.border,
          overflow: 'hidden',
          shadowColor: glass.shadowColor,
          shadowOpacity: glass.shadowOpacity,
        },
        style,
      ]}
    >
      <BlurView
        intensity={blurIntensity}
        tint={variant === 'dark' ? 'dark' : 'light'}
        style={StyleSheet.absoluteFill}
      />
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: glass.background },
        ]}
      />
      {children}
    </View>
  );
});

const styles = StyleSheet.create({
  base: {
    borderRadius: designTokens.radius.xl,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 20,
    elevation: 3,
  },
});
