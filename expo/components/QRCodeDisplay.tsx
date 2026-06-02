import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share, Platform } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Download, Share2 } from 'lucide-react-native';
import { theme } from '@/constants/theme';


interface QRCodeDisplayProps {
  value: string;
  size?: number;
  title?: string;
  description?: string;
}

export function QRCodeDisplay({ 
  value, 
  size = 200, 
  title = "Download HOMI",
  description = "Scan to download the app"
}: QRCodeDisplayProps) {
  
  const handleShare = async () => {
    try {
      await Share.share({
        message: `Download HOMI app: ${value}`,
        title: 'Share HOMI App',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      
      <View style={styles.qrContainer}>
        <QRCode
          value={value}
          size={size}
          color={theme.colors.textPrimary}
          backgroundColor={theme.colors.white}
          logo={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/47kkmyiujuadsl2f3ecwu' }}
          logoSize={size * 0.25}
          logoBackgroundColor={theme.colors.white}
          logoMargin={4}
          logoBorderRadius={12}
        />
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
          <Share2 size={20} color={theme.colors.primary} />
          <Text style={styles.actionText}>Share App</Text>
        </TouchableOpacity>
        
        {Platform.OS === 'web' && (
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => window.open(value, '_blank')}
          >
            <Download size={20} color={theme.colors.primary} />
            <Text style={styles.actionText}>Download</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
  },
  title: {
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold' as const,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  description: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
    textAlign: 'center' as const,
  },
  qrContainer: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.lg,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  actionText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary,
    fontWeight: '600' as const,
  },
});