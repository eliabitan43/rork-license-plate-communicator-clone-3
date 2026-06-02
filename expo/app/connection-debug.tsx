import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { Stack } from 'expo-router';
import Constants from 'expo-constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ConnectionDebug() {
  const insets = useSafeAreaInsets();
  const [debugInfo, setDebugInfo] = useState<any>({});

  useEffect(() => {
    loadDebugInfo();
  }, []);

  const loadDebugInfo = async () => {
    try {
      const info = {
        platform: Platform.OS,
        isDevice: Constants.isDevice,
        manifest: Constants.expoConfig?.hostUri,
        constants: {
          appOwnership: Constants.appOwnership,
          executionEnvironment: Constants.executionEnvironment,
        }
      };
      setDebugInfo(info);
    } catch (error) {
      console.error('Error loading debug info:', error as Error);
    }
  };

  const testConnection = async () => {
    try {
      const response = await fetch('https://f0vxuj4c36xrw4aj3tv05.rork.live/');
      const text = await response.text();
      Alert.alert('Connection Test', `Status: ${response.status}\nResponse received: ${text.substring(0, 100)}...`);
    } catch (error) {
      Alert.alert('Connection Test Failed', `Error: ${(error as Error).message}`);
    }
  };

  const restartApp = () => {
    if (Platform.OS === 'web') {
      window.location.reload();
    } else {
      Alert.alert('Restart Required', 'Please close and reopen the app manually.');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen 
        options={{ 
          title: 'Connection Debug',
          headerStyle: { backgroundColor: '#f8f9fa' },
          headerTitleStyle: { color: '#333' }
        }} 
      />
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Connection Status</Text>
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              Platform: {debugInfo.platform}
            </Text>
            <Text style={styles.infoText}>
              Is Physical Device: {debugInfo.isDevice ? '✅ Yes' : '❌ No (Simulator)'}
            </Text>
            <Text style={styles.infoText}>
              Development Server: f0vxuj4c36xrw4aj3tv05.rork.live
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Environment</Text>
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>Platform: {debugInfo.platform}</Text>
            <Text style={styles.infoText}>Is Device: {debugInfo.isDevice ? 'Yes' : 'No'}</Text>
            <Text style={styles.infoText}>App Ownership: {debugInfo.constants?.appOwnership}</Text>
            <Text style={styles.infoText}>Execution Environment: {debugInfo.constants?.executionEnvironment}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Server Configuration</Text>
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              Host URI: {debugInfo.manifest || 'Not set'}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Troubleshooting Steps</Text>
          <View style={styles.troubleshootingBox}>
            <Text style={styles.stepText}>1. Ensure your device and computer are on the same WiFi network</Text>
            <Text style={styles.stepText}>2. Try restarting the development server with: npm start</Text>
            <Text style={styles.stepText}>3. Clear Expo cache: expo start -c</Text>
            <Text style={styles.stepText}>4. Check if firewall is blocking the connection</Text>
            <Text style={styles.stepText}>5. Try using tunnel mode: expo start --tunnel</Text>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button} onPress={testConnection}>
            <Text style={styles.buttonText}>Test Server Connection</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.button} onPress={loadDebugInfo}>
            <Text style={styles.buttonText}>Refresh Debug Info</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.button, styles.restartButton]} onPress={restartApp}>
            <Text style={styles.buttonText}>Restart App</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Fixes</Text>
          <View style={styles.quickFixBox}>
            <Text style={styles.quickFixText}>
              If you&apos;re using Expo Go, try switching to tunnel mode in your terminal:
            </Text>
            <Text style={styles.codeText}>expo start --tunnel</Text>
            
            <Text style={styles.quickFixText}>
              If on physical device, ensure both device and computer are on same network
            </Text>
            
            <Text style={styles.quickFixText}>
              Try clearing the Expo cache:
            </Text>
            <Text style={styles.codeText}>expo start --clear</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  infoBox: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  troubleshootingBox: {
    backgroundColor: '#fff3cd',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffeaa7',
  },
  stepText: {
    fontSize: 14,
    color: '#856404',
    marginBottom: 8,
    lineHeight: 20,
  },
  quickFixBox: {
    backgroundColor: '#d1ecf1',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bee5eb',
  },
  quickFixText: {
    fontSize: 14,
    color: '#0c5460',
    marginBottom: 8,
    lineHeight: 20,
  },
  codeText: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    backgroundColor: '#f8f9fa',
    padding: 8,
    borderRadius: 4,
    color: '#e83e8c',
    marginBottom: 10,
  },
  buttonContainer: {
    marginVertical: 20,
  },
  button: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  restartButton: {
    backgroundColor: '#dc3545',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});