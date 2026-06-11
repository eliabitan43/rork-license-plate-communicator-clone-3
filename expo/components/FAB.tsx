import React from 'react';
import { StyleSheet, ViewStyle, View } from 'react-native';
import { Plus } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { PressableScale } from '@/components/PressableScale';

interface FABProps {
  onPress: () => void;
  testID?: string;
  style?: ViewStyle;
}

export function FAB({ onPress, testID, style }: FABProps) {
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.94}
      style={[styles.fab, style]}
      testID={testID ?? 'global-fab'}
      accessibilityRole="button"
      accessibilityLabel="Create report or action"
    >
      <View style={styles.fabInner}>
        <Plus size={24} color={theme.colors.white} />
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    shadowColor: theme.colors.dark,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  fabInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.fieryOrange,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.matteBlack,
  },
});
