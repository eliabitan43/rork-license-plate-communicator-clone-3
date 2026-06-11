import React, { useCallback, useEffect } from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { designTokens } from '@/constants/theme';
import { springs } from '@/lib/motion';

const OFFSCREEN = 640;
const DISMISS_DISTANCE = 120;
const DISMISS_VELOCITY = 800;

interface SheetContainerProps {
  /** Called after the dismiss animation completes (drag or backdrop tap). */
  onClose: () => void;
  children: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Bottom-sheet shell: spring-up entrance, drag-to-dismiss from the handle,
 * backdrop fade tied to sheet position. Render inside an open <Modal transparent>.
 * Drag is limited to the handle zone so inner ScrollViews keep their gestures.
 */
export function SheetContainer({ onClose, children, contentStyle, testID }: SheetContainerProps) {
  const translateY = useSharedValue(OFFSCREEN);
  const reduced = useReducedMotion();

  useEffect(() => {
    translateY.value = reduced ? 0 : withSpring(0, springs.gentle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dismiss = useCallback(() => {
    if (reduced) {
      onClose();
      return;
    }
    translateY.value = withTiming(OFFSCREEN, { duration: 220 }, (finished) => {
      'worklet';
      if (finished) runOnJS(onClose)();
    });
  }, [onClose, reduced, translateY]);

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      'worklet';
      translateY.value = Math.max(0, e.translationY);
    })
    .onEnd((e) => {
      'worklet';
      if (e.translationY > DISMISS_DISTANCE || e.velocityY > DISMISS_VELOCITY) {
        translateY.value = withTiming(OFFSCREEN, { duration: 200 }, (finished) => {
          if (finished) runOnJS(onClose)();
        });
      } else {
        translateY.value = withSpring(0, springs.gentle);
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateY.value, [0, OFFSCREEN], [1, 0]),
  }));

  return (
    <GestureHandlerRootView style={StyleSheet.absoluteFill} testID={testID}>
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={dismiss}
          accessibilityRole="button"
          accessibilityLabel="Close sheet"
          testID="sheet-backdrop"
        />
      </Animated.View>
      <View style={styles.positioner} pointerEvents="box-none">
        <Animated.View style={[styles.sheet, contentStyle, sheetStyle]}>
          <GestureDetector gesture={pan}>
            <View style={styles.handleZone} testID="sheet-handle">
              <View style={styles.handleBar} />
            </View>
          </GestureDetector>
          {children}
        </Animated.View>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: designTokens.scrim.backdrop,
  },
  positioner: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: designTokens.color.surface,
    borderTopLeftRadius: designTokens.radius.xxl,
    borderTopRightRadius: designTokens.radius.xxl,
    paddingBottom: 12,
    maxHeight: '88%',
  },
  handleZone: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  handleBar: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: designTokens.color.border,
  },
});
