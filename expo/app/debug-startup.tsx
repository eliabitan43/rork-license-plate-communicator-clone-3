import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '@/constants/theme';
import { AlertTriangle, CheckCircle, RefreshCw, Trash2 } from 'lucide-react-native';

interface DiagnosticResult {
  test: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: string;
}

export default function DebugStartupScreen() {
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [storageData, setStorageData] = useState<Record<string, any>>({});

  const runDiagnostics = async () => {
    setIsRunning(true);
    const results: DiagnosticResult[] = [];
    const storage: Record<string, any> = {};

    try {
      // Test 1: Check AsyncStorage accessibility
      try {
        await AsyncStorage.setItem('test_key', 'test_value');
        await AsyncStorage.removeItem('test_key');
        results.push({
          test: 'AsyncStorage Access',
          status: 'pass',
          message: 'AsyncStorage is accessible'
        });
      } catch (error: any) {
        results.push({
          test: 'AsyncStorage Access',
          status: 'fail',
          message: 'AsyncStorage is not accessible',
          details: error.message
        });
      }

      // Test 2: Check for corrupted data
      try {
        const keys = await AsyncStorage.getAllKeys();
        let corruptedKeys: string[] = [];
        
        for (const key of keys) {
          try {
            const value = await AsyncStorage.getItem(key);
            storage[key] = value;
            
            // Check for corruption patterns - CRITICAL: "o" character corruption
            if (value === 'o') {
              corruptedKeys.push(`${key} (CRITICAL: "o" character corruption)`);
            } else if (value === 'object' || value === 'undefined' || value === 'null' || value === '[object Object]') {
              corruptedKeys.push(`${key} (${value})`);
            }
            
            // Try to parse JSON if it looks like JSON
            if (value && typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
              try {
                JSON.parse(value);
              } catch {
                corruptedKeys.push(key);
              }
            }
          } catch {
            corruptedKeys.push(key);
          }
        }

        if (corruptedKeys.length > 0) {
          results.push({
            test: 'Data Corruption Check',
            status: 'fail',
            message: `Found ${corruptedKeys.length} corrupted keys`,
            details: corruptedKeys.join(', ')
          });
        } else {
          results.push({
            test: 'Data Corruption Check',
            status: 'pass',
            message: 'No corrupted data found'
          });
        }
      } catch (error: any) {
        results.push({
          test: 'Data Corruption Check',
          status: 'fail',
          message: 'Could not check for corrupted data',
          details: error.message
        });
      }

      // Test 3: Check critical app data
      try {
        const onboardingComplete = await AsyncStorage.getItem('onboarding_complete');
        const userProfile = await AsyncStorage.getItem('user_profile');
        
        results.push({
          test: 'Critical App Data',
          status: 'pass',
          message: `Onboarding: ${onboardingComplete || 'null'}, Profile: ${userProfile ? 'exists' : 'null'}`
        });
      } catch (error: any) {
        results.push({
          test: 'Critical App Data',
          status: 'fail',
          message: 'Could not read critical app data',
          details: error.message
        });
      }

      // Test 4: Check app store hook
      try {
        const { useAppStore: _useAppStore } = await import('@/hooks/useAppStore');
        results.push({
          test: 'App Store Hook',
          status: 'pass',
          message: 'App store hook imported successfully'
        });
      } catch (error: any) {
        results.push({
          test: 'App Store Hook',
          status: 'fail',
          message: 'Could not import app store hook',
          details: error.message
        });
      }

      // Test 5: Check theme constants
      try {
        const { theme: _themeImport } = await import('@/constants/theme');
        results.push({
          test: 'Theme Constants',
          status: 'pass',
          message: 'Theme constants loaded successfully'
        });
      } catch (error: any) {
        results.push({
          test: 'Theme Constants',
          status: 'fail',
          message: 'Could not load theme constants',
          details: error.message
        });
      }

      // Test 6: Check tRPC client
      try {
        const { trpcClient: _trpcClient } = await import('@/lib/trpc');
        results.push({
          test: 'tRPC Client',
          status: 'pass',
          message: 'tRPC client initialized successfully'
        });
      } catch (error: any) {
        results.push({
          test: 'tRPC Client',
          status: 'fail',
          message: 'Could not initialize tRPC client',
          details: error.message
        });
      }

    } catch (error: any) {
      results.push({
        test: 'General Error',
        status: 'fail',
        message: 'Unexpected error during diagnostics',
        details: error.message
      });
    }

    setDiagnostics(results);
    setStorageData(storage);
    setIsRunning(false);
  };

  const clearAllData = async () => {
    try {
      await AsyncStorage.clear();
      alert('All data cleared successfully. Please restart the app.');
    } catch (error: any) {
      alert(`Failed to clear data: ${error.message}`);
    }
  };

  const goToOnboarding = () => {
    router.replace('/onboarding');
  };

  const goToHome = () => {
    router.replace('/(tabs)/dashboard');
  };

  useEffect(() => {
    void runDiagnostics();
  }, []);

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'pass':
        return <CheckCircle size={20} color={theme.colors.success} />;
      case 'fail':
        return <AlertTriangle size={20} color={theme.colors.danger} />;
      case 'warning':
        return <AlertTriangle size={20} color={theme.colors.warning} />;
    }
  };

  const getStatusColor = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'pass':
        return theme.colors.success;
      case 'fail':
        return theme.colors.danger;
      case 'warning':
        return theme.colors.warning;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>App Startup Diagnostics</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={runDiagnostics}
          disabled={isRunning}
        >
          <RefreshCw size={20} color={theme.colors.white} />
          <Text style={styles.refreshText}>
            {isRunning ? 'Running...' : 'Refresh'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Diagnostic Results</Text>
          {diagnostics.map((result, index) => (
            <View key={index} style={styles.diagnosticItem}>
              <View style={styles.diagnosticHeader}>
                {getStatusIcon(result.status)}
                <Text style={[styles.diagnosticTest, { color: getStatusColor(result.status) }]}>
                  {result.test}
                </Text>
              </View>
              <Text style={styles.diagnosticMessage}>{result.message}</Text>
              {result.details && (
                <Text style={styles.diagnosticDetails}>{result.details}</Text>
              )}
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Storage Data</Text>
          {Object.keys(storageData).length > 0 ? (
            Object.entries(storageData).map(([key, value]) => (
              <View key={key} style={styles.storageItem}>
                <Text style={styles.storageKey}>{key}</Text>
                <Text style={styles.storageValue} numberOfLines={3}>
                  {typeof value === 'string' ? value : JSON.stringify(value)}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.noData}>No storage data found</Text>
          )}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionButton} onPress={goToOnboarding}>
            <Text style={styles.actionButtonText}>Go to Onboarding</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={goToHome}>
            <Text style={styles.actionButtonText}>Go to Home</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.dangerButton]}
            onPress={clearAllData}
          >
            <Trash2 size={16} color={theme.colors.white} />
            <Text style={styles.actionButtonText}>Clear All Data</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.primary,
  },
  title: {
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
    color: theme.colors.white,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.xs,
  },
  refreshText: {
    color: theme.colors.white,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  diagnosticItem: {
    backgroundColor: theme.colors.white,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  diagnosticHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  diagnosticTest: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
  },
  diagnosticMessage: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  diagnosticDetails: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    fontFamily: 'monospace',
    backgroundColor: theme.colors.background,
    padding: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  storageItem: {
    backgroundColor: theme.colors.white,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  storageKey: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  storageValue: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    fontFamily: 'monospace',
  },
  noData: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    padding: theme.spacing.lg,
  },
  actions: {
    gap: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.sm,
  },
  dangerButton: {
    backgroundColor: theme.colors.danger,
  },
  actionButtonText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.md,
    fontWeight: '600',
  },
});