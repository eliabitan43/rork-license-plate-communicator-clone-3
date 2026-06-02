import React, { useMemo } from 'react';
import { StyleSheet, TouchableOpacity, ViewStyle, Platform, Animated, Easing, View } from 'react-native';
import { Plus } from 'lucide-react-native';
import { theme } from '@/constants/theme';

interface FABProps {
  onPress: () => void;
  testID?: string;
  style?: ViewStyle;
}

export function FAB({ onPress, testID, style }: FABProps) {
  const scale = useMemo(() => new Animated.Value(1), []);

  const handlePressIn = () => {
    Animated.timing(scale, {
      toValue: 0.96,
      duration: 120,
      useNativeDriver: Platform.OS !== 'web',
      easing: Easing.out(Easing.quad),
    }).start();
  };

  const handlePressOut = () => {
    Animated.timing(scale, {
      toValue: 1,
      duration: 150,
      useNativeDriver: Platform.OS !== 'web',
      easing: Easing.out(Easing.quad),
    }).start();
  };

  return (
    <Animated.View style={[styles.fab, style, { transform: [{ scale }] }]}> 
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.fabInner}
        testID={testID ?? 'global-fab'}
        accessibilityRole="button"
        accessibilityLabel="Create report or action"
      >
        <View style={styles.iconWrap}>
          <Plus size={24} color={theme.colors.white} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    shadowColor: '#000',
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
  iconWrap: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
