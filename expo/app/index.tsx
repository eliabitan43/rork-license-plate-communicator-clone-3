import { Redirect } from 'expo-router';
import { useAppStore } from '@/hooks/useAppStore';
import { Text, StyleSheet, SafeAreaView, View, TouchableOpacity, Animated } from 'react-native';
import { designTokens } from '@/constants/theme';
import { HomiLogo } from '@/components/HomiLogo';
import React, { useState, useEffect, useRef } from 'react';

export default function RootIndex() {
  console.log('RootIndex component mounting...');
  const [isReady, setIsReady] = useState(false);

  const appStore = useAppStore();

  const onboardingComplete = appStore?.onboardingComplete ?? false;
  const isLoading = appStore?.isLoading ?? false;
  const userProfile = appStore?.userProfile;

  const pulseAnim = useRef(new Animated.Value(0.3)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;

  console.log('RootIndex render state:', { 
    onboardingComplete, 
    isLoading,
    hasAppStore: !!appStore,
    hasUserProfile: !!userProfile,
    isReady,
  });

  useEffect(() => {
    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(() => {
      setIsReady(true);
    }, 100);
    return () => clearTimeout(timer);
  }, [fadeIn]);

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  if (!appStore) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Animated.View style={[styles.logoContainer, { opacity: fadeIn }]}>
          <HomiLogo size={120} showSlogan={false} />
          <Text style={[styles.tagline, { color: designTokens.color.error }]}>Failed to load app data</Text>
        </Animated.View>
        <Text style={styles.loadingText}>
          Please restart the app
        </Text>
        {__DEV__ && (
          <TouchableOpacity 
            style={styles.debugButton}
            onPress={() => {
              void import('expo-router').then(({ router }) => {
                router.replace('/debug-startup');
              });
            }}
          >
            <Text style={styles.debugButtonText}>Debug Startup Issues</Text>
          </TouchableOpacity>
        )}
      </SafeAreaView>
    );
  }

  if (!isReady) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Animated.View style={[styles.logoContainer, { opacity: fadeIn }]}>
          <HomiLogo size={120} showSlogan={false} />
        </Animated.View>
        <Animated.View style={[styles.loadingBar, { opacity: pulseAnim }]}>
          <View style={styles.loadingBarInner} />
        </Animated.View>
        <Text style={styles.loadingText}>Loading...</Text>
      </SafeAreaView>
    );
  }

  console.log('RootIndex: routing decision', {
    onboardingComplete,
    hasProfile: Boolean(userProfile),
  });

  if (!onboardingComplete || !userProfile) {
    return <Redirect href="/onboarding" />;
  }

  return <Redirect href="/(tabs)/dashboard" />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: designTokens.color.bg,
    padding: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  tagline: {
    fontSize: 12,
    color: designTokens.color.textMuted,
    marginTop: 4,
    fontWeight: '600' as const,
    textAlign: 'center' as const,
  },
  loadingBar: {
    width: 48,
    height: 4,
    borderRadius: 2,
    backgroundColor: designTokens.color.border,
    overflow: 'hidden',
    marginBottom: 16,
  },
  loadingBarInner: {
    width: '60%' as const,
    height: '100%' as const,
    borderRadius: 2,
    backgroundColor: designTokens.color.primary,
  },
  loadingText: {
    fontSize: 15,
    color: designTokens.color.textMuted,
    textAlign: 'center',
    fontWeight: '500' as const,
  },
  debugButton: {
    marginTop: 24,
    backgroundColor: designTokens.color.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: designTokens.radius.lg,
    shadowColor: designTokens.color.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  debugButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600' as const,
    textAlign: 'center',
  },
});
