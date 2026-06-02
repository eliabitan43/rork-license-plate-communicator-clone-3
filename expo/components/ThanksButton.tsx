import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Heart } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { useAnalytics } from '@/utils/analytics';

interface ThanksButtonProps {
  alertId: string;
  onPress?: () => void;
  disabled?: boolean;
  thanksCount?: number;
  compact?: boolean;
}

export function ThanksButton({ alertId, onPress, disabled = false, thanksCount = 0, compact = false }: ThanksButtonProps) {
  const { track } = useAnalytics();

  const handlePress = () => {
    track('community_thanks', { alertId, thanksCount: thanksCount + 1 });
    onPress?.();
  };

  return (
    <TouchableOpacity
      style={[
        compact ? styles.compactThanksButton : styles.thanksButton, 
        disabled && styles.disabled
      ]}
      onPress={handlePress}
      disabled={disabled}
      testID={`thanks-button-${alertId}`}
    >
      <Heart 
        size={compact ? 12 : 16} 
        color={disabled ? theme.colors.textSecondary : theme.colors.danger} 
        fill={thanksCount > 0 ? theme.colors.danger : 'transparent'}
      />
      {!compact && (
        <Text style={[styles.thanksText, disabled && styles.disabledText]}>
          Thanks {thanksCount > 0 ? `(${thanksCount})` : ''}
        </Text>
      )}
      {compact && thanksCount > 0 && (
        <Text style={[styles.compactText, disabled && styles.disabledText]}>
          {thanksCount}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  thanksButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.danger,
    gap: theme.spacing.xs,
  },
  disabled: {
    backgroundColor: theme.colors.lightGray,
    borderColor: theme.colors.border,
  },
  thanksText: {
    fontSize: theme.fontSize.xs,
    fontWeight: '600',
    color: theme.colors.danger,
  },
  disabledText: {
    color: theme.colors.textSecondary,
  },
  compactThanksButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.danger,
    gap: 2,
    minWidth: 24,
    justifyContent: 'center',
  },
  compactText: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.danger,
  },
});