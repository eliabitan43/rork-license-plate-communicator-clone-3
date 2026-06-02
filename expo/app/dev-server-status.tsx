import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';
import { RefreshCw, CheckCircle, XCircle, AlertTriangle } from 'lucide-react-native';

interface ServerStatus {
  url: string;
  status: 'checking' | 'online' | 'offline' | 'error';
  responseTime?: number;
  error?: string;
}

export default function DevServerStatus() {
  const [servers, setServers] = useState<ServerStatus[]>([
    { url: 'https://fpalntr3egyjh33wsmwjp.rork.live', status: 'checking' },
    { url: 'https://fpalntr3egyjh33wsmwjp.rork.live/api', status: 'checking' },
    { url: 'https://fpalntr3egyjh33wsmwjp.rork.live/api/trpc', status: 'checking' },
  ]);

  const checkServer = async (serverUrl: string): Promise<ServerStatus> => {
    const startTime = Date.now();
    try {
      // Validate server URL
      if (!serverUrl || typeof serverUrl !== 'string' || serverUrl.trim().length === 0) {
        throw new Error('Invalid server URL');
      }
      
      const response = await fetch(serverUrl, {
        method: 'GET',
      });
      const responseTime = Date.now() - startTime;
      
      return {
        url: serverUrl,
        status: response.ok ? 'online' : 'error',
        responseTime,
        error: response.ok ? undefined : `HTTP ${response.status}`,
      };
    } catch (error) {
      return {
        url: serverUrl,
        status: 'offline',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  };

  const checkAllServers = async () => {
    setServers(prev => prev.map(s => ({ ...s, status: 'checking' as const })));
    
    const results = await Promise.all(
      servers.map(server => checkServer(server.url))
    );
    
    setServers(results);
  };

  useEffect(() => {
    checkAllServers();
  }, []);

  const getStatusIcon = (status: ServerStatus['status']) => {
    switch (status) {
      case 'online':
        return <CheckCircle size={20} color={theme.colors.success} />;
      case 'offline':
        return <XCircle size={20} color={theme.colors.danger} />;
      case 'error':
        return <AlertTriangle size={20} color={theme.colors.warning} />;
      case 'checking':
        return <RefreshCw size={20} color={theme.colors.textSecondary} />;
    }
  };

  const getStatusColor = (status: ServerStatus['status']) => {
    switch (status) {
      case 'online':
        return theme.colors.success;
      case 'offline':
        return theme.colors.danger;
      case 'error':
        return theme.colors.warning;
      case 'checking':
        return theme.colors.textSecondary;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Development Server Status</Text>
        <TouchableOpacity onPress={checkAllServers} style={styles.refreshButton}>
          <RefreshCw size={20} color={theme.colors.primary} />
          <Text style={styles.refreshText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {servers.map((server, index) => (
          <View key={index} style={styles.serverCard}>
            <View style={styles.serverHeader}>
              {getStatusIcon(server.status)}
              <Text style={styles.serverUrl} numberOfLines={1}>
                {server.url}
              </Text>
            </View>
            
            <View style={styles.serverDetails}>
              <Text style={[styles.statusText, { color: getStatusColor(server.status) }]}>
                {server.status.toUpperCase()}
              </Text>
              
              {server.responseTime && (
                <Text style={styles.responseTime}>
                  {server.responseTime}ms
                </Text>
              )}
            </View>
            
            {server.error && (
              <Text style={styles.errorText} numberOfLines={2}>
                {server.error}
              </Text>
            )}
          </View>
        ))}

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Connection Issues?</Text>
          <Text style={styles.infoText}>
            If servers show as offline, this could be due to:
          </Text>
          <Text style={styles.bulletPoint}>• Network connectivity issues</Text>
          <Text style={styles.bulletPoint}>• Development server not running</Text>
          <Text style={styles.bulletPoint}>• Firewall blocking connections</Text>
          <Text style={styles.bulletPoint}>• Server URL has changed</Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Troubleshooting</Text>
          <Text style={styles.bulletPoint}>1. Check your internet connection</Text>
          <Text style={styles.bulletPoint}>2. Restart the development server</Text>
          <Text style={styles.bulletPoint}>3. Clear app cache and reload</Text>
          <Text style={styles.bulletPoint}>4. Contact support if issues persist</Text>
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
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  refreshText: {
    color: theme.colors.primary,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  serverCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  serverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  serverUrl: {
    flex: 1,
    fontSize: theme.fontSize.sm,
    color: theme.colors.textPrimary,
    fontFamily: 'monospace',
  },
  serverDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusText: {
    fontSize: theme.fontSize.xs,
    fontWeight: 'bold',
  },
  responseTime: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  errorText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.danger,
    marginTop: theme.spacing.xs,
    fontStyle: 'italic',
  },
  infoCard: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  infoTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  infoText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  bulletPoint: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
});