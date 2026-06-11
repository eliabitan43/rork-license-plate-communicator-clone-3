import React from 'react';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { designTokens } from '@/constants/theme';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

function isCorruptionError(error: Error): boolean {
  return (
    error.message.includes('AsyncStorage') ||
    error.message.includes('JSON') ||
    error.message.includes('Unexpected character') ||
    error.message.includes('corruption detected') ||
    error.message.includes('parse error') ||
    error.message.includes('app will restart')
  );
}

/**
 * Root crash shield: friendly fallback instead of a white screen, with retry,
 * report, and full-reset actions. Preserves the legacy behavior of clearing
 * AsyncStorage automatically when the crash looks like storage corruption.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    if (isCorruptionError(error)) {
      console.log('Storage corruption detected — clearing storage');
      AsyncStorage.clear()
        .then(() => {
          if (Platform.OS === 'web' && typeof window !== 'undefined') {
            setTimeout(() => window.location.reload(), 100);
          }
        })
        .catch(() => {});
      return;
    }
    console.error('ErrorBoundary caught:', error.message, info.componentStack);
  }

  private handleRetry = () => {
    this.setState({ error: null });
  };

  private handleReset = async () => {
    try {
      await AsyncStorage.clear();
    } catch (e) {
      console.error('ErrorBoundary: failed clearing storage', e);
    }
    this.setState({ error: null });
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        window.location.reload();
      } catch {
        window.location.href = '/';
      }
    }
  };

  private handleReport = () => {
    const subject = encodeURIComponent('HOMI crash report');
    const body = encodeURIComponent(
      `What happened:\n\n\n---\nError: ${this.state.error?.message ?? 'unknown'}`,
    );
    void Linking.openURL(`mailto:support@homi.app?subject=${subject}&body=${body}`);
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <View style={styles.wrap} testID="error-boundary-fallback">
        <Text style={styles.emoji} accessibilityElementsHidden>
          🛠️
        </Text>
        <Text style={styles.title} accessibilityRole="header">
          Something went wrong
        </Text>
        <Text style={styles.body}>
          Not your fault — the app hit an unexpected error. Your messages and
          profile are safe.
        </Text>
        <Pressable
          onPress={this.handleRetry}
          accessibilityRole="button"
          accessibilityLabel="Try again"
          style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
          testID="error-try-again"
        >
          <Text style={styles.primaryText}>Try again</Text>
        </Pressable>
        <Pressable
          onPress={this.handleReport}
          accessibilityRole="button"
          accessibilityLabel="Report this problem"
          style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
          testID="error-report"
        >
          <Text style={styles.secondaryText}>Report this problem</Text>
        </Pressable>
        <Pressable
          onPress={this.handleReset}
          accessibilityRole="button"
          accessibilityLabel="Reset the app and clear local data"
          style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
          testID="error-reset-app"
        >
          <Text style={styles.resetText}>Reset app (clears local data)</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    backgroundColor: designTokens.color.bg,
  },
  emoji: {
    fontSize: 44,
    marginBottom: 14,
  },
  title: {
    fontSize: designTokens.type.h3.size,
    fontWeight: designTokens.type.h3.weight as '700',
    color: designTokens.color.text,
  },
  body: {
    fontSize: designTokens.type.body.size,
    lineHeight: designTokens.type.body.lineHeight,
    color: designTokens.color.textMuted,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  primary: {
    backgroundColor: designTokens.color.primary,
    borderRadius: designTokens.radius.lg,
    minHeight: 52,
    minWidth: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    color: designTokens.color.primaryOn,
    fontWeight: '700',
    fontSize: designTokens.type.subheadSmall.size,
  },
  secondary: {
    marginTop: 12,
    minHeight: 44,
    justifyContent: 'center',
  },
  secondaryText: {
    color: designTokens.color.primary,
    fontWeight: '600',
    fontSize: designTokens.type.bodySmall.size,
  },
  resetText: {
    color: designTokens.color.error,
    fontWeight: '600',
    fontSize: designTokens.type.bodySmall.size,
  },
  pressed: {
    opacity: 0.85,
  },
});
