import React, { useMemo } from 'react';
import { Animated, Easing, Platform, StyleSheet, TouchableOpacity, ViewStyle, useColorScheme } from 'react-native';
import { Share as RNShare } from 'react-native';
import { Share as ShareIcon } from 'lucide-react-native';
import { designTokens, theme } from '@/constants/theme';

export type SharePayload = {
  title: string;
  text: string;
  url?: string;
};

interface ShareIconButtonProps {
  payload: SharePayload;
  tone?: 'default' | 'onPrimary';
  style?: ViewStyle;
  testID?: string;
  accessibilityLabel?: string;
}

export function ShareIconButton({ payload, tone = 'default', style, testID, accessibilityLabel }: ShareIconButtonProps) {
  const scheme = useColorScheme();
  const scale = useMemo(() => new Animated.Value(1), []);
  const opacity = useMemo(() => new Animated.Value(0), []);

  const isDark = scheme === 'dark';
  const bgColor = tone === 'onPrimary'
    ? 'rgba(255,255,255,0.20)'
    : (isDark ? designTokens.dark.surfaceElevated : theme.colors.white);
  const borderColor = tone === 'onPrimary'
    ? 'rgba(255,255,255,0.30)'
    : (isDark ? designTokens.dark.border : theme.colors.border);
  const iconColor = tone === 'onPrimary'
    ? theme.colors.white
    : (isDark ? designTokens.dark.text : theme.colors.textPrimary);

  const animateIn = () => {
    Animated.parallel([
      Animated.timing(scale, { toValue: 0.96, duration: 120, easing: Easing.out(Easing.quad), useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(opacity, { toValue: 1, duration: 150, easing: Easing.out(Easing.quad), useNativeDriver: Platform.OS !== 'web' }),
    ]).start();
  };

  const animateOut = (onEnd?: () => void) => {
    Animated.parallel([
      Animated.timing(scale, { toValue: 1, duration: 160, easing: Easing.out(Easing.quad), useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(opacity, { toValue: 0, duration: 160, easing: Easing.out(Easing.quad), useNativeDriver: Platform.OS !== 'web' }),
    ]).start(({ finished }) => {
      if (finished && onEnd) onEnd();
    });
  };

  const openShare = async () => {
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && (navigator as any).share) {
        await (navigator as any).share({ title: payload.title, text: payload.text, url: payload.url });
      } else {
        const message = payload.url ? `${payload.text} ${payload.url}` : payload.text;
        await RNShare.share({ message, title: payload.title });
      }
    } catch (e) {
      console.log('Share cancelled or failed', e);
    }
  };

  return (
    <Animated.View style={[styles.wrap, style, { transform: [{ scale }], opacity: opacity.interpolate({ inputRange: [0, 1], outputRange: [1, 1] }) }]}>
      <TouchableOpacity
        onPressIn={animateIn}
        onPressOut={() => animateOut(openShare)}
        activeOpacity={0.9}
        style={[styles.button, { backgroundColor: bgColor, borderColor }]}
        testID={testID ?? 'share-button'}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? 'Share'}
      >
        <ShareIcon size={19} color={iconColor} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: designTokens.tap.targetMin,
    height: designTokens.tap.targetMin,
  },
  button: {
    width: designTokens.tap.targetMin,
    height: designTokens.tap.targetMin,
    borderRadius: designTokens.tap.targetMin / 2,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
});

export default ShareIconButton;
