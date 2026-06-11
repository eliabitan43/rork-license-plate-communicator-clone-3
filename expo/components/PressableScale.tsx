import React from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { usePressScale } from '@/lib/motion';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  children?: React.ReactNode;
}

/**
 * Pressable with UI-thread scale feedback (0.97 on press-in, spring back on release).
 * The motion-system replacement for opacity-based active states on cards and tiles.
 */
export function PressableScale({
  style,
  scaleTo = 0.97,
  onPressIn,
  onPressOut,
  children,
  ...rest
}: PressableScaleProps) {
  const { animatedStyle, onPressIn: scaleIn, onPressOut: scaleOut } = usePressScale(scaleTo);

  return (
    <AnimatedPressable
      {...rest}
      style={[style, animatedStyle]}
      onPressIn={(e) => {
        scaleIn();
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scaleOut();
        onPressOut?.(e);
      }}
    >
      {children}
    </AnimatedPressable>
  );
}
