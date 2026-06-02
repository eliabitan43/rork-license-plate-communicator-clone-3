import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '@/constants/theme';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react-native';

interface ConnectionStatusProps {
  onRetry?: () => void;
}

export function ConnectionStatus({ onRetry }: ConnectionStatusProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [lastChecked, setLastChecked] = useState<Date>(new Date());

  const checkConnection = async () => {
    try {
      // Try to fetch a simple endpoint
      const response = await fetch('https://fpalntr3egyjh33wsmwjp.rork.live/api', {
        method: 'GET',
      });
      setIsOnline(response.ok);
    } catch (error) {
      console.log('Connection check failed:', error);
      setIsOnline(false);
    }
    setLastChecked(new Date());
  };

  useEffect(() => {
    // Delay initial connection check to prevent hydration timeout
    const timer = setTimeout(() => {
      checkConnection();
    }, 1000);
    
    const interval = setInterval(checkConnection, 30000); // Check every 30 seconds
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  const handleRetry = () => {
    checkConnection();
    onRetry?.();
  };

  if (isOnline) {
    return (
      <View style={styles.container}>
        <Wifi size={16} color={theme.colors.success} />
        <Text style={[styles.text, { color: theme.colors.success }]}>Connected</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, styles.offline]}>
      <WifiOff size={16} color={theme.colors.danger} />
      <Text style={[styles.text, { color: theme.colors.danger }]}>Connection Failed</Text>
      <TouchableOpacity onPress={handleRetry} style={styles.retryButton}>
        <RefreshCw size={14} color={theme.colors.primary} />
        <Text style={styles.retryText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.sm,
    gap: theme.spacing.xs,
  },
  offline: {
    backgroundColor: theme.colors.danger + '10',
  },
  text: {
    fontSize: theme.fontSize.xs,
    fontWeight: '500',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  retryText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.primary,
    fontWeight: '500',
  },
});