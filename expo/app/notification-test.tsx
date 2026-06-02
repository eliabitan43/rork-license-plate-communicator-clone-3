import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { X, Bell, CheckCircle, AlertCircle, Send, Shield, Award, Users } from 'lucide-react-native';
import * as Notifications from 'expo-notifications';
import { theme } from '@/constants/theme';
import { useToast } from '@/hooks/useToast';
import { requestPushPermissions, PUSH_COPY } from '@/utils/notifications';

export default function NotificationTestScreen() {
  const { showToast } = useToast();
  const [permissionStatus, setPermissionStatus] = useState<string>('unknown');
  const [pushToken, setPushToken] = useState<string>('');
  const [testResults, setTestResults] = useState<{
    permissions: boolean;
    localNotification: boolean;
    toastSystem: boolean;
    pushToken: boolean;
  }>({
    permissions: false,
    localNotification: false,
    toastSystem: false,
    pushToken: false,
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
            body: 'Test notification from HOMI app',
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
            body: 'Test notification from HOMI app',
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

  const testMessageNotification = async () => {
    try {
      if (Platform.OS === 'web') {
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          new Notification(PUSH_COPY.title, {
            body: PUSH_COPY.bodies.newMessage,
            icon: '/favicon.png',
            tag: 'message-test',
          });
        }
      } else {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: PUSH_COPY.title,
            body: PUSH_COPY.bodies.newMessage,
            data: { 
              type: 'message',
              plate: 'TEST123',
              deeplink: 'homi://message?plate=TEST123'
            },
          },
          trigger: null,
        });
      }
      showToast('Message notification sent.', 'success');
    } catch (error) {
      console.error('Message notification failed:', error);
      showToast('Message notification failed.', 'error');
    }
  };

  const testSafetyAlert = async () => {
    try {
      if (Platform.OS === 'web') {
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          new Notification(PUSH_COPY.title, {
            body: PUSH_COPY.bodies.speedRadar,
            icon: '/favicon.png',
            tag: 'safety-test',
          });
        }
      } else {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: PUSH_COPY.title,
            body: PUSH_COPY.bodies.speedRadar,
            data: { 
              type: 'alert',
              id: 'test-alert-123',
              deeplink: 'homi://alert?id=test-alert-123'
            },
          },
          trigger: null,
        });
      }
      showToast('Safety alert sent.', 'success');
    } catch (error) {
      console.error('Safety alert failed:', error);
      showToast('Safety alert failed.', 'error');
    }
  };

  const runFullSystemCheck = async () => {
    showToast('Running full system check...', 'info');
    
    // Reset results
    setTestResults({
      permissions: false,
      localNotification: false,
      toastSystem: false,
      pushToken: false,
    });

    // Test permissions
    await testPermissions();
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test toast system
    testToastSystem();
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test local notifications if permissions granted
    if (permissionStatus === 'granted') {
      await testLocalNotification();
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    showToast('System check complete.', 'success');
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
        <View style={styles.statusCard}>
          <Text style={styles.sectionTitle}>System Status</Text>
          
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
            <Text style={styles.resultLabel}>Push Token</Text>
          </View>

          <View style={styles.resultItem}>
            {getStatusIcon(testResults.toastSystem)}
            <Text style={styles.resultLabel}>Toast System</Text>
          </View>

          <View style={styles.resultItem}>
            {getStatusIcon(testResults.localNotification)}
            <Text style={styles.resultLabel}>Local Notifications</Text>
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
        </View>

        <View style={styles.testSection}>
          <Text style={styles.sectionTitle}>Notification Types</Text>
          
          <TouchableOpacity 
            style={[styles.typeButton, styles.messageButton]} 
            onPress={testMessageNotification}
            disabled={permissionStatus !== 'granted'}
          >
            <Send size={20} color={theme.colors.white} />
            <Text style={styles.testButtonText}>Test Message Notification</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.typeButton, styles.safetyButton]} 
            onPress={testSafetyAlert}
            disabled={permissionStatus !== 'granted'}
          >
            <Shield size={20} color={theme.colors.white} />
            <Text style={styles.testButtonText}>Test Safety Alert</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.fullTestButton} onPress={runFullSystemCheck}>
          <Award size={24} color={theme.colors.white} />
          <Text style={styles.fullTestButtonText}>Run Full System Check</Text>
        </TouchableOpacity>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Notification Features</Text>
          <Text style={styles.infoText}>
            • Push notifications for messages and alerts{'\n'}
            • Real-time toast notifications{'\n'}
            • Deep linking support{'\n'}
            • Cross-platform compatibility{'\n'}
            • Permission management{'\n'}
            • Background notification handling
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
  safetyButton: {
    backgroundColor: theme.colors.danger,
  },
  fullTestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.orange,
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
    borderWidth: 1,
    borderColor: theme.colors.primary + '30',
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
});