import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNetInfo } from '@react-native-community/netinfo';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WifiOff } from 'lucide-react-native';
import { designTokens } from '@/constants/theme';

/**
 * Slim top banner while the device is offline. Sends queue automatically and
 * flush on reconnect (see useAppStore), so the copy promises exactly that.
 */
export function OfflineBanner() {
  const netInfo = useNetInfo();
  const insets = useSafeAreaInsets();

  // isConnected is null while unknown — only show when explicitly offline.
  if (netInfo.isConnected !== false) return null;

  return (
    <Animated.View
      entering={FadeInUp.duration(220)}
      exiting={FadeOutUp.duration(180)}
      style={[styles.banner, { top: insets.top + 4 }]}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      testID="offline-banner"
    >
      <View style={styles.inner}>
        <WifiOff size={14} color={designTokens.color.primaryOn} />
        <Text style={styles.text}>You're offline — messages will send when you're back</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 1000,
    alignItems: 'center',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: designTokens.color.secondary,
    borderRadius: designTokens.radius.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  text: {
    color: designTokens.color.primaryOn,
    fontSize: designTokens.type.small.size,
    fontWeight: '600',
  },
});
