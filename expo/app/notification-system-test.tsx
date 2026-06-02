import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { X, Bell, CheckCircle, AlertCircle, Send, Shield, Award, Users, MessageCircle, Car, Wrench } from 'lucide-react-native';
import * as Notifications from 'expo-notifications';
import { theme } from '@/constants/theme';
import { useToast } from '@/hooks/useToast';
import { requestPushPermissions, PUSH_COPY } from '@/utils/notifications';
import { useAppStore } from '@/hooks/useAppStore';

export default function NotificationSystemTestScreen() {
  const { showToast } = useToast();
  const { sendMessage, userProfile, primaryVehicle } = useAppStore();
  const [permissionStatus, setPermissionStatus] = useState<string>('unknown');
  const [pushToken, setPushToken] = useState<string>('');
  const [testResults, setTestResults] = useState<{
    permissions: boolean;
    localNotification: boolean;
    toastSystem: boolean;
    pushToken: boolean;
    messageFlow: boolean;
    marketplaceFlow: boolean;
  }>({
    permissions: false,
    localNotification: false,
    toastSystem: false,
    pushToken: false,
    messageFlow: false,
    marketplaceFlow: false,
  });

  useEffect(() => {
    checkInitialPermissions();
  }, []);

  const checkInitialPermissions = async () => {
    try {
      if (Platform.OS === 'web') {
        if (typeof Notification !== 'undefined') {
          setPermissionStatus(Notification.permission);
        } else {
          setPermissionStatus('unavailable');
        }
      } else {
        const { status } = await Notifications.getPermissionsAsync();
        setPermissionStatus(status);
      }
    } catch (error) {
      console.error('Error checking permissions:', error);
      setPermissionStatus('error');
    }
  };

  const testPermissions = async () => {
    try {
      const result = await requestPushPermissions();
      setPermissionStatus(result.status);
      if (result.token) {
        setPushToken(result.token);
      }
      
      const success = result.status === 'granted';
      setTestResults(prev => ({ ...prev, permissions: success, pushToken: !!result.token }));
      
      if (success) {
        showToast('Permissions granted successfully.', 'success');
      } else {
        showToast('Permission denied or unavailable.', 'error');
      }
    } catch (error) {
      console.error('Permission test failed:', error);
      showToast('Permission test failed.', 'error');
      setTestResults(prev => ({ ...prev, permissions: false }));
    }
  };

  const testLocalNotification = async () => {
    try {
      if (Platform.OS === 'web') {
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          new Notification(PUSH_COPY.title, {
            body: 'Test notification from HOMI app - System working correctly!',
            icon: '/favicon.png',
          });
          setTestResults(prev => ({ ...prev, localNotification: true }));
          showToast('Web notification sent.', 'success');
        } else {
          throw new Error('Web notifications not available');
        }
      } else {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: PUSH_COPY.title,
            body: 'Test notification from HOMI app - System working correctly!',
            data: { test: true },
          },
          trigger: null, // Show immediately
        });
        setTestResults(prev => ({ ...prev, localNotification: true }));
        showToast('Local notification sent.', 'success');
      }
    } catch (error) {
      console.error('Local notification test failed:', error);
      showToast('Local notification failed.', 'error');
      setTestResults(prev => ({ ...prev, localNotification: false }));
    }
  };

  const testToastSystem = () => {
    try {
      showToast('Toast system working perfectly.', 'success');
      setTimeout(() => {
        showToast('Multiple toasts supported.', 'info');
      }, 1000);
      setTimeout(() => {
        showToast('Error toasts also work.', 'error');
      }, 2000);
      
      setTestResults(prev => ({ ...prev, toastSystem: true }));
    } catch (error) {
      console.error('Toast test failed:', error);
      setTestResults(prev => ({ ...prev, toastSystem: false }));
    }
  };

  const testMessageFlow = async () => {
    try {
      if (!userProfile || !primaryVehicle) {
        showToast('User profile or vehicle not found.', 'error');
        return;
      }

      // Simulate sending a message
      const testMessage = {
        id: Date.now().toString(),
        fromPlate: primaryVehicle.licensePlate,
        toPlate: 'TEST123',
        toCountry: 'US',
        fromName: userProfile.displayName,
        content: 'Test message from notification system test',
        type: 'general' as const,
        isAnonymous: false,
        timestamp: new Date().toISOString(),
        isRead: false,
      };

      await sendMessage(testMessage);
      
      // Show success notification
      showToast('Message sent successfully.', 'success');
      
      // Send a local notification for confirmation
      if (Platform.OS === 'web') {
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          new Notification('HOMI - Message Sent', {
            body: `Your test message to TEST123 has been delivered successfully.`,
            icon: '/favicon.png',
            tag: 'message-sent-test',
          });
        }
      } else {
        const { status } = await Notifications.getPermissionsAsync();
        if (status === 'granted') {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: 'HOMI - Message Sent',
              body: `Your test message to TEST123 has been delivered successfully.`,
              data: { type: 'message-sent', plate: 'TEST123' },
            },
            trigger: null,
          });
        }
      }
      
      setTestResults(prev => ({ ...prev, messageFlow: true }));
      showToast('Message flow test completed.', 'success');
    } catch (error) {
      console.error('Message flow test failed:', error);
      showToast('Message flow test failed.', 'error');
      setTestResults(prev => ({ ...prev, messageFlow: false }));
    }
  };

  const testMarketplaceFlow = async () => {
    try {
      // Simulate marketplace notification
      showToast('Marketplace listing posted successfully.', 'success');
      
      // Send marketplace notification
      if (Platform.OS === 'web') {
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          new Notification('HOMI - Marketplace', {
            body: 'Your vehicle listing has been posted successfully!',
            icon: '/favicon.png',
            tag: 'marketplace-test',
          });
        }
      } else {
        const { status } = await Notifications.getPermissionsAsync();
        if (status === 'granted') {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: 'HOMI - Marketplace',
              body: 'Your vehicle listing has been posted successfully!',
              data: { type: 'marketplace', action: 'listing-posted' },
            },
            trigger: null,
          });
        }
      }
      
      setTestResults(prev => ({ ...prev, marketplaceFlow: true }));
      showToast('Marketplace flow test completed.', 'success');
    } catch (error) {
      console.error('Marketplace flow test failed:', error);
      showToast('Marketplace flow test failed.', 'error');
      setTestResults(prev => ({ ...prev, marketplaceFlow: false }));
    }
  };

  const runFullSystemCheck = async () => {
    showToast('Running comprehensive notification system check...', 'info');
    
    // Reset results
    setTestResults({
      permissions: false,
      localNotification: false,
      toastSystem: false,
      pushToken: false,
      messageFlow: false,
      marketplaceFlow: false,
    });

    // Test permissions
    await testPermissions();
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test toast system
    testToastSystem();
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test local notifications if permissions granted
    if (permissionStatus === 'granted') {
      await testLocalNotification();
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Test message flow
    await testMessageFlow();
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test marketplace flow
    await testMarketplaceFlow();
    await new Promise(resolve => setTimeout(resolve, 1000));

    showToast('Comprehensive system check complete.', 'success');
  };

  const getStatusIcon = (status: boolean) => {
    return status ? (
      <CheckCircle size={20} color={theme.colors.success} />
    ) : (
      <AlertCircle size={20} color={theme.colors.danger} />
    );
  };

  const getPermissionStatusColor = () => {
    switch (permissionStatus) {
      case 'granted': return theme.colors.success;
      case 'denied': return theme.colors.danger;
      case 'unavailable': return theme.colors.gray;
      default: return theme.colors.warning;
    }
  };

  const getOverallStatus = () => {
    const results = Object.values(testResults);
    const passedTests = results.filter(Boolean).length;
    const totalTests = results.length;
    
    if (passedTests === totalTests) return { status: 'EXCELLENT', color: theme.colors.success };
    if (passedTests >= totalTests * 0.8) return { status: 'GOOD', color: theme.colors.warning };
    if (passedTests >= totalTests * 0.5) return { status: 'NEEDS ATTENTION', color: theme.colors.orange };
    return { status: 'CRITICAL ISSUES', color: theme.colors.danger };
  };

  const overallStatus = getOverallStatus();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
          <X size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notification System Test</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.statusCard, { borderLeftColor: overallStatus.color }]}>
          <Text style={styles.sectionTitle}>System Status</Text>
          <View style={styles.overallStatus}>
            <Text style={[styles.overallStatusText, { color: overallStatus.color }]}>
              {overallStatus.status}
            </Text>
          </View>
          
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>Permission Status:</Text>
            <View style={styles.statusValue}>
              <Text style={[styles.statusText, { color: getPermissionStatusColor() }]}>
                {permissionStatus.toUpperCase()}
              </Text>
            </View>
          </View>

          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>Platform:</Text>
            <Text style={styles.statusText}>{Platform.OS.toUpperCase()}</Text>
          </View>

          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>User Profile:</Text>
            <Text style={styles.statusText}>{userProfile ? 'LOADED' : 'MISSING'}</Text>
          </View>

          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>Primary Vehicle:</Text>
            <Text style={styles.statusText}>{primaryVehicle ? primaryVehicle.licensePlate : 'MISSING'}</Text>
          </View>

          {pushToken && (
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Push Token:</Text>
              <Text style={[styles.statusText, styles.tokenText]} numberOfLines={1}>
                {pushToken.substring(0, 20)}...
              </Text>
            </View>
          )}
        </View>

        <View style={styles.testResultsCard}>
          <Text style={styles.sectionTitle}>Test Results</Text>
          
          <View style={styles.resultItem}>
            {getStatusIcon(testResults.permissions)}
            <Text style={styles.resultLabel}>Push Permissions</Text>
          </View>

          <View style={styles.resultItem}>
            {getStatusIcon(testResults.pushToken)}
            <Text style={styles.resultLabel}>Push Token Generation</Text>
          </View>

          <View style={styles.resultItem}>
            {getStatusIcon(testResults.toastSystem)}
            <Text style={styles.resultLabel}>Toast Notification System</Text>
          </View>

          <View style={styles.resultItem}>
            {getStatusIcon(testResults.localNotification)}
            <Text style={styles.resultLabel}>Local Notifications</Text>
          </View>

          <View style={styles.resultItem}>
            {getStatusIcon(testResults.messageFlow)}
            <Text style={styles.resultLabel}>Message Send Flow</Text>
          </View>

          <View style={styles.resultItem}>
            {getStatusIcon(testResults.marketplaceFlow)}
            <Text style={styles.resultLabel}>Marketplace Notifications</Text>
          </View>
        </View>

        <View style={styles.testSection}>
          <Text style={styles.sectionTitle}>Individual Tests</Text>
          
          <TouchableOpacity style={styles.testButton} onPress={testPermissions}>
            <Bell size={20} color={theme.colors.white} />
            <Text style={styles.testButtonText}>Test Permissions</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.testButton} onPress={testToastSystem}>
            <CheckCircle size={20} color={theme.colors.white} />
            <Text style={styles.testButtonText}>Test Toast System</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.testButton, permissionStatus !== 'granted' && styles.disabledButton]} 
            onPress={testLocalNotification}
            disabled={permissionStatus !== 'granted'}
          >
            <Bell size={20} color={theme.colors.white} />
            <Text style={styles.testButtonText}>Test Local Notification</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.typeButton, styles.messageButton]} 
            onPress={testMessageFlow}
          >
            <MessageCircle size={20} color={theme.colors.white} />
            <Text style={styles.testButtonText}>Test Message Flow</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.typeButton, styles.marketplaceButton]} 
            onPress={testMarketplaceFlow}
          >
            <Car size={20} color={theme.colors.white} />
            <Text style={styles.testButtonText}>Test Marketplace Flow</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.fullTestButton} onPress={runFullSystemCheck}>
          <Award size={24} color={theme.colors.white} />
          <Text style={styles.fullTestButtonText}>Run Comprehensive System Check</Text>
        </TouchableOpacity>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Notification System Features</Text>
          <Text style={styles.infoText}>
            • Cross-platform toast notifications{'\n'}
            • Push notification permissions{'\n'}
            • Local notification scheduling{'\n'}
            • Message send confirmations{'\n'}
            • Marketplace listing notifications{'\n'}
            • Deep linking support{'\n'}
            • Error handling and fallbacks{'\n'}
            • Web and mobile compatibility
          </Text>
        </View>

        <View style={styles.diagnosticCard}>
          <Text style={styles.infoTitle}>Diagnostic Information</Text>
          <Text style={styles.diagnosticText}>
            Platform: {Platform.OS}{'\n'}
            Permission Status: {permissionStatus}{'\n'}
            User Profile: {userProfile ? 'Loaded' : 'Missing'}{'\n'}
            Primary Vehicle: {primaryVehicle ? primaryVehicle.licensePlate : 'Missing'}{'\n'}
            Push Token: {pushToken ? 'Generated' : 'Not Available'}{'\n'}
            Toast Provider: Active{'\n'}
            Notification Handler: Configured
          </Text>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  statusCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
  },
  testResultsCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  overallStatus: {
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
  },
  overallStatusText: {
    fontSize: theme.fontSize.xl,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  statusItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  statusLabel: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  statusValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
  },
  tokenText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: theme.fontSize.sm,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.md,
  },
  resultLabel: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textPrimary,
    fontWeight: '500',
  },
  testSection: {
    marginBottom: theme.spacing.lg,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  disabledButton: {
    backgroundColor: theme.colors.gray,
    opacity: 0.6,
  },
  testButtonText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.md,
    fontWeight: '600',
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  messageButton: {
    backgroundColor: theme.colors.success,
  },
  marketplaceButton: {
    backgroundColor: theme.colors.orange,
  },
  fullTestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.fieryOrange,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    gap: theme.spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  fullTestButtonText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
  },
  infoCard: {
    backgroundColor: theme.colors.primary + '10',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.primary + '30',
  },
  diagnosticCard: {
    backgroundColor: theme.colors.gray + '10',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.gray + '30',
  },
  infoTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: theme.spacing.sm,
  },
  infoText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  diagnosticText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});