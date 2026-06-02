import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, ActivityIndicator, Alert } from 'react-native';
import { Stack } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RefreshCw, Trash2 } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function RefreshScreen() {
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);

  const canUseNativeReload = useMemo<boolean>(() => Platform.OS !== 'web', []);

  const performReload = useCallback(async () => {
    console.log('[RefreshScreen] performReload called');
    setIsRefreshing(true);
    try {
      if (Platform.OS === 'web') {
        console.log('[RefreshScreen] Reloading via window.location.reload');
        if (typeof window !== 'undefined' && typeof window.location?.reload === 'function') {
          window.location.reload();
        } else if (typeof location !== 'undefined' && typeof location.reload === 'function') {
          location.reload();
        }
      } else {
        console.log('[RefreshScreen] Reloading via native reload');
        // For native platforms, we'll use a different approach
        try {
          // Try to use expo-updates if available
          const Updates = require('expo-updates');
          if (Updates && Updates.reloadAsync) {
            await Updates.reloadAsync();
          } else {
            console.log('[RefreshScreen] expo-updates not available, using fallback');
            // Fallback: clear storage and show message
            Alert.alert('Restart Required', 'Please manually restart the app to complete the refresh.');
          }
        } catch (error) {
          console.log('[RefreshScreen] Updates not available:', error);
          Alert.alert('Restart Required', 'Please manually restart the app to complete the refresh.');
        }
      }
    } catch (error) {
      console.error('[RefreshScreen] Reload failed', error);
      if (Platform.OS !== 'web') {
        try {
          const Updates = require('expo-updates');
          if (Updates && Updates.reloadAsync) {
            await Updates.reloadAsync();
          }
        } catch {}
        Alert.alert('Reload Failed', 'Could not refresh the app. Please try again.');
      }
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const resetAndReload = useCallback(async () => {
    console.log('[RefreshScreen] resetAndReload called');
    setIsResetting(true);
    try {
      await AsyncStorage.clear();
      console.log('[RefreshScreen] AsyncStorage cleared');
    } catch (error) {
      console.error('[RefreshScreen] Failed to clear storage', error);
    } finally {
      setIsResetting(false);
    }
    await performReload();
  }, [performReload]);

  return (
    <SafeAreaView style={styles.container} testID="refresh-screen">
      <Stack.Screen options={{ title: 'Refresh' }} />

      <View style={styles.card} testID="refresh-card">
        <Text style={styles.title}>Quick Refresh</Text>
        <Text style={styles.subtitle}>
          Reload the app to get the latest UI state.
        </Text>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={performReload}
          disabled={isRefreshing}
          testID="refresh-button"
          accessibilityRole="button"
          accessibilityLabel="Refresh App"
        >
          {isRefreshing ? (
            <ActivityIndicator color={theme.colors.white} />
          ) : (
            <RefreshCw color={theme.colors.white} size={20} />
          )}
          <Text style={styles.buttonText}>{isRefreshing ? 'Refreshing…' : 'Refresh App'}</Text>
        </TouchableOpacity>
        <Text style={styles.hint} testID="platform-hint">
          {canUseNativeReload ? 'Uses native reload on device' : 'Uses web reload in browser'}
        </Text>
      </View>

      <View style={styles.card} testID="reset-card">
        <Text style={styles.title}>Hard Reset</Text>
        <Text style={styles.subtitle}>
          Clear cached data and reload. Use if the app is stuck.
        </Text>
        <TouchableOpacity
          style={[styles.button, styles.dangerButton]}
          onPress={resetAndReload}
          disabled={isResetting}
          testID="reset-button"
          accessibilityRole="button"
          accessibilityLabel="Reset App and Reload"
        >
          {isResetting ? (
            <ActivityIndicator color={theme.colors.white} />
          ) : (
            <Trash2 color={theme.colors.white} size={20} />
          )}
          <Text style={styles.buttonText}>{isResetting ? 'Resetting…' : 'Reset & Reload'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background,
    gap: theme.spacing.lg,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: theme.colors.surfaceElevated,
    padding: theme.spacing.xl,
    borderRadius: theme.borderRadius.lg,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
    gap: theme.spacing.md,
  },
  title: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  subtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.sm,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
  },
  dangerButton: {
    backgroundColor: theme.colors.danger,
  },
  buttonText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.md,
    fontWeight: '600',
  },
  hint: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
  },
});
